import { METRIC_CLASS_LABELS, MetricClass } from "../../utils";
import type { Settings, DisplayFormat } from "../../api/resources";

interface DisplaySectionProps {
  settings: Settings;
  enabledMetrics: string[];
  onSettingsChange: (settings: Settings) => void;
}

export function DisplaySection({
  settings,
  enabledMetrics,
  onSettingsChange,
}: DisplaySectionProps) {
  const handleCompactToggle = (checked: boolean) => {
    const updated = {
      ...settings,
      display: {
        ...settings.display,
        compact: checked,
      },
    };
    onSettingsChange(updated);
  };

  const handleFormatChange = (
    metricClass: string,
    field: keyof DisplayFormat,
    value: string | number | boolean
  ) => {
    const updated = {
      ...settings,
      display: {
        ...settings.display,
        formats: {
          ...settings.display.formats,
          [metricClass]: {
            ...settings.display.formats[metricClass],
            [field]: value,
          },
        },
      },
    };
    onSettingsChange(updated);
  };

  const getDefaultFormat = (): DisplayFormat => ({
    compact: false,
    units: "auto",
    precision: 1,
  });

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold">Display</h3>
      <div className="space-y-4">
        {/* Global compact/detailed toggle */}
        <div className="rounded border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/50">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">Compact View</label>
              <p className="text-xs text-neutral-500">Show minimal metric values</p>
            </div>
            <input
              type="checkbox"
              checked={settings.display.compact}
              onChange={(e) => handleCompactToggle(e.target.checked)}
              className="h-4 w-4 rounded"
            />
          </div>
        </div>

        {/* Per-metric format controls */}
        <div>
          <p className="mb-2 text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Per-Metric Format
          </p>
          <div className="space-y-2">
            {enabledMetrics.map((metricClass) => {
              const format = settings.display.formats[metricClass] || getDefaultFormat();
              const label = METRIC_CLASS_LABELS[metricClass as MetricClass];

              return (
                <div
                  key={metricClass}
                  className="rounded border border-neutral-200 p-2 dark:border-neutral-800"
                >
                  <div className="mb-2 text-xs font-medium">{label}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Units */}
                    <div>
                      <label className="text-xs text-neutral-600 dark:text-neutral-400">
                        Units
                      </label>
                      <select
                        value={format.units}
                        onChange={(e) => handleFormatChange(metricClass, "units", e.target.value)}
                        className="mt-1 w-full rounded border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800"
                      >
                        <option value="auto">Auto</option>
                        <option value="bytes">Bytes</option>
                        <option value="percent">Percent</option>
                      </select>
                    </div>

                    {/* Precision */}
                    <div>
                      <label className="text-xs text-neutral-600 dark:text-neutral-400">
                        Precision
                      </label>
                      <select
                        value={format.precision}
                        onChange={(e) =>
                          handleFormatChange(metricClass, "precision", parseInt(e.target.value))
                        }
                        className="mt-1 w-full rounded border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800"
                      >
                        <option value="0">0 decimals</option>
                        <option value="1">1 decimal</option>
                        <option value="2">2 decimals</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
