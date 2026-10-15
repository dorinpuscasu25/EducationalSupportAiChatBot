package model

import "time"

// UserQuota holds the monthly token allowance for a user. A limit of 0 means
// unlimited; an admin can set a package/limit per student.
type UserQuota struct {
	ID                string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	UserID            string    `gorm:"type:uuid;uniqueIndex;not null" json:"user_id"`
	PackageName       string    `gorm:"size:100" json:"package_name"`
	MonthlyTokenLimit int64     `gorm:"not null;default:0" json:"monthly_token_limit"`
	TokensUsed        int64     `gorm:"not null;default:0" json:"tokens_used"`
	PeriodStart       time.Time `json:"period_start"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

// Remaining returns the tokens left in the current period (never negative).
func (q *UserQuota) Remaining() int64 {
	if q.MonthlyTokenLimit <= 0 {
		return 0
	}
	r := q.MonthlyTokenLimit - q.TokensUsed
	if r < 0 {
		return 0
	}
	return r
}

// UsageEvent is an audit record of token consumption per LLM call.
type UsageEvent struct {
	ID               string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	UserID           string    `gorm:"type:uuid;index;not null" json:"user_id"`
	ChatID           *string   `gorm:"type:uuid;index" json:"chat_id,omitempty"`
	Model            string    `gorm:"size:100" json:"model"`
	PromptTokens     int64     `json:"prompt_tokens"`
	CompletionTokens int64     `json:"completion_tokens"`
	TotalTokens      int64     `json:"total_tokens"`
	CreatedAt        time.Time `gorm:"index" json:"created_at"`
}
