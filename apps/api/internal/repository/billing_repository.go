package repository

import (
	"errors"

	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/domain/model"
	"gorm.io/gorm"
)

type BillingRepository struct {
	db *gorm.DB
}

func NewBillingRepository(db *gorm.DB) *BillingRepository {
	return &BillingRepository{db: db}
}

// GetQuotaByUserID returns the quota row for a user, or nil if none exists yet.
func (r *BillingRepository) GetQuotaByUserID(userID string) (*model.UserQuota, error) {
	var q model.UserQuota
	err := r.db.Where("user_id = ?", userID).First(&q).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &q, nil
}

func (r *BillingRepository) CreateQuota(q *model.UserQuota) error {
	return r.db.Create(q).Error
}

func (r *BillingRepository) UpdateQuota(userID string, updates map[string]interface{}) error {
	return r.db.Model(&model.UserQuota{}).Where("user_id = ?", userID).Updates(updates).Error
}

// AddTokens atomically increments the used-token counter for a user.
func (r *BillingRepository) AddTokens(userID string, tokens int64) error {
	return r.db.Model(&model.UserQuota{}).
		Where("user_id = ?", userID).
		UpdateColumn("tokens_used", gorm.Expr("tokens_used + ?", tokens)).Error
}

func (r *BillingRepository) CreateUsageEvent(e *model.UsageEvent) error {
	return r.db.Create(e).Error
}

// SumTokensByUser returns the all-time total tokens consumed by a user.
func (r *BillingRepository) SumTokensByUser(userID string) (int64, error) {
	var total int64
	err := r.db.Model(&model.UsageEvent{}).
		Where("user_id = ?", userID).
		Select("COALESCE(SUM(total_tokens),0)").Scan(&total).Error
	return total, err
}

// ListRecentUsageByUser returns the most recent usage events for a user.
func (r *BillingRepository) ListRecentUsageByUser(userID string, limit int) ([]model.UsageEvent, error) {
	var events []model.UsageEvent
	err := r.db.Where("user_id = ?", userID).
		Order("created_at DESC").Limit(limit).Find(&events).Error
	return events, err
}
