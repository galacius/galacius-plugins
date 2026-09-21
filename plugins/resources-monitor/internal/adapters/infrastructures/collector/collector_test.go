package collector

import (
	"context"
	"testing"

	"github.com/galacius/galacius-plugins/plugins/resources-monitor/internal/applications/dto"
)

type testBatteryCollector struct {
	shouldFail bool
}

func (t *testBatteryCollector) CollectBattery(ctx context.Context) (*dto.BatteryMetric, error) {
	if t.shouldFail {
		return nil, nil
	}
	return &dto.BatteryMetric{Percent: 80}, nil
}

func TestCollectorGetCapabilities(t *testing.T) {
	batteryCollector := &testBatteryCollector{shouldFail: false}
	collector := NewGopsutilCollector(batteryCollector)

	caps := collector.GetCapabilities(context.Background())

	if !caps.CPU {
		t.Errorf("CPU capability should be true")
	}
	if !caps.Memory {
		t.Errorf("Memory capability should be true")
	}
	if !caps.Disk {
		t.Errorf("Disk capability should be true")
	}
	if !caps.Network {
		t.Errorf("Network capability should be true")
	}
	if !caps.Uptime {
		t.Errorf("Uptime capability should be true")
	}
}

func TestCollectorCollectCPU(t *testing.T) {
	batteryCollector := &testBatteryCollector{}
	collector := NewGopsutilCollector(batteryCollector)

	metric, err := collector.CollectCPU(context.Background())
	if err != nil {
		t.Fatalf("CollectCPU failed: %v", err)
	}

	if metric == nil {
		t.Fatalf("expected CPU metric, got nil")
	}

	if metric.UsagePercent < 0 || metric.UsagePercent > 100 {
		t.Errorf("CPU usage percent should be between 0 and 100, got %f", metric.UsagePercent)
	}
}

func TestCollectorCollectMemory(t *testing.T) {
	batteryCollector := &testBatteryCollector{}
	collector := NewGopsutilCollector(batteryCollector)

	metric, err := collector.CollectMemory(context.Background())
	if err != nil {
		t.Fatalf("CollectMemory failed: %v", err)
	}

	if metric == nil {
		t.Fatalf("expected memory metric, got nil")
	}

	if metric.TotalBytes == 0 {
		t.Errorf("total bytes should not be 0")
	}
}

func TestCollectorCollectUptime(t *testing.T) {
	batteryCollector := &testBatteryCollector{}
	collector := NewGopsutilCollector(batteryCollector)

	metric, err := collector.CollectUptime(context.Background())
	if err != nil {
		t.Fatalf("CollectUptime failed: %v", err)
	}

	if metric == nil {
		t.Fatalf("expected uptime metric, got nil")
	}

	if metric.UptimeSeconds == 0 {
		t.Errorf("uptime should not be 0")
	}
}
