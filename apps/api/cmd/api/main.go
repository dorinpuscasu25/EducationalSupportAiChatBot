package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/api/handler"
	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/api/router"
	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/database"
	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/knowledge"
	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/repository"
	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/service"
	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/pkg/logger"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"go.uber.org/zap"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Printf("Warning: .env file not found or cannot be loaded. Using environment variables.")
	}
	env := os.Getenv("ENV")
	if env == "" {
		env = "development"
	}
	logger.Init(env)
	defer logger.Sync()

	logger.Info("Starting application", zap.String("environment", env))
	if err := service.ValidateSecurityConfig(); err != nil {
		logger.Fatal("Invalid security configuration", zap.Error(err))
	}
	if env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	if env != "development" && env != "test" && !service.EmailConfigured() {
		logger.Warn("No email provider (RESEND_API_KEY or SMTP_HOST): verification and reset codes are only written to the API log")
	}

	embedder := knowledge.NewEmbedderFromEnv()
	db, err := database.SetupDB(embedder.Dim())
	if err != nil {
		logger.Fatal("Failed to setup database", zap.Error(err))
	}
	database.BootstrapAdmin(db)

	userRepo := repository.NewUserRepository(db)
	chatRepo := repository.NewChatRepository(db)
	auditRepo := repository.NewAuditRepository(db)
	billingRepo := repository.NewBillingRepository(db)

	emailService := service.NewEmailService()
	settingsService := service.NewSettingsService(db)
	authService := service.NewAuthService(userRepo, emailService, settingsService)
	usersService := service.NewUsersService(db, userRepo, emailService)
	billingService := service.NewBillingService(billingRepo)
	adminService := service.NewAdminService(db, userRepo, billingRepo, billingService, emailService)
	adminService.ConfigureAudit(auditRepo)

	llmSvc, err := service.NewLLMService()
	if err != nil {
		logger.Fatal("Failed to init LLM service", zap.Error(err))
	}
	if llmSvc.Demo() {
		logger.Warn("OPENAI_API_KEY is not set: the chat runs in demo mode and shows retrieved passages only")
	}
	if !embedder.Enabled() {
		logger.Warn("Embeddings disabled: search uses full-text only")
	}

	searcher := knowledge.NewSearcher(db, embedder)
	indexer := knowledge.NewIndexer(db, embedder, documentsDir())
	chatService := service.NewChatService(chatRepo, searcher, llmSvc, billingService)

	startKnowledgeSync(indexer)

	r := router.SetupRouter(authService, usersService, router.Handlers{
		Auth:      handler.NewAuthHandler(authService, usersService),
		User:      handler.NewUserHandler(usersService),
		Chat:      handler.NewChatHandler(chatService),
		Admin:     handler.NewAdminHandler(adminService, authService, settingsService),
		Knowledge: handler.NewKnowledgeHandler(db, indexer, searcher, embedder),
		Readiness: handler.Readiness(db),
	})

	port := os.Getenv("SERVER_PORT")
	if port == "" {
		port = "3380"
	}
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		logger.Info("Server starting", zap.String("port", port))
		if err := r.Run(":" + port); err != nil {
			logger.Fatal("Failed to start server", zap.Error(err))
		}
	}()
	<-quit
	logger.Info("Server shutdown complete")
}

func documentsDir() string {
	if dir := os.Getenv("DOCUMENTS_DIR"); dir != "" {
		return dir
	}
	return "../../documents"
}

// startKnowledgeSync indexes the documents folder at startup and, when
// KNOWLEDGE_SYNC_INTERVAL is set (e.g. "30m"), periodically afterwards.
func startKnowledgeSync(indexer *knowledge.Indexer) {
	if os.Getenv("KNOWLEDGE_SYNC_ON_START") != "false" {
		if err := indexer.StartAsync(false); err != nil {
			logger.Warn("Knowledge sync not started", zap.Error(err))
		}
	}
	interval, err := time.ParseDuration(os.Getenv("KNOWLEDGE_SYNC_INTERVAL"))
	if err != nil || interval <= 0 {
		return
	}
	go func() {
		for range time.Tick(interval) {
			_ = indexer.StartAsync(false)
		}
	}()
}
