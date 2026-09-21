package dto

type ProcessCPUUsage struct {
	Name    string  `json:"name"`
	Pid     int32   `json:"pid"`
	Percent float64 `json:"percent"`
}

type CPUMetric struct {
	UsagePercent float64           `json:"usagePercent"`
	Processes    []ProcessCPUUsage `json:"processes"`
}

type ProcessMemoryUsage struct {
	Name  string `json:"name"`
	Pid   int32  `json:"pid"`
	Bytes uint64 `json:"bytes"`
}

type MemoryMetric struct {
	UsedPercent float64              `json:"usedPercent"`
	UsedBytes   uint64               `json:"usedBytes"`
	TotalBytes  uint64               `json:"totalBytes"`
	Processes   []ProcessMemoryUsage `json:"processes"`
}

type ProcessDiskIOUsage struct {
	Name             string  `json:"name"`
	Pid              int32   `json:"pid"`
	ReadBytesPerSec  float64 `json:"readBytesPerSec"`
	WriteBytesPerSec float64 `json:"writeBytesPerSec"`
}

type DiskIOMetric struct {
	ReadBytesPerSec  float64              `json:"readBytesPerSec"`
	WriteBytesPerSec float64              `json:"writeBytesPerSec"`
	Processes        []ProcessDiskIOUsage `json:"processes"`
}

type ResourcesSample struct {
	Timestamp int64         `json:"timestamp"`
	CPU       *CPUMetric    `json:"cpu,omitempty"`
	Memory    *MemoryMetric `json:"memory,omitempty"`
	DiskIO    *DiskIOMetric `json:"diskIO,omitempty"`
	Degraded  bool          `json:"degraded"`
}

type Capabilities struct {
	CPU    bool `json:"cpu"`
	Memory bool `json:"memory"`
	DiskIO bool `json:"diskio"`
}

type DisplayFormat struct {
	Compact   bool   `json:"compact"`
	Units     string `json:"units"`
	Precision int    `json:"precision"`
}

type DisplaySettings struct {
	Compact bool                     `json:"compact"`
	Formats map[string]DisplayFormat `json:"formats"`
}

type Threshold struct {
	Warn     float64 `json:"warn"`
	Critical float64 `json:"critical"`
}

type Settings struct {
	SchemaVersion  int                  `json:"schemaVersion"`
	IntervalMs     int                  `json:"intervalMs"`
	EnabledMetrics map[string]bool      `json:"enabledMetrics"`
	MetricOrder    []string             `json:"metricOrder"`
	Display        DisplaySettings      `json:"display"`
	Thresholds     map[string]Threshold `json:"thresholds"`
}

func DefaultSettings() Settings {
	metricClasses := []string{"cpu", "memory", "diskio"}
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
	thresholds["diskio"] = Threshold{Warn: 50 * 1024 * 1024, Critical: 150 * 1024 * 1024}

	return Settings{
		SchemaVersion: 1,
		IntervalMs:    2000,
		EnabledMetrics: map[string]bool{
			"cpu":    true,
			"memory": true,
			"diskio": true,
		},
		MetricOrder: []string{"cpu", "memory", "diskio"},
		Display: DisplaySettings{
			Compact: false,
			Formats: formats,
		},
		Thresholds: thresholds,
	}
}
