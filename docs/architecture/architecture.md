This diagram covers the **Helm plugin's** call path specifically (it's the one with the full 4-channel
contract: process lifecycle, HTTP business calls, gRPC control channel, in-process host capability
calls). The `resources-monitor` plugin (`plugins/resources-monitor/`) uses a strict subset — process
lifecycle + HTTP business calls + an outbound-only gRPC `Emit` for live-sample push events — and has no
cluster-context/namespace gRPC subscribe, so it isn't separately diagrammed here. See
`.claude/memory/file_structure.md` for its structure.

Rendered from [`architecture-light.mmd`](architecture-light.mmd) / [`architecture-dark.mmd`](architecture-dark.mmd)
with `mermaid-cli` — GitHub's mobile apps don't render `mermaid` code fences, so the diagram ships as static
SVGs that switch with the OS/browser color scheme. Regenerate after editing a source:

```
npx @mermaid-js/mermaid-cli -i docs/architecture/architecture-light.mmd -o docs/architecture/architecture-light.svg -b white
npx @mermaid-js/mermaid-cli -i docs/architecture/architecture-dark.mmd -o docs/architecture/architecture-dark.svg -b transparent
```
