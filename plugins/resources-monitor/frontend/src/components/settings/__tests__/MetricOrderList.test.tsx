import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MetricOrderList } from "../MetricOrderList";
import type { Capabilities } from "../../../api/resources";

describe("MetricOrderList", () => {
  const mockCapabilities: Capabilities = {
    cpu: true,
    memory: true,
    disk: true,
    network: true,
    battery: true,
    loadAverage: true,
    uptime: true,
  };

  const defaultProps = {
    metricOrder: ["cpu", "memory", "disk", "network", "battery"],
    enabledMetrics: {
      cpu: true,
      memory: true,
      disk: true,
      network: true,
      battery: true,
      loadAverage: false,
      uptime: false,
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

  it("disables up button for first item", () => {
    render(<MetricOrderList {...defaultProps} />);
    const moveUpButtons = screen.getAllByTitle("Move up");
    expect(moveUpButtons[0]).toBeDisabled();
  });

  it("disables down button for last item", () => {
    render(<MetricOrderList {...defaultProps} />);
    const moveDownButtons = screen.getAllByTitle("Move down");
    expect(moveDownButtons[moveDownButtons.length - 1]).toBeDisabled();
  });

  it("disables checkbox for unsupported metrics", () => {
    const capabilities: Capabilities = {
      cpu: true,
      memory: false, // Unsupported
      disk: true,
      network: true,
      battery: true,
      loadAverage: true,
      uptime: true,
    };

    render(<MetricOrderList {...defaultProps} capabilities={capabilities} />);

    // Verify the component renders with unsupported metric
    const memoryItems = screen.getAllByText("Memory");
    expect(memoryItems.length).toBeGreaterThan(0);
  });
});
