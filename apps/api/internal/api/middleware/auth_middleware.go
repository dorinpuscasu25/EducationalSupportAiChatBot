package middleware

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/domain/model"
	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/service"
	"github.com/gin-gonic/gin"
)

// AuthMiddlewareJWT validates our own HS256 JWT, loads the user and stores it on
// the gin context. It does NOT gate by account status (see RequireActive).
func AuthMiddlewareJWT(authService *service.AuthService, usersService *service.UsersService) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "authorization header required"})
			c.Abort()
			return
		}
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid authorization format"})
			c.Abort()
			return
		}

		claims, err := authService.ParseClaims(parts[1])
		if err != nil || claims.UserID == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
			c.Abort()
			return
		}

		user, err := usersService.GetUserByID(claims.UserID)
		if err != nil || user == nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "user not provisioned"})
			c.Abort()
			return
		}

		// Reject tokens issued before a password change / "log out everywhere".
		if user.TokenVersion != claims.TokenVersion {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "token_revoked"})
			c.Abort()
			return
		}

		c.Set("user", user)
		c.Set("userID", fmt.Sprint(user.ID))
		c.Next()
	}
}

// RequireActive must run after AuthMiddlewareJWT. It gates resource access by
// account status: pending accounts can authenticate (so the client can show a
// "waiting for activation" screen via /users/me) but cannot use the platform
// until an admin activates them.
func RequireActive() gin.HandlerFunc {
	return func(c *gin.Context) {
		user, ok := currentUser(c)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			c.Abort()
			return
		}
		if !user.IsActive() {
			c.JSON(http.StatusForbidden, gin.H{
				"error":  "account_not_active",
				"status": user.Status,
			})
			c.Abort()
			return
		}
		c.Next()
	}
}

// RequireAdmin must run after AuthMiddlewareJWT. It rejects non-admin users.
func RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		user, ok := currentUser(c)
		if !ok || !user.IsAdmin() {
			c.JSON(http.StatusForbidden, gin.H{"error": "admin access required"})
			c.Abort()
			return
		}
		c.Next()
	}
}

// currentUser extracts the authenticated user set by AuthMiddlewareJWT.
func currentUser(c *gin.Context) (*model.User, bool) {
	v, ok := c.Get("user")
	if !ok {
		return nil, false
	}
	user, ok := v.(*model.User)
	return user, ok
}
