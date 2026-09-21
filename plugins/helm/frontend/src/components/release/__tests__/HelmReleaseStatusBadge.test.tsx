import { vi, describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// The linked @galacius/design-system pulls its own React instance under jsdom
// (see vitest.config.ts NOTE in plugins/resources-monitor/frontend) — mocking
// per test file avoids the resulting dual-React-instance crash. Badge is
// mocked with the real variant->className mapping (from atoms/badge.tsx)
// since the tests assert on className content for several variants.
vi.mock("@galacius/design-system", () => {
  const badgeVariantClassName: Record<string, string> = {
    default: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    destructive: "bg-destructive/15 text-destructive",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    info: "bg-info/15 text-info",
    danger: "bg-danger/15 text-danger",
    ghost: "bg-muted text-muted-foreground",
  };
  return {
    Badge: ({ children, variant = "default", className }: any) => (
      <span className={[badgeVariantClassName[variant] ?? "", className].filter(Boolean).join(" ")}>
        {children}
      </span>
    ),
  };
});

import { HelmReleaseStatusBadge } from "../HelmReleaseStatusBadge";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("HelmReleaseStatusBadge", () => {
  it('renders "deployed" with success variant', () => {
    render(<HelmReleaseStatusBadge status="deployed" />);
    const badge = screen.getByText("deployed");
    expect(badge).toBeInTheDocument();
  });

  it('renders "pending-install" with warning variant', () => {
    render(<HelmReleaseStatusBadge status="pending-install" />);
    const badge = screen.getByText("pending-install");
    expect(badge).toBeInTheDocument();
  });

  it('renders "pending-upgrade" with warning variant', () => {
    render(<HelmReleaseStatusBadge status="pending-upgrade" />);
    const badge = screen.getByText("pending-upgrade");
    expect(badge).toBeInTheDocument();
  });

  it('renders "pending-rollback" with warning variant', () => {
    render(<HelmReleaseStatusBadge status="pending-rollback" />);
    const badge = screen.getByText("pending-rollback");
    expect(badge).toBeInTheDocument();
  });

  it('renders "uninstalling" with danger variant', () => {
    render(<HelmReleaseStatusBadge status="uninstalling" />);
    const badge = screen.getByText("uninstalling");
    expect(badge.className).toMatch(/danger/);
  });

  it('renders "failed" with destructive variant', () => {
    render(<HelmReleaseStatusBadge status="failed" />);
    const badge = screen.getByText("failed");
    expect(badge).toBeInTheDocument();
  });

  it('renders "superseded" with info variant', () => {
    render(<HelmReleaseStatusBadge status="superseded" />);
    const badge = screen.getByText("superseded");
    expect(badge.className).toMatch(/info/);
  });

  it("renders unknown status with muted styling", () => {
    render(<HelmReleaseStatusBadge status="unknown-state" />);
    const badge = screen.getByText("unknown-state");
    expect(badge.className).toMatch(/muted/);
  });
});
