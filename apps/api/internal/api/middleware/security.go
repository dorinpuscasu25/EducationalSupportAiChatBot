package middleware

import (
	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"net/http"
	"strings"
)

func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Request-ID", uuid.NewString())
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("Referrer-Policy", "no-referrer")
		c.Header("X-Frame-Options", "DENY")
		c.Header("Cache-Control", "no-store")
		c.Next()
	}
}

// LimitUploads bounds request bodies and checks file counts before a form is
// parsed by a handler: a single avatar on the profile endpoint, up to
// service.MaxAttachments files with a chat question. The files' content is
// validated by the handlers.
func LimitUploads() gin.HandlerFunc {
	return func(c *gin.Context) {
		path := c.Request.URL.Path
		chat := strings.HasPrefix(path, "/api/chats/") && strings.HasSuffix(path, "/stream")
		limit := int64(8 << 20)
		if chat {
			limit = int64(service.MaxAttachments)*service.MaxAttachmentBytes + (2 << 20)
		}
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, limit)
		if !strings.HasPrefix(c.ContentType(), "multipart/form-data") {
			c.Next()
			return
		}
		err := c.Request.ParseMultipartForm(16 << 20)
		if c.Request.MultipartForm != nil {
			defer c.Request.MultipartForm.RemoveAll()
		}
		if err != nil {
			c.AbortWithStatusJSON(413, gin.H{"error": "Cererea depășește limita permisă ori formatul este invalid."})
			return
		}
		avatar := strings.HasSuffix(path, "/users/me/avatar")
		count := 0
		for _, files := range c.Request.MultipartForm.File {
			for _, file := range files {
				count++
				switch {
				case avatar && count == 1:
					if err := service.ValidateAvatar(file); err != nil {
						c.AbortWithStatusJSON(400, gin.H{"error": err.Error()})
						return
					}
				case chat && count <= service.MaxAttachments:
				default:
					c.AbortWithStatusJSON(400, gin.H{"error": "Prea multe fișiere sau încărcare nepermisă aici."})
					return
				}
			}
		}
		c.Next()
	}
}
