package service

import (
	"fmt"
	"html"
	"strings"
)

// Email HTML has to survive clients that strip <style>, ignore modern CSS and
// re-flow anything that is not a table. So: tables, inline styles, explicit
// colours, and a font stack rather than a web font.
const (
	emailBackground = "#080808"
	emailSurface    = "#111111"
	emailBorder     = "#292929"
	emailText       = "#ededed"
	emailMuted      = "#a1a1a1"
	emailFontStack  = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, Helvetica, Arial, sans-serif"
)

// emailContent is one message's body, in both forms every client needs.
type emailContent struct {
	Title     string
	Preheader string   // shown in the inbox preview line, never in the body
	Intro     string   // greeting paragraph
	Code      string   // optional: a confirmation code, displayed large
	CodeNote  string   // optional: expiry or usage note under the code
	Body      []string // remaining paragraphs
	Footer    string   // closing note, quieter
}

// renderHTML builds the styled message.
func renderHTML(c emailContent) string {
	var b strings.Builder

	b.WriteString(`<!doctype html><html lang="ro"><head>`)
	b.WriteString(`<meta charset="utf-8">`)
	b.WriteString(`<meta name="viewport" content="width=device-width,initial-scale=1">`)
	// Tells clients the design is already dark, so they do not invert it.
	b.WriteString(`<meta name="color-scheme" content="dark">`)
	b.WriteString(`<meta name="supported-color-schemes" content="dark">`)
	b.WriteString(`<title>` + html.EscapeString(c.Title) + `</title></head>`)

	b.WriteString(fmt.Sprintf(
		`<body style="margin:0;padding:0;background-color:%s;">`, emailBackground))

	// Preheader: the inbox preview text. Hidden in the body itself.
	if c.Preheader != "" {
		b.WriteString(fmt.Sprintf(
			`<div style="display:none;max-height:0;overflow:hidden;opacity:0;">%s</div>`,
			html.EscapeString(c.Preheader)))
	}

	b.WriteString(fmt.Sprintf(
		`<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="background-color:%s;padding:32px 16px;">`,
		emailBackground))
	b.WriteString(`<tr><td align="center">`)
	b.WriteString(fmt.Sprintf(
		`<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background-color:%s;border:1px solid %s;border-radius:12px;">`,
		emailSurface, emailBorder))

	// Header
	b.WriteString(fmt.Sprintf(
		`<tr><td style="padding:24px 28px 0 28px;font-family:%s;font-size:13px;font-weight:600;color:%s;letter-spacing:0.02em;">`,
		emailFontStack, emailText))
	b.WriteString(`&#127891;&nbsp; Asistent Academie `)
	b.WriteString(fmt.Sprintf(
		`<span style="color:%s;font-weight:400;">· Suport pentru cursanți</span></td></tr>`, emailMuted))

	// Title
	b.WriteString(fmt.Sprintf(
		`<tr><td style="padding:16px 28px 0 28px;font-family:%s;font-size:20px;font-weight:600;color:%s;line-height:1.3;">%s</td></tr>`,
		emailFontStack, emailText, html.EscapeString(c.Title)))

	// Intro
	if c.Intro != "" {
		b.WriteString(paragraph(c.Intro, emailText))
	}

	// Code block
	if c.Code != "" {
		b.WriteString(fmt.Sprintf(
			`<tr><td style="padding:20px 28px 0 28px;"><div style="background-color:%s;border:1px solid %s;border-radius:10px;padding:18px;text-align:center;font-family:'SF Mono',Menlo,Consolas,monospace;font-size:28px;font-weight:600;letter-spacing:0.18em;color:%s;">%s</div></td></tr>`,
			emailBackground, emailBorder, emailText, html.EscapeString(c.Code)))
		if c.CodeNote != "" {
			b.WriteString(fmt.Sprintf(
				`<tr><td style="padding:10px 28px 0 28px;font-family:%s;font-size:13px;color:%s;text-align:center;">%s</td></tr>`,
				emailFontStack, emailMuted, html.EscapeString(c.CodeNote)))
		}
	}

	for _, text := range c.Body {
		b.WriteString(paragraph(text, emailText))
	}

	if c.Footer != "" {
		b.WriteString(fmt.Sprintf(
			`<tr><td style="padding:20px 28px 0 28px;"><div style="border-top:1px solid %s;"></div></td></tr>`,
			emailBorder))
		b.WriteString(fmt.Sprintf(
			`<tr><td style="padding:14px 28px 26px 28px;font-family:%s;font-size:13px;line-height:1.55;color:%s;">%s</td></tr>`,
			emailFontStack, emailMuted, html.EscapeString(c.Footer)))
	} else {
		b.WriteString(`<tr><td style="padding:0 0 26px 0;"></td></tr>`)
	}

	b.WriteString(`</table>`)

	b.WriteString(fmt.Sprintf(
		`<div style="max-width:520px;margin:14px auto 0 auto;font-family:%s;font-size:12px;color:%s;text-align:center;">Asistent Academie · Suport pentru cursanți</div>`,
		emailFontStack, emailMuted))

	b.WriteString(`</td></tr></table></body></html>`)
	return b.String()
}

func paragraph(text, color string) string {
	return fmt.Sprintf(
		`<tr><td style="padding:14px 28px 0 28px;font-family:%s;font-size:15px;line-height:1.6;color:%s;">%s</td></tr>`,
		emailFontStack, color, html.EscapeString(text))
}

// renderText is the plain-text alternative. Clients that refuse HTML still get
// a readable message, and spam filters score a text part favourably.
func renderText(c emailContent) string {
	var lines []string
	lines = append(lines, c.Title, strings.Repeat("-", len([]rune(c.Title))), "")
	if c.Intro != "" {
		lines = append(lines, c.Intro, "")
	}
	if c.Code != "" {
		lines = append(lines, "    "+c.Code, "")
		if c.CodeNote != "" {
			lines = append(lines, c.CodeNote, "")
		}
	}
	for _, text := range c.Body {
		lines = append(lines, text, "")
	}
	if c.Footer != "" {
		lines = append(lines, c.Footer, "")
	}
	lines = append(lines, "— Asistent Academie · Suport pentru cursanți")
	return strings.Join(lines, "\n")
}
