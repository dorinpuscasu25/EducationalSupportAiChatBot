package service

import (
	"bytes"
	"strings"
	"testing"
	"time"

	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/domain/model"
)

func TestWriteConversationLabelsTurns(t *testing.T) {
	at := time.Date(2026, 9, 20, 10, 0, 0, 0, time.UTC)
	chat := &model.Chat{
		ID:        "c1",
		Title:     "Orarul modulului 2",
		User:      model.User{ID: "u1", FirstName: "Ana", LastName: "Pop", Email: "ana@example.com"},
		CreatedAt: at,
		Messages: []model.ChatMessage{
			{Role: "user", Content: "Când începe modulul 2?", CreatedAt: at},
			{Role: "assistant", Content: "Pe 3 noiembrie.", Feedback: "problem", FeedbackNote: "data e greșită", CreatedAt: at},
		},
	}
	var buf bytes.Buffer
	writeConversation(&buf, 1, chat)
	out := buf.String()
	t.Log("\n" + out)

	for _, want := range []string{
		"## CONVERSAȚIA 1 — Orarul modulului 2",
		"### [UTILIZATOR] — mesajul 1",
		"### [ASISTENT AI] — mesajul 2",
		"Feedback utilizator: problem — data e greșită",
		"=== SFÂRȘIT CONVERSAȚIA 1 ===",
	} {
		if !strings.Contains(out, want) {
			t.Errorf("missing %q", want)
		}
	}
}
