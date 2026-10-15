package repository

import (
	"errors"

	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/domain/model"
	"gorm.io/gorm"
)

var ErrDuplicateEmail = errors.New("duplicate active user email")

type UserRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) Create(user *model.User) error {
	err := r.db.Create(user).Error
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return ErrDuplicateEmail
	}
	return err
}

func (r *UserRepository) FindByEmail(email string) (*model.User, error) {
	var user model.User
	result := r.db.Where("email = ?", email).First(&user)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, result.Error
	}
	return &user, nil
}

func (r *UserRepository) FindByID(id string) (*model.User, error) {
	var user model.User
	result := r.db.Where("id = ?", id).First(&user)
	if result.Error != nil {
		return nil, result.Error
	}
	return &user, nil
}

func (r *UserRepository) UpdateByID(userID string, updates map[string]interface{}) error {
	return r.db.Model(&model.User{}).Where("id = ?", userID).Updates(updates).Error
}

// ListAll returns users (with their quota preloaded), newest first, optionally
// filtered by status. An empty status returns all users.
func (r *UserRepository) ListAll(status string) ([]model.User, error) {
	var users []model.User
	q := r.db.Preload("Quota").Order("created_at DESC")
	if status != "" {
		q = q.Where("status = ?", status)
	}
	if err := q.Find(&users).Error; err != nil {
		return nil, err
	}
	return users, nil
}

// CountByStatus returns how many users are in a given status.
func (r *UserRepository) CountByStatus(status string) (int64, error) {
	var n int64
	err := r.db.Model(&model.User{}).Where("status = ?", status).Count(&n).Error
	return n, err
}
