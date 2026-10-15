package handler

import (
	"fmt"
	"net/http"
	"time"

	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/domain/model"
	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/service"
	"github.com/gin-gonic/gin"
)

type AdminHandler struct {
	adminSvc    *service.AdminService
	authSvc     *service.AuthService
	settingsSvc *service.SettingsService
}

func NewAdminHandler(
	adminSvc *service.AdminService,
	authSvc *service.AuthService,
	settingsSvc *service.SettingsService,
) *AdminHandler {
	return &AdminHandler{adminSvc: adminSvc, authSvc: authSvc, settingsSvc: settingsSvc}
}

// ListUsers returns all users, optionally filtered by ?status=pending|active|suspended.
func (h *AdminHandler) ListUsers(c *gin.Context) {
	users, err := h.adminSvc.ListUsers(c.Query("status"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": publicError(c, err)})
		return
	}
	c.JSON(http.StatusOK, users)
}

func (h *AdminHandler) GetUser(c *gin.Context) {
	user, err := h.adminSvc.GetUser(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": publicError(c, err)})
		return
	}
	c.JSON(http.StatusOK, user)
}

// GetUserDetail returns the user with quota, usage totals and activity counts.
func (h *AdminHandler) GetUserDetail(c *gin.Context) {
	detail, err := h.adminSvc.GetUserDetail(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": publicError(c, err)})
		return
	}
	c.JSON(http.StatusOK, detail)
}

// ListUserSessions returns all of a user's conversations.
func (h *AdminHandler) ListUserSessions(c *gin.Context) {
	c.JSON(http.StatusOK, h.adminSvc.ListUserSessions(c.Param("id")))
}

// GetUserSession returns one of a user's conversations with its full history.
func (h *AdminHandler) GetUserSession(c *gin.Context) {
	actorID, _ := c.Get("userID")
	actor, _ := actorID.(string)
	chat, err := h.adminSvc.GetUserSession(actor, c.Param("id"), c.Param("chatId"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": publicError(c, err)})
		return
	}
	c.JSON(http.StatusOK, chat)
}

// GetUserSessionAttachment serves a file a student attached in a conversation.
func (h *AdminHandler) GetUserSessionAttachment(c *gin.Context) {
	att, err := h.adminSvc.GetUserSessionAttachment(c.Param("id"), c.Param("chatId"), c.Param("attachmentId"))
	if err != nil {
		c.Status(http.StatusNotFound)
		return
	}
	ServeAttachment(c, att)
}

// ExportConversations downloads every conversation (or ?user_id=... only) as a
// Markdown file with numbered conversations and labelled user/assistant turns.
func (h *AdminHandler) ExportConversations(c *gin.Context) {
	actorID, _ := c.Get("userID")
	actor, _ := actorID.(string)
	userID := c.Query("user_id")

	filename := fmt.Sprintf("conversatii-%s.md", time.Now().UTC().Format("2006-01-02"))
	c.Header("Content-Type", "text/markdown; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	c.Status(http.StatusOK)
	if err := h.adminSvc.ExportConversations(actor, userID, c.Writer); err != nil {
		// Headers are already sent; leave a visible marker in the file instead.
		fmt.Fprintf(c.Writer, "\n\n[EXPORT ÎNTRERUPT: %s]\n", publicError(c, err))
	}
}

func (h *AdminHandler) Activate(c *gin.Context) {
	user, err := h.adminSvc.SetStatus(c.Param("id"), "active")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": publicError(c, err)})
		return
	}
	c.JSON(http.StatusOK, user)
}

func (h *AdminHandler) Suspend(c *gin.Context) {
	user, err := h.adminSvc.SetStatus(c.Param("id"), "suspended")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": publicError(c, err)})
		return
	}
	c.JSON(http.StatusOK, user)
}

type setRoleRequest struct {
	Role string `json:"role" binding:"required"`
}

func (h *AdminHandler) SetRole(c *gin.Context) {
	var req setRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": publicError(c, err)})
		return
	}
	user, err := h.adminSvc.SetRole(c.Param("id"), req.Role)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": publicError(c, err)})
		return
	}
	c.JSON(http.StatusOK, user)
}

type setQuotaRequest struct {
	PackageName       string `json:"package_name"`
	MonthlyTokenLimit int64  `json:"monthly_token_limit"`
}

func (h *AdminHandler) SetQuota(c *gin.Context) {
	var req setQuotaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": publicError(c, err)})
		return
	}
	quota, err := h.adminSvc.SetQuota(c.Param("id"), req.PackageName, req.MonthlyTokenLimit)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": publicError(c, err)})
		return
	}
	c.JSON(http.StatusOK, quota)
}

// SendReset triggers an admin-initiated password reset email for a user.
func (h *AdminHandler) SendReset(c *gin.Context) {
	if err := h.authSvc.SendResetForUser(c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": publicError(c, err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

type adminCreateUserRequest struct {
	Email     string `json:"email" binding:"required,email"`
	FirstName string `json:"first_name" binding:"required"`
	LastName  string `json:"last_name" binding:"required"`
	Phone     string `json:"phone"`
	Password  string `json:"password" binding:"required,min=8"`
	Role      string `json:"role"`
}

// CreateUser provisions an active account directly (admin action).
func (h *AdminHandler) CreateUser(c *gin.Context) {
	var req adminCreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": publicError(c, err)})
		return
	}
	user, err := h.adminSvc.CreateUser(service.AdminCreateUserInput{
		Email:     req.Email,
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Phone:     req.Phone,
		Password:  req.Password,
		Role:      req.Role,
	})
	if err != nil {
		if err.Error() == "email_already_registered" {
			c.JSON(http.StatusConflict, gin.H{"error": "email_already_registered"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": publicError(c, err)})
		return
	}
	c.JSON(http.StatusCreated, user)
}

func (h *AdminHandler) Metrics(c *gin.Context) {
	m, err := h.adminSvc.Metrics()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": publicError(c, err)})
		return
	}
	c.JSON(http.StatusOK, m)
}

// Settings returns the admin-controlled switches.
func (h *AdminHandler) Settings(c *gin.Context) {
	c.JSON(http.StatusOK, h.settingsSvc.All())
}

type updateSettingsRequest struct {
	AutoActivateUsers *bool `json:"auto_activate_users"`
}

// UpdateSettings changes one or more switches. Fields left out are untouched,
// so a caller cannot reset a setting it does not know about.
func (h *AdminHandler) UpdateSettings(c *gin.Context) {
	var request updateSettingsRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	actorID, _ := c.Get("userID")
	actor, _ := actorID.(string)

	if request.AutoActivateUsers != nil {
		if err := h.settingsSvc.SetBool(
			model.SettingAutoActivateUsers,
			*request.AutoActivateUsers,
			actor,
		); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": publicError(c, err)})
			return
		}
	}
	c.JSON(http.StatusOK, h.settingsSvc.All())
}
