package service

import (
	"fmt"
	"strings"
	"time"

	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/domain/model"
	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/repository"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AdminService struct {
	db           *gorm.DB
	userRepo     *repository.UserRepository
	billingRepo  *repository.BillingRepository
	billingSvc   *BillingService
	emailService *EmailService
	auditRepo    repository.AuditRepository
}

func NewAdminService(db *gorm.DB, userRepo *repository.UserRepository, billingRepo *repository.BillingRepository, billingSvc *BillingService, emailService *EmailService) *AdminService {
	return &AdminService{db: db, userRepo: userRepo, billingRepo: billingRepo, billingSvc: billingSvc, emailService: emailService}
}

// ConfigureAudit enables the audit trail for admin reads of user conversations.
func (s *AdminService) ConfigureAudit(auditRepo repository.AuditRepository) {
	s.auditRepo = auditRepo
}

// UserListItem is a user row in the admin table, with the activity counts that
// make a beta roster readable at a glance.
type UserListItem struct {
	model.User
	SessionCount int64      `json:"session_count"`
	LastActiveAt *time.Time `json:"last_active_at,omitempty"`
}

// ListUsers returns users (with quota), optionally filtered by status.
//
// Session counts come from one grouped query rather than a count per user, so
// the roster stays a constant number of round trips as the beta grows.
func (s *AdminService) ListUsers(status string) ([]UserListItem, error) {
	users, err := s.userRepo.ListAll(status)
	if err != nil {
		return nil, err
	}

	type activity struct {
		UserID       string
		SessionCount int64
		LastActiveAt *time.Time
	}
	var rows []activity
	s.db.Model(&model.Chat{}).
		Select("user_id, count(*) as session_count, max(updated_at) as last_active_at").
		Where("deleted_at IS NULL").
		Group("user_id").
		Scan(&rows)

	byUser := make(map[string]activity, len(rows))
	for _, row := range rows {
		byUser[row.UserID] = row
	}

	items := make([]UserListItem, 0, len(users))
	for _, user := range users {
		found := byUser[user.ID]
		items = append(items, UserListItem{
			User:         user,
			SessionCount: found.SessionCount,
			LastActiveAt: found.LastActiveAt,
		})
	}
	return items, nil
}

func (s *AdminService) GetUser(id string) (*model.User, error) {
	return s.userRepo.FindByID(id)
}

// UserDetail is the full per-user view shown in the admin detail page.
type UserDetail struct {
	User           *model.User        `json:"user"`
	Quota          *model.UserQuota   `json:"quota"`
	Stats          UserStats          `json:"stats"`
	SessionCount   int64              `json:"session_count"`
	TokensTotal    int64              `json:"tokens_total"`
	RecentUsage    []model.UsageEvent `json:"recent_usage"`
	RecentSessions []SessionSummary   `json:"recent_sessions"`
}

// UserStats summarises how a student uses the assistant.
type UserStats struct {
	QuestionCount      int64        `json:"question_count"`
	AnswerCount        int64        `json:"answer_count"`
	QuestionsLast7Days int64        `json:"questions_last_7_days"`
	HelpfulFeedback    int64        `json:"helpful_feedback"`
	ProblemFeedback    int64        `json:"problem_feedback"`
	FirstActiveAt      *time.Time   `json:"first_active_at,omitempty"`
	LastActiveAt       *time.Time   `json:"last_active_at,omitempty"`
	DailyQuestions     []DailyCount `json:"daily_questions"`
}

// DailyCount is the number of questions asked on one calendar day.
type DailyCount struct {
	Day   string `json:"day"` // YYYY-MM-DD
	Count int64  `json:"count"`
}

// activityWindowDays is how far back the per-day activity series goes.
const activityWindowDays = 30

func (s *AdminService) userStats(userID string) UserStats {
	var stats UserStats
	messages := func() *gorm.DB {
		return s.db.Model(&model.ChatMessage{}).
			Joins("JOIN chats ON chats.id = chat_messages.chat_id").
			Where("chats.user_id = ?", userID)
	}
	messages().Where("chat_messages.role = ?", "user").Count(&stats.QuestionCount)
	messages().Where("chat_messages.role = ?", "assistant").Count(&stats.AnswerCount)
	messages().Where("chat_messages.role = ? AND chat_messages.created_at >= ?", "user", time.Now().AddDate(0, 0, -7)).
		Count(&stats.QuestionsLast7Days)
	messages().Where("chat_messages.feedback = ?", "helpful").Count(&stats.HelpfulFeedback)
	messages().Where("chat_messages.feedback IN ?", []string{"not_helpful", "incorrect_source"}).Count(&stats.ProblemFeedback)

	var bounds struct {
		First *time.Time
		Last  *time.Time
	}
	messages().Where("chat_messages.role = ?", "user").
		Select("min(chat_messages.created_at) AS first, max(chat_messages.created_at) AS last").
		Scan(&bounds)
	stats.FirstActiveAt, stats.LastActiveAt = bounds.First, bounds.Last

	since := time.Now().AddDate(0, 0, -(activityWindowDays - 1))
	since = time.Date(since.Year(), since.Month(), since.Day(), 0, 0, 0, 0, since.Location())
	var rows []DailyCount
	messages().Where("chat_messages.role = ? AND chat_messages.created_at >= ?", "user", since).
		Select("to_char(date_trunc('day', chat_messages.created_at), 'YYYY-MM-DD') AS day, count(*) AS count").
		Group("day").
		Scan(&rows)
	byDay := make(map[string]int64, len(rows))
	for _, row := range rows {
		byDay[row.Day] = row.Count
	}
	stats.DailyQuestions = make([]DailyCount, 0, activityWindowDays)
	for i := 0; i < activityWindowDays; i++ {
		day := since.AddDate(0, 0, i).Format("2006-01-02")
		stats.DailyQuestions = append(stats.DailyQuestions, DailyCount{Day: day, Count: byDay[day]})
	}
	return stats
}

// SessionSummary is one conversation as the admin list shows it: enough to see
// what a beta tester actually asked, without opening the conversation.
type SessionSummary struct {
	ID            string    `json:"id"`
	Title         string    `json:"title,omitempty"`
	MessageCount  int64     `json:"message_count"`
	FirstQuestion string    `json:"first_question,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// firstQuestionLimit keeps the preview to a line or two in the table.
const firstQuestionLimit = 240

// listRecentSessions returns a user's latest conversations with the opening
// question of each, which is the clearest signal of what they are testing.
func (s *AdminService) listRecentSessions(userID string, limit int) []SessionSummary {
	var chats []model.Chat
	if err := s.db.
		Where("user_id = ? AND deleted_at IS NULL", userID).
		Order("updated_at DESC").
		Limit(limit).
		Find(&chats).Error; err != nil {
		return nil
	}

	sessions := make([]SessionSummary, 0, len(chats))
	for _, chat := range chats {
		var messageCount int64
		s.db.Model(&model.ChatMessage{}).
			Where("chat_id = ?", chat.ID).
			Count(&messageCount)

		var opening model.ChatMessage
		s.db.
			Where("chat_id = ? AND role = ?", chat.ID, "user").
			Order("created_at ASC").
			First(&opening)

		question := strings.TrimSpace(opening.Content)
		if len([]rune(question)) > firstQuestionLimit {
			question = string([]rune(question)[:firstQuestionLimit]) + "…"
		}

		sessions = append(sessions, SessionSummary{
			ID:            chat.ID,
			Title:         chat.Title,
			MessageCount:  messageCount,
			FirstQuestion: question,
			CreatedAt:     chat.CreatedAt,
			UpdatedAt:     chat.UpdatedAt,
		})
	}
	return sessions
}

// ListUserSessions returns every conversation of a user, newest first.
func (s *AdminService) ListUserSessions(userID string) []SessionSummary {
	return s.listRecentSessions(userID, -1)
}

// GetUserSession returns one of the user's conversations with every message,
// in the same shape the user's own chat endpoint returns, so the admin view
// renders it exactly as the user saw it. Each read lands in the audit trail:
// these are privileged reads of private conversations.
func (s *AdminService) GetUserSession(actorID, userID, chatID string) (*model.Chat, error) {
	var chat model.Chat
	if err := s.db.
		Preload("Messages", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at ASC")
		}).
		Preload("Messages.Attachments").
		Where("id = ? AND user_id = ?", chatID, userID).
		First(&chat).Error; err != nil {
		return nil, err
	}
	if s.auditRepo != nil {
		_ = s.auditRepo.Record(actorID, "chat", chat.ID, "admin_viewed", map[string]string{
			"user_id": userID,
		})
	}
	return &chat, nil
}

// GetUserSessionAttachment returns a file from one of the user's conversations.
func (s *AdminService) GetUserSessionAttachment(userID, chatID, attachmentID string) (*model.ChatAttachment, error) {
	var att model.ChatAttachment
	err := s.db.
		Joins("JOIN chat_messages ON chat_messages.id = chat_attachments.message_id").
		Joins("JOIN chats ON chats.id = chat_messages.chat_id").
		Where("chat_attachments.id = ? AND chats.id = ? AND chats.user_id = ?", attachmentID, chatID, userID).
		First(&att).Error
	if err != nil {
		return nil, err
	}
	return &att, nil
}

// GetUserDetail returns a user with quota, usage and activity counts.
func (s *AdminService) GetUserDetail(id string) (*UserDetail, error) {
	user, err := s.userRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	quota, _ := s.billingRepo.GetQuotaByUserID(id)
	tokensTotal, _ := s.billingRepo.SumTokensByUser(id)
	recent, _ := s.billingRepo.ListRecentUsageByUser(id, 20)

	var sessionCount int64
	s.db.Model(&model.Chat{}).Where("user_id = ? AND deleted_at IS NULL", id).Count(&sessionCount)

	return &UserDetail{
		User:           user,
		Quota:          quota,
		Stats:          s.userStats(id),
		SessionCount:   sessionCount,
		TokensTotal:    tokensTotal,
		RecentUsage:    recent,
		RecentSessions: s.listRecentSessions(id, 20),
	}, nil
}

// SetStatus changes a user's account status (pending|active|suspended).
// Activating a user also ensures a quota row exists.
func (s *AdminService) SetStatus(id, status string) (*model.User, error) {
	if !validStatus(status) {
		return nil, fmt.Errorf("invalid status: %s", status)
	}
	if err := s.updateAccess(id, "status", status); err != nil {
		return nil, err
	}
	if status == model.StatusActive {
		if _, err := s.billingSvc.GetOrCreateQuota(id); err != nil {
			return nil, err
		}
	}
	user, err := s.userRepo.FindByID(id)
	if err == nil && user != nil && status == model.StatusActive && s.emailService != nil {
		_ = s.emailService.SendAccountActivated(user.Email, user.FirstName)
	}
	return user, err
}

// CreateUserInput is the payload for admin-created accounts.
type AdminCreateUserInput struct {
	Email     string
	FirstName string
	LastName  string
	Phone     string
	Password  string
	Role      string
}

// CreateUser provisions an active, pre-verified account (admin action).
func (s *AdminService) CreateUser(in AdminCreateUserInput) (*model.User, error) {
	email := strings.ToLower(strings.TrimSpace(in.Email))
	if existing, err := s.userRepo.FindByEmail(email); err != nil {
		return nil, err
	} else if existing != nil {
		return nil, fmt.Errorf("email_already_registered")
	}
	if err := ValidatePassword(in.Password); err != nil {
		return nil, err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	role := model.RoleUser
	if in.Role == model.RoleAdmin {
		role = model.RoleAdmin
	}
	user := &model.User{
		Email:         email,
		FirstName:     strings.TrimSpace(in.FirstName),
		LastName:      strings.TrimSpace(in.LastName),
		Phone:         strings.TrimSpace(in.Phone),
		Password:      string(hash),
		Active:        true,
		Role:          role,
		Status:        model.StatusActive,
		EmailVerified: true,
		TokenVersion:  1,
	}
	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}
	_, _ = s.billingSvc.GetOrCreateQuota(user.ID)
	return user, nil
}

// SetRole promotes or demotes a user (user|admin).
func (s *AdminService) SetRole(id, role string) (*model.User, error) {
	if role != model.RoleUser && role != model.RoleAdmin {
		return nil, fmt.Errorf("invalid role: %s", role)
	}
	if err := s.updateAccess(id, "role", role); err != nil {
		return nil, err
	}
	return s.userRepo.FindByID(id)
}

// Serialize role/status changes so concurrent demotions cannot remove all admins.
func (s *AdminService) updateAccess(id, field, value string) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("SELECT pg_advisory_xact_lock(72419001)").Error; err != nil {
			return err
		}
		var user model.User
		if err := tx.First(&user, "id = ?", id).Error; err != nil {
			return err
		}
		removesAdmin := user.IsAdmin() && user.IsActive() && ((field == "role" && value != model.RoleAdmin) || (field == "status" && value != model.StatusActive))
		if removesAdmin {
			var count int64
			if err := tx.Model(&model.User{}).Where("role = ? AND status = ?", model.RoleAdmin, model.StatusActive).Count(&count).Error; err != nil {
				return err
			}
			if count <= 1 {
				return fmt.Errorf("last_active_admin")
			}
		}
		return tx.Model(&user).Update(field, value).Error
	})
}

// SetQuota updates the package and monthly token limit for a user.
func (s *AdminService) SetQuota(id, packageName string, monthlyTokenLimit int64) (*model.UserQuota, error) {
	if _, err := s.userRepo.FindByID(id); err != nil {
		return nil, err
	}
	return s.billingSvc.SetQuota(id, packageName, monthlyTokenLimit)
}

// AdminMetrics is a small dashboard summary.
type AdminMetrics struct {
	TotalUsers         int64 `json:"total_users"`
	PendingUsers       int64 `json:"pending_users"`
	ActiveUsers        int64 `json:"active_users"`
	SuspendedUsers     int64 `json:"suspended_users"`
	AssistantResponses int64 `json:"assistant_responses"`
	HelpfulFeedback    int64 `json:"helpful_feedback"`
	ProblemFeedback    int64 `json:"problem_feedback"`
	QuestionsToday     int64 `json:"questions_today"`
	QuestionsLast7Days int64 `json:"questions_last_7_days"`
	KnowledgeDocuments int64 `json:"knowledge_documents"`
}

func (s *AdminService) Metrics() (*AdminMetrics, error) {
	pending, err := s.userRepo.CountByStatus(model.StatusPending)
	if err != nil {
		return nil, err
	}
	active, err := s.userRepo.CountByStatus(model.StatusActive)
	if err != nil {
		return nil, err
	}
	suspended, err := s.userRepo.CountByStatus(model.StatusSuspended)
	if err != nil {
		return nil, err
	}
	var assistantResponses, helpfulFeedback, problemFeedback int64
	var questionsToday, questionsWeek, documents int64
	s.db.Model(&model.ChatMessage{}).
		Where("role = ?", "assistant").
		Count(&assistantResponses)
	s.db.Model(&model.ChatMessage{}).
		Where("feedback = ?", "helpful").
		Count(&helpfulFeedback)
	s.db.Model(&model.ChatMessage{}).
		Where("feedback IN ?", []string{"not_helpful", "incorrect_source"}).
		Count(&problemFeedback)
	now := time.Now()
	s.db.Model(&model.ChatMessage{}).
		Where("role = ? AND created_at >= ?", "user", time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())).
		Count(&questionsToday)
	s.db.Model(&model.ChatMessage{}).
		Where("role = ? AND created_at >= ?", "user", now.AddDate(0, 0, -7)).
		Count(&questionsWeek)
	s.db.Model(&model.KnowledgeDocument{}).
		Where("status = ?", model.DocumentStatusReady).
		Count(&documents)
	return &AdminMetrics{
		TotalUsers:         pending + active + suspended,
		PendingUsers:       pending,
		ActiveUsers:        active,
		SuspendedUsers:     suspended,
		AssistantResponses: assistantResponses,
		HelpfulFeedback:    helpfulFeedback,
		ProblemFeedback:    problemFeedback,
		QuestionsToday:     questionsToday,
		QuestionsLast7Days: questionsWeek,
		KnowledgeDocuments: documents,
	}, nil
}

func validStatus(s string) bool {
	return s == model.StatusPending || s == model.StatusActive || s == model.StatusSuspended
}
