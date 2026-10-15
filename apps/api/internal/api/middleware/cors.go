package middleware

import (
	"net/url"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

func CORS() gin.HandlerFunc {
	allowed := map[string]bool{}
	origins := os.Getenv("CORS_ALLOWED_ORIGINS")
	if origins == "" && (os.Getenv("ENV") == "development" || os.Getenv("ENV") == "test") {
		origins = "http://localhost:4000,http://localhost:5173"
	}
	for _, origin := range strings.Split(origins, ",") {
		if origin = strings.TrimSpace(origin); origin != "" && origin != "*" {
			allowed[origin] = true
		}
	}
	return func(c *gin.Context) {
		c.Writer.Header().Add("Vary", "Origin")
		origin := c.GetHeader("Origin")
		// Same-origin requests (the web app served behind the same host, as
		// with the bundled nginx proxy) are not cross-origin at all.
		if origin != "" && sameOrigin(origin, c.Request.Host) {
			origin = ""
		}
		if origin != "" {
			if !allowed[origin] {
				c.AbortWithStatusJSON(403, gin.H{"error": "origin_not_allowed"})
				return
			}
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept, Cache-Control")
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			c.Header("Access-Control-Expose-Headers", "X-Request-ID, X-Trace-ID, Content-Disposition")
		}

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

func sameOrigin(origin, host string) bool {
	u, err := url.Parse(origin)
	return err == nil && host != "" && strings.EqualFold(u.Host, host)
}
