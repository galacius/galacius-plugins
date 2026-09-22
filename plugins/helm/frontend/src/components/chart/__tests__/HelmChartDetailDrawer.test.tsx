import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Children, cloneElement, createElement, isValidElement, useState } from "react";

// ─── hoisted mocks ────────────────────────────────────────────────────────────

vi.mock("../../../hooks/data-access/useGetHelmChartVersions", () => ({
  useGetHelmChartVersions: vi.fn(),
}));

vi.mock("../../../hooks/data-access/useGetHelmChartDetail", () => ({
  useGetHelmChartDetail: vi.fn(),
}));

vi.mock("../../../hooks/data-access/useGetArtifactHubReadme", () => ({
  useGetArtifactHubReadme: vi.fn(),
}));

vi.mock("../../../hooks/data-access/useGetHelmChartValues", () => ({
  useGetHelmChartValues: vi.fn(),
}));

vi.mock("../../../hooks/data-mutation/useInstallHelmChart", () => ({
  useInstallHelmChart: vi.fn(),
}));

vi.mock("@galacius/core", () => ({
  clusterWideAPI: {
    useExposeProperties: vi.fn(),
    useExposeMethods: vi.fn(),
  },
}));

// The linked @galacius/design-system pulls its own React instance under jsdom
// (see vitest.config.ts NOTE in plugins/resources-monitor/frontend) — mocking
// per test file avoids the resulting dual-React-instance crash. Button is
// mocked as a faithful <button> passthrough because the test asserts on its
// role/disabled attribute (it's rendered both directly and via the nested
// HelmChartVersionSelectDropdown/HelmChartIcon, which are also transitively
// rendered and need their own design-system exports covered here); the rest
// are purely decorative/unexercised by this test's assertions.
vi.mock("@galacius/design-system", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  AnnotationBadge: ({ label }: any) => <span>{label}</span>,
  Markdown: ({ children, className }: any) => <div className={className}>{children}</div>,
  PackageIcon: () => null,
  ResourceDetailDrawer: ({ open, children }: any) => (open ? <>{children}</> : null),
  ScrollArea: ({ children, className }: any) => <div className={className}>{children}</div>,
  cn: (...args: any[]) => args.filter(Boolean).join(" "),
  CheckIcon: () => null,
  ChevronDownIcon: () => null,
  Loader2Icon: () => null,
  DropdownMenu: ({ children }: any) => {
    const [open, setOpen] = useState(false);
    return (
      <>
        {Children.map(children, (child) =>
          isValidElement(child)
            ? cloneElement(child as any, { __open: open, __setOpen: setOpen })
            : child
        )}
      </>
    );
  },
  DropdownMenuTrigger: ({ children, className, disabled, __open, __setOpen }: any) => (
    <button className={className} disabled={disabled} onClick={() => __setOpen(!__open)}>
      {children}
    </button>
  ),
  DropdownMenuContent: ({ children, __open }: any) => (__open ? <div>{children}</div> : null),
  DropdownMenuItem: ({ children, onClick, className }: any) => (
    <div role="menuitem" className={className} onClick={onClick}>
      {children}
    </div>
  ),
}));

// ─── imports after mocks ──────────────────────────────────────────────────────

import { clusterWideAPI } from "@galacius/core";
import { useGetHelmChartVersions } from "../../../hooks/data-access/useGetHelmChartVersions";
import { useGetHelmChartDetail } from "../../../hooks/data-access/useGetHelmChartDetail";
import { useGetArtifactHubReadme } from "../../../hooks/data-access/useGetArtifactHubReadme";
import { useGetHelmChartValues } from "../../../hooks/data-access/useGetHelmChartValues";
import { useInstallHelmChart } from "../../../hooks/data-mutation/useInstallHelmChart";
import { HelmChartDetailDrawer } from "../HelmChartDetailDrawer";

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
}

// ─── setup ────────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();
  (useGetHelmChartVersions as ReturnType<typeof vi.fn>).mockReturnValue({
    data: [],
    isLoading: false,
  });
  (useGetHelmChartDetail as ReturnType<typeof vi.fn>).mockReturnValue({
    data: null,
    isLoading: false,
    isFetching: false,
  });
  (useGetArtifactHubReadme as ReturnType<typeof vi.fn>).mockReturnValue({
    data: undefined,
    isLoading: false,
    isFetching: false,
  });
  (useGetHelmChartValues as ReturnType<typeof vi.fn>).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
  });
  (useInstallHelmChart as ReturnType<typeof vi.fn>).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  });
  vi.mocked(clusterWideAPI.useExposeProperties).mockReturnValue({
    activeContext: "default",
    activeNamespaces: ["default"],
    activeResource: "helm-charts",
    availableNamespaces: [],
    resourceLinks: {},
    unifiedTray: {
      tabs: [],
      activeTabId: null,
      collapsed: true,
      expanded: false,
      snapPoint: "36px",
      openTab: vi.fn(),
      setActiveTab: vi.fn(),
      closeTab: vi.fn(),
      closeAll: vi.fn(),
      setSnapPoint: vi.fn(),
    },
  } as unknown as ReturnType<typeof clusterWideAPI.useExposeProperties>);
  vi.mocked(clusterWideAPI.useExposeMethods).mockReturnValue({
    onNavigateToView: vi.fn(),
  } as unknown as ReturnType<typeof clusterWideAPI.useExposeMethods>);
});

// ─── tests ────────────────────────────────────────────────────────────────────

describe("HelmChartDetailDrawer", () => {
  it("disables Install button when no versions are loaded yet", () => {
    (useGetHelmChartVersions as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: true,
    });
    (useGetHelmChartDetail as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        Name: "nginx",
        Description: "Nginx chart",
        Version: "",
        AppVersion: "1.0",
        Repository: "bitnami",
        Icon: "",
        Home: "",
        Keywords: [],
        Sources: [],
        Maintainers: [],
      },
      isLoading: false,
      isFetching: false,
    });

    render(
      <HelmChartDetailDrawer
        chartName="nginx"
        repository="bitnami"
        open={true}
        onClose={vi.fn()}
      />,
      { wrapper: makeWrapper() }
    );

    const installButtons = screen.getAllByRole("button", { name: /Install/i });
    expect(installButtons[0].hasAttribute("disabled")).toBe(true);
  });
});
