import {
  CpuIcon,
  HardDriveIcon,
  MemoryStickIcon,
  NetworkIcon,
  BatteryIcon,
  TrendingUpIcon,
  ClockIcon,
} from "@galacius/design-system";
import { useEffect, useState } from "react";
import { useLiveSampleStore } from "../stores/liveSampleStore";
import { GetSettings, GetCapabilities } from "../api/bridge";
import type { ResourcesSample, Settings, Capabilities } from "../api/resources";
import {
  formatPercent,
  formatBytes,
  formatBatteryTime,
  formatLoadAverage,
  formatUptime,
  getThresholdColor,
  DEFAULT_THRESHOLDS,
} from "../utils";
import { MetricChip } from "./MetricChip";
import { FooterOverflowIndicator } from "./FooterOverflowIndicator";

const METRIC_ICONS: Record<string, React.ReactNode> = {
  cpu: <CpuIcon />,
  memory: <MemoryStickIcon />,
  disk: <HardDriveIcon />,
  network: <NetworkIcon />,
  battery: <BatteryIcon />,
  loadAverage: <TrendingUpIcon />,
  uptime: <ClockIcon />,
};

const WORST_CASE_WIDTHS: Record<string, string> = {
  cpu: "120px",
  memory: "120px",
  disk: "120px",
  network: "120px",
  battery: "120px",
  loadAverage: "120px",
  uptime: "120px",
};

export function ResourcesFooterWidget() {
  const sample = useLiveSampleStore();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([GetSettings(), GetCapabilities()])
      .then(([s, c]) => {
        setSettings(s);
        setCapabilities(c);
      })
      .catch((err) => {
        console.error("Failed to load settings or capabilities:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  function getMetricIcon(metricClass: string): React.ReactNode {
    return METRIC_ICONS[metricClass] || null;
  }

  function getMetricValue(metricClass: string, s: ResourcesSample): string | null {
    if (metricClass === "cpu" && s.cpu) {
      return `${formatPercent(s.cpu.usagePercent)}%`;
    } else if (metricClass === "memory" && s.memory) {
      return `${formatPercent(s.memory.usedPercent)}%`;
    } else if (metricClass === "disk" && s.disk && s.disk.disks.length > 0) {
      const maxUsed = Math.max(...s.disk.disks.map((d) => d.usedPercent));
      return `${formatPercent(maxUsed)}%`;
    } else if (metricClass === "network" && s.network) {
      const totalRecv = s.network.interfaces.reduce((sum, i) => sum + i.bytesRecv, 0);
      return formatBytes(totalRecv);
    } else if (metricClass === "battery" && s.battery) {
      return `${formatPercent(s.battery.percent)}%`;
    } else if (metricClass === "loadAverage" && s.loadAverage) {
      return `${formatLoadAverage(s.loadAverage.load1)}`;
    } else if (metricClass === "uptime" && s.uptime) {
      return formatUptime(s.uptime.uptimeSeconds);
    }
    return null;
  }

  function getSeverity(value: string | null) {
    // Simplified severity logic; extended logic would check thresholds
    return undefined;
  }

  if (!settings || !capabilities) {
    return (
      <div className="flex items-center gap-1">
        {["cpu", "memory", "disk", "network", "battery"].map((mc) => (
          <MetricChip
            key={mc}
            icon={getMetricIcon(mc)}
            label={mc}
            value="—"
            isLoading={true}
            width={WORST_CASE_WIDTHS[mc]}
          />
        ))}
      </div>
    );
  }

  if (!sample) {
    return <div className="px-2 py-1 text-xs text-neutral-500">Unavailable</div>;
  }

  // Determine which metrics to show based on settings and capabilities
  const enabledMetrics = settings.metricOrder.filter(
    (m) => settings.enabledMetrics[m] && (capabilities as any)[m as keyof Capabilities]
  );

  // Calculate visibility based on container width (simplified heuristic)
  const maxVisibleMetrics = 5;
  const visibleMetrics = enabledMetrics.slice(0, maxVisibleMetrics);
  const overflowMetrics = enabledMetrics.slice(maxVisibleMetrics);

  return (
    <div className="flex items-center gap-1">
      {visibleMetrics.map((metricClass) => {
        const value = getMetricValue(metricClass, sample);
        const severity = value
          ? getThresholdColor(
              parseFloat(value),
              DEFAULT_THRESHOLDS[metricClass as keyof typeof DEFAULT_THRESHOLDS]?.warn || 0,
              DEFAULT_THRESHOLDS[metricClass as keyof typeof DEFAULT_THRESHOLDS]?.critical || 0
            )
          : undefined;

        return (
          <MetricChip
            key={metricClass}
            icon={getMetricIcon(metricClass)}
            label={metricClass}
            value={value || "—"}
            severity={severity}
            width={WORST_CASE_WIDTHS[metricClass]}
          />
        );
      })}

      {overflowMetrics.length > 0 && (
        <FooterOverflowIndicator
          overflowMetrics={overflowMetrics}
          sample={sample}
          settings={settings}
          getMetricIcon={getMetricIcon}
          getMetricValue={getMetricValue}
          getSeverity={getSeverity}
        />
      )}
    </div>
  );
}
