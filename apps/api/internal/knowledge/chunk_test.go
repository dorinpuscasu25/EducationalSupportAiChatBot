package knowledge

import (
	"strings"
	"testing"
)

func TestBuildChunksKeepsHeadingsAndPages(t *testing.T) {
	long := strings.Repeat("Cursanții trebuie să predea tema până vineri. ", 60)
	chunks := BuildChunks([]Block{
		{Text: "Modulul 1", Heading: true},
		{Text: "Introducere în curs.", Page: 1},
		{Text: long, Page: 2},
		{Text: "Modulul 2", Heading: true},
		{Text: "Evaluarea finală are loc în ultima săptămână.", Page: 3},
	})
	if len(chunks) < 3 {
		t.Fatalf("expected the long paragraph to be split, got %d chunks", len(chunks))
	}
	if chunks[0].Heading != "Modulul 1" || chunks[0].PageStart != 1 {
		t.Fatalf("first chunk: %+v", chunks[0])
	}
	last := chunks[len(chunks)-1]
	if last.Heading != "Modulul 2" || !strings.Contains(last.Content, "Evaluarea finală") {
		t.Fatalf("last chunk: %+v", last)
	}
	for _, c := range chunks {
		if len(c.Content) > chunkTarget+chunkOverlap+200 {
			t.Fatalf("chunk too long: %d", len(c.Content))
		}
	}
}

func TestJoinLinesRejoinsHyphenation(t *testing.T) {
	got := joinLines("Acesta este un docu-\nment de test\ncu rânduri")
	if got != "Acesta este un document de test cu rânduri" {
		t.Fatalf("got %q", got)
	}
}
