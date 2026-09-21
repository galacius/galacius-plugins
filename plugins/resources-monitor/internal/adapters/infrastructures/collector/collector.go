package collector

import (
	"context"
	"fmt"
	"os"
	"runtime"
	"sync"
	"time"

	"github.com/shirou/gopsutil/v4/mem"
	gopsprocess "github.com/shirou/gopsutil/v4/process"

	"github.com/galacius/galacius-plugins/plugins/resources-monitor/internal/applications/dto"
	"github.com/galacius/galacius-plugins/plugins/resources-monitor/internal/applications/port"
)

// diskIOSupported is true on platforms where gopsutil's per-process
// IOCountersWithContext is actually implemented (Linux, Windows). On macOS it
// always returns ErrNotImplementedError, so the capability is reported as
// unavailable there instead of silently returning zeroes.
const diskIOSupported = runtime.GOOS != "darwin"

type ioSample struct {
	readBytes  uint64
	writeBytes uint64
	at         time.Time
}

type GopsutilCollector struct {
	mu        sync.Mutex
	processes map[int32]*gopsprocess.Process
	lastIO    map[int32]ioSample
}

func NewGopsutilCollector() port.MetricsCollector {
	return &GopsutilCollector{
		processes: make(map[int32]*gopsprocess.Process),
		lastIO:    make(map[int32]ioSample),
	}
}

func (c *GopsutilCollector) getOrCreateProcess(ctx context.Context, pid int32) (*gopsprocess.Process, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if p, ok := c.processes[pid]; ok {
		return p, nil
	}

	p, err := gopsprocess.NewProcessWithContext(ctx, pid)
	if err != nil {
		return nil, err
	}

	c.processes[pid] = p
	return p, nil
}

// appProcesses resolves the set of processes that make up this app: the host
// process (this plugin's parent) plus its direct children, which includes
// sibling plugin subprocesses and this plugin itself. If the parent can't be
// resolved (e.g. running standalone during development), it falls back to
// just this plugin's own process.
func (c *GopsutilCollector) appProcesses(ctx context.Context) []*gopsprocess.Process {
	hostPid := int32(os.Getppid())

	host, err := c.getOrCreateProcess(ctx, hostPid)
	if err != nil {
		self, selfErr := c.getOrCreateProcess(ctx, int32(os.Getpid()))
		if selfErr != nil {
			return nil
		}
		return []*gopsprocess.Process{self}
	}

	children, err := host.ChildrenWithContext(ctx)
	if err != nil {
		return []*gopsprocess.Process{host}
	}

	processes := make([]*gopsprocess.Process, 0, len(children)+1)
	processes = append(processes, host)
	for _, child := range children {
		cached, err := c.getOrCreateProcess(ctx, child.Pid)
		if err != nil {
			continue
		}
		processes = append(processes, cached)
	}

	return processes
}

func (c *GopsutilCollector) CollectCPU(ctx context.Context) (*dto.CPUMetric, error) {
	processes := c.appProcesses(ctx)

	var total float64
	usages := make([]dto.ProcessCPUUsage, 0, len(processes))
	for _, p := range processes {
		percent, err := p.PercentWithContext(ctx, 0)
		if err != nil {
			continue
		}
		name, err := p.NameWithContext(ctx)
		if err != nil {
			name = "unknown"
		}
		total += percent
		usages = append(usages, dto.ProcessCPUUsage{
			Name:    name,
			Pid:     p.Pid,
			Percent: percent,
		})
	}

	numCPU := max(runtime.NumCPU(), 1)

	return &dto.CPUMetric{
		UsagePercent: total / float64(numCPU),
		Processes:    usages,
	}, nil
}

func (c *GopsutilCollector) CollectMemory(ctx context.Context) (*dto.MemoryMetric, error) {
	vm, err := mem.VirtualMemoryWithContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("collect memory: %w", err)
	}

	processes := c.appProcesses(ctx)

	var totalBytes uint64
	usages := make([]dto.ProcessMemoryUsage, 0, len(processes))
	for _, p := range processes {
		info, err := p.MemoryInfoWithContext(ctx)
		if err != nil {
			continue
		}
		name, err := p.NameWithContext(ctx)
		if err != nil {
			name = "unknown"
		}
		totalBytes += info.RSS
		usages = append(usages, dto.ProcessMemoryUsage{
			Name:  name,
			Pid:   p.Pid,
			Bytes: info.RSS,
		})
	}

	var usedPercent float64
	if vm.Total > 0 {
		usedPercent = float64(totalBytes) / float64(vm.Total) * 100
	}

	return &dto.MemoryMetric{
		UsedPercent: usedPercent,
		UsedBytes:   totalBytes,
		TotalBytes:  vm.Total,
		Processes:   usages,
	}, nil
}

// diskIORate returns this process's read/write throughput in bytes/sec since
// the last call for this pid, using cached cumulative counters. The first
// call for a given pid always yields 0 (no prior sample to diff against).
func (c *GopsutilCollector) diskIORate(pid int32, counters *gopsprocess.IOCountersStat) (readPerSec, writePerSec float64) {
	now := time.Now()

	c.mu.Lock()
	defer c.mu.Unlock()

	prev, ok := c.lastIO[pid]
	c.lastIO[pid] = ioSample{readBytes: counters.ReadBytes, writeBytes: counters.WriteBytes, at: now}

	if !ok {
		return 0, 0
	}

	elapsed := now.Sub(prev.at).Seconds()
	if elapsed <= 0 {
		return 0, 0
	}

	readDelta := diffUint64(counters.ReadBytes, prev.readBytes)
	writeDelta := diffUint64(counters.WriteBytes, prev.writeBytes)

	return float64(readDelta) / elapsed, float64(writeDelta) / elapsed
}

func diffUint64(current, previous uint64) uint64 {
	if current < previous {
		return 0
	}
	return current - previous
}

func (c *GopsutilCollector) CollectDiskIO(ctx context.Context) (*dto.DiskIOMetric, error) {
	if !diskIOSupported {
		return &dto.DiskIOMetric{Processes: []dto.ProcessDiskIOUsage{}}, nil
	}

	processes := c.appProcesses(ctx)

	var totalRead, totalWrite float64
	usages := make([]dto.ProcessDiskIOUsage, 0, len(processes))
	for _, p := range processes {
		counters, err := p.IOCountersWithContext(ctx)
		if err != nil {
			continue
		}
		name, err := p.NameWithContext(ctx)
		if err != nil {
			name = "unknown"
		}
		readPerSec, writePerSec := c.diskIORate(p.Pid, counters)
		totalRead += readPerSec
		totalWrite += writePerSec
		usages = append(usages, dto.ProcessDiskIOUsage{
			Name:             name,
			Pid:              p.Pid,
			ReadBytesPerSec:  readPerSec,
			WriteBytesPerSec: writePerSec,
		})
	}

	return &dto.DiskIOMetric{
		ReadBytesPerSec:  totalRead,
		WriteBytesPerSec: totalWrite,
		Processes:        usages,
	}, nil
}

func (c *GopsutilCollector) GetCapabilities(ctx context.Context) dto.Capabilities {
	return dto.Capabilities{
		CPU:    true,
		Memory: true,
		DiskIO: diskIOSupported,
	}
}
