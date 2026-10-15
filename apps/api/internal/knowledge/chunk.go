package knowledge

import (
	"regexp"
	"strings"
	"unicode/utf8"
)

// Chunk is a passage ready to be indexed.
type Chunk struct {
	Ordinal   int
	Heading   string
	Content   string
	PageStart int
	PageEnd   int
}

// Chunking limits, in characters. A chunk of ~1500 characters is a few
// paragraphs: enough context for an answer, small enough to rank precisely.
const (
	chunkTarget  = 1500
	chunkOverlap = 250
)

var sentenceEnd = regexp.MustCompile(`([.!?;:])\s+`)

// BuildChunks groups blocks into overlapping passages, remembering the most
// recent heading so each passage knows which section it belongs to.
func BuildChunks(blocks []Block) []Chunk {
	var (
		chunks  []Chunk
		parts   []Block
		size    int
		heading string
	)
	emit := func() {
		if len(parts) == 0 {
			return
		}
		texts := make([]string, 0, len(parts))
		for _, p := range parts {
			texts = append(texts, p.Text)
		}
		chunks = append(chunks, Chunk{
			Ordinal:   len(chunks),
			Heading:   heading,
			Content:   strings.Join(texts, "\n\n"),
			PageStart: parts[0].Page,
			PageEnd:   parts[len(parts)-1].Page,
		})
		// Carry the tail over so a sentence split across chunks stays findable.
		var keep []Block
		kept := 0
		for i := len(parts) - 1; i >= 0 && kept+len(parts[i].Text) <= chunkOverlap; i-- {
			keep = append([]Block{parts[i]}, keep...)
			kept += len(parts[i].Text)
		}
		parts, size = keep, kept
	}

	for _, block := range blocks {
		text := strings.TrimSpace(block.Text)
		if text == "" {
			continue
		}
		if block.Heading && len(text) < 300 {
			emit()
			parts, size = nil, 0
			heading = text
			continue
		}
		for _, piece := range splitLong(text) {
			if size+len(piece) > chunkTarget && size > 0 {
				emit()
			}
			parts = append(parts, Block{Text: piece, Page: block.Page})
			size += len(piece)
		}
	}
	// Do not emit a final chunk that is only overlap from the previous one.
	if len(chunks) == 0 || size > chunkOverlap || !isTail(parts, chunks[len(chunks)-1]) {
		emit()
	}
	return chunks
}

func isTail(parts []Block, last Chunk) bool {
	for _, p := range parts {
		if !strings.Contains(last.Content, p.Text) {
			return false
		}
	}
	return true
}

// splitLong breaks an oversized paragraph on sentence boundaries.
func splitLong(text string) []string {
	if len(text) <= chunkTarget {
		return []string{text}
	}
	marked := sentenceEnd.ReplaceAllString(text, "$1\x00")
	var (
		out []string
		cur strings.Builder
	)
	for _, sentence := range strings.Split(marked, "\x00") {
		if cur.Len()+len(sentence) > chunkTarget && cur.Len() > 0 {
			out = append(out, strings.TrimSpace(cur.String()))
			cur.Reset()
		}
		// A single "sentence" longer than the target (tables, lists) is cut hard.
		for len(sentence) > chunkTarget {
			cut := strings.LastIndex(sentence[:chunkTarget], " ")
			if cut <= 0 {
				cut = chunkTarget
				for cut > 0 && !utf8.RuneStart(sentence[cut]) {
					cut--
				}
			}
			out = append(out, strings.TrimSpace(sentence[:cut]))
			sentence = sentence[cut:]
		}
		cur.WriteString(sentence)
		cur.WriteString(" ")
	}
	if s := strings.TrimSpace(cur.String()); s != "" {
		out = append(out, s)
	}
	return out
}
