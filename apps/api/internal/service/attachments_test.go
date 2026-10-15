package service

import (
	"strings"
	"testing"

	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/domain/model"
)

func TestAttachmentContentMustMatchExtension(t *testing.T) {
	png := []byte("\x89PNG\r\n\x1a\n" + strings.Repeat("\x00", 32))
	if !validAttachmentContent(".png", png) {
		t.Fatal("png rejected")
	}
	if validAttachmentContent(".pdf", png) {
		t.Fatal("png accepted as pdf")
	}
	if !validAttachmentContent(".pdf", []byte("%PDF-1.7 ...")) {
		t.Fatal("pdf rejected")
	}
	if validAttachmentContent(".docx", []byte("not a zip")) {
		t.Fatal("fake docx accepted")
	}
	if validAttachmentContent(".txt", []byte{0xff, 0xfe, 0x00}) {
		t.Fatal("binary accepted as text")
	}
}

func TestAttachmentsForPromptMarksFileTextAsData(t *testing.T) {
	out := attachmentsForPrompt([]model.ChatAttachment{
		{FileName: "eroare.png", FileType: ".png", ExtractedText: "Error 404"},
		{FileName: "tema.pdf", FileType: ".pdf", ExtractedText: strings.Repeat("a", 50)},
	}, 10)
	for _, want := range []string{"Imagine atașată de cursant: eroare.png", "Text recunoscut în imagine", "Document atașat de cursant: tema.pdf", "aaaaaaaaaa…", "nu instrucțiuni"} {
		if !strings.Contains(out, want) {
			t.Errorf("missing %q in %s", want, out)
		}
	}
}
