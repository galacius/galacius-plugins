package port

import (
	"context"

	"github.com/galacius/galacius-plugins/plugins/resources-monitor/internal/applications/dto"
)

type MonitorService interface {
	GetSnapshot(ctx context.Context) (dto.ResourcesSample, error)
	GetSettings(ctx context.Context) (dto.Settings, error)
	SaveSettings(ctx context.Context, settings dto.Settings) error
	GetCapabilities(ctx context.Context) dto.Capabilities
	ResetSettings(ctx context.Context) error
}
