package dto

type CPUMetric struct {
	UsagePercent float64  `json:"usagePercent"`
	PerCore      []uint64 `json:"perCore"`
}

type MemoryMetric struct {
	UsedPercent   float64 `json:"usedPercent"`
	UsedBytes     uint64  `json:"usedBytes"`
	TotalBytes    uint64  `json:"totalBytes"`
	SwapPercent   float64 `json:"swapPercent"`
	SwapUsedBytes uint64  `json:"swapUsedBytes"`
	SwapTotalBytes uint64 `json:"swapTotalBytes"`
}

type DiskMetric struct {
	UsedPercent float64 `json:"usedPercent"`
	UsedBytes   uint64  `json:"usedBytes"`
	TotalBytes  uint64  `json:"totalBytes"`
	Path        string  `json:"path"`
}

type DiskMetrics struct {
	Disks []DiskMetric `json:"disks"`
}

type NetworkMetric struct {
	BytesSent   uint64 `json:"bytesSent"`
	BytesRecv   uint64 `json:"bytesRecv"`
	PacketsSent uint64 `json:"packetsSent"`
	PacketsRecv uint64 `json:"packetsRecv"`
	Name        string `json:"name"`
}

type NetworkMetrics struct {
	Interfaces []NetworkMetric `json:"interfaces"`
}

type BatteryMetric struct {
	Percent     float64 `json:"percent"`
	TimeRemaining int    `json:"timeRemaining"`
	State       string  `json:"state"`
	Plugged     bool    `json:"plugged"`
}

type LoadAverageMetric struct {
	Load1  float64 `json:"load1"`
	Load5  float64 `json:"load5"`
	Load15 float64 `json:"load15"`
}

type UptimeMetric struct {
	UptimeSeconds uint64 `json:"uptimeSeconds"`
}

type ResourcesSample struct {
	Timestamp    int64               `json:"timestamp"`
	CPU          *CPUMetric          `json:"cpu,omitempty"`
	Memory       *MemoryMetric       `json:"memory,omitempty"`
	Disk         *DiskMetrics        `json:"disk,omitempty"`
	Network      *NetworkMetrics     `json:"network,omitempty"`
	Battery      *BatteryMetric      `json:"battery,omitempty"`
	LoadAverage  *LoadAverageMetric  `json:"loadAverage,omitempty"`
	Uptime       *UptimeMetric       `json:"uptime,omitempty"`
	Degraded     bool                `json:"degraded"`
}

type Capabilities struct {
	CPU         bool `json:"cpu"`
	Memory      bool `json:"memory"`
	Disk        bool `json:"disk"`
	Network     bool `json:"network"`
	Battery     bool `json:"battery"`
	LoadAverage bool `json:"loadAverage"`
	Uptime      bool `json:"uptime"`
}

type DisplayFormat struct {
	Compact   bool   `json:"compact"`
	Units     string `json:"units"`
	Precision int    `json:"precision"`
}

type DisplaySettings struct {
	Compact bool                      `json:"compact"`
	Formats map[string]DisplayFormat `json:"formats"`
}

type Threshold struct {
	Warn     float64 `json:"warn"`
	Critical float64 `json:"critical"`
}

type Settings struct {
	SchemaVersion   int                    `json:"schemaVersion"`
	IntervalMs      int                    `json:"intervalMs"`
	EnabledMetrics  map[string]bool        `json:"enabledMetrics"`
	MetricOrder     []string               `json:"metricOrder"`
	Display         DisplaySettings        `json:"display"`
	Thresholds      map[string]Threshold   `json:"thresholds"`
}

func DefaultSettings() Settings {
	metricClasses := []string{"cpu", "memory", "disk", "network", "battery", "loadAverage", "uptime"}
	formats := make(map[string]DisplayFormat)
	thresholds := make(map[string]Threshold)
	for _, mc := range metricClasses {
		formats[mc] = DisplayFormat{
			Compact:   false,
			Units:     "auto",
			Precision: 1,
		}
	}

	thresholds["cpu"] = Threshold{Warn: 70, Critical: 90}
	thresholds["memory"] = Threshold{Warn: 70, Critical: 85}
	thresholds["disk"] = Threshold{Warn: 80, Critical: 95}
	thresholds["network"] = Threshold{Warn: 0, Critical: 0}
	thresholds["battery"] = Threshold{Warn: 20, Critical: 10}
	thresholds["loadAverage"] = Threshold{Warn: 0, Critical: 0}
	thresholds["uptime"] = Threshold{Warn: 0, Critical: 0}

	return Settings{
		SchemaVersion: 1,
		IntervalMs: 2000,
		EnabledMetrics: map[string]bool{
			"cpu":        true,
			"memory":     true,
			"disk":       true,
			"network":    true,
			"battery":    true,
			"loadAverage": true,
			"uptime":     true,
		},
		MetricOrder: []string{"cpu", "memory", "disk", "network", "battery", "loadAverage", "uptime"},
		Display: DisplaySettings{
			Compact: false,
			Formats: formats,
		},
		Thresholds: thresholds,
	}
}
