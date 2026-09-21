import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ResourcesFooterWidget } from "../ResourcesFooterWidget";
import { getThresholdColor } from "../../utils";
import { GetSettings, GetCapabilities } from "../../api/bridge";
import { useLiveSampleStore } from "../../stores/liveSampleStore";
import type { ResourcesSample, Settings, Capabilities } from "../../api/resources";

vi.mock("../../api/bridge", () => ({
  GetSettings: vi.fn(),
  GetCapabilities: vi.fn(),
}));

// Icons are presentational and irrelevant to the severity/overflow logic under
// test; mocking them decouples these tests from whichever @galacius/design-system
// version happens to be installed (published npm vs. the local link override).
vi.mock("@galacius/design-system", () => ({
  CpuIcon: () => null,
  HardDriveIcon: () => null,
  MemoryStickIcon: () => null,
  NetworkIcon: () => null,
  BatteryIcon: () => null,
  TrendingUpIcon: () => null,
  ClockIcon: () => null,
}));

vi.mock("../../stores/liveSampleStore", () => ({
  useLiveSampleStore: vi.fn(),
}));

const baseSettings: Settings = {
  schemaVersion: 1,
  intervalMs: 2000,
  enabledMetrics: {
    cpu: true,
    memory: true,
    disk: true,
    network: true,
    battery: true,
    loadAverage: false,
    uptime: false,
  },
  metricOrder: ["cpu", "memory", "disk", "network", "battery"],
  display: { compact: false, formats: {} },
};

const baseCapabilities: Capabilities = {
  cpu: true,
  memory: true,
  disk: true,
  network: true,
  battery: true,
  loadAverage: true,
  uptime: true,
};

const baseSample: ResourcesSample = {
  timestamp: Date.now(),
  cpu: { usagePercent: 12.3, perCore: [12.3] },
  memory: {
    usedPercent: 40,
    usedBytes: 0,
    totalBytes: 0,
    swapPercent: 0,
    swapUsedBytes: 0,
    swapTotalBytes: 0,
  },
  disk: { disks: [{ usedPercent: 30, usedBytes: 0, totalBytes: 0, path: "/" }] },
  network: {
    interfaces: [{ bytesSent: 0, bytesRecv: 0, packetsSent: 0, packetsRecv: 0, name: "en0" }],
  },
  battery: { percent: 5, timeRemaining: 10, state: "discharging", plugged: false },
  degraded: false,
};

describe("ResourcesFooterWidget severity logic (getThresholdColor)", () => {
  it("returns destructive for values at or above critical threshold", () => {
    expect(getThresholdColor(95, 70, 90)).toBe("destructive");
  });

  it("returns destructive for critically low battery (lower-is-worse)", () => {
    expect(getThresholdColor(5, 20, 10, true)).toBe("destructive");
  });
});

describe("ResourcesFooterWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders skeleton chips while settings/capabilities are loading", async () => {
    vi.mocked(GetSettings).mockReturnValue(new Promise(() => {}));
    vi.mocked(GetCapabilities).mockReturnValue(new Promise(() => {}));
    vi.mocked(useLiveSampleStore).mockReturnValue(null);

    render(<ResourcesFooterWidget />);

    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    expect(screen.getByText("cpu")).toBeInTheDocument();
  });

  it("renders 'Unavailable' when the sample is degraded", async () => {
    vi.mocked(GetSettings).mockResolvedValue(baseSettings);
    vi.mocked(GetCapabilities).mockResolvedValue(baseCapabilities);
    vi.mocked(useLiveSampleStore).mockReturnValue({ ...baseSample, degraded: true });

    render(<ResourcesFooterWidget />);

    await waitFor(() => expect(screen.getByText("Unavailable")).toBeInTheDocument());
  });

  it("renders 'Unavailable' when there is no sample yet", async () => {
    vi.mocked(GetSettings).mockResolvedValue(baseSettings);
    vi.mocked(GetCapabilities).mockResolvedValue(baseCapabilities);
    vi.mocked(useLiveSampleStore).mockReturnValue(null);

    render(<ResourcesFooterWidget />);

    await waitFor(() => expect(screen.getByText("Unavailable")).toBeInTheDocument());
  });

  it("marks a critically-low battery chip as destructive severity, not healthy", async () => {
    vi.mocked(GetSettings).mockResolvedValue(baseSettings);
    vi.mocked(GetCapabilities).mockResolvedValue(baseCapabilities);
    vi.mocked(useLiveSampleStore).mockReturnValue(baseSample);

    render(<ResourcesFooterWidget />);

    const batteryChip = await waitFor(() => screen.getByTitle("battery: 5.0%"));
    expect(batteryChip.className).toContain("text-destructive");
  });

  it("does not mark a healthy CPU chip as destructive", async () => {
    vi.mocked(GetSettings).mockResolvedValue(baseSettings);
    vi.mocked(GetCapabilities).mockResolvedValue(baseCapabilities);
    vi.mocked(useLiveSampleStore).mockReturnValue(baseSample);

    render(<ResourcesFooterWidget />);

    const cpuChip = await waitFor(() => screen.getByTitle("cpu: 12.3%"));
    expect(cpuChip.className).not.toContain("text-destructive");
  });
});
