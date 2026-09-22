# Resources Monitor Plugin

The Resources Monitor plugin shows live CPU, memory, and disk-IO usage for the Galacius host app and
its plugin subprocesses, via an always-visible footer widget plus a Settings tab for configuring which
metrics are shown, their order, and alert thresholds.

**Structure:**

- `plugins/resources-monitor/` — Contains the Resources Monitor plugin (Go backend + TypeScript/React
  frontend)
  - `plugins/resources-monitor/internal/` — Go backend, hexagonal architecture: `applications/monitor`
    (the sampler loop + service, framework-agnostic) behind `applications/port` (driven/driver
    interfaces), driven by `adapters/presentations/rest/` (inbound HTTP API) and drives
    `adapters/infrastructures/collector/` (gopsutil-based CPU/memory/disk-IO collection) and
    `adapters/infrastructures/store/` (file-based settings persistence). Unlike the Helm plugin, it has
    no gRPC pub/sub subscription — it only dials out to `Emit` live samples to the host.
  - `plugins/resources-monitor/frontend/` — TypeScript/React frontend package
    (`@galacius/resources-monitor-plugin-frontend`): a footer status-bar widget
    (`components/footer/`) and a Settings tab (`components/settings/`)

**Development:**

Install dependencies:

```bash
pnpm install
```

Build the Resources Monitor frontend:

```bash
pnpm build:resources-monitor:fe
```

Run tests:

```bash
# Go backend tests
pnpm test:resources-monitor:be

# TypeScript frontend tests
pnpm test:resources-monitor:fe
```

`@galacius/core` and `@galacius/design-system` are consumed as ordinary published npm dependencies —
no local linking or workspace adjustment is needed to build or test the frontend.
