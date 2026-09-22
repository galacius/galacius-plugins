package port

import (
	"context"

	"github.com/galacius/galacius-plugins/plugins/resources-monitor/internal/applications/dto"
)

type MetricsCollector interface {
	CollectCPU(ctx context.Context) (*dto.CPUMetric, error)
	CollectMemory(ctx context.Context) (*dto.MemoryMetric, error)
	CollectDiskIO(ctx context.Context) (*dto.DiskIOMetric, error)
	GetCapabilities(ctx context.Context) dto.Capabilities
}

type SettingsStore interface {
	Load(ctx context.Context) (dto.Settings, error)
	Save(ctx context.Context, settings dto.Settings) error
}

type SamplePublisher interface {
	Emit(ctx context.Context, eventName string, pluginID string, data interface{})
}
