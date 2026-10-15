package model

import (
	"time"

	"gorm.io/datatypes"
)

// AuditEvent is append-only and records privileged actions (admin reads of
// conversations, approvals, operator provisioning). Details hold metadata only.
type AuditEvent struct {
	ID          string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	ActorUserID string         `gorm:"type:uuid;not null;index" json:"actor_user_id"`
	EntityType  string         `gorm:"size:50;not null;index" json:"entity_type"`
	EntityID    string         `gorm:"type:uuid;not null;index" json:"entity_id"`
	Action      string         `gorm:"size:100;not null;index" json:"action"`
	Details     datatypes.JSON `gorm:"type:jsonb;not null;default:'{}'" json:"details"`
	CreatedAt   time.Time      `gorm:"index" json:"created_at"`
}
