package collector

import (
	"context"
	"runtime"
	"testing"
)

func TestCollectorGetCapabilities(t *testing.T) {
	collector := NewGopsutilCollector()

	caps := collector.GetCapabilities(context.Background())

	if !caps.CPU {
		t.Errorf("CPU capability should be true")
	}
	if !caps.Memory {
		t.Errorf("Memory capability should be true")
	}
	wantDiskIO := runtime.GOOS != "darwin"
	if caps.DiskIO != wantDiskIO {
		t.Errorf("DiskIO capability should be %v on %s, got %v", wantDiskIO, runtime.GOOS, caps.DiskIO)
	}
}

func TestCollectorCollectCPU(t *testing.T) {
	collector := NewGopsutilCollector()

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
	collector := NewGopsutilCollector()

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

func TestCollectorCollectDiskIO(t *testing.T) {
	collector := NewGopsutilCollector()

	metric, err := collector.CollectDiskIO(context.Background())
	if err != nil {
		t.Fatalf("CollectDiskIO failed: %v", err)
	}

	if metric == nil {
		t.Fatalf("expected disk IO metric, got nil")
	}

	// First sample always yields 0 throughput (no prior counters to diff
	// against), regardless of platform support.
	if metric.ReadBytesPerSec != 0 {
		t.Errorf("expected 0 read bytes/sec on first sample, got %f", metric.ReadBytesPerSec)
	}
	if metric.WriteBytesPerSec != 0 {
		t.Errorf("expected 0 write bytes/sec on first sample, got %f", metric.WriteBytesPerSec)
	}
}
