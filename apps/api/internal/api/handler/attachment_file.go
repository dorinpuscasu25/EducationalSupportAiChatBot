package handler

import (
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/domain/model"
	"github.com/gin-gonic/gin"
)

// privateFilePath resolves a stored path and requires it to stay inside the
// uploads folder, even though it comes from the database.
func privateFilePath(stored string) (string, error) {
	root, err := filepath.Abs("uploads")
	if err != nil {
		return "", err
	}
	if root, err = filepath.EvalSymlinks(root); err != nil {
		return "", err
	}
	path, err := filepath.Abs(stored)
	if err != nil {
		return "", err
	}
	if path, err = filepath.EvalSymlinks(path); err != nil {
		return "", err
	}
	rel, err := filepath.Rel(root, path)
	if err != nil || rel == "." || rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) {
		return "", os.ErrPermission
	}
	return path, nil
}

// ServeAttachment sends a chat attachment. Images are served inline with their
// real type so the chat can preview them; everything else downloads.
func ServeAttachment(c *gin.Context, att *model.ChatAttachment) {
	path, err := privateFilePath(att.StoragePath)
	if err != nil {
		c.Status(http.StatusNotFound)
		return
	}
	file, err := os.Open(path)
	if err != nil {
		c.Status(http.StatusNotFound)
		return
	}
	defer file.Close()
	info, err := file.Stat()
	if err != nil || !info.Mode().IsRegular() {
		c.Status(http.StatusNotFound)
		return
	}
	disposition, contentType := "attachment", "application/octet-stream"
	if strings.HasPrefix(att.MimeType, "image/") {
		disposition, contentType = "inline", att.MimeType
	}
	c.Header("Content-Type", contentType)
	c.Header("Content-Disposition", mime.FormatMediaType(disposition, map[string]string{"filename": filepath.Base(att.FileName)}))
	c.Header("Content-Security-Policy", "sandbox")
	c.Header("Cache-Control", "private, no-store")
	http.ServeContent(c.Writer, c.Request, "", info.ModTime(), file)
}
