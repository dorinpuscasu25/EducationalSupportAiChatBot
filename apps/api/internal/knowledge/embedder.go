package knowledge

import (
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
)

// Embedder calls an OpenAI-compatible /embeddings endpoint. When no API key is
// configured it is disabled and search falls back to full-text only.
type Embedder struct {
	baseURL string
	apiKey  string
	model   string
	dim     int
	client  *http.Client
}

// NewEmbedderFromEnv reads EMBEDDING_* settings, falling back to the chat
// provider's OPENAI_* settings so one key is enough.
func NewEmbedderFromEnv() *Embedder {
	base := firstNonEmpty(os.Getenv("EMBEDDING_API_URL"), os.Getenv("OPENAI_API_BASE_URL"), "https://api.openai.com/v1")
	key := firstNonEmpty(os.Getenv("EMBEDDING_API_KEY"), os.Getenv("OPENAI_API_KEY"))
	if os.Getenv("EMBEDDINGS_ENABLED") == "false" {
		key = ""
	}
	dim, _ := strconv.Atoi(os.Getenv("EMBEDDING_DIM"))
	if dim <= 0 {
		dim = 1536
	}
	return &Embedder{
		baseURL: strings.TrimSuffix(strings.TrimRight(base, "/"), "/embeddings"),
		apiKey:  key,
		model:   firstNonEmpty(os.Getenv("EMBEDDING_MODEL"), "text-embedding-3-small"),
		dim:     dim,
		client:  &http.Client{Timeout: 60 * time.Second},
	}
}

func (e *Embedder) Enabled() bool { return e != nil && e.apiKey != "" }
func (e *Embedder) Dim() int      { return e.dim }
func (e *Embedder) Model() string { return e.model }

// Embed returns one vector per input, in order.
func (e *Embedder) Embed(ctx context.Context, inputs []string) ([][]float32, error) {
	if !e.Enabled() {
		return nil, fmt.Errorf("embeddings disabled")
	}
	out := make([][]float32, 0, len(inputs))
	const batch = 64
	for start := 0; start < len(inputs); start += batch {
		end := start + batch
		if end > len(inputs) {
			end = len(inputs)
		}
		vectors, err := e.embedBatch(ctx, inputs[start:end])
		if err != nil {
			return nil, err
		}
		out = append(out, vectors...)
	}
	return out, nil
}

func (e *Embedder) embedBatch(ctx context.Context, inputs []string) ([][]float32, error) {
	body, _ := json.Marshal(map[string]any{"model": e.model, "input": inputs})
	var lastErr error
	for attempt := 0; attempt < 3; attempt++ {
		if attempt > 0 {
			time.Sleep(time.Duration(attempt*2) * time.Second)
		}
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, e.baseURL+"/embeddings", bytes.NewReader(body))
		if err != nil {
			return nil, err
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+e.apiKey)
		resp, err := e.client.Do(req)
		if err != nil {
			lastErr = err
			continue
		}
		raw, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		if resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode >= 500 {
			lastErr = fmt.Errorf("embeddings %d: %s", resp.StatusCode, truncate(string(raw), 300))
			continue
		}
		if resp.StatusCode >= 400 {
			return nil, fmt.Errorf("embeddings %d: %s", resp.StatusCode, truncate(string(raw), 300))
		}
		var parsed struct {
			Data []struct {
				Index     int       `json:"index"`
				Embedding []float32 `json:"embedding"`
			} `json:"data"`
		}
		if err := json.Unmarshal(raw, &parsed); err != nil {
			return nil, fmt.Errorf("embeddings: invalid response")
		}
		if len(parsed.Data) != len(inputs) {
			return nil, fmt.Errorf("embeddings: expected %d vectors, got %d", len(inputs), len(parsed.Data))
		}
		vectors := make([][]float32, len(inputs))
		for _, item := range parsed.Data {
			if len(item.Embedding) != e.dim {
				return nil, fmt.Errorf("embeddings: model returned dimension %d, EMBEDDING_DIM is %d", len(item.Embedding), e.dim)
			}
			if item.Index >= 0 && item.Index < len(vectors) {
				vectors[item.Index] = item.Embedding
			}
		}
		return vectors, nil
	}
	return nil, lastErr
}

// vectorLiteral formats a vector the way pgvector parses it: [0.1,0.2,...].
func vectorLiteral(v []float32) string {
	var b strings.Builder
	b.Grow(len(v) * 10)
	b.WriteByte('[')
	for i, x := range v {
		if i > 0 {
			b.WriteByte(',')
		}
		b.WriteString(strconv.FormatFloat(float64(x), 'f', -1, 32))
	}
	b.WriteByte(']')
	return b.String()
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return strings.TrimSpace(v)
		}
	}
	return ""
}

func truncate(s string, n int) string {
	if len([]rune(s)) <= n {
		return s
	}
	return string([]rune(s)[:n]) + "…"
}
