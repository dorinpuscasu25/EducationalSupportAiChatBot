package repository

import (
	"encoding/json"

	"github.com/dorinpuscasu25/EducationalSupportAiChatBot/apps/api/internal/domain/model"
	"gorm.io/gorm"
)

type AuditRepository interface {
	Record(
		actorUserID,
		entityType,
		entityID,
		action string,
		details any,
	) error
	List(entityType, entityID string) ([]model.AuditEvent, error)
	ListRecent(entityType, entityID string, limit int) ([]model.AuditEvent, error)
}

func (r *auditRepository) ListRecent(entityType, entityID string, limit int) ([]model.AuditEvent, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	query := r.db.Order("created_at DESC").Limit(limit)
	if entityType != "" {
		query = query.Where("entity_type = ?", entityType)
	}
	if entityID != "" {
		query = query.Where("entity_id = ?", entityID)
	}
	var events []model.AuditEvent
	err := query.Find(&events).Error
	if events == nil {
		events = []model.AuditEvent{}
	}
	return events, err
}

type auditRepository struct {
	db *gorm.DB
}

func NewAuditRepository(db *gorm.DB) AuditRepository {
	return &auditRepository{db: db}
}

func (r *auditRepository) Record(
	actorUserID,
	entityType,
	entityID,
	action string,
	details any,
) error {
	payload, err := json.Marshal(details)
	if err != nil {
		return err
	}
	if string(payload) == "null" {
		payload = []byte("{}")
	}
	return r.db.Create(&model.AuditEvent{
		ActorUserID: actorUserID,
		EntityType:  entityType,
		EntityID:    entityID,
		Action:      action,
		Details:     payload,
	}).Error
}

func (r *auditRepository) List(
	entityType,
	entityID string,
) ([]model.AuditEvent, error) {
	var events []model.AuditEvent
	err := r.db.
		Where("entity_type = ? AND entity_id = ?", entityType, entityID).
		Order("created_at DESC").
		Find(&events).Error
	return events, err
}
