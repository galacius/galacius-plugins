import { CpuIcon, HardDriveIcon, MemoryStickIcon } from "@galacius/design-system";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLiveSampleStore } from "../stores/liveSampleStore";
import { GetSettings, GetCapabilities } from "../api/bridge";
import type { ResourcesSample, Settings, Capabilities } from "../api/resources";
import {
  formatPercent,
  formatBytesPerSec,
  getThresholdColor,
  getEnabledMetrics,
  DEFAULT_THRESHOLDS,
} from "../utils";
import { MetricChip } from "./MetricChip";

function getRawMetricValue(metricClass: string, s: ResourcesSample): number | null {
  if (metricClass === "cpu" && s.cpu) {
    return s.cpu.usagePercent;
  } else if (metricClass === "memory" && s.memory) {
    return s.memory.usedPercent;
  } else if (metricClass === "diskio" && s.diskIO) {
    return s.diskIO.readBytesPerSec + s.diskIO.writeBytesPerSec;
  }
  return null;
}

const METRIC_ICONS: Record<string, React.ReactNode> = {
  cpu: <CpuIcon />,
  memory: <MemoryStickIcon />,
  diskio: <HardDriveIcon />,
};

const WORST_CASE_WIDTHS: Record<string, string> = {
  cpu: "120px",
  memory: "120px",
  diskio: "140px",
};

function getMetricIcon(metricClass: string): React.ReactNode {
  return METRIC_ICONS[metricClass] || null;
}

function getMetricValue(metricClass: string, s: ResourcesSample): string | null {
  if (metricClass === "cpu" && s.cpu) {
    return `${formatPercent(s.cpu.usagePercent)}%`;
  } else if (metricClass === "memory" && s.memory) {
    return `${formatPercent(s.memory.usedPercent)}%`;
  } else if (metricClass === "diskio" && s.diskIO) {
    return formatBytesPerSec(s.diskIO.readBytesPerSec + s.diskIO.writeBytesPerSec);
  }
  return null;
}

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

  const getSeverity = useCallback(
    (metricClass: string, s: ResourcesSample): "destructive" | "warning" | undefined => {
      const rawValue = getRawMetricValue(metricClass, s);
      if (rawValue === null) return undefined;

      const thresholds =
        settings?.thresholds?.[metricClass] ||
        DEFAULT_THRESHOLDS[metricClass as keyof typeof DEFAULT_THRESHOLDS];

      if (thresholds.warn === 0 && thresholds.critical === 0) {
        return undefined;
      }

      return getThresholdColor(rawValue, thresholds.warn, thresholds.critical);
    },
    [settings]
  );

  // Metrics the user enabled, whether or not the platform supports them —
  // unsupported ones still render a chip, showing "N/A" instead of a value.
  const enabledMetrics = useMemo(() => {
    if (!settings) return undefined;
    return getEnabledMetrics(settings.metricOrder, settings.enabledMetrics);
  }, [settings]);

  if (!settings || !capabilities) {
    return (
      <div className="flex items-center gap-1">
        {["cpu", "memory", "diskio"].map((mc) => (
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

  return (
    <div className="flex items-center gap-1">
      {enabledMetrics?.map((metricClass) => {
        const isSupported = capabilities[metricClass as keyof Capabilities];
        if (!isSupported) {
          return (
            <MetricChip
              key={metricClass}
              icon={getMetricIcon(metricClass)}
              label={metricClass}
              value="N/A"
              disabled
              width={WORST_CASE_WIDTHS[metricClass]}
              title={`${metricClass} is not available on this platform`}
            />
          );
        }
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
    </div>
  );
}
