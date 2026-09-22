package monitor

import (
	"context"
	"sync"
	"sync/atomic"
	"time"

	"github.com/galacius/galacius-plugins/plugins/resources-monitor/internal/applications/dto"
	"github.com/galacius/galacius-plugins/plugins/resources-monitor/internal/applications/port"
)

type Sampler struct {
	collector port.MetricsCollector
	publisher port.SamplePublisher
	pluginID  string

	ticker        *time.Ticker
	stopCh        chan struct{}
	mu            sync.RWMutex
	currentSample dto.ResourcesSample

	interval     time.Duration
	lastTickTime atomic.Int64
	overrun      atomic.Bool
}

const (
	minInterval = 500 * time.Millisecond
	maxInterval = 60 * time.Second
)

func NewSampler(collector port.MetricsCollector, publisher port.SamplePublisher, pluginID string, initialInterval int) *Sampler {
	interval := time.Duration(initialInterval) * time.Millisecond
	interval = clampInterval(interval)

	sampler := &Sampler{
		collector: collector,
		publisher: publisher,
		pluginID:  pluginID,
		interval:  interval,
		stopCh:    make(chan struct{}),
	}

	sampler.ticker = time.NewTicker(interval)

	return sampler
}

func clampInterval(interval time.Duration) time.Duration {
	if interval < minInterval {
		return minInterval
	}
	if interval > maxInterval {
		return maxInterval
	}
	return interval
}

func (s *Sampler) Start(ctx context.Context) {
	go s.run(ctx)
}

func (s *Sampler) Stop() {
	close(s.stopCh)
	if s.ticker != nil {
		s.ticker.Stop()
	}
}

func (s *Sampler) Reconfigure(newIntervalMs int) {
	newInterval := time.Duration(newIntervalMs) * time.Millisecond
	newInterval = clampInterval(newInterval)

	s.mu.Lock()
	defer s.mu.Unlock()

	if newInterval == s.interval {
		return
	}

	s.interval = newInterval
	if s.ticker != nil {
		s.ticker.Reset(newInterval)
	}
}

func (s *Sampler) GetCurrentSample() dto.ResourcesSample {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.currentSample
}

func (s *Sampler) run(ctx context.Context) {
	for {
		select {
		case <-s.stopCh:
			return
		case <-s.ticker.C:
			s.collectAndPublish(ctx)
		}
	}
}

func (s *Sampler) collectAndPublish(ctx context.Context) {
	now := time.Now()
	thisTickTime := now.UnixMilli()
	lastTickTime := s.lastTickTime.Load()

	degraded := false
	if lastTickTime > 0 && now.Sub(time.UnixMilli(lastTickTime)) > s.interval+50*time.Millisecond {
		degraded = true
	}

	s.lastTickTime.Store(thisTickTime)
	s.overrun.Store(degraded)

	sample := dto.ResourcesSample{
		Timestamp: thisTickTime,
		Degraded:  degraded,
	}

	cpuMetric, err := s.collector.CollectCPU(ctx)
	if err == nil {
		sample.CPU = cpuMetric
	}

	memMetric, err := s.collector.CollectMemory(ctx)
	if err == nil {
		sample.Memory = memMetric
	}

	diskIOMetric, err := s.collector.CollectDiskIO(ctx)
	if err == nil {
		sample.DiskIO = diskIOMetric
	}

	s.mu.Lock()
	s.currentSample = sample
	s.mu.Unlock()

	s.publisher.Emit(ctx, "plugins.resources-monitor.metrics:sample", s.pluginID, sample)
}
