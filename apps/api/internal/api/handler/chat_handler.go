package handler

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strings"

	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/domain/model"
	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/gin-gonic/gin/binding"
)

// maxQuestionLength bounds a single question (characters).
const maxQuestionLength = 8000

type ChatHandler struct {
	chatSvc *service.ChatService
}

func NewChatHandler(chatSvc *service.ChatService) *ChatHandler {
	return &ChatHandler{chatSvc: chatSvc}
}

// ListChats returns the student's conversations, newest first.
func (h *ChatHandler) ListChats(c *gin.Context) {
	chats, err := h.chatSvc.ListChats(chatUserID(c))
	if err != nil {
		c.JSON(statusFromErr(err), gin.H{"error": publicError(c, err)})
		return
	}
	c.JSON(http.StatusOK, chats)
}

// GetChat returns a chat with all its messages.
func (h *ChatHandler) GetChat(c *gin.Context) {
	chat, err := h.chatSvc.GetChat(c.Param("chatId"), chatUserID(c))
	if err != nil {
		c.JSON(statusFromErr(err), gin.H{"error": publicError(c, err)})
		return
	}
	c.JSON(http.StatusOK, chat)
}

// DeleteChat soft-deletes a chat.
func (h *ChatHandler) DeleteChat(c *gin.Context) {
	if err := h.chatSvc.DeleteChat(c.Param("chatId"), chatUserID(c)); err != nil {
		c.JSON(statusFromErr(err), gin.H{"error": publicError(c, err)})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *ChatHandler) SubmitFeedback(c *gin.Context) {
	var body struct {
		Rating string `json:"rating" binding:"required"`
		Note   string `json:"note"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "rating is required"})
		return
	}
	message, err := h.chatSvc.SubmitFeedback(c.Param("chatId"), c.Param("messageId"), chatUserID(c), body.Rating, body.Note)
	if err != nil {
		c.JSON(statusFromErr(err), gin.H{"error": publicError(c, err)})
		return
	}
	c.JSON(http.StatusOK, message)
}

// StartChatStream creates a chat and streams the first answer as SSE:
//
//	event: chat_created  data: {"chat_id": "..."}
//	data: "<token>"      (repeated)
//	event: assistant_saved data: {"message_id": "..."}
//	event: done          data: {"user_message": {...}}
func (h *ChatHandler) StartChatStream(c *gin.Context) {
	content, ok := requireContent(c)
	if !ok {
		return
	}
	flusher, ok := startSSE(c)
	if !ok {
		return
	}
	files, err := service.PrepareAttachments(c.Request.Context(), extractFiles(c))
	if err != nil {
		finishSSE(c, flusher, nil, err)
		return
	}
	userMsg, _, err := h.chatSvc.StartChatStream(
		c.Request.Context(),
		chatUserID(c),
		content,
		files,
		func(id string) { _ = writeSSE(c.Writer, flusher, "chat_created", gin.H{"chat_id": id}) },
		callbacks(c, flusher),
	)
	finishSSE(c, flusher, userMsg, err)
}

// StreamMessage sends a follow-up question and streams the answer as SSE.
func (h *ChatHandler) StreamMessage(c *gin.Context) {
	content, ok := requireContent(c)
	if !ok {
		return
	}
	flusher, ok := startSSE(c)
	if !ok {
		return
	}
	files, err := service.PrepareAttachments(c.Request.Context(), extractFiles(c))
	if err != nil {
		finishSSE(c, flusher, nil, err)
		return
	}
	userMsg, _, err := h.chatSvc.StreamMessage(c.Request.Context(), c.Param("chatId"), chatUserID(c), content, files, callbacks(c, flusher))
	finishSSE(c, flusher, userMsg, err)
}

// ─── helpers ─────────────────────────────────────────────────────────────────

// defaultFileQuestion is asked when a student sends files without text.
const defaultFileQuestion = "Uită-te la fișierele atașate și ajută-mă cu ele."

func requireContent(c *gin.Context) (string, bool) {
	content := strings.TrimSpace(extractContent(c))
	if content == "" && len(extractFiles(c)) > 0 {
		content = defaultFileQuestion
	}
	if content == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "content is required"})
		return "", false
	}
	if len([]rune(content)) > maxQuestionLength {
		c.JSON(http.StatusBadRequest, gin.H{"error": "message_too_long"})
		return "", false
	}
	return content, true
}

func startSSE(c *gin.Context) (http.Flusher, bool) {
	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "streaming not supported"})
		return nil, false
	}
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("X-Accel-Buffering", "no")
	c.Header("Connection", "keep-alive")
	return flusher, true
}

func callbacks(c *gin.Context, flusher http.Flusher) service.ChatStreamCallbacks {
	return service.ChatStreamCallbacks{
		OnChunk: func(chunk string) error { return writeSSE(c.Writer, flusher, "", chunk) },
		OnEvent: func(event service.ChatStreamEvent) error { return writeSSE(c.Writer, flusher, event.Type, event.Data) },
	}
}

// finishSSE ends the stream. The answer's sources are stored for
// administrators and are never sent to the student.
func finishSSE(c *gin.Context, flusher http.Flusher, userMsg *model.ChatMessage, err error) {
	if err != nil {
		_ = writeSSE(c.Writer, flusher, "error", publicError(c, err))
		return
	}
	meta := gin.H{}
	if userMsg != nil {
		meta["user_message_id"] = userMsg.ID
		meta["user_message"] = userMsg
	}
	raw, _ := json.Marshal(meta)
	fmt.Fprintf(c.Writer, "event: done\ndata: %s\n\n", raw)
	flusher.Flush()
}

// extractContent reads "content" from a JSON body or form data.
func extractContent(c *gin.Context) string {
	if strings.HasPrefix(c.ContentType(), "application/json") {
		var body struct {
			Content string `json:"content"`
		}
		_ = c.ShouldBindBodyWith(&body, binding.JSON)
		return body.Content
	}
	return c.PostForm("content")
}

// extractFiles returns the files sent as the multipart field "files".
func extractFiles(c *gin.Context) []*multipart.FileHeader {
	form, err := c.MultipartForm()
	if err != nil || form == nil {
		return nil
	}
	return form.File["files"]
}

// DownloadAttachment serves a file of one of the student's own chats.
func (h *ChatHandler) DownloadAttachment(c *gin.Context) {
	att, err := h.chatSvc.Attachment(c.Param("chatId"), c.Param("attachmentId"), chatUserID(c))
	if err != nil {
		c.Status(http.StatusNotFound)
		return
	}
	ServeAttachment(c, att)
}

func chatUserID(c *gin.Context) string {
	if v, exists := c.Get("userID"); exists {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

func statusFromErr(err error) int {
	if err == nil {
		return http.StatusInternalServerError
	}
	switch {
	case errors.Is(err, service.ErrForbidden):
		return http.StatusForbidden
	case errors.Is(err, service.ErrQuotaExceeded):
		return http.StatusPaymentRequired
	}
	msg := err.Error()
	switch {
	case strings.Contains(msg, "record not found"):
		return http.StatusNotFound
	case strings.Contains(msg, "already"):
		return http.StatusConflict
	case strings.Contains(msg, "required"), strings.Contains(msg, "invalid"):
		return http.StatusBadRequest
	}
	return http.StatusInternalServerError
}

func writeSSE(writer io.Writer, flusher http.Flusher, event string, data any) error {
	raw, err := json.Marshal(data)
	if err != nil {
		return err
	}
	if event == "" {
		_, err = fmt.Fprintf(writer, "data: %s\n\n", raw)
	} else {
		_, err = fmt.Fprintf(writer, "event: %s\ndata: %s\n\n", event, raw)
	}
	if err != nil {
		return err
	}
	flusher.Flush()
	return nil
}
