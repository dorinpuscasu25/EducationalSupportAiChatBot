package database

import (
	"os"
	"strings"

	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/domain/model"
	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/pkg/logger"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// BootstrapAdmin creates the first administrator from ADMIN_EMAIL and
// ADMIN_PASSWORD when no account with that email exists yet. It never changes
// an existing account, so removing the variables after the first start is safe.
func BootstrapAdmin(db *gorm.DB) {
	email := strings.ToLower(strings.TrimSpace(os.Getenv("ADMIN_EMAIL")))
	password := os.Getenv("ADMIN_PASSWORD")
	if email == "" || password == "" {
		return
	}
	var count int64
	db.Model(&model.User{}).Where("lower(email) = ?", email).Count(&count)
	if count > 0 {
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		logger.Error("Admin bootstrap failed", zap.Error(err))
		return
	}
	admin := model.User{
		Email:         email,
		FirstName:     "Administrator",
		LastName:      "",
		Password:      string(hash),
		Active:        true,
		Role:          model.RoleAdmin,
		Status:        model.StatusActive,
		EmailVerified: true,
		TokenVersion:  1,
	}
	if err := db.Create(&admin).Error; err != nil {
		logger.Error("Admin bootstrap failed", zap.Error(err))
		return
	}
	logger.Info("Administrator account created", zap.String("email", email))
}
