// Admin provisioning is an operator command, never part of public registration.
package main

import (
	"context"
	"flag"
	"fmt"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/domain/model"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func main() {
	email := flag.String("email", "", "Existing verified account to promote")
	apply := flag.Bool("apply", false, "Apply promotion; default is preview")
	flag.Parse()
	_ = godotenv.Load()
	if err := run(strings.ToLower(strings.TrimSpace(*email)), *apply); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run(email string, apply bool) error {
	if email == "" {
		return fmt.Errorf("--email is required")
	}
	host := os.Getenv("DB_HOST")
	if port := os.Getenv("DB_PORT"); port != "" {
		host += ":" + port
	}
	u := url.URL{Scheme: "postgres", Host: host, Path: "/" + os.Getenv("DB_NAME"), User: url.UserPassword(os.Getenv("DB_USER"), os.Getenv("DB_PASSWORD"))}
	q := u.Query()
	q.Set("sslmode", os.Getenv("DB_SSLMODE"))
	q.Set("connect_timeout", "5")
	u.RawQuery = q.Encode()
	db, err := gorm.Open(postgres.Open(u.String()), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		return fmt.Errorf("database connection failed; check DB configuration")
	}
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	defer sqlDB.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	return db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("SELECT pg_advisory_xact_lock(72419001)").Error; err != nil {
			return fmt.Errorf("could not acquire admin lock")
		}
		var user model.User
		if err := tx.Where("lower(email) = ?", email).First(&user).Error; err != nil {
			return fmt.Errorf("account not found")
		}
		if !user.EmailVerified {
			return fmt.Errorf("verify the account email before promotion")
		}
		if user.Status == model.StatusSuspended {
			return fmt.Errorf("account is suspended; resolve suspension first")
		}
		fmt.Printf("Account %s (%s): %s/%s -> admin/active\n", user.ID, user.Email, user.Role, user.Status)
		if !apply {
			fmt.Println("Preview only. Repeat with --apply to promote.")
			return nil
		}
		if err := tx.Model(&user).Updates(map[string]any{"role": model.RoleAdmin, "status": model.StatusActive, "token_version": gorm.Expr("token_version + 1")}).Error; err != nil {
			return fmt.Errorf("promotion failed")
		}
		if err := tx.Create(&model.AuditEvent{ActorUserID: user.ID, EntityType: "user", EntityID: user.ID, Action: "operator_admin_provisioned", Details: []byte(`{"method":"local_cli"}`)}).Error; err != nil {
			return fmt.Errorf("audit failed; promotion rolled back")
		}
		fmt.Println("Administrator activated. Sign in again.")
		return nil
	})
}
