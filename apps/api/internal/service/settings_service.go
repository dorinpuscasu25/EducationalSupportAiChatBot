package service

import (
	"strconv"
	"time"

	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/domain/model"
	"gorm.io/gorm"
)

// SettingsService reads and writes the admin-controlled switches.
type SettingsService struct {
	db *gorm.DB
}

func NewSettingsService(db *gorm.DB) *SettingsService {
	return &SettingsService{db: db}
}

// Bool returns a switch, falling back to the given default when it was never
// set or holds something unparseable. A missing row must never be read as
// "on" for a setting that widens access.
func (s *SettingsService) Bool(key string, fallback bool) bool {
	var setting model.Setting
	if err := s.db.First(&setting, "key = ?", key).Error; err != nil {
		return fallback
	}
	value, err := strconv.ParseBool(setting.Value)
	if err != nil {
		return fallback
	}
	return value
}

// SetBool stores a switch and records who changed it.
func (s *SettingsService) SetBool(key string, value bool, actorID string) error {
	setting := model.Setting{
		Key:       key,
		Value:     strconv.FormatBool(value),
		UpdatedAt: time.Now(),
		UpdatedBy: actorID,
	}
	return s.db.Save(&setting).Error
}

// AdminSettings is the whole switch panel, as the admin UI reads it.
type AdminSettings struct {
	AutoActivateUsers bool `json:"auto_activate_users"`
}

func (s *SettingsService) All() AdminSettings {
	return AdminSettings{
		// Default off: an account should not reach the corpus without a decision.
		AutoActivateUsers: s.Bool(model.SettingAutoActivateUsers, false),
	}
}
