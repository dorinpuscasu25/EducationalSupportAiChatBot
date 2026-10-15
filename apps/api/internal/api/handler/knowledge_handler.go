package handler

import (
	"errors"
	"net/http"

	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/domain/model"
	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/knowledge"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// KnowledgeHandler exposes the knowledge base to administrators: which
// documents are indexed, and a button to re-read the documents folder.
type KnowledgeHandler struct {
	db       *gorm.DB
	indexer  *knowledge.Indexer
	searcher *knowledge.Searcher
	embedder *knowledge.Embedder
}

func NewKnowledgeHandler(db *gorm.DB, indexer *knowledge.Indexer, searcher *knowledge.Searcher, embedder *knowledge.Embedder) *KnowledgeHandler {
	return &KnowledgeHandler{db: db, indexer: indexer, searcher: searcher, embedder: embedder}
}

type knowledgeOverview struct {
	Documents         []model.KnowledgeDocument `json:"documents"`
	TotalChunks       int64                     `json:"total_chunks"`
	EmbeddingsEnabled bool                      `json:"embeddings_enabled"`
	EmbeddingModel    string                    `json:"embedding_model,omitempty"`
	Sync              *knowledge.Report         `json:"sync,omitempty"`
}

// List returns every indexed document with the state of the last sync.
func (h *KnowledgeHandler) List(c *gin.Context) {
	var docs []model.KnowledgeDocument
	if err := h.db.Order("category ASC, title ASC").Find(&docs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": publicError(c, err)})
		return
	}
	var chunks int64
	h.db.Model(&model.KnowledgeChunk{}).Count(&chunks)
	overview := knowledgeOverview{
		Documents:         docs,
		TotalChunks:       chunks,
		EmbeddingsEnabled: h.embedder.Enabled(),
		Sync:              h.indexer.LastReport(),
	}
	if h.embedder.Enabled() {
		overview.EmbeddingModel = h.embedder.Model()
	}
	c.JSON(http.StatusOK, overview)
}

// Sync starts re-reading the documents folder in the background.
// ?force=true re-indexes unchanged files too.
func (h *KnowledgeHandler) Sync(c *gin.Context) {
	if err := h.indexer.StartAsync(c.Query("force") == "true"); err != nil {
		if errors.Is(err, knowledge.ErrSyncRunning) {
			c.JSON(http.StatusConflict, gin.H{"error": "sync_already_running"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": publicError(c, err)})
		return
	}
	c.JSON(http.StatusAccepted, gin.H{"sync": h.indexer.LastReport()})
}

// Search runs a retrieval query, so the admin can check what the assistant
// would find for a question.
func (h *KnowledgeHandler) Search(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "q is required"})
		return
	}
	results, err := h.searcher.Search(c.Request.Context(), query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": publicError(c, err)})
		return
	}
	c.JSON(http.StatusOK, results)
}
