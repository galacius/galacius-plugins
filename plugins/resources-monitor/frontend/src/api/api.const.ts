// Prefixed with the plugin's own namespace — this QueryClient is the host
// app's shared singleton (see api/query.client.ts), so an unprefixed key
// like "settings" collides with the host's own query of the same name.
export const QUERY_KEY_CAPABILITIES = "resources-monitor-capabilities";
export const QUERY_KEY_SETTINGS = "resources-monitor-settings";
export const QUERY_KEY_LIVE_SAMPLE = "resources-monitor-live-sample";
