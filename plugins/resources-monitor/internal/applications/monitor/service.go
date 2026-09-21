package monitor

import (
	"context"
	"fmt"
	"sync"

	"github.com/galacius/galacius-plugins/plugins/resources-monitor/internal/applications/dto"
	"github.com/galacius/galacius-plugins/plugins/resources-monitor/internal/applications/port"
)

type Service struct {
	sampler        *Sampler
	settingsStore  port.SettingsStore
	collector      port.MetricsCollector
	publisher      port.SamplePublisher
	capabilities   dto.Capabilities
	settingsMu     sync.RWMutex
	currentSettings dto.Settings
}

func NewService(
	collector port.MetricsCollector,
	settingsStore port.SettingsStore,
	publisher port.SamplePublisher,
	pluginID string,
) (*Service, error) {
	ctx := context.Background()

	settings, err := settingsStore.Load(ctx)
	if err != nil {
		return nil, fmt.Errorf("load settings: %w", err)
	}

	sampler := NewSampler(collector, publisher, pluginID, settings.IntervalMs)
	sampler.Start(ctx)

	svc := &Service{
		sampler:         sampler,
		settingsStore:   settingsStore,
		collector:       collector,
		publisher:       publisher,
		capabilities:    collector.GetCapabilities(ctx),
		currentSettings: settings,
	}

	return svc, nil
}

func (s *Service) GetSnapshot(ctx context.Context) (dto.ResourcesSample, error) {
	return s.sampler.GetCurrentSample(), nil
}

func (s *Service) GetSettings(ctx context.Context) (dto.Settings, error) {
	s.settingsMu.RLock()
	defer s.settingsMu.RUnlock()
	return s.currentSettings, nil
}

func (s *Service) SaveSettings(ctx context.Context, settings dto.Settings) error {
	settings.IntervalMs = validateInterval(settings.IntervalMs)
	settings.SchemaVersion = 1

	if err := s.settingsStore.Save(ctx, settings); err != nil {
		return fmt.Errorf("save settings: %w", err)
	}

	s.settingsMu.Lock()
	s.currentSettings = settings
	s.settingsMu.Unlock()

	s.sampler.Reconfigure(settings.IntervalMs)
	s.publisher.Emit(ctx, "plugins.resources-monitor.metrics:settings:changed", "", settings)

	return nil
}

func (s *Service) GetCapabilities(ctx context.Context) dto.Capabilities {
	return s.capabilities
}

func (s *Service) ResetSettings(ctx context.Context) error {
	defaultSettings := dto.DefaultSettings()
	return s.SaveSettings(ctx, defaultSettings)
}

func (s *Service) Stop() {
	s.sampler.Stop()
}

func validateInterval(intervalMs int) int {
	if intervalMs < 500 {
		return 500
	}
	if intervalMs > 60000 {
		return 60000
	}
	return intervalMs
}
