package service

import (
	"errors"
	"unicode"
)

// ErrWeakPassword is returned when a password does not meet the policy.
var ErrWeakPassword = errors.New("weak_password")

// ValidatePassword enforces the minimum password policy: at least 8 characters,
// containing at least one letter and one digit.
func ValidatePassword(pw string) error {
	if len([]rune(pw)) < 8 {
		return ErrWeakPassword
	}
	var hasLetter, hasDigit bool
	for _, r := range pw {
		switch {
		case unicode.IsLetter(r):
			hasLetter = true
		case unicode.IsDigit(r):
			hasDigit = true
		}
	}
	if !hasLetter || !hasDigit {
		return ErrWeakPassword
	}
	return nil
}
