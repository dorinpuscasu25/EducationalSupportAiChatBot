package service

import (
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/domain/model"
	"gorm.io/gorm"
)

// exportBatchSize bounds how many conversations (with their messages) sit in
// memory at once while the export is written out.
const exportBatchSize = 100

// ExportConversations writes every conversation (optionally only one user's)
// as a single Markdown document meant to be handed to an AI for analysis:
// each conversation is numbered and delimited, and every message is labelled
// unambiguously as coming from the user or from the assistant.
//
// Like GetUserSession, this is a privileged read of private conversations, so
// it lands in the audit trail.
func (s *AdminService) ExportConversations(actorID, userID string, w io.Writer) error {
	scope := func(db *gorm.DB) *gorm.DB {
		if userID != "" {
			return db.Where("user_id = ?", userID)
		}
		return db
	}

	var total int64
	if err := s.db.Model(&model.Chat{}).Scopes(scope).Count(&total).Error; err != nil {
		return err
	}

	fmt.Fprintf(w, "# Export conversații — Asistent Academie\n\n")
	fmt.Fprintf(w, "- Generat: %s\n", time.Now().UTC().Format("2006-01-02 15:04 UTC"))
	fmt.Fprintf(w, "- Număr conversații: %d\n", total)
	fmt.Fprintf(w, "- Structură: fiecare conversație începe cu `## CONVERSAȚIA N` și se încheie cu `=== SFÂRȘIT CONVERSAȚIA N ===`.\n")
	fmt.Fprintf(w, "  Fiecare mesaj începe cu `### [UTILIZATOR]` (întrebarea omului) sau `### [ASISTENT AI]` (răspunsul generat).\n\n")

	// Paged by offset rather than FindInBatches, which pages by primary key:
	// ids are random UUIDs, and conversations should come out in time order.
	n := 0
	for offset := 0; ; offset += exportBatchSize {
		var chats []model.Chat
		if err := s.db.
			Scopes(scope).
			Preload("User").
			Preload("Messages", func(db *gorm.DB) *gorm.DB {
				return db.Order("created_at ASC")
			}).
			Preload("Messages.Attachments").
			Order("created_at ASC, id ASC").
			Offset(offset).
			Limit(exportBatchSize).
			Find(&chats).Error; err != nil {
			return err
		}
		for i := range chats {
			n++
			writeConversation(w, n, &chats[i])
		}
		if len(chats) < exportBatchSize {
			break
		}
	}

	if s.auditRepo != nil {
		entityType, entityID := "user", actorID
		if userID != "" {
			entityID = userID
		}
		_ = s.auditRepo.Record(actorID, entityType, entityID, "admin_exported_chats", map[string]string{
			"user_id": userID,
			"count":   fmt.Sprint(n),
		})
	}
	return nil
}

func writeConversation(w io.Writer, n int, chat *model.Chat) {
	title := strings.TrimSpace(chat.Title)
	if title == "" {
		title = "(fără titlu)"
	}

	fmt.Fprintf(w, "---\n\n## CONVERSAȚIA %d — %s\n\n", n, title)
	fmt.Fprintf(w, "- ID: %s\n", chat.ID)
	if chat.User.ID != "" {
		name := strings.TrimSpace(chat.User.FirstName + " " + chat.User.LastName)
		fmt.Fprintf(w, "- Utilizator: %s <%s>\n", name, chat.User.Email)
	}
	fmt.Fprintf(w, "- Început: %s\n", chat.CreatedAt.UTC().Format("2006-01-02 15:04 UTC"))
	fmt.Fprintf(w, "- Mesaje: %d\n\n", len(chat.Messages))

	for i, msg := range chat.Messages {
		label := "[ASISTENT AI]"
		if msg.Role == "user" {
			label = "[UTILIZATOR]"
		}
		fmt.Fprintf(w, "### %s — mesajul %d (%s)\n\n", label, i+1, msg.CreatedAt.UTC().Format("2006-01-02 15:04"))

		for _, att := range msg.Attachments {
			fmt.Fprintf(w, "_Atașament: %s (%s)_\n\n", att.FileName, att.FileType)
		}

		content := strings.TrimSpace(msg.Content)
		if content == "" {
			content = "(mesaj gol)"
		}
		fmt.Fprintf(w, "%s\n\n", content)

		if msg.Role != "user" {
			if msg.Feedback != "" {
				fmt.Fprintf(w, "_Feedback utilizator: %s", msg.Feedback)
				if note := strings.TrimSpace(msg.FeedbackNote); note != "" {
					fmt.Fprintf(w, " — %s", note)
				}
				fmt.Fprintf(w, "_\n\n")
			}
		}
	}

	fmt.Fprintf(w, "=== SFÂRȘIT CONVERSAȚIA %d ===\n\n", n)
}
