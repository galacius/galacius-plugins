/* Plugin bundle - loaded dynamically */

// src/index.ts
import { appWideAPI } from "@galacius/core";
import { Activity } from "@galacius/design-system";

// src/const.ts
var PLUGIN_ID = "resources-monitor";

// src/components/ResourcesFooterWidget.tsx
import {
  CpuIcon,
  HardDriveIcon,
  MemoryStickIcon,
  NetworkIcon,
  BatteryIcon,
  TrendingUpIcon,
  ClockIcon,
} from "@galacius/design-system";
import { useEffect, useState as useState2 } from "react";

// src/stores/liveSampleStore.ts
import { useSyncExternalStore } from "react";

// src/api/bridge.ts
import { createPluginBridge } from "@galacius/core";
var bridge = createPluginBridge(PLUGIN_ID);
var GetSnapshot = () => bridge.fetchWithRetry("getSnapshot", {});
var GetSettings = () => bridge.fetchWithRetry("getSettings", {});
var SaveSettings = (settings) => bridge.fetchWithRetry("saveSettings", settings);
var GetCapabilities = () => bridge.fetchWithRetry("getCapabilities", {});
var ResetSettings = () => bridge.fetchWithRetry("resetSettings", {});

// src/stores/liveSampleStore.ts
var lastSample = null;
var listeners = /* @__PURE__ */ new Set();
var eventListenerRegistered = false;
function notifyListeners() {
  listeners.forEach((listener) => listener());
}
function subscribeToEvents() {
  if (eventListenerRegistered) return;
  eventListenerRegistered = true;
  if (typeof window !== "undefined" && window.go?.Run) {
    const go = window.go;
    go.Run("plugin:event", (event) => {
      if (event?.payload?.topic === "plugins.resources-monitor.metrics:sample") {
        try {
          lastSample = event.payload.data;
          notifyListeners();
        } catch (err) {
          console.error("Failed to parse metrics sample event:", err);
        }
      }
    });
  }
}
function useLiveSampleStore() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      subscribeToEvents();
      GetSnapshot()
        .then((sample) => {
          lastSample = sample;
          notifyListeners();
        })
        .catch((err) => {
          console.error("Failed to fetch initial snapshot:", err);
        });
      return () => {
        listeners.delete(listener);
      };
    },
    () => lastSample,
    () => null
  );
}

// src/utils.ts
function formatPercent(value, decimals = 1) {
  return value.toFixed(decimals);
}
function formatBytes(bytes) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return size.toFixed(1) + units[unitIndex];
}
function formatLoadAverage(value, decimals = 2) {
  return value.toFixed(decimals);
}
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
function getThresholdColor(value, warnThreshold, criticalThreshold) {
  if (value >= criticalThreshold) return "destructive";
  if (value >= warnThreshold) return "warning";
  return void 0;
}
var METRIC_CLASS_LABELS = {
  cpu: "CPU",
  memory: "Memory",
  disk: "Disk",
  network: "Network",
  battery: "Battery",
  loadAverage: "Load",
  uptime: "Uptime",
};
var DEFAULT_THRESHOLDS = {
  cpu: { warn: 70, critical: 90 },
  memory: { warn: 70, critical: 85 },
  disk: { warn: 80, critical: 95 },
  network: { warn: 0, critical: 0 },
  battery: { warn: 20, critical: 10 },
  loadAverage: { warn: 0, critical: 0 },
  uptime: { warn: 0, critical: 0 },
};

// src/components/MetricChip.tsx
import { jsx, jsxs } from "react/jsx-runtime";
function MetricChip({ icon, label, value, severity, isLoading, width }) {
  const baseClass = "flex items-center gap-1 px-2 py-1 rounded text-xs transition-opacity";
  const severityClass =
    severity === "destructive"
      ? "bg-destructive/10 text-destructive"
      : severity === "warning"
        ? "bg-warning/10 text-warning"
        : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300";
  if (isLoading) {
    return /* @__PURE__ */ jsxs("div", {
      className: `${baseClass} ${severityClass} animate-pulse`,
      style: { width: width || "auto" },
      children: [
        /* @__PURE__ */ jsx("span", { className: "text-lg", children: icon }),
        /* @__PURE__ */ jsx("span", { className: "flex-1", children: label }),
        /* @__PURE__ */ jsx("span", {
          className: "font-mono text-xs min-w-8 text-right",
          children: "\u2014",
        }),
      ],
    });
  }
  return /* @__PURE__ */ jsxs("div", {
    className: `${baseClass} ${severityClass}`,
    title: `${label}: ${value}`,
    children: [
      /* @__PURE__ */ jsx("span", { className: "text-lg", children: icon }),
      /* @__PURE__ */ jsx("span", { className: "flex-1", children: label }),
      /* @__PURE__ */ jsx("span", {
        className: "font-mono text-xs min-w-8 text-right",
        children: value,
      }),
    ],
  });
}

// src/components/FooterOverflowIndicator.tsx
import { useState } from "react";
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
function FooterOverflowIndicator({
  overflowMetrics,
  sample,
  settings,
  getMetricIcon,
  getMetricValue,
  getSeverity,
}) {
  const [isOpen, setIsOpen] = useState(false);
  if (overflowMetrics.length === 0) return null;
  return /* @__PURE__ */ jsxs2("div", {
    className: "relative",
    children: [
      /* @__PURE__ */ jsxs2("button", {
        onClick: () => setIsOpen(!isOpen),
        className:
          "px-2 py-1 text-xs font-semibold rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors",
        title: `${overflowMetrics.length} more metrics`,
        children: ["+", overflowMetrics.length],
      }),
      isOpen &&
        /* @__PURE__ */ jsx2("div", {
          className:
            "absolute right-0 mt-1 bg-white dark:bg-neutral-950 rounded-md shadow-lg border border-neutral-200 dark:border-neutral-800 z-50 p-2 min-w-64",
          children: /* @__PURE__ */ jsx2("div", {
            className: "space-y-1 max-h-96 overflow-y-auto",
            children: overflowMetrics.map((metricClass) => {
              const value =
                sample && getMetricValue(metricClass, sample)
                  ? getMetricValue(metricClass, sample)
                  : "\u2014";
              const severity = getSeverity(value);
              return /* @__PURE__ */ jsx2(
                "div",
                {
                  className: "flex items-center gap-2",
                  children: /* @__PURE__ */ jsx2(MetricChip, {
                    icon: getMetricIcon(metricClass),
                    label: METRIC_CLASS_LABELS[metricClass] || metricClass,
                    value: value || "\u2014",
                    severity,
                  }),
                },
                metricClass
              );
            }),
          }),
        }),
    ],
  });
}

// src/components/ResourcesFooterWidget.tsx
import { jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
var METRIC_ICONS = {
  cpu: /* @__PURE__ */ jsx3(CpuIcon, {}),
  memory: /* @__PURE__ */ jsx3(MemoryStickIcon, {}),
  disk: /* @__PURE__ */ jsx3(HardDriveIcon, {}),
  network: /* @__PURE__ */ jsx3(NetworkIcon, {}),
  battery: /* @__PURE__ */ jsx3(BatteryIcon, {}),
  loadAverage: /* @__PURE__ */ jsx3(TrendingUpIcon, {}),
  uptime: /* @__PURE__ */ jsx3(ClockIcon, {}),
};
var WORST_CASE_WIDTHS = {
  cpu: "120px",
  memory: "120px",
  disk: "120px",
  network: "120px",
  battery: "120px",
  loadAverage: "120px",
  uptime: "120px",
};
function ResourcesFooterWidget() {
  const sample = useLiveSampleStore();
  const [settings, setSettings] = useState2(null);
  const [capabilities, setCapabilities] = useState2(null);
  const [isLoading, setIsLoading] = useState2(true);
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
  function getMetricIcon(metricClass) {
    return METRIC_ICONS[metricClass] || null;
  }
  function getMetricValue(metricClass, s) {
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
  function getSeverity(value) {
    return void 0;
  }
  if (!settings || !capabilities) {
    return /* @__PURE__ */ jsx3("div", {
      className: "flex items-center gap-1",
      children: ["cpu", "memory", "disk", "network", "battery"].map((mc) =>
        /* @__PURE__ */ jsx3(
          MetricChip,
          {
            icon: getMetricIcon(mc),
            label: mc,
            value: "\u2014",
            isLoading: true,
            width: WORST_CASE_WIDTHS[mc],
          },
          mc
        )
      ),
    });
  }
  if (!sample) {
    return /* @__PURE__ */ jsx3("div", {
      className: "text-xs text-neutral-500 px-2 py-1",
      children: "Unavailable",
    });
  }
  const enabledMetrics = settings.metricOrder.filter(
    (m) => settings.enabledMetrics[m] && capabilities[m]
  );
  const maxVisibleMetrics = 5;
  const visibleMetrics = enabledMetrics.slice(0, maxVisibleMetrics);
  const overflowMetrics = enabledMetrics.slice(maxVisibleMetrics);
  return /* @__PURE__ */ jsxs3("div", {
    className: "flex items-center gap-1",
    children: [
      visibleMetrics.map((metricClass) => {
        const value = getMetricValue(metricClass, sample);
        const severity = value
          ? getThresholdColor(
              parseFloat(value),
              DEFAULT_THRESHOLDS[metricClass]?.warn || 0,
              DEFAULT_THRESHOLDS[metricClass]?.critical || 0
            )
          : void 0;
        return /* @__PURE__ */ jsx3(
          MetricChip,
          {
            icon: getMetricIcon(metricClass),
            label: metricClass,
            value: value || "\u2014",
            severity,
            width: WORST_CASE_WIDTHS[metricClass],
          },
          metricClass
        );
      }),
      overflowMetrics.length > 0 &&
        /* @__PURE__ */ jsx3(FooterOverflowIndicator, {
          overflowMetrics,
          sample,
          settings,
          getMetricIcon,
          getMetricValue,
          getSeverity,
        }),
    ],
  });
}

// src/components/ResourcesMonitorSettingsTab.tsx
import { useEffect as useEffect2, useState as useState3 } from "react";

// src/components/settings/MetricOrderList.tsx
import { ChevronUpIcon, ChevronDownIcon } from "@galacius/design-system";
import { jsx as jsx4, jsxs as jsxs4 } from "react/jsx-runtime";
function MetricOrderList({ metricOrder, enabledMetrics, capabilities, onToggle, onReorder }) {
  const handleMoveUp = (index) => {
    if (index <= 0) return;
    const newOrder = [...metricOrder];
    [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
    onReorder(newOrder);
  };
  const handleMoveDown = (index) => {
    if (index >= metricOrder.length - 1) return;
    const newOrder = [...metricOrder];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    onReorder(newOrder);
  };
  return /* @__PURE__ */ jsx4("div", {
    className: "space-y-2",
    children: metricOrder.map((metricClass, index) => {
      const isSupported = capabilities[metricClass];
      const isEnabled = enabledMetrics[metricClass];
      const label = METRIC_CLASS_LABELS[metricClass];
      return /* @__PURE__ */ jsxs4(
        "div",
        {
          className:
            "flex items-center gap-2 p-2 bg-neutral-50 dark:bg-neutral-900 rounded border border-neutral-200 dark:border-neutral-800",
          children: [
            /* @__PURE__ */ jsx4("input", {
              type: "checkbox",
              checked: isEnabled,
              onChange: (e) => onToggle(metricClass, e.target.checked),
              disabled: !isSupported,
              className: "w-4 h-4 rounded",
              title: !isSupported ? `${label} is not available on this platform` : void 0,
            }),
            /* @__PURE__ */ jsx4("span", { className: "flex-1 text-sm", children: label }),
            !isSupported &&
              /* @__PURE__ */ jsx4("span", {
                className: "text-xs text-neutral-500 cursor-help",
                title: `${label} is not available on this platform`,
                children: "\u2139\uFE0F",
              }),
            /* @__PURE__ */ jsxs4("div", {
              className: "flex gap-1",
              children: [
                /* @__PURE__ */ jsx4("button", {
                  onClick: () => handleMoveUp(index),
                  disabled: index === 0,
                  className:
                    "p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed",
                  title: "Move up",
                  children: /* @__PURE__ */ jsx4(ChevronUpIcon, { className: "w-4 h-4" }),
                }),
                /* @__PURE__ */ jsx4("button", {
                  onClick: () => handleMoveDown(index),
                  disabled: index === metricOrder.length - 1,
                  className:
                    "p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed",
                  title: "Move down",
                  children: /* @__PURE__ */ jsx4(ChevronDownIcon, { className: "w-4 h-4" }),
                }),
              ],
            }),
          ],
        },
        metricClass
      );
    }),
  });
}

// src/components/settings/ThresholdsSection.tsx
import { jsx as jsx5, jsxs as jsxs5 } from "react/jsx-runtime";
function ThresholdsSection({ thresholds, enabledMetrics }) {
  return /* @__PURE__ */ jsxs5("div", {
    children: [
      /* @__PURE__ */ jsx5("h3", {
        className: "font-semibold text-sm mb-3",
        children: "Thresholds (Color Indicators)",
      }),
      /* @__PURE__ */ jsx5("div", {
        className: "space-y-2",
        children: enabledMetrics.map((metricClass) => {
          const threshold = thresholds[metricClass] || DEFAULT_THRESHOLDS[metricClass];
          const label = METRIC_CLASS_LABELS[metricClass];
          if (threshold.warn === 0 && threshold.critical === 0) {
            return null;
          }
          return /* @__PURE__ */ jsxs5(
            "div",
            {
              className: "text-sm",
              children: [
                /* @__PURE__ */ jsxs5("div", {
                  className: "flex items-center justify-between mb-1",
                  children: [
                    /* @__PURE__ */ jsx5("span", { children: label }),
                    /* @__PURE__ */ jsxs5("span", {
                      className: "text-xs text-neutral-500",
                      children: ["Warn: ", threshold.warn, "%, Crit: ", threshold.critical, "%"],
                    }),
                  ],
                }),
                /* @__PURE__ */ jsx5("div", {
                  className: "flex gap-2 h-6",
                  children: /* @__PURE__ */ jsxs5("div", {
                    className: "flex-1 bg-neutral-200 dark:bg-neutral-800 rounded relative",
                    children: [
                      /* @__PURE__ */ jsxs5("div", {
                        className: "absolute top-0 left-0 right-0 bottom-0 flex",
                        children: [
                          /* @__PURE__ */ jsx5("div", {
                            className: "bg-green-500/30",
                            style: { width: `${threshold.warn}%` },
                          }),
                          /* @__PURE__ */ jsx5("div", {
                            className: "bg-yellow-500/30",
                            style: {
                              width: `${threshold.critical - threshold.warn}%`,
                            },
                          }),
                          /* @__PURE__ */ jsx5("div", {
                            className: "bg-red-500/30",
                            style: { width: `${100 - threshold.critical}%` },
                          }),
                        ],
                      }),
                      /* @__PURE__ */ jsx5("div", {
                        className: "absolute top-0 bottom-0 w-0.5 bg-yellow-600",
                        style: { left: `${threshold.warn}%` },
                        title: `Warning: ${threshold.warn}%`,
                      }),
                      /* @__PURE__ */ jsx5("div", {
                        className: "absolute top-0 bottom-0 w-0.5 bg-red-600",
                        style: { left: `${threshold.critical}%` },
                        title: `Critical: ${threshold.critical}%`,
                      }),
                    ],
                  }),
                }),
              ],
            },
            metricClass
          );
        }),
      }),
    ],
  });
}

// src/components/ResourcesMonitorSettingsTab.tsx
import { jsx as jsx6, jsxs as jsxs6 } from "react/jsx-runtime";
function ResourcesMonitorSettingsTab() {
  const [settings, setSettings] = useState3(null);
  const [capabilities, setCapabilities] = useState3(null);
  const [intervalMs, setIntervalMs] = useState3(2e3);
  const [thresholds, setThresholds] = useState3(DEFAULT_THRESHOLDS);
  const [loading, setLoading] = useState3(true);
  useEffect2(() => {
    Promise.all([GetSettings(), GetCapabilities()])
      .then(([s, c]) => {
        setSettings(s);
        setCapabilities(c);
        setIntervalMs(s.intervalMs);
      })
      .catch((err) => {
        console.error("Failed to load settings:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);
  const handleSaveSettings = async () => {
    if (!settings) return;
    try {
      await SaveSettings(settings);
    } catch (err) {
      console.error("Failed to save settings:", err);
    }
  };
  const handleIntervalChange = async (newInterval) => {
    setIntervalMs(newInterval);
    if (!settings) return;
    const updated = { ...settings, intervalMs: newInterval };
    setSettings(updated);
    try {
      await SaveSettings(updated);
    } catch (err) {
      console.error("Failed to save interval:", err);
    }
  };
  const handleMetricToggle = async (metricClass, enabled) => {
    if (!settings) return;
    const updated = {
      ...settings,
      enabledMetrics: {
        ...settings.enabledMetrics,
        [metricClass]: enabled,
      },
    };
    setSettings(updated);
    try {
      await SaveSettings(updated);
    } catch (err) {
      console.error("Failed to toggle metric:", err);
    }
  };
  const handleReorderMetrics = async (newOrder) => {
    if (!settings) return;
    const updated = {
      ...settings,
      metricOrder: newOrder,
    };
    setSettings(updated);
    try {
      await SaveSettings(updated);
    } catch (err) {
      console.error("Failed to reorder metrics:", err);
    }
  };
  const handleResetSettings = async () => {
    if (window.confirm("Reset all settings to defaults?")) {
      try {
        await ResetSettings();
        const updated = await GetSettings();
        setSettings(updated);
        setIntervalMs(updated.intervalMs);
      } catch (err) {
        console.error("Failed to reset settings:", err);
      }
    }
  };
  if (loading || !settings || !capabilities) {
    return /* @__PURE__ */ jsx6("div", { className: "p-4", children: "Loading..." });
  }
  const enabledMetrics = settings.metricOrder.filter(
    (m) => settings.enabledMetrics[m] && capabilities[m]
  );
  return /* @__PURE__ */ jsxs6("div", {
    className: "h-full flex flex-col",
    children: [
      /* @__PURE__ */ jsx6("div", {
        className:
          "sticky top-0 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 p-3 z-10",
        children: /* @__PURE__ */ jsx6(ResourcesFooterWidget, {}),
      }),
      /* @__PURE__ */ jsxs6("div", {
        className: "flex-1 overflow-y-auto p-4 space-y-6",
        children: [
          /* @__PURE__ */ jsxs6("div", {
            children: [
              /* @__PURE__ */ jsx6("h3", {
                className: "font-semibold text-sm mb-3",
                children: "Metrics",
              }),
              /* @__PURE__ */ jsx6(MetricOrderList, {
                metricOrder: settings.metricOrder,
                enabledMetrics: settings.enabledMetrics,
                capabilities,
                onToggle: handleMetricToggle,
                onReorder: handleReorderMetrics,
              }),
            ],
          }),
          /* @__PURE__ */ jsxs6("div", {
            children: [
              /* @__PURE__ */ jsx6("h3", {
                className: "font-semibold text-sm mb-3",
                children: "Refresh Interval",
              }),
              /* @__PURE__ */ jsxs6("div", {
                className: "space-y-2",
                children: [
                  /* @__PURE__ */ jsx6("input", {
                    type: "range",
                    min: "500",
                    max: "60000",
                    step: "500",
                    value: intervalMs,
                    onChange: (e) => handleIntervalChange(Number(e.target.value)),
                    className: "w-full",
                  }),
                  /* @__PURE__ */ jsxs6("div", {
                    className: "flex justify-between text-xs text-neutral-500",
                    children: [
                      /* @__PURE__ */ jsx6("span", { children: "500ms" }),
                      /* @__PURE__ */ jsxs6("span", {
                        className: "font-mono font-semibold text-neutral-700 dark:text-neutral-300",
                        children: [intervalMs, "ms"],
                      }),
                      /* @__PURE__ */ jsx6("span", { children: "60s" }),
                    ],
                  }),
                  /* @__PURE__ */ jsx6("p", {
                    className: "text-xs text-neutral-500 mt-2",
                    children: "Shorter intervals increase CPU usage. Recommended: 2000ms.",
                  }),
                ],
              }),
            ],
          }),
          /* @__PURE__ */ jsx6(ThresholdsSection, {
            thresholds,
            enabledMetrics,
          }),
          /* @__PURE__ */ jsx6("div", {
            className: "pt-4 border-t border-neutral-200 dark:border-neutral-800",
            children: /* @__PURE__ */ jsx6("button", {
              onClick: handleResetSettings,
              className:
                "px-4 py-2 text-sm rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors",
              children: "Reset to Defaults",
            }),
          }),
        ],
      }),
    ],
  });
}

// src/index.ts
appWideAPI.registerStylesheets(PLUGIN_ID, [import("./style.css-SDDRJTXW.js")]);
appWideAPI.registerSettingsTab(PLUGIN_ID, {
  id: PLUGIN_ID,
  label: "Resources",
  icon: Activity,
  component: ResourcesMonitorSettingsTab,
});
appWideAPI.registerFooterWidget(PLUGIN_ID, {
  id: PLUGIN_ID,
  component: ResourcesFooterWidget,
});
appWideAPI.registerEvents(PLUGIN_ID, {
  "plugins.resources-monitor.metrics:sample": (data) => {},
});
