package response

import (
	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/domain/model"
	"time"
)

// LoginResponse represents the response from a successful login
type LoginResponse struct {
	Token     string      `json:"token" example:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`
	ExpiresAt time.Time   `json:"expires_at" example:"2023-01-01T12:00:00Z"`
	User      *model.User `json:"user"`
}
