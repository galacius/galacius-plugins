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
  formatLoadAverage,
  formatUptime,
  getThresholdColor,
  DEFAULT_THRESHOLDS,
} from "../utils";
import { MetricChip } from "./MetricChip";
import { FooterOverflowIndicator } from "./FooterOverflowIndicator";

function getRawMetricValue(metricClass: string, s: ResourcesSample): number | null {
  if (metricClass === "cpu" && s.cpu) {
    return s.cpu.usagePercent;
  } else if (metricClass === "memory" && s.memory) {
    return s.memory.usedPercent;
  } else if (metricClass === "disk" && s.disk && s.disk.disks.length > 0) {
    return Math.max(...s.disk.disks.map((d) => d.usedPercent));
  } else if (metricClass === "battery" && s.battery) {
    return s.battery.percent;
  }
  return null;
}

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

  useEffect(() => {
    Promise.all([GetSettings(), GetCapabilities()])
      .then(([s, c]) => {
        setSettings(s);
        setCapabilities(c);
      })
      .catch((err) => {
        console.error("Failed to load settings or capabilities:", err);
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

  function getSeverity(
    metricClass: string,
    s: ResourcesSample
  ): "destructive" | "warning" | undefined {
    const rawValue = getRawMetricValue(metricClass, s);
    if (rawValue === null) return undefined;

    const thresholds =
      settings?.thresholds?.[metricClass] ||
      DEFAULT_THRESHOLDS[metricClass as keyof typeof DEFAULT_THRESHOLDS];

    if (thresholds.warn === 0 && thresholds.critical === 0) {
      return undefined;
    }

    return getThresholdColor(rawValue, thresholds.warn, thresholds.critical);
  }

  function getSeverityRank(severity: "destructive" | "warning" | undefined): number {
    if (severity === "destructive") return 2;
    if (severity === "warning") return 1;
    return 0;
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

  if (!sample || sample.degraded) {
    return <div className="px-2 py-1 text-xs text-neutral-500">Unavailable</div>;
  }

  // Determine which metrics to show based on settings and capabilities
  const enabledMetrics = settings.metricOrder.filter((m) => {
    const metricKey = m as keyof Capabilities;
    return settings.enabledMetrics[m] && capabilities[metricKey];
  });

  // Partition metrics by severity: critical > warning > normal, with metricOrder as tie-breaker
  const maxVisibleMetrics = 5;
  const { visibleMetrics, overflowMetrics } = (() => {
    if (enabledMetrics.length <= maxVisibleMetrics) {
      return { visibleMetrics: enabledMetrics, overflowMetrics: [] };
    }

    const metricsWithSeverity = enabledMetrics.map((m) => {
      const value = getMetricValue(m, sample);
      const severity = getSeverity(m, sample);
      return { metric: m, value, severity, severityRank: getSeverityRank(severity) };
    });

    // Separate high-severity from normal
    const highSeverity = metricsWithSeverity.filter((m) => m.severityRank > 0);
    const normalSeverity = metricsWithSeverity.filter((m) => m.severityRank === 0);

    // Sort each group by metricOrder to preserve user's display preference
    const sortByOrder = (a: { metric: string }, b: { metric: string }) => {
      const aIdx = settings.metricOrder.indexOf(a.metric);
      const bIdx = settings.metricOrder.indexOf(b.metric);
      return aIdx - bIdx;
    };
    highSeverity.sort(sortByOrder);
    normalSeverity.sort(sortByOrder);

    // Take high-severity first, then fill remaining slots with normal
    const visibleData = [
      ...highSeverity.slice(0, maxVisibleMetrics),
      ...normalSeverity.slice(0, Math.max(0, maxVisibleMetrics - highSeverity.length)),
    ];
    const visibleMetricsList = visibleData.map((m) => m.metric);
    const overflowMetricsList = enabledMetrics.filter((m) => !visibleMetricsList.includes(m));

    return { visibleMetrics: visibleMetricsList, overflowMetrics: overflowMetricsList };
  })();

  return (
    <div className="flex items-center gap-1">
      {visibleMetrics.map((metricClass) => {
        const value = getMetricValue(metricClass, sample);
        const severity = getSeverity(metricClass, sample);

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
          getMetricIcon={getMetricIcon}
          getMetricValue={getMetricValue}
          getSeverity={getSeverity}
        />
      )}
    </div>
  );
}
