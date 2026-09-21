import { ChevronUpIcon, ChevronDownIcon } from "@galacius/design-system";
import type { Capabilities } from "../../api/resources";
import { METRIC_CLASS_LABELS } from "../../utils";

interface MetricOrderListProps {
  metricOrder: string[];
  enabledMetrics: Record<string, boolean>;
  capabilities: Capabilities;
  onToggle: (metricClass: string, enabled: boolean) => void;
  onReorder: (newOrder: string[]) => void;
}

export function MetricOrderList({
  metricOrder,
  enabledMetrics,
  capabilities,
  onToggle,
  onReorder,
}: MetricOrderListProps) {
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const newOrder = [...metricOrder];
    [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
    onReorder(newOrder);
  };

  const handleMoveDown = (index: number) => {
    if (index >= metricOrder.length - 1) return;
    const newOrder = [...metricOrder];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    onReorder(newOrder);
  };

  return (
    <div className="space-y-2">
      {metricOrder.map((metricClass, index) => {
        const isSupported = (capabilities as any)[metricClass];
        const isEnabled = enabledMetrics[metricClass];
        const label = METRIC_CLASS_LABELS[metricClass as keyof typeof METRIC_CLASS_LABELS];

        return (
          <div
            key={metricClass}
            className="flex items-center gap-2 rounded border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => onToggle(metricClass, e.target.checked)}
              disabled={!isSupported}
              className="h-4 w-4 rounded"
              title={!isSupported ? `${label} is not available on this platform` : undefined}
            />
            <span className="flex-1 text-sm">{label}</span>
            {!isSupported && (
              <span
                className="cursor-help text-xs text-neutral-500"
                title={`${label} is not available on this platform`}
              >
                ℹ️
              </span>
            )}
            <div className="flex gap-1">
              <button
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
                className="rounded p-1 hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-neutral-800"
                title="Move up"
              >
                <ChevronUpIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleMoveDown(index)}
                disabled={index === metricOrder.length - 1}
                className="rounded p-1 hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-neutral-800"
                title="Move down"
              >
                <ChevronDownIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
