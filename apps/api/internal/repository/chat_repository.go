package repository

import (
	"fmt"
	"time"

	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/domain/model"
	"gorm.io/gorm"
)

type ChatRepository interface {
	CreateChat(chat model.Chat) (*model.Chat, error)
	GetChatByID(id string) (*model.Chat, error)
	GetChatWithMessages(id string) (*model.Chat, error)
	ListChatsByUserID(userID string) ([]model.Chat, error)
	PatchChat(id string, updates map[string]interface{}) error
	DeleteChat(id string) error
	AddMessage(msg model.ChatMessage) (*model.ChatMessage, error)
	AddAttachment(att model.ChatAttachment) (*model.ChatAttachment, error)
	GetMessageByID(id string) (*model.ChatMessage, error)
	GetAttachment(chatID, attachmentID string) (*model.ChatAttachment, error)
	PatchMessage(id string, updates map[string]interface{}) error
}

type chatRepository struct {
	db *gorm.DB
}

func NewChatRepository(db *gorm.DB) ChatRepository {
	return &chatRepository{db: db}
}

func (r *chatRepository) CreateChat(chat model.Chat) (*model.Chat, error) {
	if err := r.db.Create(&chat).Error; err != nil {
		return nil, err
	}
	return &chat, nil
}

func (r *chatRepository) GetChatByID(id string) (*model.Chat, error) {
	var chat model.Chat
	if err := r.db.First(&chat, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &chat, nil
}

func (r *chatRepository) GetChatWithMessages(id string) (*model.Chat, error) {
	var chat model.Chat
	if err := r.db.
		Preload("Messages", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at ASC")
		}).
		Preload("Messages.Attachments").
		First(&chat, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &chat, nil
}

func (r *chatRepository) ListChatsByUserID(userID string) ([]model.Chat, error) {
	var chats []model.Chat
	if err := r.db.
		Where("user_id = ? AND deleted_at IS NULL", userID).
		Order("updated_at DESC").
		Find(&chats).Error; err != nil {
		return nil, err
	}
	return chats, nil
}

func (r *chatRepository) PatchChat(id string, updates map[string]interface{}) error {
	if id == "" {
		return fmt.Errorf("id is required")
	}
	if _, ok := updates["updated_at"]; !ok {
		updates["updated_at"] = time.Now()
	}
	return r.db.Model(&model.Chat{}).Where("id = ?", id).Updates(updates).Error
}

func (r *chatRepository) DeleteChat(id string) error {
	return r.db.Delete(&model.Chat{}, "id = ?", id).Error
}

func (r *chatRepository) AddMessage(msg model.ChatMessage) (*model.ChatMessage, error) {
	if err := r.db.Create(&msg).Error; err != nil {
		return nil, err
	}
	return &msg, nil
}

func (r *chatRepository) GetMessageByID(id string) (*model.ChatMessage, error) {
	var message model.ChatMessage
	if err := r.db.First(&message, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &message, nil
}

func (r *chatRepository) PatchMessage(id string, updates map[string]interface{}) error {
	if id == "" {
		return fmt.Errorf("id is required")
	}
	return r.db.Model(&model.ChatMessage{}).Where("id = ?", id).Updates(updates).Error
}

// GetAttachment returns an attachment only if it belongs to a message of the chat.
func (r *chatRepository) GetAttachment(chatID, attachmentID string) (*model.ChatAttachment, error) {
	var att model.ChatAttachment
	if err := r.db.
		Joins("JOIN chat_messages ON chat_messages.id = chat_attachments.message_id").
		Where("chat_attachments.id = ? AND chat_messages.chat_id = ?", attachmentID, chatID).
		First(&att).Error; err != nil {
		return nil, err
	}
	return &att, nil
}

func (r *chatRepository) AddAttachment(att model.ChatAttachment) (*model.ChatAttachment, error) {
	if err := r.db.Create(&att).Error; err != nil {
		return nil, err
	}
	return &att, nil
}
