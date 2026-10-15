package service

import (
	"errors"
	"time"

	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/domain/model"
	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/repository"
)

// ErrQuotaExceeded is returned when a user has consumed their monthly token
// allowance. Handlers map this to HTTP 402.
var ErrQuotaExceeded = errors.New("quota_exceeded")

type BillingService struct {
	repo *repository.BillingRepository
}

func NewBillingService(repo *repository.BillingRepository) *BillingService {
	return &BillingService{repo: repo}
}

// GetOrCreateQuota returns the user's quota, creating a zero-limit row if none
// exists. A MonthlyTokenLimit of 0 means "unlimited" (no enforcement).
func (s *BillingService) GetOrCreateQuota(userID string) (*model.UserQuota, error) {
	q, err := s.repo.GetQuotaByUserID(userID)
	if err != nil {
		return nil, err
	}
	if q != nil {
		s.maybeResetMonthly(q)
		return q, nil
	}
	q = &model.UserQuota{
		UserID:      userID,
		PeriodStart: startOfMonth(time.Now()),
	}
	if err := s.repo.CreateQuota(q); err != nil {
		return nil, err
	}
	return q, nil
}

// CheckQuota verifies the user still has tokens left for this period. It rolls
// over the monthly counter when a new month has started.
func (s *BillingService) CheckQuota(userID string) error {
	q, err := s.GetOrCreateQuota(userID)
	if err != nil {
		return err
	}
	if q.MonthlyTokenLimit <= 0 {
		return nil // unlimited
	}
	if q.TokensUsed >= q.MonthlyTokenLimit {
		return ErrQuotaExceeded
	}
	return nil
}

// RecordUsage persists a usage event and increments the running token counter.
// Best-effort: a failure here must not fail the user's chat, so callers should
// log but not propagate the error.
func (s *BillingService) RecordUsage(userID string, chatID *string, llmModel string, usage LLMUsage) error {
	if usage.TotalTokens <= 0 {
		usage.TotalTokens = usage.PromptTokens + usage.CompletionTokens
	}
	if usage.TotalTokens <= 0 {
		return nil
	}
	_ = s.repo.CreateUsageEvent(&model.UsageEvent{
		UserID:           userID,
		ChatID:           chatID,
		Model:            llmModel,
		PromptTokens:     usage.PromptTokens,
		CompletionTokens: usage.CompletionTokens,
		TotalTokens:      usage.TotalTokens,
	})
	return s.repo.AddTokens(userID, usage.TotalTokens)
}

// SetQuota upserts the package/limit for a user (admin action).
func (s *BillingService) SetQuota(userID, packageName string, monthlyTokenLimit int64) (*model.UserQuota, error) {
	existing, err := s.repo.GetQuotaByUserID(userID)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		q := &model.UserQuota{
			UserID:            userID,
			PackageName:       packageName,
			MonthlyTokenLimit: monthlyTokenLimit,
			PeriodStart:       startOfMonth(time.Now()),
		}
		if err := s.repo.CreateQuota(q); err != nil {
			return nil, err
		}
		return q, nil
	}
	updates := map[string]interface{}{
		"package_name":        packageName,
		"monthly_token_limit": monthlyTokenLimit,
	}
	if err := s.repo.UpdateQuota(userID, updates); err != nil {
		return nil, err
	}
	return s.repo.GetQuotaByUserID(userID)
}

// maybeResetMonthly resets the consumed counter when the stored period predates
// the current calendar month.
func (s *BillingService) maybeResetMonthly(q *model.UserQuota) {
	cur := startOfMonth(time.Now())
	if q.PeriodStart.Before(cur) {
		_ = s.repo.UpdateQuota(q.UserID, map[string]interface{}{
			"tokens_used":  0,
			"period_start": cur,
		})
		q.TokensUsed = 0
		q.PeriodStart = cur
	}
}

func startOfMonth(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, t.Location())
}
