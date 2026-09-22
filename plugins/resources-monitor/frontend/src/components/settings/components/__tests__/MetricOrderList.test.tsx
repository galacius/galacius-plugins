import "@testing-library/jest-dom/vitest";
import type { ComponentProps, ReactNode } from "react";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MetricOrderList } from "../MetricOrderList";
import type { Capabilities } from "../../../../api/resources";

// Icons are presentational and irrelevant to the reorder/toggle logic under
// test; mocking them decouples these tests from whichever @galacius/design-system
// version happens to be installed (published npm vs. the local link override).
vi.mock("@galacius/design-system", () => ({
  GripVerticalIcon: () => null,
  EyeIcon: () => null,
  EyeOffIcon: () => null,
  CpuIcon: () => null,
  MemoryStickIcon: () => null,
  HardDriveIcon: () => null,
  InfoIcon: () => null,
  Tooltip: ({ children }: { children?: ReactNode }) => children,
  TooltipProvider: ({ children }: { children?: ReactNode }) => children,
  TooltipTrigger: (props: { render?: ReactNode }) => props.render ?? null,
  TooltipContent: ({ children }: { children?: ReactNode }) => children,
  Button: (props: ComponentProps<"button"> & { variant?: string; size?: string }) => (
    <button {...props} />
  ),
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(" "),
}));

describe("MetricOrderList", () => {
  const mockCapabilities: Capabilities = {
    cpu: true,
    memory: true,
    diskio: true,
  };

  const defaultProps = {
    metricOrder: ["cpu", "memory", "diskio"],
    enabledMetrics: {
      cpu: true,
      memory: true,
      diskio: true,
    },
    capabilities: mockCapabilities,
    onToggle: vi.fn(),
    onReorder: vi.fn(),
  };

  it("renders all metrics in order", () => {
    render(<MetricOrderList {...defaultProps} />);
    const cpu = screen.getByText("CPU");
    const memory = screen.getByText("Memory");
    expect(cpu).toBeInTheDocument();
    expect(memory).toBeInTheDocument();
  });

  it("keeps the enable toggle usable for unsupported metrics", () => {
    const capabilities: Capabilities = {
      cpu: true,
      memory: false,
      diskio: true,
    };

    const { container } = render(<MetricOrderList {...defaultProps} capabilities={capabilities} />);

    const memoryToggle = within(container).getByRole("button", { name: "Disable Memory" });
    expect(memoryToggle).toBeEnabled();

    const cpuToggle = within(container).getByRole("button", { name: "Disable CPU" });
    expect(cpuToggle).toBeEnabled(); // cpu, first in defaultProps.metricOrder
  });

  it("reorders metrics when a row is dragged and dropped on another", () => {
    const onReorder = vi.fn();
    const { container } = render(<MetricOrderList {...defaultProps} onReorder={onReorder} />);

    const rows = container.querySelectorAll('[draggable="true"]');
    const dataTransfer = { setDragImage: vi.fn() } as unknown as DataTransfer;

    fireEvent.dragStart(rows[0], { dataTransfer });
    fireEvent.dragOver(rows[2], { dataTransfer });
    fireEvent.drop(rows[2], { dataTransfer });

    expect(onReorder).toHaveBeenCalledWith(["memory", "diskio", "cpu"]);
  });

  it("does not reorder when dropping a row onto itself", () => {
    const onReorder = vi.fn();
    const { container } = render(<MetricOrderList {...defaultProps} onReorder={onReorder} />);

    const rows = container.querySelectorAll('[draggable="true"]');
    const dataTransfer = { setDragImage: vi.fn() } as unknown as DataTransfer;

    fireEvent.dragStart(rows[0], { dataTransfer });
    fireEvent.dragOver(rows[0], { dataTransfer });
    fireEvent.drop(rows[0], { dataTransfer });

    expect(onReorder).not.toHaveBeenCalled();
  });
});
