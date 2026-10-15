package service

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

// LLMMessage is a single turn in the conversation history.
type LLMMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
	// Images are data URLs sent alongside Content to a vision-capable model.
	Images []string `json:"-"`
}

// LLMUsage holds token accounting returned by the provider (OpenAI-compatible
// `usage` object). Used for per-user billing.
type LLMUsage struct {
	PromptTokens     int64 `json:"prompt_tokens"`
	CompletionTokens int64 `json:"completion_tokens"`
	TotalTokens      int64 `json:"total_tokens"`
}

// Model returns the chat model id in use (for usage records).
func (s *LLMService) Model() string { return s.model }

// Demo reports that no LLM credentials are configured. The chat then answers
// with the retrieved passages, so the platform can be tried without a key.
func (s *LLMService) Demo() bool { return s.tokenSource == nil && s.apiKey == "" }

// LLMService calls an OpenAI-compatible chat completions API.
// Supports: OpenAI, Gemini (AI Studio), Vertex AI
type LLMService struct {
	apiBaseURL   string
	apiKey       string
	model        string
	httpClient   *http.Client
	systemPrompt string
	maxTokens    int
	vision       bool               // the model accepts images (CHAT_VISION, default on)
	tokenSource  oauth2.TokenSource // non-nil only for Vertex AI
}

func NewLLMService() (*LLMService, error) {
	provider := strings.ToLower(os.Getenv("LLM_PROVIDER"))
	if provider == "" {
		provider = "openai"
	}

	maxTokens, _ := strconv.Atoi(os.Getenv("CHAT_MAX_TOKENS"))
	if maxTokens <= 0 {
		maxTokens = 1500
	}
	svc := &LLMService{
		httpClient: &http.Client{Timeout: 120 * time.Second},
		maxTokens:  maxTokens,
		vision:     os.Getenv("CHAT_VISION") != "false",
	}

	switch provider {
	case "vertex":
		if err := svc.initVertex(); err != nil {
			return nil, err
		}
	default: // "openai" or "gemini" (AI Studio) — both use static API key
		apiBaseURL := os.Getenv("OPENAI_API_BASE_URL")
		if apiBaseURL == "" {
			apiBaseURL = "https://api.openai.com/v1"
		}
		model := os.Getenv("CHAT_LLM_MODEL")
		if model == "" {
			model = "gpt-4o-mini"
		}
		svc.apiBaseURL = strings.TrimRight(apiBaseURL, "/")
		svc.apiKey = os.Getenv("OPENAI_API_KEY")
		svc.model = model
	}

	if err := svc.loadSystemPrompt(); err != nil {
		return nil, err
	}
	return svc, nil
}

// initVertex configures the service for Vertex AI using Application Default Credentials.
//
// Required env vars:
//
//	VERTEX_PROJECT_ID  — GCP project ID
//	VERTEX_LOCATION    — region, e.g. "us-central1" (default: "us-central1")
//	CHAT_LLM_MODEL     — model name, e.g. "google/gemini-2.0-flash-001" (default)
//
// Auth: run `gcloud auth application-default login`
// OR set GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa-key.json
func (s *LLMService) initVertex() error {
	project := os.Getenv("VERTEX_PROJECT_ID")
	if project == "" {
		return fmt.Errorf("LLM_PROVIDER=vertex dar VERTEX_PROJECT_ID nu e setat")
	}
	location := os.Getenv("VERTEX_LOCATION")
	if location == "" {
		location = "us-central1"
	}
	model := os.Getenv("CHAT_LLM_MODEL")
	if model == "" {
		model = "google/gemini-2.0-flash-001"
	}

	// Application Default Credentials
	ts, err := google.DefaultTokenSource(context.Background(), "https://www.googleapis.com/auth/cloud-platform")
	if err != nil {
		return fmt.Errorf("vertex ADC: %w", err)
	}

	s.apiBaseURL = fmt.Sprintf(
		"https://%s-aiplatform.googleapis.com/v1beta1/projects/%s/locations/%s/endpoints/openapi",
		location, project, location,
	)
	s.model = model
	s.tokenSource = ts
	return nil
}

func (s *LLMService) loadSystemPrompt() error {
	path := os.Getenv("CHAT_SYSTEM_PROMPT_PATH")
	if path == "" {
		path = "prompts/assistant.md"
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("system prompt not found at %q: %w", path, err)
	}
	s.systemPrompt = string(data)
	return nil
}

// Chat sends the conversation history to the LLM and returns the full response.
func (s *LLMService) Chat(history []LLMMessage, ragContext string) (string, error) {
	content, _, err := s.ChatWithUsage(history, ragContext)
	return content, err
}

// ChatWithUsage is like Chat but also returns the provider's token accounting.
func (s *LLMService) ChatWithUsage(history []LLMMessage, ragContext string) (string, LLMUsage, error) {
	msgs := s.buildMessages(history, ragContext)
	body, _ := json.Marshal(map[string]interface{}{
		"model":       s.model,
		"messages":    msgs,
		"temperature": 0.3,
		"max_tokens":  s.maxTokens,
	})

	raw, err := s.post("/chat/completions", body)
	if err != nil {
		return "", LLMUsage{}, err
	}

	var resp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
		Usage LLMUsage `json:"usage"`
	}
	if err := json.Unmarshal(raw, &resp); err != nil || len(resp.Choices) == 0 {
		return "", LLMUsage{}, fmt.Errorf("llm bad response: %s", string(raw))
	}
	return resp.Choices[0].Message.Content, resp.Usage, nil
}

// StreamChat streams the LLM response, calling onChunk for each token. It
// returns the provider's token accounting captured from the final usage chunk
// (requested via stream_options.include_usage). When the provider does not emit
// usage, the returned LLMUsage is zero and the caller should estimate.
func (s *LLMService) StreamChat(ctx context.Context, history []LLMMessage, ragContext string, onChunk func(string) error) (LLMUsage, error) {
	msgs := s.buildMessages(history, ragContext)
	body, _ := json.Marshal(map[string]interface{}{
		"model":          s.model,
		"messages":       msgs,
		"temperature":    0.3,
		"max_tokens":     s.maxTokens,
		"stream":         true,
		"stream_options": map[string]interface{}{"include_usage": true},
	})

	var usage LLMUsage

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.apiBaseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return usage, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "text/event-stream")
	if err := s.setAuth(req); err != nil {
		return usage, err
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return usage, fmt.Errorf("llm stream: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		raw, _ := io.ReadAll(resp.Body)
		return usage, fmt.Errorf("llm stream %d: %s", resp.StatusCode, string(raw))
	}

	scanner := bufio.NewScanner(resp.Body)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasPrefix(line, "data: ") {
			continue
		}
		data := strings.TrimPrefix(line, "data: ")
		if data == "[DONE]" {
			break
		}
		var chunk struct {
			Choices []struct {
				Delta struct {
					Content string `json:"content"`
				} `json:"delta"`
			} `json:"choices"`
			Usage *LLMUsage `json:"usage"`
		}
		if err := json.Unmarshal([]byte(data), &chunk); err != nil {
			continue
		}
		if chunk.Usage != nil {
			usage = *chunk.Usage
		}
		if len(chunk.Choices) > 0 && chunk.Choices[0].Delta.Content != "" {
			if err := onChunk(chunk.Choices[0].Delta.Content); err != nil {
				return usage, err
			}
		}
	}
	return usage, scanner.Err()
}

// EstimateTokens is a rough fallback (~4 chars/token) when the provider does
// not return usage for a streamed response.
func EstimateTokens(text string) int64 {
	t := int64(len([]rune(text)) / 4)
	if t < 1 {
		return 1
	}
	return t
}

// GenerateTitle generates a short Romanian title for the chat from the first user message.
func (s *LLMService) GenerateTitle(userMessage string) (string, error) {
	msgs := []map[string]string{
		{
			"role":    "system",
			"content": "Generează un titlu scurt (maxim 6 cuvinte), în limba mesajului, pentru această conversație a unui cursant cu asistentul academiei. Răspunde DOAR cu titlul, fără ghilimele sau explicații suplimentare.",
		},
		{"role": "user", "content": userMessage},
	}
	body, _ := json.Marshal(map[string]interface{}{
		"model":       s.model,
		"messages":    msgs,
		"temperature": 0.5,
		"max_tokens":  25,
	})

	if s.Demo() {
		return fallbackTitle(userMessage), nil
	}
	raw, err := s.post("/chat/completions", body)
	if err != nil {
		return fallbackTitle(userMessage), nil // non-fatal fallback
	}
	var resp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(raw, &resp); err != nil || len(resp.Choices) == 0 {
		return fallbackTitle(userMessage), nil
	}
	title := strings.Trim(strings.TrimSpace(resp.Choices[0].Message.Content), "\"'„”")
	if len([]rune(title)) > 100 {
		runes := []rune(title)
		title = string(runes[:100])
	}
	return title, nil
}

// fallbackTitle uses the start of the first question as the title.
func fallbackTitle(message string) string {
	words := strings.Fields(message)
	if len(words) == 0 {
		return "Conversație nouă"
	}
	if len(words) > 7 {
		words = append(words[:7], "…")
	}
	return strings.Join(words, " ")
}

// ─── internal helpers ────────────────────────────────────────────────────────

func (s *LLMService) buildMessages(history []LLMMessage, ragContext string) []map[string]any {
	systemContent := s.systemPrompt
	if ragContext != "" {
		systemContent += "\n\n" + ragContext
	}
	msgs := []map[string]any{
		{"role": "system", "content": systemContent},
	}
	for _, m := range history {
		if len(m.Images) == 0 || !s.vision {
			msgs = append(msgs, map[string]any{"role": m.Role, "content": m.Content})
			continue
		}
		parts := []map[string]any{{"type": "text", "text": m.Content}}
		for _, url := range m.Images {
			parts = append(parts, map[string]any{
				"type":      "image_url",
				"image_url": map[string]any{"url": url},
			})
		}
		msgs = append(msgs, map[string]any{"role": m.Role, "content": parts})
	}
	return msgs
}

// setAuth injects the correct Authorization header (API key or Google ADC token).
func (s *LLMService) setAuth(req *http.Request) error {
	if s.tokenSource != nil {
		token, err := s.tokenSource.Token()
		if err != nil {
			return fmt.Errorf("vertex token: %w", err)
		}
		req.Header.Set("Authorization", "Bearer "+token.AccessToken)
		return nil
	}
	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	return nil
}

func (s *LLMService) post(path string, body []byte) ([]byte, error) {
	req, err := http.NewRequest(http.MethodPost, s.apiBaseURL+path, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	if err := s.setAuth(req); err != nil {
		return nil, err
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("llm http: %w", err)
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("llm %d: %s", resp.StatusCode, string(raw))
	}
	return raw, nil
}
