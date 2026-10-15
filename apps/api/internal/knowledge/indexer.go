package knowledge

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/domain/model"
	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/pkg/logger"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// Report summarises one synchronisation of the documents folder.
type Report struct {
	StartedAt  time.Time  `json:"started_at"`
	FinishedAt *time.Time `json:"finished_at,omitempty"`
	Running    bool       `json:"running"`
	Scanned    int        `json:"scanned"`
	Added      int        `json:"added"`
	Updated    int        `json:"updated"`
	Unchanged  int        `json:"unchanged"`
	Removed    int        `json:"removed"`
	Failed     int        `json:"failed"`
	Error      string     `json:"error,omitempty"`
}

// Indexer keeps the knowledge base in sync with a folder on disk. The folder is
// the source of truth: new files are indexed, changed files re-indexed and
// deleted files removed. The first-level sub-folder becomes the category.
type Indexer struct {
	db       *gorm.DB
	embedder *Embedder
	dir      string

	mu      sync.Mutex
	running bool
	last    *Report
}

func NewIndexer(db *gorm.DB, embedder *Embedder, dir string) *Indexer {
	return &Indexer{db: db, embedder: embedder, dir: dir}
}

func (ix *Indexer) Dir() string { return ix.dir }

// LastReport returns the current or most recent run, if any.
func (ix *Indexer) LastReport() *Report {
	ix.mu.Lock()
	defer ix.mu.Unlock()
	if ix.last == nil {
		return nil
	}
	copy := *ix.last
	return &copy
}

// ErrSyncRunning is returned when a synchronisation is already in progress.
var ErrSyncRunning = errors.New("sync_already_running")

// StartAsync launches a sync in the background.
func (ix *Indexer) StartAsync(force bool) error {
	ix.mu.Lock()
	if ix.running {
		ix.mu.Unlock()
		return ErrSyncRunning
	}
	ix.running = true
	ix.mu.Unlock()
	go func() {
		_, _ = ix.run(context.Background(), force)
	}()
	return nil
}

// Sync runs a synchronisation and waits for it to finish.
// With force, every file is re-read even if unchanged (e.g. after enabling
// embeddings or OCR, or to retry failed files).
func (ix *Indexer) Sync(ctx context.Context, force bool) (*Report, error) {
	ix.mu.Lock()
	if ix.running {
		ix.mu.Unlock()
		return nil, ErrSyncRunning
	}
	ix.running = true
	ix.mu.Unlock()
	return ix.run(ctx, force)
}

func (ix *Indexer) run(ctx context.Context, force bool) (*Report, error) {
	report := &Report{StartedAt: time.Now(), Running: true}
	ix.mu.Lock()
	ix.last = report
	ix.mu.Unlock()

	err := ix.sync(ctx, report, force)

	ix.mu.Lock()
	now := time.Now()
	report.FinishedAt = &now
	report.Running = false
	if err != nil {
		report.Error = err.Error()
	}
	ix.running = false
	ix.mu.Unlock()

	logger.Info("Knowledge sync finished",
		zap.Int("scanned", report.Scanned), zap.Int("added", report.Added),
		zap.Int("updated", report.Updated), zap.Int("removed", report.Removed),
		zap.Int("failed", report.Failed), zap.Error(err))
	return report, err
}

func (ix *Indexer) sync(ctx context.Context, report *Report, force bool) error {
	if info, err := os.Stat(ix.dir); err != nil || !info.IsDir() {
		return fmt.Errorf("folderul de documente %q nu există", ix.dir)
	}

	var existing []model.KnowledgeDocument
	if err := ix.db.Find(&existing).Error; err != nil {
		return err
	}
	byPath := make(map[string]model.KnowledgeDocument, len(existing))
	for _, d := range existing {
		byPath[d.Path] = d
	}
	seen := map[string]bool{}

	walkErr := filepath.WalkDir(ix.dir, func(path string, entry fs.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		name := entry.Name()
		if strings.HasPrefix(name, ".") || strings.HasPrefix(name, "~$") {
			if entry.IsDir() && path != ix.dir {
				return filepath.SkipDir
			}
			return nil
		}
		if entry.IsDir() || !SupportedExtensions[strings.ToLower(filepath.Ext(name))] {
			return nil
		}
		// The folder's own instructions are not course material.
		if filepath.Dir(path) == filepath.Clean(ix.dir) && strings.EqualFold(name, "README.md") {
			return nil
		}
		if ctx.Err() != nil {
			return ctx.Err()
		}
		rel, _ := filepath.Rel(ix.dir, path)
		rel = filepath.ToSlash(rel)
		seen[rel] = true
		report.Scanned++

		old, known := byPath[rel]
		changed, err := ix.indexFile(ctx, path, rel, old, known && !force, known)
		switch {
		case err != nil:
			report.Failed++
			logger.Warn("Knowledge file failed", zap.String("path", rel), zap.Error(err))
		case !changed:
			report.Unchanged++
		case known:
			report.Updated++
		default:
			report.Added++
		}
		return nil
	})
	if walkErr != nil {
		return walkErr
	}

	for path, doc := range byPath {
		if seen[path] {
			continue
		}
		if err := ix.deleteDocument(doc.ID); err == nil {
			report.Removed++
		}
	}
	return nil
}

// indexFile (re)indexes one file. It reports changed=false when the stored copy
// is already current.
func (ix *Indexer) indexFile(ctx context.Context, path, rel string, old model.KnowledgeDocument, canSkip, known bool) (bool, error) {
	info, err := os.Stat(path)
	if err != nil {
		return false, err
	}
	sum, err := fileSHA256(path)
	if err != nil {
		return false, err
	}
	upToDate := canSkip && old.SHA256 == sum &&
		(old.Status != model.DocumentStatusReady || old.Embedded == ix.embedder.Enabled())
	if upToDate {
		return false, nil
	}

	doc := old
	if !known {
		doc = model.KnowledgeDocument{Path: rel}
	}
	doc.Title = titleFromPath(rel)
	doc.Category = categoryFromPath(rel)
	doc.FileType = strings.TrimPrefix(strings.ToLower(filepath.Ext(rel)), ".")
	doc.SizeBytes = info.Size()
	doc.SHA256 = sum
	now := time.Now()
	doc.IndexedAt = &now
	doc.Error = ""
	doc.ChunkCount = 0
	doc.Embedded = false

	blocks, err := Extract(ctx, path)
	var chunks []Chunk
	switch {
	case errors.Is(err, ErrNoText):
		doc.Status = model.DocumentStatusEmpty
		doc.Error = "Nu s-a putut extrage text (posibil document scanat)."
	case err != nil:
		doc.Status = model.DocumentStatusFailed
		doc.Error = err.Error()
	default:
		chunks = BuildChunks(blocks)
		doc.Status = model.DocumentStatusReady
	}

	var vectors [][]float32
	if len(chunks) > 0 && ix.embedder.Enabled() {
		inputs := make([]string, len(chunks))
		for i, c := range chunks {
			inputs[i] = embeddingInput(doc.Title, c)
		}
		vectors, err = ix.embedder.Embed(ctx, inputs)
		if err != nil {
			// Keep the document searchable by text; the next sync retries vectors.
			logger.Warn("Embedding failed; indexed for full-text only", zap.String("path", rel), zap.Error(err))
			vectors = nil
		}
	}

	txErr := ix.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(&doc).Error; err != nil {
			return err
		}
		if err := tx.Where("document_id = ?", doc.ID).Delete(&model.KnowledgeChunk{}).Error; err != nil {
			return err
		}
		for i, c := range chunks {
			row := model.KnowledgeChunk{
				DocumentID: doc.ID,
				Ordinal:    c.Ordinal,
				Heading:    headingFor(doc.Title, c.Heading),
				Content:    c.Content,
				PageStart:  c.PageStart,
				PageEnd:    c.PageEnd,
			}
			if err := tx.Create(&row).Error; err != nil {
				return err
			}
			if vectors != nil {
				if err := tx.Exec(`UPDATE knowledge_chunks SET embedding = ?::vector WHERE id = ?`,
					vectorLiteral(vectors[i]), row.ID).Error; err != nil {
					return err
				}
			}
		}
		return tx.Model(&doc).Updates(map[string]any{
			"chunk_count": len(chunks),
			"embedded":    vectors != nil,
		}).Error
	})
	if txErr != nil {
		return false, txErr
	}
	if doc.Status == model.DocumentStatusFailed {
		return true, errors.New(doc.Error)
	}
	return true, nil
}

func (ix *Indexer) deleteDocument(id string) error {
	return ix.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("document_id = ?", id).Delete(&model.KnowledgeChunk{}).Error; err != nil {
			return err
		}
		return tx.Delete(&model.KnowledgeDocument{}, "id = ?", id).Error
	})
}

func embeddingInput(title string, c Chunk) string {
	parts := []string{title}
	if c.Heading != "" {
		parts = append(parts, c.Heading)
	}
	parts = append(parts, c.Content)
	return strings.Join(parts, "\n")
}

func headingFor(title, section string) string {
	if section == "" || strings.EqualFold(section, title) {
		return title
	}
	return truncate(title+" — "+section, 480)
}

func titleFromPath(rel string) string {
	base := filepath.Base(rel)
	name := strings.TrimSuffix(base, filepath.Ext(base))
	name = strings.NewReplacer("_", " ").Replace(name)
	return strings.TrimSpace(name)
}

func categoryFromPath(rel string) string {
	if i := strings.Index(rel, "/"); i > 0 {
		return rel[:i]
	}
	return ""
}

func fileSHA256(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()
	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}
