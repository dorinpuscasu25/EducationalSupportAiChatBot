package database

import (
	"fmt"
	"os"
	"time"

	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/domain/model"
	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/knowledge"
	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/pkg/logger"
	"go.uber.org/zap"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func SetupDB(embeddingDim int) (*gorm.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s TimeZone=%s",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
		os.Getenv("DB_SSLMODE"),
		os.Getenv("DB_TIMEZONE"),
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger:         logger.NewGormLogger(),
		TranslateError: true,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get database connection: %w", err)
	}
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(50)
	sqlDB.SetConnMaxLifetime(time.Hour)

	logger.Info("Starting database migration...")
	if err := db.AutoMigrate(
		&model.Setting{},
		&model.User{},
		&model.UserQuota{},
		&model.UsageEvent{},
		&model.Chat{},
		&model.ChatMessage{},
		&model.ChatAttachment{},
		&model.AuditEvent{},
		&model.KnowledgeDocument{},
		&model.KnowledgeChunk{},
	); err != nil {
		logger.Error("Failed to migrate database", zap.Error(err))
		return nil, fmt.Errorf("failed to migrate database: %w", err)
	}
	if err := db.Exec(`
		CREATE UNIQUE INDEX IF NOT EXISTS idx_users_active_email
		ON users (LOWER(email))
		WHERE deleted_at IS NULL
	`).Error; err != nil {
		return nil, fmt.Errorf("create active user email constraint: %w", err)
	}
	if err := knowledge.EnsureSchema(db, embeddingDim); err != nil {
		return nil, err
	}

	logger.Info("Database connected and migrated successfully")
	return db, nil
}
