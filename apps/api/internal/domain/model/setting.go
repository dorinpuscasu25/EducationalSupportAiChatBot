package model

import "time"

// Setting keys. Kept as constants so a typo cannot silently read a default.
const (
	// SettingAutoActivateUsers makes a newly registered account active straight
	// away instead of waiting for an admin. Intended for a closed beta; leaving
	// it on in production hands the corpus to anyone who can register.
	SettingAutoActivateUsers = "auto_activate_users"
)

// Setting is one admin-controlled switch, stored so it survives a restart and
// applies to every instance rather than living in one process's environment.
type Setting struct {
	Key       string    `gorm:"primaryKey;size:64" json:"key"`
	Value     string    `gorm:"size:255;not null" json:"value"`
	UpdatedAt time.Time `json:"updated_at"`
	UpdatedBy string    `gorm:"type:uuid" json:"updated_by,omitempty"`
}
