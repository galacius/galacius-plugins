---
name: file-structure
description: "Repo layout of galacius-plugins — pnpm workspace + Go module structure, hexagonal-architecture backend/frontend directory map for the helm and resources-monitor plugins"
metadata:
  node_type: memory
  type: reference
  originSessionId: 7d5e9c83-be5e-4cf5-9fd6-36ce1356d5fc
  modified: 2026-09-22T00:00:00.000Z
---

galacius-plugins is the official plugin repo for Galacius (Wails Kubernetes desktop app). Each plugin
pairs a Go subprocess (backend) with a dynamically-loaded TS/React ES module (frontend). The repo
currently holds two plugins: `plugins/helm/` and `plugins/resources-monitor/` (see the
"`plugins/resources-monitor/`" section near the end of this file for its structure — it's simpler
than helm: no gRPC pub/sub control channel, just an HTTP business API plus outbound `Emit` for
live-sample push events).

Repo-level:

- pnpm workspace (`pnpm-workspace.yaml` includes `plugins/helm/frontend` and
  `plugins/resources-monitor/frontend`) at the JS layer.
- Single Go module `github.com/galacius/galacius-plugins` at the root, but `plugins/helm/` and
  `plugins/resources-monitor/` each have their own nested `go.mod`
  (`.../galacius-plugins/plugins/helm`, `.../galacius-plugins/plugins/resources-monitor`) — helm
  since it pulls in heavy deps (`helm.sh/helm/v3`, `k8s.io/client-go`) that shouldn't pollute the
  root module, resources-monitor following the same per-plugin-module convention.
- `staticcheck` is a Go 1.26+ `tool` directive in each plugin's `go.mod`, run via
  `go tool staticcheck ./...` inside that plugin's directory.
- `docs/architecture/` holds the architecture diagram (`architecture-{light,dark}.mmd` + rendered
  `.svg`, `architecture.md` with the mermaid-cli regen command). It documents the helm plugin's
  call path only — resources-monitor's simpler HTTP+Emit path isn't diagrammed there. Keep in sync
  with this file and [[architecture-call-path]] when the plugin/host wire contract changes.
- The reusable gRPC pub/sub sync machinery (client, backoff, generic event-route/dispatch framework,
  event DTOs) lives in `packages/core/async` in the sibling `galacius` (host) repo, not in this repo —
  `plugins/helm/go.mod` depends on it as a tagged release (`github.com/galacius/galacius/packages/core`);
  `plugins/resources-monitor/go.mod` depends on the same package but only for `coreasync.GrpcClient`
  (dial + `Emit`, no `Subscribe`/event-route usage — resources-monitor has no cluster-context or
  namespace concept). The frontend counterpart is npm's `@galacius/core`. `pnpm-workspace.yaml`'s
  earlier `overrides`/`link:` block pointing these at the sibling `galacius` checkout's local source
  has been removed — both packages are now consumed as ordinary published versions in every plugin.
  See [[architecture-call-path]].

`plugins/helm/internal/` (Go backend, HTTP + gRPC-client subprocess, **hexagonal architecture** —
refactored from the old flat `internal/api`/`internal/helm`/`internal/kube` layout):

- `internal/main.go` — process entrypoint. Reads an auth token from stdin
  (`util.ReadAuthTokenFromStdin`, before any gRPC ops), dials the host's gRPC server if
  `GALACIUS_HOST_GRPC_PORT` is set (via `coreasync.GrpcClient` — aliased `coreasync` in this file only,
  since `main` also imports the plugin's own local `presentations/async` package under the bare
  identifier `async`), builds a `kube.DynamicClusterProvider`, wraps `applications/helm.Service` in
  `applications/lock.LockedService`, builds `presentations/async.NewEventDispatcher(dp)` (two
  `coreasync.EventRoute`s — cluster-context, active-namespaces — each still dialing its *own* dedicated
  `GrpcClient` internally, sharing one would tear down the other's stream on reconnect) and calls
  `.StartAll(...)`, then `dp.WaitForInitialSync(5s)` to block the first business call until the host's
  replay lands, then starts `adapters/presentations/rest.HttpServer` (blocks for process lifetime).
- `internal/applications/` — framework-agnostic core:
  - `applications/port/driven.go` — outbound interfaces the core depends on: `KubeClusterProvider`
    (merged from the former separate `ClusterProvider`/`MutableClusterProvider` interfaces — embeds
    `async.EventReceiver` plus `Ctx`/`WaitForInitialSync`/`GetActiveContext`/`SetActiveContext`/
    `GetActiveNamespaces`/`SetActiveNamespaces`), `RESTClientGetterFactory`, `EventEmitter` func type.
  - `applications/port/driver.go` — `HelmService` interface (what the core exposes inbound), defined
    here rather than in `applications/helm` to avoid circular imports.
  - `applications/helm/` — `Service` (`helm.go`/`helm_chart.go`/`helm_release.go`/`utils.go`), talks to
    Helm SDK (`helm.sh/helm/v3`) + Kubernetes via `port.ClusterProvider`.
  - `applications/lock/lock.go` — `LockedService` wraps `*helm.Service` in `sync.RWMutex` (business
    methods take `RLock`, `SetActiveContext` takes `Lock`) so a context swap can't race an in-flight
    business call.
  - `applications/dto/` — `helm.go` only (Helm-specific DTOs, plugin-owned). The event DTOs
    (`ClusterContextEvent`/`ActiveNamespacesEvent`, formerly `dto/kube.go`) and the `SubscribeStream`
    type (formerly `dto/stream.go`) moved to `packages/core/async` (`dto.go`/`stream.go`) — they're
    shared plugin-sync types, not helm-specific.
  - `applications/helm/cache.go` — in-memory `cache` used by `Service` to avoid rebuilding
    `action.Configuration` / re-parsing repo index files / re-running discovery on every business
    call. Keyed by `configCacheKey{context, namespace}` (namespace-keyed because
    `action.Configuration.Init` binds a fixed storage namespace — sharing across namespaces in the
    same context returns the wrong one); discovery results are cluster-wide so they're cached
    separately per-context; repo index entries carry a 10-minute TTL. `invalidateAllConfigs` clears
    both config and discovery caches on active-context switch. See [[architecture-call-path]] for why
    context switches must invalidate this.
- `internal/adapters/presentations/rest/` — inbound HTTP adapter. `server.go`'s `NewHttpServer` binds
  the listener (hard-fails if not localhost — CORS-reflects `Origin`, so non-localhost would be
  unsafe), builds a `chi.NewRouter()` (go-chi, not `http.ServeMux`) directly in `NewHttpServer` itself
  (registering all 17 `POST /api/helm/<camelCaseMethod>` routes inline, one per `port.HelmService`
  method — `handlers.go` has no separate `RegisterRoutes` function, it only defines the `Handler`
  struct + per-route methods), wrapped in `corsMiddleware`. `Serve()` emits the one-line JSON
  handshake (`{"type":"READY","version":...,"httpPort":...,"pid":...,"timestamp":...}`) before
  blocking. `utils.go` (not `response.go`): `decodeBody`, `writeError`/`writeJSON`, `ErrorResponse`
  type; codes `PLUGIN_UNAVAILABLE` (503), `INVALID_REQUEST` (400), `NOT_FOUND` (404), `INTERNAL_ERROR`
  (500).
- `internal/adapters/infrastructures/app/` no longer exists — the outbound gRPC pub/sub client
  (`GrpcClient.Dial`/`Subscribe`/`Publish`/`DialAndSubscribe`), auth interceptor
  (`NewAuthInterceptors`), event emitter (`Emit`), and backoff reconnector (`BackoffReconnector`) were
  all generic (not Helm-specific) and have been extracted into `packages/core/async` in the sibling
  `galacius` repo (see [[architecture-call-path]]), reusable by any future plugin. `pb` is still
  imported from `github.com/galacius/galacius/packages/core/pb` — no local `.proto` copy.
- `internal/adapters/presentations/async/` — thin helm-specific wiring over the shared
  `packages/core/async` event-route framework (unaliased import — this package's own name is also
  `async`, so no collision): `handlers.go`'s `Handler` (dispatches deserialized `async.
  ClusterContextEvent`/`async.ActiveNamespacesEvent` to a `port.KubeClusterProvider`; each event
  carries a `Clearing` bool — the host now pushes a clear-first message immediately before every
  cluster switch, so `Handler` branches to `ClearActiveContext`/`ClearActiveNamespaces` instead of
  `SyncClusterContext`/`SyncActiveNamespaces` when set. `maybeAck` unconditionally acks
  `event.RequestID` back to the host afterward via the injected `ackFunc`, even on an apply error, so
  the host's `PublishAndAwaitAck` (host repo) doesn't burn its full timeout on a plugin-side error it
  can't otherwise observe) and `dispatcher.go`'s `EventDispatcher` (holds `[]async.EventRoute` built
  via `async.NewRoute(topic, handler, deserializer)` for the two topics; `NewEventDispatcher` now also
  takes the shared `hostClient *async.GrpcClient` and `pluginID` to build the `ackFunc` — it calls
  `hostClient.Emit(ctx, "ack", pluginID, ...)`, fire-and-forget, reusing the same emit path as
  business-progress events; `StartAll` loops `go route.Run(grpcAddr, authToken)` for each — core does
  not expose its own `EventDispatcher`, this plugin-local wrapper owns the route slice + start loop
  directly).
- `internal/adapters/infrastructures/kube/` — split across three files, all on the single
  `ClusterProvider` struct (renamed from `DynamicClusterProvider`; `ClusterProvider` and the old
  `MutableClusterProvider` port were merged into one `port.KubeClusterProvider`, see above):
  `provider.go` (struct/constructor `NewClusterProvider`, `Ctx()`, `WaitForInitialSync` — the
  sync-timeout wait moved here from `main.go`, which no longer needs a type assertion back to the
  concrete provider), `cluster.go` (`GetActiveContext`/`SetActiveContext`, `SyncClusterContext`/
  `ClearActiveContext` implementing `async.EventReceiver`; `ClearActiveContext` only blanks
  `activeContext`, deliberately leaving `cs`/`rc`/`kubeconfigPath` alone so cluster-independent
  endpoints that don't gate on `activeContext` never see a nil clientset), `namespace.go` (mirror for
  `GetActiveNamespaces`/`SetActiveNamespaces`/`SyncActiveNamespaces`/`ClearActiveNamespaces` — clearing
  sets `activeNamespaces` to nil, reusing the existing "empty means cluster-wide" semantics rather than
  a distinct error state). No longer has its own `WatchClusterContext`/`WatchActiveNamespaces`
  reconnect loops or a local `connector.go`/`BackoffReconnector` — that reconnect-loop logic lives
  generically inside each `packages/core/async.eventRoute[T].Run`, driven by
  `presentations/async.EventDispatcher`.
- `internal/adapters/infrastructures/restconfig/` — `getter.go`'s `Getter` (implements
  `genericclioptions.RESTClientGetter` off a live `rest.Config`) + `Factory` (implements
  `port.RESTClientGetterFactory`).
- `internal/config/env.go` — `GetHostGRPCPort()` reads `GALACIUS_HOST_GRPC_PORT` (empty when unset,
  e.g. running the binary standalone outside the host app).
- `internal/config/const.go` — `PluginID = "helm"`, used as the sender ID on emitted events (including
  acks) and to build the ack topic the host's `PublishAndAwaitAck` waits on.

`plugins/helm/frontend/src/` (TS/React, builds to standalone ESM via `tsup`):

- `src/index.ts` — **registration-based** plugin entrypoint (no longer a named-export barrel): calls
  `appWideAPI.registerStylesheets`, `.registerSettingsTab` (registers `HelmSettingsTab` under the
  host's Settings surface, labeled "Helm"), `clusterWideAPI.registerNavEntry`, `.registerTrayFamilies`,
  `.registerEvents`, `.registerViews` from `@galacius/core` at module load. The host discovers plugin
  capabilities by importing this module for its side effects, not by reading exported symbols.
- `src/const.ts` — `PLUGIN_ID`, `HELM_NAV_ENTRY`, `HELM_TRAY_FAMILIES` (tray family keys `"helm-chart"`,
  `"helm-chart-upgrade"` are wire contract with the host's `unifiedTray.openTab(family, params)`).
- `src/events.ts` — `eventHandlers` map keyed by event name (`helm:install:complete`,
  `helm:install:error`, `helm:upgrade:complete`, `helm:upgrade:error`, `helm:cleanup:complete`,
  `helm:cleanup:partial`, `helm:cleanup:error`), registered via `clusterWideAPI.registerEvents`; each
  handler toasts (`@galacius/design-system`) and invalidates react-query keys via
  `appWideAPI.getQueryClient()`.
- `src/api/bridge.ts` (renamed from `wailsBridge.ts`) — the fetch/retry/backend-address-caching
  machinery (`fetchWithRetry`, `TypeError`-triggers-one-retry, `PluginError` type) moved out into
  `@galacius/core`'s `createPluginBridge(pluginID)` factory so other plugins can reuse it instead of
  duplicating it; this file now just calls `createPluginBridge(PLUGIN_ID)` once (`export const bridge
  = createPluginBridge(PLUGIN_ID)`) and defines the per-endpoint payload exports
  (`bridge.fetchWithRetry<T>("listCharts", {})` etc., method name → `POST
  /api/helm/<camelCaseMethod>`, payload field names stay Go PascalCase). Must match the
  `RegisterRoutes` table in `internal/adapters/presentations/rest/handlers.go` exactly.
  `frontend/package.json` links `@galacius/core` for the shared bridge/`NavEntry`/etc.
- `src/api/resources.ts` — TS types mirroring the Go DTOs/handler payloads.
- `src/api/api.const.ts` — react-query key constants (`QUERY_KEY_HELM_CHARTS`,
  `QUERY_KEY_HELM_RELEASES`, `QUERY_KEY_HELM_REPOSITORIES`, `QUERY_KEY_HELM_REPOSITORY_CATALOG`, etc.).
- `src/api/api.ts` — `DEFAULT_QUERY_OPTIONS` (`refetchOnWindowFocus: false`, `retry: false`,
  `keepPreviousData`), shared across the data-access hooks.
- `src/api/query.client.ts` — exports `queryClient` (`appWideAPI.getQueryClient()`), a shared
  singleton. All data-mutation hooks import this instead of calling `useQueryClient()` or
  `appWideAPI.getQueryClient()` themselves — keeps cache reads/writes on one instance.
- `components/chart/`, `components/release/` — chart browse/install and release list/detail views.
  `components/settings/` — `HelmSettingsTab.tsx` (registered as the plugin's Settings-tab component)
  - `HelmRepositoriesSelect.tsx` (add/remove/search Helm repositories, backed by
  `addRepository`/`removeRepository`/`searchRepositoryCatalog` endpoints).
- `hooks/data-access/`, `hooks/data-mutation/` — react-query queries/mutations, one file per endpoint,
  matching the 17 `bridge.ts` exports (chart browse/install, release list/detail/rollback/delete,
  repository add/remove/search). `useInstallHelmChart.tsx`/`useUpgradeHelmChart.tsx` seed an optimistic
  `pending-install`/`pending-upgrade` release into the `QUERY_KEY_HELM_RELEASES` cache in `onSuccess`,
  ahead of the async `helm:install:complete`/`upgrade:complete` event that does the definitive
  invalidate — see [[architecture-call-path]]. (There is no `hooks/async-events/` directory anymore —
  event handling lives in top-level `src/events.ts`.)
- `src/style.css` → compiled by `pnpm build:css` before `tsup`, embedded as `PLUGIN_STYLES` equivalent
  registered via `appWideAPI.registerStylesheets`.
- Component tests live under `__tests__/` alongside the components they cover (vitest +
  @testing-library/react).

Other:

- `plugins/helm/scripts/build.sh` — builds the Go plugin binary (used by local dev + CI).
- `plugins/helm/scripts/deploy-plugin-helm-local.mjs` — mirrors a full local plugin install under
  `<repo-root>/.output/helm/` (frontend dist + binary + tar.gz + metadata); never touches the real
  `~/.galacius/plugins/helm` install dir; does not produce `helm.lock` (runtime-only, created by host).

Three-place payload sync required by hand (helm): route (`server.go`'s `NewHttpServer`) + handler
(`internal/adapters/presentations/rest/handlers.go`) ↔ `frontend/src/api/bridge.ts` export ↔
`frontend/src/api/resources.ts` type. See [[architecture-call-path]].

`plugins/resources-monitor/` — samples host-app + sibling-plugin-subprocess CPU/memory/disk-IO via
`gopsutil` on an interval and exposes it over HTTP, with live samples also pushed via the host gRPC
`Emit` channel. Much smaller surface than helm: no `port.KubeClusterProvider`, no cluster-context/
namespace sync, no `presentations/async` event-route wiring — the plugin only *dials out* to emit,
it never subscribes.

- `internal/main.go` — reads the auth token from stdin, dials the host's gRPC server (if
  `GALACIUS_HOST_GRPC_PORT` is set) purely to get an outbound `*coreasync.GrpcClient` for `Emit`
  (wrapped in a local `emitWrapper` implementing `port.SamplePublisher`, since `GrpcClient.Emit`'s
  signature doesn't itself satisfy the port), builds `collector.NewGopsutilCollector()` and
  `store.NewFileSettingsStore()`, constructs `monitor.NewService(...)` (which starts the sampler
  loop immediately), then starts `rest.NewHttpServer` (blocks for process lifetime). If the gRPC
  dial fails, `hostClient` stays nil and `Emit` becomes a no-op — the plugin still serves HTTP.
- `internal/applications/port/driven.go` — outbound interfaces: `MetricsCollector`
  (`CollectCPU`/`CollectMemory`/`CollectDiskIO`/`GetCapabilities`), `SettingsStore`
  (`Load`/`Save`), `SamplePublisher` (`Emit`, satisfied by the `emitWrapper` around
  `coreasync.GrpcClient`).
- `internal/applications/port/driver.go` — `MonitorService` interface: `GetSnapshot`,
  `GetSettings`/`SaveSettings`/`ResetSettings`, `GetCapabilities`.
- `internal/applications/monitor/sampler.go` — `Sampler` runs a `time.Ticker` (clamped to
  500ms–60s via `clampInterval`) on its own goroutine, calling `collector.Collect*` each tick,
  storing the result in `currentSample` (guarded by `sync.RWMutex`) and `publisher.Emit`-ing it on
  topic `plugins.resources-monitor.metrics:sample`. Tracks `overrun`/`lastTickTime` to mark a
  sample `Degraded: true` when a tick lands more than `interval+50ms` late (e.g. after the process
  was suspended), so the frontend can flag a stale-looking reading instead of trusting it blindly.
  `Reconfigure` swaps the ticker interval live when settings change (`ticker.Reset`).
- `internal/applications/monitor/service.go` — `Service` (implements `port.MonitorService`): loads
  settings once at construction, starts the `Sampler`, and on `SaveSettings` clamps
  `IntervalMs` (`validateInterval`, same 500–60000ms bounds as the sampler), persists via
  `SettingsStore`, calls `sampler.Reconfigure`, and emits `plugins.resources-monitor.metrics:settings:changed`
  (this event currently has no frontend handler in `events.ts` — the settings-tab mutations read the
  HTTP response directly instead).
- `internal/adapters/infrastructures/collector/collector.go` — `GopsutilCollector`. `appProcesses`
  resolves "this app's" process set as the host process (`os.Getppid()`, the plugin's parent) plus
  its direct children (sibling plugin subprocesses included), falling back to just this plugin's own
  PID if the parent can't be resolved (e.g. running the binary standalone in dev) — so CPU/memory/
  disk-IO are reported for the whole Galacius app, not just this one plugin process. CPU usage is
  normalized by `runtime.NumCPU()`. Disk IO reports per-process byte-rate deltas against a cached
  previous sample (`lastIO` map keyed by pid; first sample for a pid always yields 0) and is gated by
  `diskIOSupported = runtime.GOOS != "darwin"` — gopsutil's per-process IO counters are unimplemented
  on macOS, so `GetCapabilities().DiskIO` reports `false` there instead of returning fabricated
  zeroes.
- `internal/adapters/infrastructures/store/settings_store.go` — `FileSettingsStore` persists
  `settings.json` under `hostStorageDir("plugins", "resources-monitor")`. `hostStorageDir` mirrors
  the host's own storage-dir resolution (`GALACIUS_ROOT_DIR` env var, set by the host's plugin
  loader; falls back to `~/.galacius` only when run standalone) since that host-internal helper
  isn't exposed via `packages/core`. `Save` writes via temp-file + `chmod 0600` + atomic rename
  rather than a direct write, to avoid a reader observing a half-written file. `Load` falls back to
  `dto.DefaultSettings()` on missing file, unmarshal error, or `SchemaVersion == 0`.
- `internal/adapters/presentations/rest/server.go` / `handlers.go` — same shape as helm's REST
  adapter (chi router, localhost-only listener hard-fail, CORS-reflect-`Origin` middleware, JSON
  handshake on `Serve()`) but only 5 routes: `getSnapshot`, `getSettings`, `saveSettings`,
  `getCapabilities`, `resetSettings` — all under `/api/resources-monitor/<method>`. Error codes
  (`PLUGIN_UNAVAILABLE`, `INVALID_REQUEST`) match helm's convention but this handler set has no
  `NOT_FOUND`/`INTERNAL_ERROR` cases since there's no resource-lookup-by-ID surface.
- `internal/config/const.go` — `PluginID = "resources-monitor"`, `GetHostGRPCPort()` (same
  `GALACIUS_HOST_GRPC_PORT` env var as helm).

`plugins/resources-monitor/frontend/src/`:

- `src/index.ts` — registration entrypoint like helm's: `registerStylesheets`, `registerSettingsTab`
  (tab labeled "Resources", `ActivityIcon`), `registerEvents`. Also calls
  `appWideAPI.registerFooterWidget(PLUGIN_ID, { component: ResourcesFooterWidget })` — this plugin
  is the first (and so far only) to use that host API; see [[footer-widget-and-event-listener]] for
  why that matters (app-wide widget, live before any cluster connects).
- `src/events.ts` — one handler, `plugins.resources-monitor.metrics:sample`, which
  `queryClient.setQueryData`s the `QUERY_KEY_LIVE_SAMPLE` cache directly (no invalidate+refetch —
  the push payload *is* the new value).
- `src/api/bridge.ts` — same `createPluginBridge(PLUGIN_ID)` pattern as helm, 5 exports
  (`GetSnapshot`/`GetSettings`/`SaveSettings`/`GetCapabilities`/`ResetSettings`) matching the 5 HTTP
  routes.
- `src/api/resources.ts` — TS types mirroring the Go DTOs (`ResourcesSample`, `CPUMetric`,
  `MemoryMetric`, `DiskIOMetric`, per-process usage rows, `Capabilities`, `Settings` with
  `enabledMetrics`/`metricOrder`/`display`/`thresholds`).
- `src/api/api.const.ts` — react-query keys prefixed `resources-monitor-*` (capabilities, settings,
  live-sample) since the query client is the host's shared singleton and an unprefixed key like
  `"settings"` would collide with the host's own.
- `hooks/data-access/useGetLiveSample.ts` — `staleTime: Infinity`, no `refetchOnWindowFocus`/retry;
  the cache is kept fresh exclusively by the `metrics:sample` event handler above, this hook just
  reads it (and does one initial `GetSnapshot()` fetch to seed the cache before the first event
  arrives).
- `hooks/data-mutation/useSaveSettings.ts` / `useResetSettings.ts` — mutate then
  `queryClient.setQueryData` the settings cache directly from the HTTP response, plus a
  success/error toast (`@galacius/design-system`).
- `components/footer/ResourcesFooterWidget.tsx` (+ `components/footer/components/MetricChip.tsx`) —
  the footer-widget surface registered above.
- `components/settings/ResourcesMonitorSettingsTab.tsx` (+ `components/settings/components/
  DisplaySection.tsx`, `MetricOrderList.tsx`, `ThresholdsSection.tsx`) — the Settings-tab surface.
- `components/shared/icons.tsx` — icons shared across the footer widget and settings tab.

Other:

- `plugins/resources-monitor/scripts/build.sh` — mirrors helm's `build.sh` (same GOOS/GOARCH/VERSION
  env-var contract), builds `./internal` to `.output/plugin-resources-monitor[.exe]`.
- `plugins/resources-monitor/scripts/deploy-plugin-resources-monitor-local.mjs` — mirrors
  `deploy-plugin-helm-local.mjs` for local install testing.
- `plugins/resources-monitor/scripts/resolve-logo.mjs` — resolves/copies `resources-monitor.svg`
  for the build; helm has no equivalent script (its `helm.svg` is referenced directly).
