package collector

import (
	"context"
	"fmt"

	"github.com/shirou/gopsutil/v4/cpu"
	"github.com/shirou/gopsutil/v4/disk"
	"github.com/shirou/gopsutil/v4/host"
	"github.com/shirou/gopsutil/v4/load"
	"github.com/shirou/gopsutil/v4/mem"
	"github.com/shirou/gopsutil/v4/net"

	"github.com/galacius/galacius-plugins/plugins/resources-monitor/internal/applications/dto"
	"github.com/galacius/galacius-plugins/plugins/resources-monitor/internal/applications/port"
)

type GopsutilCollector struct {
	batteryCollector BatteryCollector
}

type BatteryCollector interface {
	CollectBattery(ctx context.Context) (*dto.BatteryMetric, error)
}

func NewGopsutilCollector(batteryCollector BatteryCollector) port.MetricsCollector {
	return &GopsutilCollector{
		batteryCollector: batteryCollector,
	}
}

func (c *GopsutilCollector) CollectCPU(ctx context.Context) (*dto.CPUMetric, error) {
	percent, err := cpu.PercentWithContext(ctx, 0, false)
	if err != nil {
		return nil, fmt.Errorf("collect cpu: %w", err)
	}

	perCorePercent, err := cpu.PercentWithContext(ctx, 0, true)
	if err != nil {
		return nil, fmt.Errorf("collect per-core cpu: %w", err)
	}

	perCore := make([]uint64, len(perCorePercent))
	for i, p := range perCorePercent {
		perCore[i] = uint64(p)
	}

	return &dto.CPUMetric{
		UsagePercent: percent[0],
		PerCore:      perCore,
	}, nil
}

func (c *GopsutilCollector) CollectMemory(ctx context.Context) (*dto.MemoryMetric, error) {
	vm, err := mem.VirtualMemoryWithContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("collect memory: %w", err)
	}

	swap, err := mem.SwapMemoryWithContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("collect swap: %w", err)
	}

	return &dto.MemoryMetric{
		UsedPercent:    vm.UsedPercent,
		UsedBytes:      vm.Used,
		TotalBytes:     vm.Total,
		SwapPercent:    swap.UsedPercent,
		SwapUsedBytes:  swap.Used,
		SwapTotalBytes: swap.Total,
	}, nil
}

func (c *GopsutilCollector) CollectDisk(ctx context.Context) (*dto.DiskMetrics, error) {
	partitions, err := disk.PartitionsWithContext(ctx, false)
	if err != nil {
		return nil, fmt.Errorf("collect disk partitions: %w", err)
	}

	var disks []dto.DiskMetric
	for _, partition := range partitions {
		usage, err := disk.UsageWithContext(ctx, partition.Mountpoint)
		if err != nil {
			continue
		}
		disks = append(disks, dto.DiskMetric{
			Path:        partition.Mountpoint,
			UsedPercent: usage.UsedPercent,
			UsedBytes:   usage.Used,
			TotalBytes:  usage.Total,
		})
	}

	return &dto.DiskMetrics{Disks: disks}, nil
}

func (c *GopsutilCollector) CollectNetwork(ctx context.Context) (*dto.NetworkMetrics, error) {
	counters, err := net.IOCountersWithContext(ctx, true)
	if err != nil {
		return nil, fmt.Errorf("collect network counters: %w", err)
	}

	var metrics []dto.NetworkMetric
	for _, counter := range counters {
		metrics = append(metrics, dto.NetworkMetric{
			Name:        counter.Name,
			BytesSent:   counter.BytesSent,
			BytesRecv:   counter.BytesRecv,
			PacketsSent: counter.PacketsSent,
			PacketsRecv: counter.PacketsRecv,
		})
	}

	return &dto.NetworkMetrics{Interfaces: metrics}, nil
}

func (c *GopsutilCollector) CollectBattery(ctx context.Context) (*dto.BatteryMetric, error) {
	if c.batteryCollector == nil {
		return nil, fmt.Errorf("battery collector not available")
	}
	return c.batteryCollector.CollectBattery(ctx)
}

func (c *GopsutilCollector) CollectLoadAverage(ctx context.Context) (*dto.LoadAverageMetric, error) {
	avg, err := load.AvgWithContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("collect load average: %w", err)
	}

	return &dto.LoadAverageMetric{
		Load1:  avg.Load1,
		Load5:  avg.Load5,
		Load15: avg.Load15,
	}, nil
}

func (c *GopsutilCollector) CollectUptime(ctx context.Context) (*dto.UptimeMetric, error) {
	uptime, err := host.UptimeWithContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("collect uptime: %w", err)
	}

	return &dto.UptimeMetric{
		UptimeSeconds: uptime,
	}, nil
}

func (c *GopsutilCollector) GetCapabilities(ctx context.Context) dto.Capabilities {
	caps := dto.Capabilities{
		CPU:     true,
		Memory:  true,
		Disk:    true,
		Network: true,
		Uptime:  true,
	}

	_, err := load.AvgWithContext(ctx)
	caps.LoadAverage = err == nil

	_, err = c.CollectBattery(ctx)
	caps.Battery = err == nil

	return caps
}
