package monitor

import (
	"context"
	"testing"
	"time"

	"github.com/galacius/galacius-plugins/plugins/resources-monitor/internal/applications/dto"
)

type mockCollector struct {
	cpuErr bool
}

func (m *mockCollector) CollectCPU(ctx context.Context) (*dto.CPUMetric, error) {
	if m.cpuErr {
		return nil, nil
	}
	return &dto.CPUMetric{UsagePercent: 25.5}, nil
}

func (m *mockCollector) CollectMemory(ctx context.Context) (*dto.MemoryMetric, error) {
	return &dto.MemoryMetric{UsedPercent: 50.0}, nil
}

func (m *mockCollector) CollectDiskIO(ctx context.Context) (*dto.DiskIOMetric, error) {
	return &dto.DiskIOMetric{}, nil
}

func (m *mockCollector) GetCapabilities(ctx context.Context) dto.Capabilities {
	return dto.Capabilities{}
}

type mockPublisher struct {
	lastSample dto.ResourcesSample
}

func (m *mockPublisher) Emit(ctx context.Context, eventName string, pluginID string, data interface{}) {
	if sample, ok := data.(dto.ResourcesSample); ok {
		m.lastSample = sample
	}
}

func TestSamplerClampsInterval(t *testing.T) {
	collector := &mockCollector{cpuErr: false}
	publisher := &mockPublisher{}
	sampler := NewSampler(collector, publisher, "test-plugin", 50)

	if sampler.interval != 500*time.Millisecond {
		t.Errorf("expected interval clamped to 500ms, got %v", sampler.interval)
	}
}

func TestSamplerIntervalValidation(t *testing.T) {
	collector := &mockCollector{}
	publisher := &mockPublisher{}

	tests := []struct {
		input    int
		expected time.Duration
	}{
		{100, 500 * time.Millisecond},
		{2000, 2000 * time.Millisecond},
		{100000, 60 * time.Second},
		{500, 500 * time.Millisecond},
		{60000, 60 * time.Second},
	}

	for _, tt := range tests {
		sampler := NewSampler(collector, publisher, "test", tt.input)
		if sampler.interval != tt.expected {
			t.Errorf("interval %d: expected %v, got %v", tt.input, tt.expected, sampler.interval)
		}
	}
}

func TestSamplerReconfigure(t *testing.T) {
	collector := &mockCollector{}
	publisher := &mockPublisher{}
	sampler := NewSampler(collector, publisher, "test", 2000)

	sampler.Reconfigure(5000)
	if sampler.interval != 5*time.Second {
		t.Errorf("expected 5s, got %v", sampler.interval)
	}

	sampler.Reconfigure(100)
	if sampler.interval != 500*time.Millisecond {
		t.Errorf("expected 500ms, got %v", sampler.interval)
	}
}
