package model

import "time"

// Knowledge document statuses.
const (
	DocumentStatusReady  = "ready"
	DocumentStatusEmpty  = "empty"  // no extractable text (e.g. a scanned PDF without OCR)
	DocumentStatusFailed = "failed" // extraction or indexing error, see Error
)

// KnowledgeDocument is one file from the documents folder. Path is relative to
// that folder and identifies the file across re-indexing runs; SHA256 lets an
// unchanged file be skipped.
type KnowledgeDocument struct {
	ID         string     `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	Path       string     `gorm:"size:1000;not null;uniqueIndex" json:"path"`
	Title      string     `gorm:"size:500;not null" json:"title"`
	Category   string     `gorm:"size:255;index" json:"category"`
	FileType   string     `gorm:"size:20" json:"file_type"`
	SizeBytes  int64      `json:"size_bytes"`
	SHA256     string     `gorm:"size:64" json:"sha256"`
	Status     string     `gorm:"size:20;not null;index" json:"status"`
	Error      string     `gorm:"type:text" json:"error,omitempty"`
	ChunkCount int        `gorm:"not null;default:0" json:"chunk_count"`
	Embedded   bool       `gorm:"not null;default:false" json:"embedded"`
	IndexedAt  *time.Time `json:"indexed_at,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}

// KnowledgeChunk is a passage of a document. The full-text column (tsv) and
// the vector column (embedding) are added with raw SQL in database.SetupDB,
// since GORM has no native types for them.
type KnowledgeChunk struct {
	ID         string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	DocumentID string    `gorm:"type:uuid;not null;index" json:"document_id"`
	Ordinal    int       `gorm:"not null" json:"ordinal"`
	Heading    string    `gorm:"size:500" json:"heading,omitempty"`
	Content    string    `gorm:"type:text;not null" json:"content"`
	PageStart  int       `json:"page_start,omitempty"`
	PageEnd    int       `json:"page_end,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
}
