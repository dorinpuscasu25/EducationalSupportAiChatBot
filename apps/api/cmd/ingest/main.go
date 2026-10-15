// Command ingest indexes the documents folder into the knowledge base and
// exits. It is the same synchronisation the API runs at startup or from the
// admin panel, for use from a terminal or a cron job:
//
//	ingest            index new and changed files, remove deleted ones
//	ingest --force    re-read every file
package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"os"

	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/database"
	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/knowledge"
	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/pkg/logger"
	"github.com/joho/godotenv"
)

func main() {
	force := flag.Bool("force", false, "Re-index every file, even unchanged ones")
	dir := flag.String("dir", "", "Documents folder (default: DOCUMENTS_DIR or ../../documents)")
	flag.Parse()
	_ = godotenv.Load()
	logger.Init("development")
	defer logger.Sync()

	folder := *dir
	if folder == "" {
		folder = os.Getenv("DOCUMENTS_DIR")
	}
	if folder == "" {
		folder = "../../documents"
	}

	embedder := knowledge.NewEmbedderFromEnv()
	db, err := database.SetupDB(embedder.Dim())
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	report, err := knowledge.NewIndexer(db, embedder, folder).Sync(context.Background(), *force)
	if report != nil {
		out, _ := json.MarshalIndent(report, "", "  ")
		fmt.Println(string(out))
	}
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
