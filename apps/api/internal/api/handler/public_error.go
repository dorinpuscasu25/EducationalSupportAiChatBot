package handler

import (
	"errors"
	"log"

	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/service"
	"github.com/gin-gonic/gin"
)

// Return stable public codes, never database, provider or filesystem messages.
func publicError(c *gin.Context, err error) string {
	if err == nil {
		return "request_failed"
	}
	var attachmentErr service.ErrAttachment
	if errors.As(err, &attachmentErr) {
		return attachmentErr.Error()
	}
	switch err.Error() {
	case "last_active_admin":
		return "Ultimul administrator activ nu poate fi suspendat sau retrogradat."
	case "invalid email or password", "invalid_credentials":
		return "invalid_credentials"
	case "email_not_verified", "email_already_registered", "invalid_or_expired_code", "too_many_attempts", "weak_password", "quota_exceeded", "forbidden", "message_too_long", "sync_already_running":
		return err.Error()
	}
	log.Printf("request_failed request_id=%s error=%v", c.Writer.Header().Get("X-Request-ID"), err)
	switch statusFromErr(err) {
	case 400:
		return "Datele introduse sunt incomplete sau invalide."
	case 403:
		return "Nu ai acces la această resursă."
	case 404:
		return "Resursa nu este disponibilă."
	case 409:
		return "Operațiunea intră în conflict cu datele existente."
	case 402:
		return "Limita de utilizare a fost atinsă."
	default:
		return "Serviciul nu este disponibil momentan. Încearcă din nou. Referință: " + c.Writer.Header().Get("X-Request-ID")
	}
}
