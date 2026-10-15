package model

import (
	"time"

	"gorm.io/gorm"
)

// Role values for User.Role.
const (
	RoleUser  = "user"
	RoleAdmin = "admin"
)

// Status values for User.Status. New users start as pending and must be
// approved by an admin before they can use the assistant.
const (
	StatusPending   = "pending"
	StatusActive    = "active"
	StatusSuspended = "suspended"
)

type User struct {
	ID        string `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Email     string `json:"email"`
	Password  string `json:"-"`
	Phone     string `json:"phone"`
	Active    bool   `gorm:"default:true"`
	Role      string `gorm:"size:20;not null;default:'user';index" json:"role"`
	Status    string `gorm:"size:20;not null;default:'pending';index" json:"status"`
	Avatar    string `json:"avatar"`
	Language  string `json:"language"`

	// Email verification (custom auth). Password is bcrypt-hashed.
	EmailVerified       bool       `gorm:"not null;default:false" json:"email_verified"`
	VerifyCodeHash      string     `json:"-"`
	VerifyCodeExpiresAt *time.Time `json:"-"`
	VerifyAttempts      int        `gorm:"not null;default:0" json:"-"`
	VerifyCodeSentAt    *time.Time `json:"-"`

	// Password reset (forgot password).
	ResetCodeHash      string     `json:"-"`
	ResetCodeExpiresAt *time.Time `json:"-"`
	ResetAttempts      int        `gorm:"not null;default:0" json:"-"`
	ResetCodeSentAt    *time.Time `json:"-"`

	// Pending email change (re-verification on the new address).
	PendingEmail         string     `json:"-"`
	EmailChangeCodeHash  string     `json:"-"`
	EmailChangeExpiresAt *time.Time `json:"-"`

	// TokenVersion is embedded in JWTs; bumping it invalidates all existing
	// tokens (used on password change/reset and "log out everywhere").
	TokenVersion int `gorm:"not null;default:1" json:"-"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Quota *UserQuota `gorm:"foreignKey:UserID" json:"quota,omitempty"`
}

// IsAdmin reports whether the user has the admin role.
func (u *User) IsAdmin() bool { return u.Role == RoleAdmin }

// IsActive reports whether the user account has been activated.
func (u *User) IsActive() bool { return u.Status == StatusActive }
