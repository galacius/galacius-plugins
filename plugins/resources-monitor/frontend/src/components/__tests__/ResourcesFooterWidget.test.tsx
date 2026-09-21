import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
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
  MemoryStickIcon: () => null,
  HardDriveIcon: () => null,
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
    diskio: true,
  },
  metricOrder: ["cpu", "memory", "diskio"],
  display: { compact: false, formats: {} },
};

const baseCapabilities: Capabilities = {
  cpu: true,
  memory: true,
  diskio: true,
};

const baseSample: ResourcesSample = {
  timestamp: Date.now(),
  cpu: { usagePercent: 12.3, processes: [] },
  memory: {
    usedPercent: 40,
    usedBytes: 0,
    totalBytes: 0,
    processes: [],
  },
  diskIO: {
    readBytesPerSec: 1024,
    writeBytesPerSec: 2048,
    processes: [],
  },
  degraded: false,
};

describe("ResourcesFooterWidget severity logic (getThresholdColor)", () => {
  it("returns destructive for values at or above critical threshold", () => {
    expect(getThresholdColor(95, 70, 90)).toBe("destructive");
  });

  it("returns destructive for a critically low value when lower-is-worse", () => {
    expect(getThresholdColor(5, 20, 10, true)).toBe("destructive");
  });
});

describe("ResourcesFooterWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
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

  it("marks a critically-high memory chip as destructive severity, not healthy", async () => {
    vi.mocked(GetSettings).mockResolvedValue(baseSettings);
    vi.mocked(GetCapabilities).mockResolvedValue(baseCapabilities);
    vi.mocked(useLiveSampleStore).mockReturnValue({
      ...baseSample,
      memory: { usedPercent: 97, usedBytes: 0, totalBytes: 0, processes: [] },
    });

    render(<ResourcesFooterWidget />);

    const memoryChip = await waitFor(() => screen.getByTitle("memory: 97.0%"));
    expect(memoryChip.className).toContain("text-destructive");
  });

  it("marks a critically-high disk I/O chip as destructive severity", async () => {
    vi.mocked(GetSettings).mockResolvedValue(baseSettings);
    vi.mocked(GetCapabilities).mockResolvedValue(baseCapabilities);
    vi.mocked(useLiveSampleStore).mockReturnValue({
      ...baseSample,
      diskIO: {
        readBytesPerSec: 100 * 1024 * 1024,
        writeBytesPerSec: 100 * 1024 * 1024,
        processes: [],
      },
    });

    render(<ResourcesFooterWidget />);

    const diskioChip = await waitFor(() => screen.getByTitle("diskio: 200.0MB/s"));
    expect(diskioChip.className).toContain("text-destructive");
  });

  it("shows N/A for an enabled metric the platform doesn't support", async () => {
    vi.mocked(GetSettings).mockResolvedValue(baseSettings);
    vi.mocked(GetCapabilities).mockResolvedValue({ ...baseCapabilities, diskio: false });
    vi.mocked(useLiveSampleStore).mockReturnValue(baseSample);

    render(<ResourcesFooterWidget />);

    const diskioChip = await waitFor(() =>
      screen.getByTitle("diskio is not available on this platform")
    );
    expect(diskioChip).toHaveTextContent("N/A");
  });

  it("ignores stale metric classes persisted from a removed metric", async () => {
    vi.mocked(GetSettings).mockResolvedValue({
      ...baseSettings,
      enabledMetrics: { ...baseSettings.enabledMetrics, battery: true, network: true },
      metricOrder: ["cpu", "memory", "diskio", "battery", "network"],
    });
    vi.mocked(GetCapabilities).mockResolvedValue(baseCapabilities);
    vi.mocked(useLiveSampleStore).mockReturnValue(baseSample);

    render(<ResourcesFooterWidget />);

    await waitFor(() => screen.getByTitle("cpu: 12.3%"));
    expect(screen.queryByText("battery")).not.toBeInTheDocument();
    expect(screen.queryByText("network")).not.toBeInTheDocument();
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
