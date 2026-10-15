package service

import (
	"strings"
	"testing"
)

func TestSecurityConfigurationFailsClosed(t *testing.T) {
	t.Setenv("ENV", "production")
	t.Setenv("SMTP_HOST", "smtp.example.invalid")
	t.Setenv("JWT_SECRET", strings.Repeat("x", 40))
	t.Setenv("CORS_ALLOWED_ORIGINS", "https://academie.example.com")
	if err := ValidateSecurityConfig(); err != nil {
		t.Fatal(err)
	}
	for _, secret := range []string{"", "xxxx", "your-default-secret-key-for-development-only"} {
		t.Setenv("JWT_SECRET", secret)
		if ValidateSecurityConfig() == nil {
			t.Fatal("accepted unsafe secret")
		}
	}
	t.Setenv("JWT_SECRET", strings.Repeat("x", 40))
	for _, origin := range []string{"*", "http://academie.example.com", "https://academie.example.com/path", "https://*.example.com"} {
		t.Setenv("CORS_ALLOWED_ORIGINS", origin)
		if ValidateSecurityConfig() == nil {
			t.Fatalf("accepted origin %q", origin)
		}
	}
}
