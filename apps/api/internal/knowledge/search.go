package knowledge

import (
	"context"
	"os"
	"sort"
	"strconv"

	"gorm.io/gorm"
)

// Result is one retrieved passage with the document it comes from.
type Result struct {
	ChunkID    string  `json:"chunk_id"`
	DocumentID string  `json:"document_id"`
	Title      string  `json:"title"`
	Category   string  `json:"category,omitempty"`
	Path       string  `json:"path"`
	Heading    string  `json:"heading,omitempty"`
	Content    string  `json:"content"`
	PageStart  int     `json:"page_start,omitempty"`
	PageEnd    int     `json:"page_end,omitempty"`
	Score      float64 `json:"score"`
}

// Searcher runs hybrid retrieval: full-text (accent-insensitive, Romanian
// stemming) and, when embeddings are configured, vector similarity. The two
// rankings are merged with reciprocal rank fusion.
type Searcher struct {
	db             *gorm.DB
	embedder       *Embedder
	topK           int
	maxPerDoc      int
	minSimilarity  float64
	candidateCount int
}

func NewSearcher(db *gorm.DB, embedder *Embedder) *Searcher {
	return &Searcher{
		db:             db,
		embedder:       embedder,
		topK:           envInt("RAG_TOP_K", 6),
		maxPerDoc:      envInt("RAG_MAX_CHUNKS_PER_DOC", 3),
		minSimilarity:  envFloat("RAG_MIN_SIMILARITY", 0.25),
		candidateCount: 20,
	}
}

type candidate struct {
	Result
	rank       float64
	similarity float64
}

const resultColumns = `c.id AS chunk_id, c.document_id, d.title, d.category, d.path, c.heading, c.content,
	c.page_start, c.page_end`

// Search returns the best passages for a question. An empty slice means the
// materials do not cover it.
func (s *Searcher) Search(ctx context.Context, query string) ([]Result, error) {
	db := s.db.WithContext(ctx)
	fused := map[string]*candidate{}
	order := []string{}
	add := func(rows []candidate, weight float64) {
		for i := range rows {
			row := rows[i]
			c, ok := fused[row.ChunkID]
			if !ok {
				c = &row
				c.rank = 0
				fused[row.ChunkID] = c
				order = append(order, row.ChunkID)
			}
			if row.similarity > c.similarity {
				c.similarity = row.similarity
			}
			c.rank += weight / float64(60+i+1)
		}
	}

	var textRows []Result
	if err := db.Raw(`
		WITH q AS (
			SELECT replace(plainto_tsquery('romanian', kb_unaccent(?))::text, ' & ', ' | ')::tsquery AS tsq
		)
		SELECT `+resultColumns+`, ts_rank_cd(c.tsv, q.tsq) AS score
		FROM knowledge_chunks c
		JOIN knowledge_documents d ON d.id = c.document_id, q
		WHERE q.tsq::text <> '' AND c.tsv @@ q.tsq
		ORDER BY score DESC
		LIMIT ?`, query, s.candidateCount).Scan(&textRows).Error; err != nil {
		return nil, err
	}
	add(toCandidates(textRows, nil), 1.0)

	if s.embedder.Enabled() {
		vectors, err := s.embedder.Embed(ctx, []string{query})
		if err == nil && len(vectors) == 1 {
			var vectorRows []Result
			if err := db.Raw(`
				SELECT `+resultColumns+`, 1 - (c.embedding <=> ?::vector) AS score
				FROM knowledge_chunks c
				JOIN knowledge_documents d ON d.id = c.document_id
				WHERE c.embedding IS NOT NULL
				ORDER BY c.embedding <=> ?::vector
				LIMIT ?`, vectorLiteral(vectors[0]), vectorLiteral(vectors[0]), s.candidateCount).Scan(&vectorRows).Error; err != nil {
				return nil, err
			}
			kept := vectorRows[:0]
			similarities := []float64{}
			for _, r := range vectorRows {
				if r.Score < s.minSimilarity {
					continue
				}
				kept = append(kept, r)
				similarities = append(similarities, r.Score)
			}
			// Semantic matches understand paraphrases, so they weigh a bit more.
			add(toCandidates(kept, similarities), 1.2)
		}
	}

	ranked := make([]*candidate, 0, len(order))
	for _, id := range order {
		ranked = append(ranked, fused[id])
	}
	sort.SliceStable(ranked, func(i, j int) bool { return ranked[i].rank > ranked[j].rank })

	perDoc := map[string]int{}
	out := make([]Result, 0, s.topK)
	for _, c := range ranked {
		if perDoc[c.DocumentID] >= s.maxPerDoc {
			continue
		}
		perDoc[c.DocumentID]++
		r := c.Result
		r.Score = c.rank
		out = append(out, r)
		if len(out) == s.topK {
			break
		}
	}
	return out, nil
}

func toCandidates(rows []Result, similarities []float64) []candidate {
	out := make([]candidate, len(rows))
	for i, r := range rows {
		out[i] = candidate{Result: r}
		if similarities != nil {
			out[i].similarity = similarities[i]
		}
	}
	return out
}

func envInt(name string, fallback int) int {
	if v, err := strconv.Atoi(os.Getenv(name)); err == nil && v > 0 {
		return v
	}
	return fallback
}

func envFloat(name string, fallback float64) float64 {
	if v, err := strconv.ParseFloat(os.Getenv(name), 64); err == nil {
		return v
	}
	return fallback
}
