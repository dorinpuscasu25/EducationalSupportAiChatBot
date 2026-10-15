package service

import (
	"strings"
	"testing"
)

func TestRenderHTMLEscapesUserText(t *testing.T) {
	// Names come from registration, so they are attacker-controlled.
	content := emailContent{
		Title: "Confirmă-ți adresa",
		Intro: `Salut <script>alert("x")</script> & co, `,
		Code:  "123456",
	}
	got := renderHTML(content)

	if strings.Contains(got, "<script>") {
		t.Fatal("script tag survived into the message body")
	}
	if !strings.Contains(got, "&lt;script&gt;") {
		t.Fatal("expected the tag to be escaped, not dropped")
	}
	if !strings.Contains(got, "&amp; co") {
		t.Fatal("ampersand must be escaped")
	}
}

func TestRenderHTMLIncludesCodeAndPreheader(t *testing.T) {
	got := renderHTML(emailContent{
		Title:     "Resetează-ți parola",
		Preheader: "Codul expiră în 15 minute.",
		Code:      "482913",
	})

	if !strings.Contains(got, "482913") {
		t.Fatal("code missing from the message")
	}
	if !strings.Contains(got, "Codul expiră în 15 minute.") {
		t.Fatal("preheader missing")
	}
	// Clients that invert dark designs make the code unreadable.
	if !strings.Contains(got, `name="color-scheme" content="dark"`) {
		t.Fatal("colour-scheme hint missing")
	}
}

func TestRenderTextCarriesEverythingHTMLDoes(t *testing.T) {
	content := emailContent{
		Title:    "Contul tău e activ",
		Intro:    "Salut Ana, contul tău a fost activat.",
		Code:     "000111",
		CodeNote: "Codul expiră în 15 minute.",
		Body:     []string{"Intră pe https://academie.example.com"},
		Footer:   "Ești în beta.",
	}
	got := renderText(content)

	for _, want := range []string{
		content.Title, content.Intro, content.Code,
		content.CodeNote, content.Body[0], content.Footer,
	} {
		if !strings.Contains(got, want) {
			t.Fatalf("plain-text part is missing %q", want)
		}
	}
	// The preheader is an inbox-preview trick; it has no place in the body.
	if strings.Contains(got, "<") {
		t.Fatal("plain-text part contains markup")
	}
}

func TestGreetingHandlesMissingName(t *testing.T) {
	if got := greeting(""); got != "Salut, " {
		t.Fatalf("got %q", got)
	}
	if got := greeting("  Ana  "); got != "Salut Ana, " {
		t.Fatalf("got %q", got)
	}
}
