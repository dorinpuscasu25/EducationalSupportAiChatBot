package service

import (
	"crypto/rand"
	"errors"
	"math/big"
	"os"
	"strings"
	"time"

	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/api/response"
	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/domain/model"
	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/repository"
	"github.com/golang-jwt/jwt/v4"
	"golang.org/x/crypto/bcrypt"
)

// Sentinel errors mapped to HTTP codes by the handler.
var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrEmailNotVerified   = errors.New("email_not_verified")
	ErrEmailTaken         = errors.New("email_already_registered")
	ErrInvalidCode        = errors.New("invalid_or_expired_code")
	ErrTooManyAttempts    = errors.New("too_many_attempts")
)

const (
	verifyCodeTTL  = 15 * time.Minute
	maxCodeTries   = 5
	resendCooldown = 60 * time.Second
)

type AuthService struct {
	userRepository *repository.UserRepository
	emailService   *EmailService
	settings       *SettingsService
	jwtSecret      []byte
	tokenDuration  time.Duration
}

func NewAuthService(userRepository *repository.UserRepository, emailService *EmailService, settings *SettingsService) *AuthService {
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		panic("JWT_SECRET is required")
	}

	return &AuthService{
		userRepository: userRepository,
		emailService:   emailService,
		settings:       settings,
		jwtSecret:      []byte(jwtSecret),
		tokenDuration:  time.Hour * 24 * 7,
	}
}

type Claims struct {
	UserID       string `json:"user_id"`
	Email        string `json:"email"`
	TokenVersion int    `json:"tv"`
	jwt.StandardClaims
}

// RegisterInput is the payload for self-service signup.
type RegisterInput struct {
	Email     string
	FirstName string
	LastName  string
	Phone     string
	Password  string
}

// Register creates a new (pending, unverified) account and emails a code.
func (s *AuthService) Register(in RegisterInput) (*model.User, error) {
	email := strings.ToLower(strings.TrimSpace(in.Email))

	if err := ValidatePassword(in.Password); err != nil {
		return nil, err
	}

	existing, err := s.userRepository.FindByEmail(email)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, ErrEmailTaken
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	// Public registration never grants privileges or bypasses email ownership.
	// It may skip the admin's approval step, but only while an admin has
	// deliberately turned that on — the default keeps new accounts pending.
	role, status := model.RoleUser, model.StatusPending
	if s.settings != nil &&
		s.settings.Bool(model.SettingAutoActivateUsers, false) {
		status = model.StatusActive
	}
	emailVerified := false

	user := &model.User{
		Email:         email,
		FirstName:     strings.TrimSpace(in.FirstName),
		LastName:      strings.TrimSpace(in.LastName),
		Phone:         strings.TrimSpace(in.Phone),
		Password:      string(hash),
		Active:        true,
		Role:          role,
		Status:        status,
		EmailVerified: emailVerified,
		TokenVersion:  1,
	}

	if !emailVerified {
		code := generateCode()
		if err := s.stampCode(user, code); err != nil {
			return nil, err
		}
		if err := s.userRepository.Create(user); err != nil {
			if errors.Is(err, repository.ErrDuplicateEmail) {
				return nil, ErrEmailTaken
			}
			return nil, err
		}
		_ = s.emailService.SendVerificationCode(user.Email, user.FirstName, code)
		return user, nil
	}

	if err := s.userRepository.Create(user); err != nil {
		if errors.Is(err, repository.ErrDuplicateEmail) {
			return nil, ErrEmailTaken
		}
		return nil, err
	}
	return user, nil
}

// VerifyEmail validates the code, marks the email verified and returns a token.
func (s *AuthService) VerifyEmail(email, code string) (*response.LoginResponse, error) {
	user, err := s.userRepository.FindByEmail(strings.ToLower(strings.TrimSpace(email)))
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, ErrInvalidCode
	}
	if user.EmailVerified {
		return nil, ErrInvalidCode
	}
	if user.VerifyCodeExpiresAt == nil || time.Now().After(*user.VerifyCodeExpiresAt) {
		return nil, ErrInvalidCode
	}
	if user.VerifyAttempts >= maxCodeTries {
		// Burn the code; the user must request a new one.
		_ = s.userRepository.UpdateByID(user.ID, map[string]interface{}{
			"verify_code_hash":       "",
			"verify_code_expires_at": nil,
		})
		return nil, ErrTooManyAttempts
	}
	if bcrypt.CompareHashAndPassword([]byte(user.VerifyCodeHash), []byte(code)) != nil {
		_ = s.userRepository.UpdateByID(user.ID, map[string]interface{}{
			"verify_attempts": user.VerifyAttempts + 1,
		})
		return nil, ErrInvalidCode
	}

	if err := s.userRepository.UpdateByID(user.ID, map[string]interface{}{
		"email_verified":         true,
		"verify_code_hash":       "",
		"verify_code_expires_at": nil,
		"verify_attempts":        0,
	}); err != nil {
		return nil, err
	}
	user.EmailVerified = true
	return s.issue(user)
}

// ResendCode regenerates and re-sends the verification code.
func (s *AuthService) ResendCode(email string) error {
	user, err := s.userRepository.FindByEmail(strings.ToLower(strings.TrimSpace(email)))
	if err != nil || user == nil || user.EmailVerified {
		return nil // do not reveal account existence
	}
	// Cooldown to prevent email bombing.
	if user.VerifyCodeSentAt != nil && time.Since(*user.VerifyCodeSentAt) < resendCooldown {
		return ErrTooManyAttempts
	}
	code := generateCode()
	hash, _ := bcrypt.GenerateFromPassword([]byte(code), bcrypt.DefaultCost)
	now := time.Now()
	exp := now.Add(verifyCodeTTL)
	if err := s.userRepository.UpdateByID(user.ID, map[string]interface{}{
		"verify_code_hash":       string(hash),
		"verify_code_expires_at": exp,
		"verify_code_sent_at":    now,
		"verify_attempts":        0,
	}); err != nil {
		return err
	}
	return s.emailService.SendVerificationCode(user.Email, user.FirstName, code)
}

// Login authenticates email + password. Pending accounts can log in (so the
// client can show the waiting screen); unverified emails cannot.
func (s *AuthService) Login(email, password string) (*response.LoginResponse, error) {
	user, err := s.userRepository.FindByEmail(strings.ToLower(strings.TrimSpace(email)))
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, ErrInvalidCredentials
	}
	if bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)) != nil {
		return nil, ErrInvalidCredentials
	}
	if !user.EmailVerified {
		return nil, ErrEmailNotVerified
	}
	return s.issue(user)
}

// ForgotPassword emails a reset code. Always returns nil to avoid revealing
// whether an account exists.
func (s *AuthService) ForgotPassword(email string) error {
	user, err := s.userRepository.FindByEmail(strings.ToLower(strings.TrimSpace(email)))
	if err != nil || user == nil || !user.EmailVerified {
		return nil
	}
	if user.ResetCodeSentAt != nil && time.Since(*user.ResetCodeSentAt) < resendCooldown {
		return nil
	}
	code := generateCode()
	hash, _ := bcrypt.GenerateFromPassword([]byte(code), bcrypt.DefaultCost)
	now := time.Now()
	exp := now.Add(verifyCodeTTL)
	if err := s.userRepository.UpdateByID(user.ID, map[string]interface{}{
		"reset_code_hash":       string(hash),
		"reset_code_expires_at": exp,
		"reset_code_sent_at":    now,
		"reset_attempts":        0,
	}); err != nil {
		return err
	}
	return s.emailService.SendPasswordResetCode(user.Email, user.FirstName, code)
}

// ResetPassword validates the reset code, sets a new password and invalidates
// all existing tokens.
func (s *AuthService) ResetPassword(email, code, newPassword string) error {
	if err := ValidatePassword(newPassword); err != nil {
		return err
	}
	user, err := s.userRepository.FindByEmail(strings.ToLower(strings.TrimSpace(email)))
	if err != nil {
		return err
	}
	if user == nil || user.ResetCodeExpiresAt == nil || time.Now().After(*user.ResetCodeExpiresAt) {
		return ErrInvalidCode
	}
	if user.ResetAttempts >= maxCodeTries {
		_ = s.userRepository.UpdateByID(user.ID, map[string]interface{}{
			"reset_code_hash":       "",
			"reset_code_expires_at": nil,
		})
		return ErrTooManyAttempts
	}
	if bcrypt.CompareHashAndPassword([]byte(user.ResetCodeHash), []byte(code)) != nil {
		_ = s.userRepository.UpdateByID(user.ID, map[string]interface{}{
			"reset_attempts": user.ResetAttempts + 1,
		})
		return ErrInvalidCode
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	if err := s.userRepository.UpdateByID(user.ID, map[string]interface{}{
		"password":              string(hash),
		"reset_code_hash":       "",
		"reset_code_expires_at": nil,
		"reset_attempts":        0,
		"token_version":         user.TokenVersion + 1,
	}); err != nil {
		return err
	}
	_ = s.emailService.SendPasswordChanged(user.Email, user.FirstName)
	return nil
}

// SendResetForUser is an admin-initiated password reset (emails the code).
func (s *AuthService) SendResetForUser(userID string) error {
	user, err := s.userRepository.FindByID(userID)
	if err != nil || user == nil {
		return err
	}
	return s.ForgotPassword(user.Email)
}

// ParseClaims validates the signature/expiry and returns the typed claims
// (including TokenVersion, checked against the user by the middleware).
func (s *AuthService) ParseClaims(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return s.jwtSecret, nil
	})
	if err != nil {
		return nil, err
	}
	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}
	return nil, errors.New("invalid token")
}

// ─── helpers ─────────────────────────────────────────────────────────────────

func (s *AuthService) stampCode(user *model.User, code string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(code), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	now := time.Now()
	exp := now.Add(verifyCodeTTL)
	user.VerifyCodeHash = string(hash)
	user.VerifyCodeExpiresAt = &exp
	user.VerifyCodeSentAt = &now
	user.VerifyAttempts = 0
	return nil
}

func (s *AuthService) issue(user *model.User) (*response.LoginResponse, error) {
	expiresAt := time.Now().Add(s.tokenDuration)
	tv := user.TokenVersion
	if tv == 0 {
		tv = 1
	}
	claims := &Claims{
		UserID:       user.ID,
		Email:        user.Email,
		TokenVersion: tv,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: expiresAt.Unix(),
			IssuedAt:  time.Now().Unix(),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(s.jwtSecret)
	if err != nil {
		return nil, err
	}
	return &response.LoginResponse{Token: signed, ExpiresAt: expiresAt, User: user}, nil
}

func generateCode() string {
	const digits = "0123456789"
	b := make([]byte, 6)
	for i := range b {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(digits))))
		if err != nil {
			b[i] = '0'
			continue
		}
		b[i] = digits[n.Int64()]
	}
	return string(b)
}
