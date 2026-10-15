package knowledge

import (
	"fmt"

	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/domain/model"
	"gorm.io/gorm"
)

// EnsureSchema adds what AutoMigrate cannot express: the pgvector column, the
// accent-insensitive full-text column and their indexes. Students often type
// without diacritics ("cand incepe cursul"), so text is unaccented on both the
// index and the query side.
func EnsureSchema(db *gorm.DB, dim int) error {
	statements := []string{
		`CREATE EXTENSION IF NOT EXISTS vector`,
		`CREATE EXTENSION IF NOT EXISTS unaccent`,
		`CREATE OR REPLACE FUNCTION kb_unaccent(text) RETURNS text
			LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
			AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$`,
		`ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS tsv tsvector
			GENERATED ALWAYS AS (to_tsvector('romanian', kb_unaccent(coalesce(heading, '') || ' ' || content))) STORED`,
		`CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_tsv ON knowledge_chunks USING gin (tsv)`,
	}
	for _, sql := range statements {
		if err := db.Exec(sql).Error; err != nil {
			return fmt.Errorf("knowledge schema: %w", err)
		}
	}

	// The vector column's dimension follows EMBEDDING_DIM. When the model
	// changes, old vectors are useless: drop them and force a re-index.
	var current int
	db.Raw(`SELECT atttypmod FROM pg_attribute
		WHERE attrelid = 'knowledge_chunks'::regclass AND attname = 'embedding' AND NOT attisdropped`).Scan(&current)
	if current != 0 && current != dim {
		if err := db.Exec(`ALTER TABLE knowledge_chunks DROP COLUMN embedding`).Error; err != nil {
			return err
		}
		db.Model(&model.KnowledgeDocument{}).Where("1 = 1").Updates(map[string]any{"sha256": "", "embedded": false})
		current = 0
	}
	if current == 0 {
		if err := db.Exec(fmt.Sprintf(`ALTER TABLE knowledge_chunks ADD COLUMN embedding vector(%d)`, dim)).Error; err != nil {
			return fmt.Errorf("knowledge schema: %w", err)
		}
	}
	// HNSW indexes support at most 2000 dimensions; below that size a
	// sequential scan is fast enough anyway for a course library.
	if dim <= 2000 {
		if err := db.Exec(`CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding
			ON knowledge_chunks USING hnsw (embedding vector_cosine_ops)`).Error; err != nil {
			return fmt.Errorf("knowledge schema: %w", err)
		}
	}
	return nil
}
