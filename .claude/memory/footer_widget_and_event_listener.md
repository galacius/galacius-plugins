---
name: footer-widget-and-event-listener
description: "resources-monitor is the first plugin frontend to register an app-wide footer widget and rely on the host's app-root plugin-event listener; plugin-repo-side summary, full design lives in the galacius host repo"
metadata:
  node_type: memory
  type: reference
---

`resources-monitor`'s `frontend/src/index.ts` is the first (and so far only) plugin frontend to call
`appWideAPI.registerFooterWidget(pluginId, widget)` — a host API mirroring `registerSettingsTab`, that
registers an app-wide footer status-bar widget shown in the host's footer even before any cluster is
connected.

The host's plugin-event dispatch is split into two listeners: an app-root `PluginEventListener`
(mounted pre-cluster-connection, so app-wide surfaces like footer widgets get live events immediately)
and a cluster-scoped `PluginDisabledSubscriber` (mounted inside `MainLayout`, needs a connected
cluster). `resources-monitor` calls `clusterWideAPI.registerEvents(pluginId, handlers)` in
`frontend/src/index.ts` like any other plugin — it doesn't need to know or care which listener
dispatches to it; this is host-internal plumbing, documented here only so a future plugin author isn't
surprised that events can arrive before a cluster is connected.

Full design/rationale (registry pattern, reconciliation/snapshot mechanism, event-listener split, and
the dispatch-time liveness guard) lives in the `galacius` host repo's
`.claude/memory/plugin_footer_widget_registry.md` — see its index entry in
`galacius/.claude/memory/MEMORY.md`.
