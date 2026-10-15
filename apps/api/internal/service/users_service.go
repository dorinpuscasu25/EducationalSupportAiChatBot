package service

import (
	"errors"
	"strings"
	"time"

	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/domain/model"
	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/repository"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type UsersService struct {
	userRepository *repository.UserRepository
	emailService   *EmailService
}

func NewUsersService(_ *gorm.DB, userRepo *repository.UserRepository, emailService *EmailService) *UsersService {
	return &UsersService{
		userRepository: userRepo,
		emailService:   emailService,
	}
}

func (s *UsersService) GetUserByID(id string) (*model.User, error) {
	return s.userRepository.FindByID(id)
}

func (s *UsersService) GetUserByEmail(email string) (*model.User, error) {
	return s.userRepository.FindByEmail(email)
}

// ─── Self-service profile management (custom auth) ────────────────────────────

type UpdateProfileInput struct {
	FirstName *string `json:"first_name,omitempty"`
	LastName  *string `json:"last_name,omitempty"`
	Phone     *string `json:"phone,omitempty"`
	Language  *string `json:"language,omitempty"`
}

// UpdateProfile updates the current user's editable profile fields.
func (s *UsersService) UpdateProfile(userID string, input UpdateProfileInput) (*model.User, error) {
	updates := make(map[string]interface{})
	if input.FirstName != nil {
		updates["first_name"] = *input.FirstName
	}
	if input.LastName != nil {
		updates["last_name"] = *input.LastName
	}
	if input.Phone != nil {
		updates["phone"] = *input.Phone
	}
	if input.Language != nil {
		updates["language"] = *input.Language
	}
	if len(updates) > 0 {
		if err := s.userRepository.UpdateByID(userID, updates); err != nil {
			return nil, err
		}
	}
	return s.userRepository.FindByID(userID)
}

// SetAvatar stores the avatar URL/path for a user.
func (s *UsersService) SetAvatar(userID, url string) (*model.User, error) {
	if err := s.userRepository.UpdateByID(userID, map[string]interface{}{"avatar": url}); err != nil {
		return nil, err
	}
	return s.userRepository.FindByID(userID)
}

// ChangePassword verifies the current password, sets a new bcrypt hash and
// invalidates existing tokens (token_version bump). Emails a notification.
func (s *UsersService) ChangePassword(userID, currentPassword, newPassword string) error {
	user, err := s.userRepository.FindByID(userID)
	if err != nil {
		return err
	}
	if user == nil {
		return errors.New("user not found")
	}
	if bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(currentPassword)) != nil {
		return errors.New("invalid_current_password")
	}
	if err := ValidatePassword(newPassword); err != nil {
		return err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	if err := s.userRepository.UpdateByID(userID, map[string]interface{}{
		"password":      string(hash),
		"token_version": user.TokenVersion + 1,
	}); err != nil {
		return err
	}
	if s.emailService != nil {
		_ = s.emailService.SendPasswordChanged(user.Email, user.FirstName)
	}
	return nil
}

// RequestEmailChange stores a pending email and emails a code to the NEW address.
func (s *UsersService) RequestEmailChange(userID, newEmail string) error {
	newEmail = strings.ToLower(strings.TrimSpace(newEmail))
	existing, err := s.userRepository.FindByEmail(newEmail)
	if err != nil {
		return err
	}
	if existing != nil {
		return errors.New("email_already_registered")
	}
	user, err := s.userRepository.FindByID(userID)
	if err != nil || user == nil {
		return errors.New("user not found")
	}
	code := generateCode()
	hash, _ := bcrypt.GenerateFromPassword([]byte(code), bcrypt.DefaultCost)
	exp := time.Now().Add(15 * time.Minute)
	if err := s.userRepository.UpdateByID(userID, map[string]interface{}{
		"pending_email":           newEmail,
		"email_change_code_hash":  string(hash),
		"email_change_expires_at": exp,
	}); err != nil {
		return err
	}
	if s.emailService != nil {
		_ = s.emailService.SendEmailChangeCode(newEmail, user.FirstName, code)
	}
	return nil
}

// ConfirmEmailChange validates the code and applies the pending email.
func (s *UsersService) ConfirmEmailChange(userID, code string) (*model.User, error) {
	user, err := s.userRepository.FindByID(userID)
	if err != nil || user == nil {
		return nil, errors.New("user not found")
	}
	if user.PendingEmail == "" || user.EmailChangeExpiresAt == nil ||
		time.Now().After(*user.EmailChangeExpiresAt) {
		return nil, errors.New("invalid_or_expired_code")
	}
	if bcrypt.CompareHashAndPassword([]byte(user.EmailChangeCodeHash), []byte(code)) != nil {
		return nil, errors.New("invalid_or_expired_code")
	}
	if err := s.userRepository.UpdateByID(userID, map[string]interface{}{
		"email":                   user.PendingEmail,
		"pending_email":           "",
		"email_change_code_hash":  "",
		"email_change_expires_at": nil,
	}); err != nil {
		return nil, err
	}
	return s.userRepository.FindByID(userID)
}
