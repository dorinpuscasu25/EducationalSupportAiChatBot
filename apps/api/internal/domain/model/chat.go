package model

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type Chat struct {
	ID        string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	UserID    string         `gorm:"type:uuid;index;not null" json:"-"`
	User      User           `gorm:"foreignKey:UserID" json:"-"`
	Title     string         `gorm:"size:255" json:"title"`
	Messages  []ChatMessage  `gorm:"foreignKey:ChatID" json:"messages,omitempty"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

type ChatMessage struct {
	ID           string           `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	ChatID       string           `gorm:"type:uuid;index;not null" json:"chat_id"`
	Role         string           `gorm:"size:20;not null" json:"role"` // user | assistant
	Content      string           `gorm:"type:text" json:"content"`
	Sources      datatypes.JSON   `gorm:"type:jsonb" json:"sources,omitempty"`
	Feedback     string           `gorm:"size:30" json:"feedback,omitempty"`
	FeedbackNote string           `gorm:"type:text" json:"feedback_note,omitempty"`
	FeedbackAt   *time.Time       `json:"feedback_at,omitempty"`
	Attachments  []ChatAttachment `gorm:"foreignKey:MessageID" json:"attachments,omitempty"`
	CreatedAt    time.Time        `json:"created_at"`
}

// ChatAttachment is a file a student sent with a question: a screenshot or a
// document. The file stays private on disk; its extracted text is what the
// model reads (images are also sent to the model directly when it can see).
type ChatAttachment struct {
	ID            string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	MessageID     string    `gorm:"type:uuid;index;not null" json:"message_id"`
	FileName      string    `gorm:"size:255" json:"file_name"`
	FileType      string    `gorm:"size:20" json:"file_type"` // extension, e.g. ".pdf"
	MimeType      string    `gorm:"size:100" json:"mime_type"`
	FileSize      int64     `json:"file_size"`
	StoragePath   string    `gorm:"size:500" json:"-"`
	ExtractedText string    `gorm:"type:text" json:"-"`
	CreatedAt     time.Time `json:"created_at"`
}
