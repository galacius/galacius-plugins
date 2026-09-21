import { ReactNode } from "react";
import type { ResourcesSample } from "../api/resources";
import { formatBytes, formatBytesPerSec, formatPercent } from "../utils";

interface MetricDetailPanelProps {
  metricClass: string;
  sample: ResourcesSample | null;
}

export function MetricDetailPanel({ metricClass, sample }: MetricDetailPanelProps) {
  if (!sample) {
    return <div className="p-2 text-xs text-neutral-500">No data</div>;
  }

  let content: ReactNode;

  if (metricClass === "cpu" && sample.cpu) {
    const { usagePercent, processes } = sample.cpu;
    content = (
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span>App Total</span>
          <span className="font-mono">{formatPercent(usagePercent)}%</span>
        </div>
        {processes.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-semibold">Processes</div>
            {processes.map((proc) => (
              <div key={proc.pid} className="flex items-center justify-between gap-2 text-xs">
                <span className="flex-1 truncate">
                  {proc.name} ({proc.pid})
                </span>
                <span className="font-mono">{formatPercent(proc.percent)}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  } else if (metricClass === "memory" && sample.memory) {
    const { usedPercent, usedBytes, totalBytes, processes } = sample.memory;
    content = (
      <div className="space-y-2">
        <div>
          <div className="mb-1 flex justify-between text-xs">
            <span>App Total</span>
            <span className="font-mono">{formatPercent(usedPercent)}%</span>
          </div>
          <div className="text-xs text-neutral-500">
            {formatBytes(usedBytes)} / {formatBytes(totalBytes)}
          </div>
        </div>
        {processes.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-semibold">Processes</div>
            {processes.map((proc) => (
              <div key={proc.pid} className="flex items-center justify-between gap-2 text-xs">
                <span className="flex-1 truncate">
                  {proc.name} ({proc.pid})
                </span>
                <span className="font-mono">{formatBytes(proc.bytes)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  } else if (metricClass === "diskio" && sample.diskIO) {
    const { readBytesPerSec, writeBytesPerSec, processes } = sample.diskIO;
    content = (
      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-xs">
            <span>Read</span>
            <span className="font-mono">{formatBytesPerSec(readBytesPerSec)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>Write</span>
            <span className="font-mono">{formatBytesPerSec(writeBytesPerSec)}</span>
          </div>
        </div>
        {processes.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-semibold">Processes</div>
            {processes.map((proc) => (
              <div key={proc.pid} className="flex items-center justify-between gap-2 text-xs">
                <span className="flex-1 truncate">
                  {proc.name} ({proc.pid})
                </span>
                <span className="font-mono">
                  R {formatBytesPerSec(proc.readBytesPerSec)} / W{" "}
                  {formatBytesPerSec(proc.writeBytesPerSec)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  } else {
    content = <div className="text-xs text-neutral-500">Metric unavailable</div>;
  }

  return <div className="min-w-48 rounded-md bg-white p-3 dark:bg-neutral-950">{content}</div>;
}
