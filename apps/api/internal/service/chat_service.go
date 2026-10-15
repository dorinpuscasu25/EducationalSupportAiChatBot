package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/domain/model"
	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/knowledge"
	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/repository"
	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/pkg/logger"
	"go.uber.org/zap"
	"gorm.io/datatypes"
)

// ErrForbidden is returned when a chat does not belong to the caller.
var ErrForbidden = errors.New("forbidden")

// Source is a passage an answer relied on. Sources are stored with the answer
// for administrators; students only ever receive the answer text.
type Source struct {
	Index      int     `json:"index"`
	DocumentID string  `json:"document_id"`
	Title      string  `json:"title"`
	Category   string  `json:"category,omitempty"`
	Path       string  `json:"path,omitempty"`
	Heading    string  `json:"heading,omitempty"`
	Excerpt    string  `json:"excerpt"`
	PageStart  int     `json:"page_start,omitempty"`
	PageEnd    int     `json:"page_end,omitempty"`
	Score      float64 `json:"score"`
}

// ChatStreamEvent is a typed SSE event other than a text token.
type ChatStreamEvent struct {
	Type string `json:"-"`
	Data any    `json:"-"`
}

// ChatStreamCallbacks receive the streamed answer.
type ChatStreamCallbacks struct {
	OnChunk func(string) error
	OnEvent func(ChatStreamEvent) error
}

type ChatService struct {
	chatRepo   repository.ChatRepository
	searcher   *knowledge.Searcher
	llm        *LLMService
	billing    *BillingService
	historyMax int
}

func NewChatService(chatRepo repository.ChatRepository, searcher *knowledge.Searcher, llm *LLMService, billing *BillingService) *ChatService {
	historyMax, _ := strconv.Atoi(os.Getenv("CHAT_HISTORY_MESSAGES"))
	if historyMax <= 0 {
		historyMax = 10
	}
	return &ChatService{chatRepo: chatRepo, searcher: searcher, llm: llm, billing: billing, historyMax: historyMax}
}

func (s *ChatService) ListChats(userID string) ([]model.Chat, error) {
	return s.chatRepo.ListChatsByUserID(userID)
}

// GetChat returns one of the student's chats, without the sources behind the
// answers (those are for administrators only).
func (s *ChatService) GetChat(chatID, userID string) (*model.Chat, error) {
	chat, err := s.chatRepo.GetChatWithMessages(chatID)
	if err != nil {
		return nil, err
	}
	if chat.UserID != userID {
		return nil, ErrForbidden
	}
	for i := range chat.Messages {
		chat.Messages[i].Sources = nil
	}
	return chat, nil
}

func (s *ChatService) DeleteChat(chatID, userID string) error {
	chat, err := s.chatRepo.GetChatByID(chatID)
	if err != nil {
		return err
	}
	if chat.UserID != userID {
		return ErrForbidden
	}
	return s.chatRepo.DeleteChat(chatID)
}

var validFeedback = map[string]bool{"helpful": true, "not_helpful": true, "incorrect_source": true}

func (s *ChatService) SubmitFeedback(chatID, messageID, userID, rating, note string) (*model.ChatMessage, error) {
	if !validFeedback[rating] {
		return nil, errors.New("invalid rating")
	}
	chat, err := s.chatRepo.GetChatByID(chatID)
	if err != nil {
		return nil, err
	}
	if chat.UserID != userID {
		return nil, ErrForbidden
	}
	msg, err := s.chatRepo.GetMessageByID(messageID)
	if err != nil {
		return nil, err
	}
	if msg.ChatID != chatID || msg.Role != "assistant" {
		return nil, ErrForbidden
	}
	now := time.Now()
	if err := s.chatRepo.PatchMessage(messageID, map[string]interface{}{
		"feedback":      rating,
		"feedback_note": strings.TrimSpace(note),
		"feedback_at":   now,
	}); err != nil {
		return nil, err
	}
	updated, err := s.chatRepo.GetMessageByID(messageID)
	if err == nil {
		updated.Sources = nil
	}
	return updated, err
}

// StartChatStream creates a chat and answers its first question.
func (s *ChatService) StartChatStream(ctx context.Context, userID, content string, files []PreparedAttachment, onCreated func(chatID string), cb ChatStreamCallbacks) (*model.ChatMessage, []Source, error) {
	if err := s.billing.CheckQuota(userID); err != nil {
		discardAttachments(files)
		return nil, nil, err
	}
	chat, err := s.chatRepo.CreateChat(model.Chat{UserID: userID, Title: fallbackTitle(content)})
	if err != nil {
		discardAttachments(files)
		return nil, nil, err
	}
	onCreated(chat.ID)
	go s.updateTitle(chat.ID, content)
	return s.answer(ctx, chat, userID, content, files, nil, cb)
}

// StreamMessage answers a follow-up question in an existing chat.
func (s *ChatService) StreamMessage(ctx context.Context, chatID, userID, content string, files []PreparedAttachment, cb ChatStreamCallbacks) (*model.ChatMessage, []Source, error) {
	chat, err := s.chatRepo.GetChatWithMessages(chatID)
	if err != nil {
		discardAttachments(files)
		return nil, nil, err
	}
	if chat.UserID != userID {
		discardAttachments(files)
		return nil, nil, ErrForbidden
	}
	if err := s.billing.CheckQuota(userID); err != nil {
		discardAttachments(files)
		return nil, nil, err
	}
	return s.answer(ctx, chat, userID, content, files, chat.Messages, cb)
}

func (s *ChatService) answer(ctx context.Context, chat *model.Chat, userID, content string, files []PreparedAttachment, previous []model.ChatMessage, cb ChatStreamCallbacks) (*model.ChatMessage, []Source, error) {
	userMsg, err := s.chatRepo.AddMessage(model.ChatMessage{ChatID: chat.ID, Role: "user", Content: content})
	if err != nil {
		discardAttachments(files)
		return nil, nil, err
	}
	var images []string
	for _, f := range files {
		f.MessageID = userMsg.ID
		saved, err := s.chatRepo.AddAttachment(f.ChatAttachment)
		if err != nil {
			discardAttachments(files)
			return nil, nil, err
		}
		userMsg.Attachments = append(userMsg.Attachments, *saved)
		if f.ImageDataURL != "" {
			images = append(images, f.ImageDataURL)
		}
	}

	history := s.buildHistory(previous, content+attachmentsForPrompt(userMsg.Attachments, maxAttachmentText), images)
	results, err := s.searcher.Search(ctx, retrievalQuery(previous, content, userMsg.Attachments))
	if err != nil {
		logger.Error("Knowledge search failed", zap.Error(err))
		results = nil
	}
	sources := toSources(results)

	var answer strings.Builder
	onChunk := func(token string) error {
		answer.WriteString(token)
		return cb.OnChunk(token)
	}

	var usage LLMUsage
	if s.llm.Demo() {
		err = streamText(demoAnswer(sources, userMsg.Attachments), onChunk)
	} else {
		usage, err = s.llm.StreamChat(ctx, history, buildContext(sources), onChunk)
	}
	if err != nil && answer.Len() == 0 {
		return userMsg, nil, fmt.Errorf("llm: %w", err)
	}
	if err != nil {
		// Keep what was streamed so the student does not lose a partial answer.
		logger.Warn("LLM stream interrupted", zap.Error(err))
	}

	sourcesJSON, _ := json.Marshal(sources)
	assistantMsg, saveErr := s.chatRepo.AddMessage(model.ChatMessage{
		ChatID:  chat.ID,
		Role:    "assistant",
		Content: answer.String(),
		Sources: datatypes.JSON(sourcesJSON),
	})
	if saveErr != nil {
		return userMsg, sources, saveErr
	}
	_ = s.chatRepo.PatchChat(chat.ID, map[string]interface{}{})
	if cb.OnEvent != nil {
		_ = cb.OnEvent(ChatStreamEvent{Type: "assistant_saved", Data: map[string]any{"message_id": assistantMsg.ID}})
	}

	if usage.TotalTokens == 0 && !s.llm.Demo() {
		usage = LLMUsage{
			PromptTokens:     EstimateTokens(content) + EstimateTokens(buildContext(sources)),
			CompletionTokens: EstimateTokens(answer.String()),
		}
	}
	chatID := chat.ID
	if err := s.billing.RecordUsage(userID, &chatID, s.llm.Model(), usage); err != nil {
		logger.Warn("Usage record failed", zap.Error(err))
	}
	return userMsg, sources, nil
}

// buildHistory keeps the last few turns so follow-up questions make sense.
func (s *ChatService) buildHistory(previous []model.ChatMessage, content string, images []string) []LLMMessage {
	start := 0
	if len(previous) > s.historyMax {
		start = len(previous) - s.historyMax
	}
	history := make([]LLMMessage, 0, len(previous)-start+1)
	for _, m := range previous[start:] {
		text := m.Content + attachmentsForPrompt(m.Attachments, maxHistoryAttachment)
		if strings.TrimSpace(text) == "" {
			continue
		}
		history = append(history, LLMMessage{Role: m.Role, Content: text})
	}
	return append(history, LLMMessage{Role: "user", Content: content, Images: images})
}

// retrievalQuery adds the previous question to short follow-ups ("și pentru
// modulul 2?") so retrieval still knows the topic.
func retrievalQuery(previous []model.ChatMessage, content string, files []model.ChatAttachment) string {
	// A question about an attached screenshot or document is mostly in the
	// file: search with the start of its text too.
	for _, f := range files {
		if text := strings.TrimSpace(f.ExtractedText); text != "" {
			content += "\n" + truncateRunes(text, 500)
		}
	}
	if len([]rune(content)) >= 60 {
		return content
	}
	for i := len(previous) - 1; i >= 0; i-- {
		if previous[i].Role == "user" {
			return previous[i].Content + "\n" + content
		}
	}
	return content
}

func toSources(results []knowledge.Result) []Source {
	sources := make([]Source, 0, len(results))
	for i, r := range results {
		sources = append(sources, Source{
			Index:      i + 1,
			DocumentID: r.DocumentID,
			Title:      r.Title,
			Category:   r.Category,
			Path:       r.Path,
			Heading:    r.Heading,
			Excerpt:    r.Content,
			PageStart:  r.PageStart,
			PageEnd:    r.PageEnd,
			Score:      r.Score,
		})
	}
	return sources
}

// buildContext is appended to the system prompt: the passages the answer must
// rely on, numbered so the model can cite them as [1], [2]…
func buildContext(sources []Source) string {
	if len(sources) == 0 {
		return "## Informații de referință\n\nNu există informații despre această întrebare."
	}
	var b strings.Builder
	b.WriteString("## Informații de referință\n\nInformații interne ale academiei. Folosește-le pentru răspuns, fără să le menționezi ca surse.\n")
	for _, src := range sources {
		fmt.Fprintf(&b, "\n### %s", src.Title)
		if src.Category != "" {
			fmt.Fprintf(&b, " (%s)", src.Category)
		}
		if src.PageStart > 0 {
			fmt.Fprintf(&b, ", pagina %d", src.PageStart)
		}
		if src.Heading != "" && src.Heading != src.Title {
			fmt.Fprintf(&b, "\nSecțiune: %s", src.Heading)
		}
		fmt.Fprintf(&b, "\n%s\n", src.Excerpt)
	}
	return b.String()
}

func demoAnswer(sources []Source, files []model.ChatAttachment) string {
	var b strings.Builder
	b.WriteString("_Mod demonstrativ: nu este configurată o cheie pentru modelul AI, așa că afișez direct informațiile găsite._\n\n")
	for _, f := range files {
		fmt.Fprintf(&b, "Am primit fișierul **%s**", f.FileName)
		if text := strings.TrimSpace(f.ExtractedText); text != "" {
			fmt.Fprintf(&b, ". Text recunoscut:\n\n> %s\n\n", strings.ReplaceAll(truncateRunes(text, 300), "\n", " "))
		} else {
			b.WriteString(" (fără text recunoscut).\n\n")
		}
	}
	if len(sources) == 0 {
		b.WriteString("Nu am această informație. Te rog să contactezi echipa academiei.")
		return b.String()
	}
	for _, src := range sources {
		excerpt := []rune(src.Excerpt)
		if len(excerpt) > 400 {
			excerpt = append(excerpt[:400], '…')
		}
		fmt.Fprintf(&b, "%s\n\n", string(excerpt))
	}
	return b.String()
}

// discardAttachments removes stored files of a question that was not saved.
func discardAttachments(files []PreparedAttachment) {
	for _, f := range files {
		_ = os.Remove(f.StoragePath)
	}
}

// Attachment returns a file of one of the user's chats.
func (s *ChatService) Attachment(chatID, attachmentID, userID string) (*model.ChatAttachment, error) {
	chat, err := s.chatRepo.GetChatByID(chatID)
	if err != nil {
		return nil, err
	}
	if chat.UserID != userID {
		return nil, ErrForbidden
	}
	return s.chatRepo.GetAttachment(chatID, attachmentID)
}

func streamText(text string, onChunk func(string) error) error {
	words := strings.SplitAfter(text, " ")
	for _, w := range words {
		if err := onChunk(w); err != nil {
			return err
		}
	}
	return nil
}

func (s *ChatService) updateTitle(chatID, firstMessage string) {
	title, err := s.llm.GenerateTitle(firstMessage)
	if err != nil || strings.TrimSpace(title) == "" {
		return
	}
	_ = s.chatRepo.PatchChat(chatID, map[string]interface{}{"title": title})
}
