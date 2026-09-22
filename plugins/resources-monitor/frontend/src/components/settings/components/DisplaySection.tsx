import {
  Button,
  SaveIcon,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@galacius/design-system";
import { FC, useCallback, useState, type SubmitEvent } from "react";
import type { DisplayFormat, Settings } from "../../../api/resources";
import { getDefaultFormat, METRIC_CLASS_LABELS, MetricClass } from "../../../utils";

type FormatMap = Record<string, DisplayFormat>;

interface DisplaySectionProps {
  settings: Settings;
  enabledMetrics: string[];
  onSettingsChange: (settings: Settings) => void | Promise<void>;
}

export const DisplaySection: FC<DisplaySectionProps> = ({
  settings,
  enabledMetrics,
  onSettingsChange,
}) => {
  const handleCompactToggle = useCallback(
    (checked: boolean) => {
      const updated = {
        ...settings,
        display: {
          ...settings.display,
          compact: checked,
        },
      };
      onSettingsChange(updated);
    },
    [settings, onSettingsChange]
  );

  const [draftFormats, setDraftFormats] = useState<FormatMap>(() => settings.display.formats);
  const [syncedFormats, setSyncedFormats] = useState(settings.display.formats);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (settings.display.formats !== syncedFormats && !isDirty) {
    setSyncedFormats(settings.display.formats);
    setDraftFormats(settings.display.formats);
  }

  const handleFormatChange = useCallback(
    (metricClass: string, field: keyof DisplayFormat, value: string | number | boolean) => {
      setDraftFormats((prev) => ({
        ...prev,
        [metricClass]: {
          ...(prev[metricClass] || getDefaultFormat()),
          [field]: value,
        },
      }));
      setIsDirty(true);
    },
    []
  );

  const handleFormatSubmit = useCallback(
    async (e: SubmitEvent<HTMLFormElement>) => {
      e.preventDefault();
      setIsSaving(true);
      try {
        await onSettingsChange({
          ...settings,
          display: { ...settings.display, formats: draftFormats },
        });
        setIsDirty(false);
      } finally {
        setIsSaving(false);
      }
    },
    [settings, draftFormats, onSettingsChange]
  );

  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold tracking-wider uppercase">Display</h3>
      <div className="space-y-4">
        {/* Global compact/detailed toggle */}
        <div className="rounded border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/50">
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="compact-view-toggle" className="text-sm font-medium">
                Compact View
              </label>
              <p className="text-xs text-neutral-500">Show minimal metric values</p>
            </div>
            <Switch
              id="compact-view-toggle"
              checked={settings.display.compact}
              onCheckedChange={handleCompactToggle}
              aria-label="Compact View"
            />
          </div>
        </div>

        {/* Per-metric format controls */}
        <form onSubmit={handleFormatSubmit}>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold tracking-wider text-neutral-600 uppercase dark:text-neutral-400">
              Per-Metric Format
            </p>
            <Button type="submit" size="sm" disabled={!isDirty || isSaving}>
              <SaveIcon className="size-3.5" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
          <div className="space-y-2">
            {enabledMetrics.map((metricClass) => {
              const format = draftFormats[metricClass] || getDefaultFormat();
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
                      <Select
                        value={format.units}
                        onValueChange={(val) =>
                          handleFormatChange(metricClass, "units", val ?? "auto")
                        }
                      >
                        <SelectTrigger size="sm" className="mt-1 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Auto</SelectItem>
                          <SelectItem value="bytes">Bytes</SelectItem>
                          <SelectItem value="percent">Percent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Precision */}
                    <div>
                      <label className="text-xs text-neutral-600 dark:text-neutral-400">
                        Precision
                      </label>
                      <Select
                        value={String(format.precision)}
                        onValueChange={(val) =>
                          handleFormatChange(metricClass, "precision", parseInt(val ?? "1"))
                        }
                      >
                        <SelectTrigger size="sm" className="mt-1 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0 decimals</SelectItem>
                          <SelectItem value="1">1 decimal</SelectItem>
                          <SelectItem value="2">2 decimals</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </form>
      </div>
    </div>
  );
};
