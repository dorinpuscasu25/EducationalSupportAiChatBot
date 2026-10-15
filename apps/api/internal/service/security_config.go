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
	// CORS is only needed when the browser calls the API from another origin;
	// the bundled web app proxies /api on the same origin.
	origins := strings.TrimSpace(os.Getenv("CORS_ALLOWED_ORIGINS"))
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
