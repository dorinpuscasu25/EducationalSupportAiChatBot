package knowledge

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"
)

// Block is a unit of extracted text: a paragraph, a heading or a page of OCR
// output. Page is 1-based and 0 when the format has no pages.
type Block struct {
	Text    string
	Heading bool
	Page    int
}

// SupportedExtensions lists the file types the indexer reads.
var SupportedExtensions = map[string]bool{
	".pdf":  true,
	".docx": true,
	".pptx": true,
	".txt":  true,
	".md":   true,
}

// ErrNoText means the file was read but contained no extractable text.
var ErrNoText = errors.New("documentul nu conține text extractibil")

// Extract reads a file and returns its text as ordered blocks.
func Extract(ctx context.Context, path string) ([]Block, error) {
	ext := strings.ToLower(filepath.Ext(path))
	var (
		blocks []Block
		err    error
	)
	switch ext {
	case ".pdf":
		blocks, err = extractPDF(ctx, path)
	case ".docx":
		blocks, err = extractDOCX(path)
	case ".pptx":
		blocks, err = extractPPTX(path)
	case ".txt", ".md":
		blocks, err = extractPlain(path, ext == ".md")
	default:
		return nil, fmt.Errorf("format neacceptat: %s", ext)
	}
	if err != nil {
		return nil, err
	}
	total := 0
	for _, b := range blocks {
		total += len(strings.TrimSpace(b.Text))
	}
	if total == 0 {
		return nil, ErrNoText
	}
	return blocks, nil
}

// ─── Plain text / Markdown ───────────────────────────────────────────────────

func extractPlain(path string, markdown bool) ([]Block, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	if !utf8.Valid(data) {
		return nil, errors.New("fișierul text nu este în UTF-8")
	}
	text := strings.ReplaceAll(string(data), "\r\n", "\n")
	var blocks []Block
	for _, para := range splitParagraphs(text) {
		if markdown && strings.HasPrefix(para, "#") && !strings.Contains(para, "\n") {
			blocks = append(blocks, Block{Text: strings.TrimSpace(strings.TrimLeft(para, "#")), Heading: true})
			continue
		}
		blocks = append(blocks, Block{Text: para})
	}
	return blocks, nil
}

func splitParagraphs(text string) []string {
	var out []string
	for _, part := range regexp.MustCompile(`\n\s*\n`).Split(text, -1) {
		if p := strings.TrimSpace(part); p != "" {
			out = append(out, p)
		}
	}
	return out
}

// ─── PDF (poppler pdftotext, OCR fallback with tesseract) ────────────────────

func extractPDF(ctx context.Context, path string) ([]Block, error) {
	if _, err := exec.LookPath("pdftotext"); err != nil {
		return nil, errors.New("pdftotext (poppler-utils) nu este instalat")
	}
	runCtx, cancel := context.WithTimeout(ctx, 2*time.Minute)
	defer cancel()
	out, err := exec.CommandContext(runCtx, "pdftotext", "-enc", "UTF-8", path, "-").Output()
	if err != nil {
		return nil, fmt.Errorf("pdftotext: %w", err)
	}
	pages := strings.Split(string(out), "\f")
	var blocks []Block
	chars := 0
	for i, page := range pages {
		for _, para := range splitParagraphs(page) {
			blocks = append(blocks, Block{Text: joinLines(para), Page: i + 1})
			chars += len(para)
		}
	}
	// A scanned PDF yields (almost) no text layer; OCR it when possible.
	if chars < 40*maxInt(1, len(pages)-1) && ocrEnabled() {
		if ocr, ocrErr := ocrPDF(ctx, path); ocrErr == nil && len(ocr) > 0 {
			return ocr, nil
		}
	}
	return blocks, nil
}

// joinLines turns hard-wrapped PDF lines into one paragraph, re-joining words
// hyphenated across a line break.
func joinLines(para string) string {
	out := ""
	for _, line := range strings.Split(para, "\n") {
		line = strings.TrimSpace(line)
		switch {
		case line == "":
		case out == "":
			out = line
		case strings.HasSuffix(out, "-"):
			out = strings.TrimSuffix(out, "-") + line
		default:
			out += " " + line
		}
	}
	return out
}

func ocrEnabled() bool {
	if os.Getenv("OCR_ENABLED") == "false" {
		return false
	}
	_, e1 := exec.LookPath("pdftoppm")
	_, e2 := exec.LookPath("tesseract")
	return e1 == nil && e2 == nil
}

func ocrLanguages() string {
	if v := strings.TrimSpace(os.Getenv("OCR_LANGUAGES")); v != "" {
		return v
	}
	return "ron+eng"
}

func ocrPDF(ctx context.Context, path string) ([]Block, error) {
	dir, err := os.MkdirTemp("", "ocr-*")
	if err != nil {
		return nil, err
	}
	defer os.RemoveAll(dir)
	runCtx, cancel := context.WithTimeout(ctx, 20*time.Minute)
	defer cancel()
	if err := exec.CommandContext(runCtx, "pdftoppm", "-r", "200", "-png", path, filepath.Join(dir, "p")).Run(); err != nil {
		return nil, fmt.Errorf("pdftoppm: %w", err)
	}
	images, _ := filepath.Glob(filepath.Join(dir, "p-*.png"))
	pageOf := func(name string) int {
		base := strings.TrimSuffix(filepath.Base(name), ".png")
		n, _ := strconv.Atoi(base[strings.LastIndex(base, "-")+1:])
		return n
	}
	sort.Slice(images, func(i, j int) bool { return pageOf(images[i]) < pageOf(images[j]) })
	var blocks []Block
	for _, img := range images {
		out, err := exec.CommandContext(runCtx, "tesseract", img, "stdout", "-l", ocrLanguages()).Output()
		if err != nil {
			continue
		}
		for _, para := range splitParagraphs(string(out)) {
			blocks = append(blocks, Block{Text: joinLines(para), Page: pageOf(img)})
		}
	}
	return blocks, nil
}

// ─── DOCX ────────────────────────────────────────────────────────────────────

func extractDOCX(path string) ([]Block, error) {
	zr, err := zip.OpenReader(path)
	if err != nil {
		return nil, fmt.Errorf("docx invalid: %w", err)
	}
	defer zr.Close()
	data, err := readZipEntry(&zr.Reader, "word/document.xml")
	if err != nil {
		return nil, err
	}
	dec := xml.NewDecoder(bytes.NewReader(data))
	var (
		blocks    []Block
		para      strings.Builder
		heading   bool
		inText    bool
		cellCount int
	)
	flush := func() {
		if t := strings.TrimSpace(para.String()); t != "" {
			blocks = append(blocks, Block{Text: t, Heading: heading})
		}
		para.Reset()
		heading = false
	}
	for {
		tok, err := dec.Token()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("docx xml: %w", err)
		}
		switch t := tok.(type) {
		case xml.StartElement:
			switch t.Name.Local {
			case "t":
				inText = true
			case "tab":
				para.WriteString("\t")
			case "br", "cr":
				para.WriteString("\n")
			case "pStyle":
				for _, a := range t.Attr {
					if a.Name.Local == "val" {
						v := strings.ToLower(a.Value)
						heading = strings.HasPrefix(v, "heading") || strings.HasPrefix(v, "titlu") || v == "title"
					}
				}
			case "tr":
				cellCount = 0
			case "tc":
				if cellCount > 0 {
					para.WriteString(" | ")
				}
				cellCount++
			}
		case xml.EndElement:
			switch t.Name.Local {
			case "t":
				inText = false
			case "p":
				// Paragraphs inside a table cell stay on the row's line.
				if cellCount == 0 {
					flush()
				} else {
					para.WriteString(" ")
				}
			case "tr":
				cellCount = 0
				flush()
			}
		case xml.CharData:
			if inText {
				para.Write(t)
			}
		}
	}
	flush()
	return blocks, nil
}

// ─── PPTX (one page per slide) ───────────────────────────────────────────────

var slideName = regexp.MustCompile(`^ppt/slides/slide(\d+)\.xml$`)

func extractPPTX(path string) ([]Block, error) {
	zr, err := zip.OpenReader(path)
	if err != nil {
		return nil, fmt.Errorf("pptx invalid: %w", err)
	}
	defer zr.Close()
	type slide struct {
		n    int
		file *zip.File
	}
	var slides []slide
	for _, f := range zr.File {
		if m := slideName.FindStringSubmatch(f.Name); m != nil {
			n, _ := strconv.Atoi(m[1])
			slides = append(slides, slide{n, f})
		}
	}
	sort.Slice(slides, func(i, j int) bool { return slides[i].n < slides[j].n })
	var blocks []Block
	for _, s := range slides {
		rc, err := s.file.Open()
		if err != nil {
			continue
		}
		data, _ := io.ReadAll(io.LimitReader(rc, 20<<20))
		rc.Close()
		dec := xml.NewDecoder(bytes.NewReader(data))
		var para strings.Builder
		inText := false
		first := true
		for {
			tok, err := dec.Token()
			if err != nil {
				break
			}
			switch t := tok.(type) {
			case xml.StartElement:
				inText = t.Name.Local == "t"
			case xml.EndElement:
				if t.Name.Local == "t" {
					inText = false
				}
				if t.Name.Local == "p" {
					if txt := strings.TrimSpace(para.String()); txt != "" {
						// The first paragraph of a slide is almost always its title.
						blocks = append(blocks, Block{Text: txt, Heading: first, Page: s.n})
						first = false
					}
					para.Reset()
				}
			case xml.CharData:
				if inText {
					para.Write(t)
				}
			}
		}
	}
	return blocks, nil
}

func readZipEntry(zr *zip.Reader, name string) ([]byte, error) {
	for _, f := range zr.File {
		if f.Name == name {
			if f.UncompressedSize64 > 100<<20 {
				return nil, errors.New("conținut prea mare")
			}
			rc, err := f.Open()
			if err != nil {
				return nil, err
			}
			defer rc.Close()
			return io.ReadAll(rc)
		}
	}
	return nil, fmt.Errorf("lipsește %s", name)
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}
