package router

import (
	"os"
	"strconv"
	"time"

	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/api/handler"
	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/api/middleware"
	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/service"
	"github.com/gin-gonic/gin"
)

type Handlers struct {
	Auth      *handler.AuthHandler
	User      *handler.UserHandler
	Chat      *handler.ChatHandler
	Admin     *handler.AdminHandler
	Knowledge *handler.KnowledgeHandler
	Readiness gin.HandlerFunc
}

func SetupRouter(authService *service.AuthService, userService *service.UsersService, h Handlers) *gin.Engine {
	r := gin.New()
	r.Use(gin.Recovery(), middleware.SecurityHeaders(), middleware.CORS())

	// Uploaded profile pictures.
	r.Static("/uploads/avatars", "./uploads/avatars")

	public := r.Group("/api")
	{
		public.GET("/health", func(c *gin.Context) { c.JSON(200, gin.H{"status": "ok"}) })
		public.GET("/readiness", h.Readiness)
		auth := public.Group("/auth")
		{
			auth.POST("/register", middleware.RateLimit(15, time.Hour), h.Auth.Register)
			auth.POST("/verify-email", middleware.RateLimit(20, 15*time.Minute), h.Auth.VerifyEmail)
			auth.POST("/resend-code", middleware.RateLimit(5, time.Hour), h.Auth.ResendCode)
			auth.POST("/login", middleware.RateLimit(10, time.Minute), h.Auth.Login)
			auth.POST("/forgot-password", middleware.RateLimit(5, time.Hour), h.Auth.ForgotPassword)
			auth.POST("/reset-password", middleware.RateLimit(20, 15*time.Minute), h.Auth.ResetPassword)
		}
	}

	// Profile self-service works while an account still waits for approval, so
	// a pending student can see their status.
	authed := r.Group("/api")
	authed.Use(middleware.AuthMiddlewareJWT(authService, userService), middleware.LimitUploads())
	{
		users := authed.Group("/users")
		users.GET("/me", h.Auth.GetMe)
		users.PATCH("/me", h.User.UpdateMe)
		users.POST("/me/password", h.User.ChangePassword)
		users.POST("/me/avatar", h.User.UploadAvatar)
		users.POST("/me/email/request", h.User.RequestEmailChange)
		users.POST("/me/email/confirm", h.User.ConfirmEmailChange)
	}

	// Everything else requires an account approved by an admin.
	protected := r.Group("/api")
	protected.Use(middleware.AuthMiddlewareJWT(authService, userService), middleware.RequireActive(), middleware.LimitUploads())
	{
		chats := protected.Group("/chats")
		chats.Use(middleware.RateLimitUser(envInt("CHAT_RATE_LIMIT_PER_MINUTE", 20), time.Minute))
		chats.GET("", h.Chat.ListChats)
		chats.POST("/start/stream", h.Chat.StartChatStream)
		chats.GET("/:chatId", h.Chat.GetChat)
		chats.DELETE("/:chatId", h.Chat.DeleteChat)
		chats.POST("/:chatId/messages/stream", h.Chat.StreamMessage)
		chats.POST("/:chatId/messages/:messageId/feedback", h.Chat.SubmitFeedback)
		chats.GET("/:chatId/attachments/:attachmentId", h.Chat.DownloadAttachment)

		admin := protected.Group("/admin")
		admin.Use(middleware.RequireAdmin())
		admin.GET("/metrics", h.Admin.Metrics)
		admin.GET("/settings", h.Admin.Settings)
		admin.POST("/settings", h.Admin.UpdateSettings)
		admin.GET("/users", h.Admin.ListUsers)
		admin.POST("/users", h.Admin.CreateUser)
		admin.GET("/conversations/export", h.Admin.ExportConversations)
		admin.GET("/users/:id", h.Admin.GetUser)
		admin.GET("/users/:id/detail", h.Admin.GetUserDetail)
		admin.GET("/users/:id/sessions", h.Admin.ListUserSessions)
		admin.GET("/users/:id/sessions/:chatId", h.Admin.GetUserSession)
		admin.GET("/users/:id/sessions/:chatId/attachments/:attachmentId", h.Admin.GetUserSessionAttachment)
		admin.POST("/users/:id/activate", h.Admin.Activate)
		admin.POST("/users/:id/suspend", h.Admin.Suspend)
		admin.POST("/users/:id/role", h.Admin.SetRole)
		admin.POST("/users/:id/quota", h.Admin.SetQuota)
		admin.POST("/users/:id/send-reset", h.Admin.SendReset)
		admin.GET("/knowledge", h.Knowledge.List)
		admin.POST("/knowledge/sync", h.Knowledge.Sync)
		admin.GET("/knowledge/search", h.Knowledge.Search)
	}

	return r
}

// envInt reads a positive limit from the environment, keeping the default when
// the variable is missing or invalid.
func envInt(name string, fallback int) int {
	if raw := os.Getenv(name); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 {
			return parsed
		}
	}
	return fallback
}
