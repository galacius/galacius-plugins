import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// NOTE(resources-monitor): while pnpm-workspace.yaml's temporary
// @galacius/core / @galacius/design-system link: override is active (see TODO
// there), tests that actually render a component using a design-system icon
// (MetricOrderList.test.tsx) fail with "Cannot read properties of null
// (reading 'useContext')" — the linked design-system pulls its own separate
// react instance from galacius/node_modules, which breaks lucide-react's
// context lookup under jsdom. resolve.dedupe/alias + test.server.deps.inline
// were tried and do NOT fix this (vitest still externalizes/resolves the
// linked package's react before those apply). This is a known limitation of
// the link, not a real bug: to run the full test suite, remove the
// pnpm-workspace.yaml override and `pnpm install` first (tests don't need
// the link — they don't exercise registerFooterWidget/registerEvents).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      reporter: ["text", "html", ["text-summary", { file: "./summary.txt" }]],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/test-setup.ts", "src/index.ts"],
    },
  },
});
