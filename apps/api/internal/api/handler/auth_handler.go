package handler

import (
	"errors"
	"net/http"

	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/api/request"
	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/service"
	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	authService *service.AuthService
	userService *service.UsersService
}

func NewAuthHandler(authService *service.AuthService, userService *service.UsersService) *AuthHandler {
	return &AuthHandler{authService: authService, userService: userService}
}

// Register creates a pending account and emails a confirmation code.
func (h *AuthHandler) Register(c *gin.Context) {
	var req request.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": publicError(c, err)})
		return
	}

	_, err := h.authService.Register(service.RegisterInput{
		Email:     req.Email,
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Phone:     req.Phone,
		Password:  req.Password,
	})
	if err != nil {
		switch {
		case errors.Is(err, service.ErrEmailTaken):
			c.JSON(http.StatusConflict, gin.H{"error": "email_already_registered"})
		case errors.Is(err, service.ErrWeakPassword):
			c.JSON(http.StatusBadRequest, gin.H{"error": "weak_password"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": publicError(c, err)})
		}
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"ok":      true,
		"email":   req.Email,
		"message": "verification_code_sent",
	})
}

// VerifyEmail validates the code and returns a JWT (the user is logged in).
func (h *AuthHandler) VerifyEmail(c *gin.Context) {
	var req request.VerifyEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": publicError(c, err)})
		return
	}
	resp, err := h.authService.VerifyEmail(req.Email, req.Code)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_or_expired_code"})
		return
	}
	c.JSON(http.StatusOK, resp)
}

// ResendCode re-sends the confirmation code.
func (h *AuthHandler) ResendCode(c *gin.Context) {
	var req request.ResendCodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": publicError(c, err)})
		return
	}
	_ = h.authService.ResendCode(req.Email)
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ForgotPassword emails a reset code (always returns ok, no enumeration).
func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var req request.ForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": publicError(c, err)})
		return
	}
	_ = h.authService.ForgotPassword(req.Email)
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ResetPassword sets a new password from a valid reset code.
func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var req request.ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": publicError(c, err)})
		return
	}
	err := h.authService.ResetPassword(req.Email, req.Code, req.NewPassword)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrWeakPassword):
			c.JSON(http.StatusBadRequest, gin.H{"error": "weak_password"})
		case errors.Is(err, service.ErrTooManyAttempts):
			c.JSON(http.StatusTooManyRequests, gin.H{"error": "too_many_attempts"})
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_or_expired_code"})
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// Login authenticates with email + password.
func (h *AuthHandler) Login(c *gin.Context) {
	var req request.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": publicError(c, err)})
		return
	}

	resp, err := h.authService.Login(req.Email, req.Password)
	if err != nil {
		if errors.Is(err, service.ErrEmailNotVerified) {
			c.JSON(http.StatusForbidden, gin.H{"error": "email_not_verified"})
			return
		}
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid_credentials"})
		return
	}
	c.JSON(http.StatusOK, resp)
}

// GetMe returns the authenticated user.
func (h *AuthHandler) GetMe(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}
	user, err := h.userService.GetUserByID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": publicError(c, err)})
		return
	}
	c.JSON(http.StatusOK, user)
}
