export interface CPUMetric {
  usagePercent: number;
  perCore: number[];
}

export interface MemoryMetric {
  usedPercent: number;
  usedBytes: number;
  totalBytes: number;
  swapPercent: number;
  swapUsedBytes: number;
  swapTotalBytes: number;
}

export interface DiskMetric {
  usedPercent: number;
  usedBytes: number;
  totalBytes: number;
  path: string;
}

export interface DiskMetrics {
  disks: DiskMetric[];
}

export interface NetworkMetric {
  bytesSent: number;
  bytesRecv: number;
  packetsSent: number;
  packetsRecv: number;
  name: string;
}

export interface NetworkMetrics {
  interfaces: NetworkMetric[];
}

export interface BatteryMetric {
  percent: number;
  timeRemaining: number;
  state: string;
  plugged: boolean;
}

export interface LoadAverageMetric {
  load1: number;
  load5: number;
  load15: number;
}

export interface UptimeMetric {
  uptimeSeconds: number;
}

export interface ResourcesSample {
  timestamp: number;
  cpu?: CPUMetric;
  memory?: MemoryMetric;
  disk?: DiskMetrics;
  network?: NetworkMetrics;
  battery?: BatteryMetric;
  loadAverage?: LoadAverageMetric;
  uptime?: UptimeMetric;
  degraded: boolean;
}

export interface Capabilities {
  cpu: boolean;
  memory: boolean;
  disk: boolean;
  network: boolean;
  battery: boolean;
  loadAverage: boolean;
  uptime: boolean;
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
