package middleware

import (
	"github.com/gin-gonic/gin"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestCORSExactOriginsAndBearerHeaders(t *testing.T) {
	t.Setenv("CORS_ALLOWED_ORIGINS", "https://academie.example.com")
	r := gin.New()
	r.Use(CORS())
	r.GET("/", func(c *gin.Context) { c.Status(200) })
	for _, tc := range []struct {
		origin string
		code   int
	}{{"https://academie.example.com", 200}, {"https://academie.example.com.evil.test", 403}, {"null", 403}, {"", 200}} {
		w := httptest.NewRecorder()
		req := httptest.NewRequest("GET", "/", nil)
		req.Header.Set("Origin", tc.origin)
		r.ServeHTTP(w, req)
		if w.Code != tc.code {
			t.Fatalf("%s: %d", tc.origin, w.Code)
		}
		if w.Header().Get("Access-Control-Allow-Credentials") != "" {
			t.Fatal("unnecessary cookie credentials")
		}
	}
}

func TestSameOriginRequestsPassWithoutAllowList(t *testing.T) {
	t.Setenv("CORS_ALLOWED_ORIGINS", "https://academie.example.com")
	r := gin.New()
	r.Use(CORS())
	r.POST("/", func(c *gin.Context) { c.Status(200) })
	req := httptest.NewRequest("POST", "http://platform.test:8080/", nil)
	req.Header.Set("Origin", "http://platform.test:8080")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != 200 {
		t.Fatalf("same origin rejected: %d", w.Code)
	}
}

func TestMalformedMultipartRejectedBeforeHandler(t *testing.T) {
	r := gin.New()
	r.Use(LimitUploads())
	r.POST("/", func(c *gin.Context) { t.Error("handler reached"); c.Status(200) })
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader("bad form"))
	req.Header.Set("Content-Type", "multipart/form-data; boundary=foo")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != 413 {
		t.Fatalf("got %d", w.Code)
	}
}
