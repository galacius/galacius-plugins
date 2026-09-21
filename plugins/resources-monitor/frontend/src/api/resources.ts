export interface ProcessCPUUsage {
  name: string;
  pid: number;
  percent: number;
}

export interface CPUMetric {
  usagePercent: number;
  processes: ProcessCPUUsage[];
}

export interface ProcessMemoryUsage {
  name: string;
  pid: number;
  bytes: number;
}

export interface MemoryMetric {
  usedPercent: number;
  usedBytes: number;
  totalBytes: number;
  processes: ProcessMemoryUsage[];
}

export interface ProcessDiskIOUsage {
  name: string;
  pid: number;
  readBytesPerSec: number;
  writeBytesPerSec: number;
}

export interface DiskIOMetric {
  readBytesPerSec: number;
  writeBytesPerSec: number;
  processes: ProcessDiskIOUsage[];
}

export interface ResourcesSample {
  timestamp: number;
  cpu?: CPUMetric;
  memory?: MemoryMetric;
  diskIO?: DiskIOMetric;
  degraded: boolean;
}

export interface Capabilities {
  cpu: boolean;
  memory: boolean;
  diskio: boolean;
}

export interface DisplayFormat {
  units: string;
  precision: number;
}

export interface Settings {
  schemaVersion: number;
  intervalMs: number;
  enabledMetrics: Record<string, boolean>;
  metricOrder: string[];
  display: {
    compact: boolean;
    formats: Record<string, DisplayFormat>;
  };
  thresholds?: Record<string, { warn: number; critical: number }>;
}
