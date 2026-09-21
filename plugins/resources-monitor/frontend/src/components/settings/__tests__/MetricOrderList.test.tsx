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
      memory: false,
      disk: true,
      network: true,
      battery: true,
      loadAverage: true,
      uptime: true,
    };

    render(<MetricOrderList {...defaultProps} capabilities={capabilities} />);

    const memoryCheckbox = screen
      .getAllByTitle("Memory is not available on this platform")
      .find((el) => el.tagName === "INPUT");
    expect(memoryCheckbox).toBeDisabled();

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[0]).toBeEnabled(); // cpu, first in defaultProps.metricOrder
  });

  it("up button is enabled for all items except the first", () => {
    render(<MetricOrderList {...defaultProps} />);

    const moveUpButtons = screen.getAllByTitle("Move up");
    expect(moveUpButtons[0]).toBeDisabled(); // First item can't move up
    expect(moveUpButtons[1]).not.toBeDisabled(); // Second item can move up
    expect(moveUpButtons[2]).not.toBeDisabled(); // Third item can move up
  });

  it("down button is enabled for all items except the last", () => {
    render(<MetricOrderList {...defaultProps} />);

    const moveDownButtons = screen.getAllByTitle("Move down");
    const lastIndex = moveDownButtons.length - 1;
    expect(moveDownButtons[0]).not.toBeDisabled(); // First item can move down
    expect(moveDownButtons[lastIndex - 1]).not.toBeDisabled(); // Second-to-last can move down
    expect(moveDownButtons[lastIndex]).toBeDisabled(); // Last item can't move down
  });
});
