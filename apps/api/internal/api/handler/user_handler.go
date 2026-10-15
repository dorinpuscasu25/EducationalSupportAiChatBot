package handler

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type UserHandler struct {
	userService *service.UsersService
}

func NewUserHandler(userService *service.UsersService) *UserHandler {
	return &UserHandler{userService: userService}
}

type updateProfileRequest struct {
	FirstName *string `json:"first_name"`
	LastName  *string `json:"last_name"`
	Phone     *string `json:"phone"`
	Language  *string `json:"language"`
}

// UpdateMe updates the authenticated user's profile fields.
func (h *UserHandler) UpdateMe(c *gin.Context) {
	userID := c.GetString("userID")
	var req updateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": publicError(c, err)})
		return
	}
	user, err := h.userService.UpdateProfile(userID, service.UpdateProfileInput{
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Phone:     req.Phone,
		Language:  req.Language,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": publicError(c, err)})
		return
	}
	c.JSON(http.StatusOK, user)
}

type changePasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=8"`
}

// ChangePassword updates the authenticated user's password.
func (h *UserHandler) ChangePassword(c *gin.Context) {
	userID := c.GetString("userID")
	var req changePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": publicError(c, err)})
		return
	}
	if err := h.userService.ChangePassword(userID, req.CurrentPassword, req.NewPassword); err != nil {
		switch err.Error() {
		case "invalid_current_password":
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_current_password"})
		case "weak_password":
			c.JSON(http.StatusBadRequest, gin.H{"error": "weak_password"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": publicError(c, err)})
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

type requestEmailChangeRequest struct {
	NewEmail string `json:"new_email" binding:"required,email"`
}

// RequestEmailChange sends a confirmation code to the new email address.
func (h *UserHandler) RequestEmailChange(c *gin.Context) {
	userID := c.GetString("userID")
	var req requestEmailChangeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": publicError(c, err)})
		return
	}
	if err := h.userService.RequestEmailChange(userID, req.NewEmail); err != nil {
		if err.Error() == "email_already_registered" {
			c.JSON(http.StatusConflict, gin.H{"error": "email_already_registered"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": publicError(c, err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true, "new_email": req.NewEmail})
}

type confirmEmailChangeRequest struct {
	Code string `json:"code" binding:"required,len=6"`
}

// ConfirmEmailChange applies the pending email after validating the code.
func (h *UserHandler) ConfirmEmailChange(c *gin.Context) {
	userID := c.GetString("userID")
	var req confirmEmailChangeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": publicError(c, err)})
		return
	}
	user, err := h.userService.ConfirmEmailChange(userID, req.Code)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_or_expired_code"})
		return
	}
	c.JSON(http.StatusOK, user)
}

var allowedAvatarExt = map[string]bool{
	".jpg": true, ".jpeg": true, ".png": true, ".webp": true, ".gif": true,
}

// UploadAvatar accepts a multipart "avatar" file, stores it under uploads/avatars
// and saves the public path on the user.
func (h *UserHandler) UploadAvatar(c *gin.Context) {
	userID := c.GetString("userID")

	fileHeader, err := c.FormFile("avatar")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "avatar file is required"})
		return
	}
	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	if !allowedAvatarExt[ext] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported image format"})
		return
	}
	if fileHeader.Size > 5<<20 { // 5 MB
		c.JSON(http.StatusBadRequest, gin.H{"error": "image too large (max 5MB)"})
		return
	}

	dir := "uploads/avatars"
	if err := os.MkdirAll(dir, 0o755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": publicError(c, err)})
		return
	}
	name := uuid.New().String() + ext
	dest := filepath.Join(dir, name)
	if err := c.SaveUploadedFile(fileHeader, dest); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": publicError(c, err)})
		return
	}

	publicURL := fmt.Sprintf("/uploads/avatars/%s", name)
	user, err := h.userService.SetAvatar(userID, publicURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": publicError(c, err)})
		return
	}
	c.JSON(http.StatusOK, user)
}
