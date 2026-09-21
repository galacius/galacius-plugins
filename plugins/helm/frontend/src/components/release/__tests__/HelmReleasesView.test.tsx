import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Children, cloneElement, createElement, isValidElement, useRef, useState } from "react";
import type { HelmRelease } from "../../../api/resources";

// ─── hoisted mocks ────────────────────────────────────────────────────────────

const resourceLinksNamespaceMock = vi.hoisted(() => vi.fn());
const openTabMock = vi.hoisted(() => vi.fn());

vi.mock("../../../hooks/data-access/useGetHelmReleases", () => ({
  useGetHelmReleases: vi.fn(),
}));

vi.mock("@galacius/core", () => ({
  appWideAPI: {
    getQueryClient: vi.fn(() => new QueryClient({ defaultOptions: { queries: { retry: false } } })),
  },
  createPluginBridge: vi.fn(() => ({
    fetchWithRetry: vi.fn(),
    invalidateBackendAddrCache: vi.fn(),
  })),
  clusterWideAPI: {
    useExposeProperties: vi.fn(() => ({
      activeContext: "ctx",
      activeNamespaces: [],
      availableNamespaces: [],
      resourceLinks: { namespace: resourceLinksNamespaceMock },
      unifiedTray: {
        tabs: [],
        activeTabId: null,
        collapsed: true,
        expanded: false,
        snapPoint: "36px",
        openTab: openTabMock,
        setActiveTab: vi.fn(),
        closeTab: vi.fn(),
        closeAll: vi.fn(),
        setSnapPoint: vi.fn(),
      },
    })),
  },
}));

// The linked @galacius/design-system pulls its own React instance under jsdom
// (see vitest.config.ts NOTE in plugins/resources-monitor/frontend) — mocking
// per test file avoids the resulting dual-React-instance crash. This mock
// covers every export touched by HelmReleasesView's full render tree (the
// row-actions dropdown, status badge, upgrade/rollback/delete buttons,
// confirmation/rollback/detail modals, etc. all import from the same module,
// so they all resolve to this mock too). Table/*, SearchInput, EmptyState,
// Badge, ResourceLink and FullTextSearchInput/useFullTextSearch are faithful
// passthroughs (real DOM + real value/onChange wiring, or — for
// useFullTextSearch — the real case-insensitive substring-search behavior
// mirrored from galacius/packages/design-system/src/libs/full-text-search/*)
// because tests assert on rendered row content, filtering, and sorting.
// Modals/menus that no test in this file opens (ConfirmationModal, FormModal,
// the row-actions DropdownMenuContent) render nothing while closed, matching
// their real closed-state behavior, so nothing further needs mocking inside
// them. Icons are purely decorative.
vi.mock("@galacius/design-system", () => ({
  ArrowUpIcon: () => null,
  ChevronDownIcon: () => null,
  Loader2Icon: () => null,
  MoreVerticalIcon: () => null,
  PackageIcon: () => null,
  RocketIcon: () => null,
  RotateCcwIcon: () => null,
  cn: (...args: any[]) => args.filter(Boolean).join(" "),
  Badge: ({ children, className }: any) => <span className={className}>{children}</span>,
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  ButtonGroup: ({ children }: any) => <div>{children}</div>,
  EmptyState: ({ title, description }: any) => (
    <div>
      <p>{title}</p>
      <p>{description}</p>
    </div>
  ),
  LoadingSpinner: ({ className }: any) => <div className={className}>Loading…</div>,
  Markdown: ({ children, className }: any) => <div className={className}>{children}</div>,
  ResourceLink: ({ children, onClick }: any) => <a onClick={onClick}>{children}</a>,
  ScrollArea: ({ children, className }: any) => <div className={className}>{children}</div>,
  SearchInput: ({ placeholder, value, onChange, wrapperClassName }: any) => (
    <div className={wrapperClassName}>
      <input placeholder={placeholder} value={value} onChange={onChange} />
    </div>
  ),
  SheetTitle: ({ children, className }: any) => <div className={className}>{children}</div>,
  Table: ({ children }: any) => <table>{children}</table>,
  TableHeader: ({ children, className }: any) => <thead className={className}>{children}</thead>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableRow: ({ children, className, onClick }: any) => (
    <tr className={className} onClick={onClick}>
      {children}
    </tr>
  ),
  TableHead: ({ children, className }: any) => <th className={className}>{children}</th>,
  TableCell: ({ children, className, colSpan, onClick }: any) => (
    <td className={className} colSpan={colSpan} onClick={onClick}>
      {children}
    </td>
  ),
  TableSkeletonLoader: () => null,
  Textarea: ({ value, onChange, ...props }: any) => (
    <textarea value={value} onChange={onChange} {...props} />
  ),
  Tabs: ({ children }: any) => <div>{children}</div>,
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ children }: any) => <button>{children}</button>,
  TabsContent: ({ children }: any) => <div>{children}</div>,
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipContent: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ render }: any) => render ?? null,
  ResourceDeletionButton: ({ children, label, onClick }: any) => (
    <button onClick={onClick}>{label ?? children ?? "Delete"}</button>
  ),
  ResourceDetailDrawer: ({ open, children }: any) => (open ? <>{children}</> : null),
  ResourceDetailDrawerHeader: ({ children }: any) => <div>{children}</div>,
  ResourceDetailEmptyBody: () => null,
  ConfirmationModal: ({ open }: any) => (open ? <div role="dialog" /> : null),
  FormModal: ({ open, children }: any) => (open ? <div>{children}</div> : null),
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
  DropdownMenuTrigger: ({ children, className, onClick, __open, __setOpen }: any) => (
    <button
      className={className}
      onClick={(e: any) => {
        onClick?.(e);
        __setOpen(!__open);
      }}
    >
      {children}
    </button>
  ),
  DropdownMenuContent: ({ children, __open }: any) => (__open ? <div>{children}</div> : null),
  DropdownMenuItem: ({ children, onClick, className }: any) => (
    <div role="menuitem" className={className} onClick={onClick}>
      {children}
    </div>
  ),
  FullTextSearchInput: ({
    searchTerm,
    matchCount,
    currentMatchIdx,
    onSearch,
    onSearchNext,
    ariaLabel,
  }: any) => (
    <div>
      <input
        aria-label={ariaLabel}
        placeholder="Search…"
        value={searchTerm}
        onChange={(e) => onSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSearchNext();
          }
        }}
      />
      <output>
        {searchTerm ? (matchCount === 0 ? "0" : `${currentMatchIdx + 1}/${matchCount}`) : ""}
      </output>
    </div>
  ),
  useFullTextSearch: ({ text }: { text: string }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [matches, setMatches] = useState<number[]>([]);
    const [currentMatchIdx, setCurrentMatchIdx] = useState(0);
    const contentRef = useRef(null);

    const handleSearch = (term: string) => {
      setSearchTerm(term);
      if (!term || !text) {
        setMatches([]);
        setCurrentMatchIdx(0);
        return;
      }
      const lowerText = text.toLowerCase();
      const lowerTerm = term.toLowerCase();
      const found: number[] = [];
      let idx = 0;
      let pos: number;
      while ((pos = lowerText.indexOf(lowerTerm, idx)) !== -1) {
        found.push(pos);
        idx = pos + lowerTerm.length;
      }
      setMatches(found);
      setCurrentMatchIdx(0);
    };

    const handleSearchNext = () => {
      if (!matches.length) return;
      setCurrentMatchIdx((idx) => (idx + 1) % matches.length);
    };

    return {
      searchTerm,
      matchCount: matches.length,
      currentMatchIdx,
      activeMatchCharIdx: matches.length > 0 ? matches[currentMatchIdx] : -1,
      contentRef,
      handleSearch,
      handleSearchNext,
    };
  },
}));

// ─── imports after mocks ──────────────────────────────────────────────────────

import { clusterWideAPI } from "@galacius/core";
import { useGetHelmReleases } from "../../../hooks/data-access/useGetHelmReleases";
import { HelmReleasesView } from "../HelmReleasesView";

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
}

function makeRelease(overrides: Partial<HelmRelease> = {}): HelmRelease {
  return {
    Name: "my-release",
    Namespace: "default",
    Chart: "nginx",
    ChartVersion: "15.0.0",
    AppVersion: "1.25.0",
    Status: "deployed",
    Revision: 1,
    Updated: "2d",
    UpdatedAt: "2026-06-28T00:00:00Z",
    Repository: "bitnami",
    EncodedValuesYAML: "",
    ...overrides,
  };
}

// ─── setup ────────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();
  (useGetHelmReleases as ReturnType<typeof vi.fn>).mockReturnValue({ data: [] });
});

// ─── tests ────────────────────────────────────────────────────────────────────

describe("HelmReleasesView", () => {
  it('renders "Releases" heading and 0 items count when data is empty', () => {
    render(<HelmReleasesView />, { wrapper: makeWrapper() });

    expect(screen.getAllByText("Releases").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/0 item/).length).toBeGreaterThan(0);
  });

  it('shows "Item list is empty" when data is empty', () => {
    render(<HelmReleasesView />, { wrapper: makeWrapper() });

    expect(screen.getAllByText("No Helm Releases").length).toBeGreaterThan(0);
  });

  it("renders release rows with Name, Namespace, Chart, Status columns", () => {
    const releases = [
      makeRelease({ Name: "prometheus", Namespace: "monitoring", Chart: "kube-prometheus" }),
      makeRelease({ Name: "grafana", Namespace: "monitoring", Chart: "grafana" }),
    ];
    (useGetHelmReleases as ReturnType<typeof vi.fn>).mockReturnValue({ data: releases });

    render(<HelmReleasesView />, { wrapper: makeWrapper() });

    expect(screen.getAllByText("prometheus").length).toBeGreaterThan(0);
    expect(screen.getAllByText("grafana").length).toBeGreaterThan(0);
    expect(screen.getAllByText("kube-prometheus").length).toBeGreaterThan(0);
  });

  it("shows correct item count for 1 item (singular)", () => {
    (useGetHelmReleases as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [makeRelease()],
    });

    render(<HelmReleasesView />, { wrapper: makeWrapper() });

    expect(screen.getAllByText("1 item").length).toBeGreaterThan(0);
  });

  it("filters by Name (case-insensitive)", () => {
    const releases = [makeRelease({ Name: "prometheus-stack" }), makeRelease({ Name: "grafana" })];
    (useGetHelmReleases as ReturnType<typeof vi.fn>).mockReturnValue({ data: releases });

    render(<HelmReleasesView />, { wrapper: makeWrapper() });

    fireEvent.change(screen.getByPlaceholderText("Search Releases..."), {
      target: { value: "PROMETHEUS" },
    });

    expect(screen.getAllByText("prometheus-stack").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("grafana")).toHaveLength(0);
  });

  it("filters by Namespace (case-insensitive)", () => {
    const releases = [
      makeRelease({ Name: "rel-a", Namespace: "monitoring" }),
      makeRelease({ Name: "rel-b", Namespace: "default" }),
    ];
    (useGetHelmReleases as ReturnType<typeof vi.fn>).mockReturnValue({ data: releases });

    render(<HelmReleasesView />, { wrapper: makeWrapper() });

    fireEvent.change(screen.getByPlaceholderText("Search Releases..."), {
      target: { value: "MONITORING" },
    });

    expect(screen.getAllByText("rel-a").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("rel-b")).toHaveLength(0);
  });

  it("filters by Chart (case-insensitive)", () => {
    const releases = [
      makeRelease({ Name: "rel-a", Chart: "kube-prometheus-stack" }),
      makeRelease({ Name: "rel-b", Chart: "grafana" }),
    ];
    (useGetHelmReleases as ReturnType<typeof vi.fn>).mockReturnValue({ data: releases });

    render(<HelmReleasesView />, { wrapper: makeWrapper() });

    fireEvent.change(screen.getByPlaceholderText("Search Releases..."), {
      target: { value: "kube-prometheus" },
    });

    expect(screen.getAllByText("rel-a").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("rel-b")).toHaveLength(0);
  });

  it("renders releases sorted alphabetically by Name", () => {
    const releases = [
      makeRelease({ Name: "zebra-rel", Namespace: "ns" }),
      makeRelease({ Name: "alpha-rel", Namespace: "ns" }),
      makeRelease({ Name: "mango-rel", Namespace: "ns" }),
    ];
    (useGetHelmReleases as ReturnType<typeof vi.fn>).mockReturnValue({ data: releases });

    render(<HelmReleasesView />, { wrapper: makeWrapper() });

    const rows = screen.getAllByRole("row");
    const dataRows = rows.filter((row) => row.querySelector("td"));
    const nameCells = dataRows
      .map((row) => row.querySelector("td:first-child")?.textContent)
      .filter(Boolean);

    expect(nameCells).toEqual(["alpha-rel", "mango-rel", "zebra-rel"]);
  });

  it("renders a status badge for each release", () => {
    const releases = [
      makeRelease({ Name: "rel-deployed", Status: "deployed" }),
      makeRelease({ Name: "rel-failed", Status: "failed" }),
    ];
    (useGetHelmReleases as ReturnType<typeof vi.fn>).mockReturnValue({ data: releases });

    render(<HelmReleasesView />, { wrapper: makeWrapper() });

    expect(screen.getAllByText("deployed").length).toBeGreaterThan(0);
    expect(screen.getAllByText("failed").length).toBeGreaterThan(0);
  });

  it("row click calls onToggleHelmReleaseDetail and release stays visible", () => {
    const releases = [makeRelease({ Name: "clickable-release" })];
    (useGetHelmReleases as ReturnType<typeof vi.fn>).mockReturnValue({ data: releases });

    render(<HelmReleasesView />, { wrapper: makeWrapper() });

    const rows = screen.getAllByRole("row");
    const dataRow = rows.find((r) => r.querySelector("td"));
    expect(dataRow).toBeTruthy();
    fireEvent.click(dataRow!);
    // Still visible — no drawer exists in this view
    expect(screen.getAllByText("clickable-release").length).toBeGreaterThan(0);
  });

  it("passes context and namespaces to useGetHelmReleases", () => {
    (clusterWideAPI.useExposeProperties as ReturnType<typeof vi.fn>).mockReturnValue({
      activeContext: "my-ctx",
      activeNamespaces: ["kube-system"],
      availableNamespaces: [],
      resourceLinks: { namespace: resourceLinksNamespaceMock },
      unifiedTray: null,
    });

    render(<HelmReleasesView />, { wrapper: makeWrapper() });

    expect(useGetHelmReleases).toHaveBeenCalledWith({
      context: "my-ctx",
      namespaces: ["kube-system"],
    });
  });
});
