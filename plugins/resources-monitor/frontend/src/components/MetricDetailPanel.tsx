import { ReactNode } from "react";
import type { ResourcesSample } from "../api/resources";
import {
  formatBytes,
  formatBatteryTime,
  formatLoadAverage,
  formatPercent,
  formatUptime,
} from "../utils";

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
    const { usagePercent, perCore } = sample.cpu;
    content = (
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span>Overall</span>
          <span className="font-mono">{formatPercent(usagePercent)}%</span>
        </div>
        {perCore.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-semibold">Per-Core</div>
            {perCore.map((core, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-12 text-xs">Core {i}</span>
                <div className="h-1.5 flex-1 rounded-sm bg-neutral-200 dark:bg-neutral-700">
                  <div className="h-1.5 rounded-sm bg-blue-500" style={{ width: `${core}%` }} />
                </div>
                <span className="w-8 text-right font-mono text-xs">{core}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  } else if (metricClass === "memory" && sample.memory) {
    const { usedPercent, usedBytes, totalBytes, swapPercent, swapUsedBytes } = sample.memory;
    content = (
      <div className="space-y-2">
        <div>
          <div className="mb-1 flex justify-between text-xs">
            <span>RAM</span>
            <span className="font-mono">{formatPercent(usedPercent)}%</span>
          </div>
          <div className="text-xs text-neutral-500">
            {formatBytes(usedBytes)} / {formatBytes(totalBytes)}
          </div>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs">
            <span>Swap</span>
            <span className="font-mono">{formatPercent(swapPercent)}%</span>
          </div>
          <div className="text-xs text-neutral-500">
            {formatBytes(swapUsedBytes)} / {formatBytes(sample.memory.swapTotalBytes)}
          </div>
        </div>
      </div>
    );
  } else if (metricClass === "disk" && sample.disk) {
    content = (
      <div className="space-y-2">
        {sample.disk.disks.map((disk, i) => (
          <div key={i}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="flex-1 truncate">{disk.path}</span>
              <span className="ml-2 font-mono">{formatPercent(disk.usedPercent)}%</span>
            </div>
            <div className="text-xs text-neutral-500">
              {formatBytes(disk.usedBytes)} / {formatBytes(disk.totalBytes)}
            </div>
          </div>
        ))}
      </div>
    );
  } else if (metricClass === "network" && sample.network) {
    content = (
      <div className="max-h-48 space-y-2 overflow-y-auto">
        {sample.network.interfaces.map((iface, i) => (
          <div key={i} className="text-xs">
            <div className="truncate font-semibold">{iface.name}</div>
            <div className="space-y-0.5 text-neutral-500">
              <div className="flex justify-between">
                <span>Sent</span>
                <span className="font-mono">{formatBytes(iface.bytesSent)}</span>
              </div>
              <div className="flex justify-between">
                <span>Recv</span>
                <span className="font-mono">{formatBytes(iface.bytesRecv)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  } else if (metricClass === "battery" && sample.battery) {
    const { percent, timeRemaining, state, plugged } = sample.battery;
    content = (
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span>Charge</span>
          <span className="font-mono">{formatPercent(percent)}%</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>Time Remaining</span>
          <span className="font-mono">{formatBatteryTime(timeRemaining)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>State</span>
          <span className="font-mono capitalize">{state}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>Plugged</span>
          <span className="font-mono">{plugged ? "Yes" : "No"}</span>
        </div>
      </div>
    );
  } else if (metricClass === "loadAverage" && sample.loadAverage) {
    const { load1, load5, load15 } = sample.loadAverage;
    content = (
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span>1m</span>
          <span className="font-mono">{formatLoadAverage(load1)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>5m</span>
          <span className="font-mono">{formatLoadAverage(load5)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>15m</span>
          <span className="font-mono">{formatLoadAverage(load15)}</span>
        </div>
      </div>
    );
  } else if (metricClass === "uptime" && sample.uptime) {
    const { uptimeSeconds } = sample.uptime;
    content = (
      <div className="flex justify-between text-xs">
        <span>Uptime</span>
        <span className="font-mono">{formatUptime(uptimeSeconds)}</span>
      </div>
    );
  } else {
    content = <div className="text-xs text-neutral-500">Metric unavailable</div>;
  }

  return <div className="min-w-48 rounded-md bg-white p-3 dark:bg-neutral-950">{content}</div>;
}
