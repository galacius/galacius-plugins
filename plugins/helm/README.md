# Helm Plugin

The Helm plugin provides integration with Helm package manager for Kubernetes deployments.

**Structure:**

- `plugins/helm/` — Contains the Helm plugin (Go backend + TypeScript/React frontend)
  - `plugins/helm/internal/` — Go backend, hexagonal architecture: `applications/` (business logic +
    driven/driver ports, framework-agnostic), `adapters/presentations/{rest,async}/` (inbound HTTP API
    - gRPC pub/sub wiring), `adapters/infrastructures/{kube,restconfig}/` (Kubernetes cluster provider,
      Helm REST-config shim)
  - `plugins/helm/frontend/` — TypeScript/React frontend package (`@galacius/helm-plugin-frontend`)

**Development:**

Install dependencies:

```bash
pnpm install
```

Build the Helm frontend:

```bash
pnpm build:helm:fe
```

Run tests:

```bash
# Go backend tests
pnpm test:helm:be

# TypeScript frontend tests
pnpm test:helm:fe
```

`@galacius/core` and `@galacius/design-system` are consumed as ordinary published npm dependencies —
no local linking or workspace adjustment is needed to build or test the frontend.
