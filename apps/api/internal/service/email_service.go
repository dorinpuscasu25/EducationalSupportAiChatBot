package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/mail"
	"net/smtp"
	"net/textproto"
	"os"
	"strings"
	"time"

	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/pkg/logger"
	"go.uber.org/zap"
)

const resendEndpoint = "https://api.resend.com/emails"

// EmailConfigured reports whether a real mail provider is set up.
func EmailConfigured() bool {
	return strings.TrimSpace(os.Getenv("RESEND_API_KEY")) != "" || strings.TrimSpace(os.Getenv("SMTP_HOST")) != ""
}

// EmailService sends transactional mail. It prefers Resend when an API key is
// present, falls back to SMTP, and in development logs the message so a code
// can still be read without any provider configured.
type EmailService struct {
	resendKey string
	host      string
	port      string
	username  string
	password  string
	from      string
	client    *http.Client
}

func NewEmailService() *EmailService {
	return &EmailService{
		resendKey: strings.TrimSpace(os.Getenv("RESEND_API_KEY")),
		host:      os.Getenv("SMTP_HOST"),
		port:      orDefault(os.Getenv("SMTP_PORT"), "587"),
		username:  os.Getenv("SMTP_USERNAME"),
		password:  os.Getenv("SMTP_PASSWORD"),
		// EMAIL_FROM is the new name; SMTP_FROM stays readable for existing setups.
		from: orDefault(
			os.Getenv("EMAIL_FROM"),
			orDefault(os.Getenv("SMTP_FROM"), "Asistent Academie <no-reply@example.com>"),
		),
		client: &http.Client{Timeout: 15 * time.Second},
	}
}

// SendVerificationCode emails a 6-digit confirmation code to the user.
func (s *EmailService) SendVerificationCode(toEmail, name, code string) error {
	return s.send(toEmail, "Codul tău de confirmare — Asistent Academie", emailContent{
		Title:     "Confirmă-ți adresa de email",
		Preheader: "Codul tău de confirmare expiră în 15 minute.",
		Intro:     greeting(name) + "introdu codul de mai jos ca să-ți confirmi adresa de email.",
		Code:      code,
		CodeNote:  "Codul expiră în 15 minute.",
		Footer:    "Dacă nu ți-ai creat cont pe platforma academiei, ignoră acest mesaj.",
	})
}

// SendPasswordResetCode emails a code to reset a forgotten password.
func (s *EmailService) SendPasswordResetCode(toEmail, name, code string) error {
	return s.send(toEmail, "Resetare parolă — Asistent Academie", emailContent{
		Title:     "Resetează-ți parola",
		Preheader: "Codul de resetare expiră în 15 minute.",
		Intro:     greeting(name) + "ai cerut resetarea parolei. Folosește codul de mai jos.",
		Code:      code,
		CodeNote:  "Codul expiră în 15 minute.",
		Footer:    "Dacă nu ai cerut tu resetarea, ignoră acest mesaj — parola rămâne neschimbată.",
	})
}

// SendEmailChangeCode emails a code to confirm a new email address.
func (s *EmailService) SendEmailChangeCode(toEmail, name, code string) error {
	return s.send(toEmail, "Confirmă noua adresă de email — Asistent Academie", emailContent{
		Title:     "Confirmă noua adresă",
		Preheader: "Codul de confirmare expiră în 15 minute.",
		Intro:     greeting(name) + "ca să folosești această adresă pe contul tău, introdu codul de mai jos.",
		Code:      code,
		CodeNote:  "Codul expiră în 15 minute.",
		Footer:    "Dacă nu ai cerut tu schimbarea, ignoră acest mesaj — adresa rămâne cea veche.",
	})
}

// SendAccountActivated notifies the user their account was approved.
func (s *EmailService) SendAccountActivated(toEmail, name string) error {
	return s.send(toEmail, "Contul tău a fost activat — Asistent Academie", emailContent{
		Title:     "Contul tău e activ",
		Preheader: "Te poți autentifica și începe să lucrezi.",
		Intro:     greeting(name) + "contul tău a fost activat. Te poți autentifica și începe să lucrezi.",
		Body: []string{
			"Poți pune întrebări despre cursuri, materiale și organizarea studiilor. Asistentul răspunde pe baza materialelor academiei și indică sursele folosite.",
			"Intră pe " + orDefault(os.Getenv("APP_PUBLIC_URL"), "platformă") + ".",
		},
		Footer: "Pentru situații care nu sunt acoperite de materiale, contactează echipa academiei.",
	})
}

// SendPasswordChanged notifies the user their password changed.
func (s *EmailService) SendPasswordChanged(toEmail, name string) error {
	return s.send(toEmail, "Parola contului tău a fost schimbată", emailContent{
		Title:     "Parola a fost schimbată",
		Preheader: "Dacă nu ai făcut tu această schimbare, anunță-ne imediat.",
		Intro:     greeting(name) + "parola contului tău a fost schimbată.",
		Footer:    "Dacă nu ai făcut tu această schimbare, contactează-ne imediat — contul poate fi compromis.",
	})
}

func greeting(name string) string {
	name = strings.TrimSpace(name)
	if name == "" {
		return "Salut, "
	}
	return "Salut " + name + ", "
}

func (s *EmailService) send(to, subject string, content emailContent) error {
	// No provider configured: log the message so a code can still be read from
	// the server logs (main warns about this at startup outside development).
	if s.resendKey == "" && s.host == "" {
		logger.Info("email_dev_fallback",
			zap.String("to", to),
			zap.String("subject", subject),
			zap.String("body", renderText(content)),
		)
		return nil
	}

	// Header injection: a newline in any of these would let a caller append
	// arbitrary headers, including extra recipients.
	if strings.ContainsAny(to+s.from+subject, "\r\n") {
		return fmt.Errorf("invalid email header")
	}
	if _, err := mail.ParseAddress(to); err != nil {
		return fmt.Errorf("invalid recipient")
	}
	if _, err := mail.ParseAddress(s.from); err != nil {
		return fmt.Errorf("invalid sender address")
	}

	htmlBody := renderHTML(content)
	textBody := renderText(content)

	if s.resendKey != "" {
		return s.sendViaResend(to, subject, htmlBody, textBody)
	}
	return s.sendViaSMTP(to, subject, htmlBody, textBody)
}

type resendRequest struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	HTML    string   `json:"html"`
	Text    string   `json:"text"`
}

func (s *EmailService) sendViaResend(to, subject, htmlBody, textBody string) error {
	payload, err := json.Marshal(resendRequest{
		From:    s.from,
		To:      []string{to},
		Subject: subject,
		HTML:    htmlBody,
		Text:    textBody,
	})
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	request, err := http.NewRequestWithContext(
		ctx, http.MethodPost, resendEndpoint, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	request.Header.Set("Authorization", "Bearer "+s.resendKey)
	request.Header.Set("Content-Type", "application/json")

	response, err := s.client.Do(request)
	if err != nil {
		logger.Error("email_send_failed", zap.String("to", to), zap.Error(err))
		return err
	}
	defer response.Body.Close()

	if response.StatusCode >= 300 {
		// Resend explains refusals (unverified domain, invalid sender) in the
		// body; without it the failure is unreadable.
		detail, _ := io.ReadAll(io.LimitReader(response.Body, 2000))
		logger.Error("email_send_failed",
			zap.String("to", to),
			zap.Int("status", response.StatusCode),
			zap.String("detail", string(detail)),
		)
		return fmt.Errorf("resend: HTTP %d", response.StatusCode)
	}
	return nil
}

func (s *EmailService) sendViaSMTP(to, subject, htmlBody, textBody string) error {
	from, err := mail.ParseAddress(s.from)
	if err != nil {
		return fmt.Errorf("invalid sender address")
	}

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)

	headers := strings.Join([]string{
		"From: " + s.from,
		"To: " + to,
		"Subject: " + subject,
		"MIME-Version: 1.0",
		`Content-Type: multipart/alternative; boundary="` + writer.Boundary() + `"`,
		"", "",
	}, "\r\n")

	// Plain text first: clients pick the last part they can render, so HTML
	// must come second to be preferred.
	for _, part := range []struct{ contentType, content string }{
		{"text/plain; charset=\"utf-8\"", textBody},
		{"text/html; charset=\"utf-8\"", htmlBody},
	} {
		w, err := writer.CreatePart(textproto.MIMEHeader{
			"Content-Type": {part.contentType},
		})
		if err != nil {
			return err
		}
		if _, err := w.Write([]byte(part.content)); err != nil {
			return err
		}
	}
	if err := writer.Close(); err != nil {
		return err
	}

	message := append([]byte(headers), body.Bytes()...)

	var auth smtp.Auth
	if s.username != "" {
		auth = smtp.PlainAuth("", s.username, s.password, s.host)
	}
	if err := smtp.SendMail(s.host+":"+s.port, auth, from.Address, []string{to}, message); err != nil {
		logger.Error("email_send_failed", zap.String("to", to), zap.Error(err))
		return err
	}
	return nil
}

func orDefault(v, def string) string {
	if v == "" {
		return def
	}
	return v
}
