package service

import (
	"fmt"
	"net/url"
	"os"
	"strings"
)

// ValidateSecurityConfig runs before migrations or any network listener.
func ValidateSecurityConfig() error {
	secret := strings.TrimSpace(os.Getenv("JWT_SECRET"))
	if len(secret) < 32 || strings.Contains(strings.ToLower(secret), "default-secret") {
		return fmt.Errorf("JWT_SECRET must contain at least 32 characters and must not be a default")
	}
	env := os.Getenv("ENV")
	production := env != "development" && env != "test"
	if production && strings.TrimSpace(os.Getenv("SMTP_HOST")) == "" && strings.TrimSpace(os.Getenv("RESEND_API_KEY")) == "" {
		return fmt.Errorf("SMTP_HOST or RESEND_API_KEY is required outside development/test")
	}
	origins := strings.TrimSpace(os.Getenv("CORS_ALLOWED_ORIGINS"))
	if production && origins == "" {
		return fmt.Errorf("CORS_ALLOWED_ORIGINS is required outside development/test")
	}
	for _, origin := range strings.Split(origins, ",") {
		origin = strings.TrimSpace(origin)
		if origin == "" {
			continue
		}
		u, err := url.Parse(origin)
		if err != nil || u.Host == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" || u.Path != "" || (u.Scheme != "https" && u.Scheme != "http") || strings.Contains(origin, "*") {
			return fmt.Errorf("CORS_ALLOWED_ORIGINS must contain exact HTTP(S) origins")
		}
		if production && u.Scheme != "https" {
			return fmt.Errorf("CORS origins must use HTTPS outside development/test")
		}
	}
	return nil
}
