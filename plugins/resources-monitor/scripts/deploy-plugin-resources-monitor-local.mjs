#!/usr/bin/env node
// Mirrors what a real Resources Monitor plugin install looks like under
// ~/.galacius/plugins/resources-monitor, but entirely inside <repo-root>/.output/resources-monitor —
// for local verification only. Does NOT touch ~/.galacius/plugins/resources-monitor;
// that directory is populated exclusively by the real install/update flow
// (InstallPlugin downloading the CI-built binary + tar.gz archive).
//
// Produces, under <repo-root>/.output/<plugin-id>/:
//   dist/                                     - the built frontend bundle (index.js + chunks)
//   resources-monitor-plugin-frontend.tar.gz - the same archive CI ships, for checksum parity
//   plugin-resources-monitor                 - the Go plugin binary, built for the host platform
//   resources-monitor.<ext>                  - the plugin logo, copied verbatim if present (see resolve-logo.mjs)
//   .plugin-metadata.json                    - mirrors the real installed metadata shape
//
// Not produced: resources-monitor.lock. That file is runtime state created and removed by
// the plugin process loader (internal/plugin/loader.go) while the plugin is
// actually running — it has no meaningful "build" representation to mirror.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { resolveLogoFile } from "./resolve-logo.mjs";

const pluginRoot = path.resolve(import.meta.dirname, "..");
const repoRoot = path.resolve(pluginRoot, "..", "..");
const pluginId = "resources-monitor";
const builtDist = path.join(pluginRoot, "frontend", "dist");
const outputDir = path.join(repoRoot, ".output", pluginId);
const outputDist = path.join(outputDir, "dist");
const archivePath = path.join(outputDir, "resources-monitor-plugin-frontend.tar.gz");
const binaryName = process.platform === "win32" ? "plugin-resources-monitor.exe" : "plugin-resources-monitor";
const binaryPath = path.join(outputDir, binaryName);
const metadataPath = path.join(outputDir, ".plugin-metadata.json");

if (!existsSync(builtDist)) {
  console.error(`Build output not found at ${builtDist}. Run the frontend build first.`);
  process.exit(1);
}

// Clean the output dir for a fresh build, then recreate it.
rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

// dist/
cpSync(builtDist, outputDist, { recursive: true });

// tar.gz archive (same shape as the CI-shipped asset, for checksum parity)
execFileSync("tar", ["-C", outputDist, "-czf", archivePath, "."]);
const bundleSha256 = createHash("sha256").update(readFileSync(archivePath)).digest("hex");

// Go binary, built for the host platform via the shared build.sh (same script CI uses)
execFileSync("bash", [path.join(pluginRoot, "scripts", "build.sh")], {
  cwd: pluginRoot,
  env: { ...process.env, VERSION: "local-dev", OUTPUT: binaryPath },
  stdio: "inherit",
});

// Metadata, mirroring pluginMetadata in internal/app/plugin.go (which in turn
// mirrors plugin.Manifest / the frontend's PluginManifest interface) plus the
// two install-specific fields, releaseTag and installedAt.
const binarySize = statSync(binaryPath).size;

// Logo, if a resources-monitor.{svg,png,jpg,jpeg} file exists — copied verbatim into the
// output dir alongside dist/ and the binary, same as a real install.
const logoFile = resolveLogoFile(pluginRoot);
if (logoFile) {
  cpSync(path.join(pluginRoot, logoFile), path.join(outputDir, logoFile));
}

const metadata = {
  id: pluginId,
  name: "Resources Monitor",
  description: "Live monitoring CPU, memory and disk I/O usage for the application",
  version: "local-dev",
  repository: "https://github.com/gknguyen/galacius/releases",
  homepage: "https://github.com/galacius/galacius-plugins/tree/master/plugins/resources-monitor",
  minimumHostVersion: "0.1.0",
  maximumHostVersion: "999.999.999",
  os: {
    linux: ["amd64"],
    darwin: ["arm64"],
    windows: ["amd64"],
  },
  bundle: {
    sha256: bundleSha256,
    size: statSync(archivePath).size,
  },
  binary: {
    sha256: createHash("sha256").update(readFileSync(binaryPath)).digest("hex"),
    size: binarySize,
  },
  capabilities: ["host-metrics"],
  assets: {
    binaryName: "plugin-resources-monitor",
    bundleDir: "dist",
    ...(logoFile ? { logo: logoFile } : {}),
  },
  releaseTag: "local-dev",
  installedAt: new Date().toISOString(),
};

writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

console.log(`Mirrored local Resources Monitor plugin build to ${outputDir}`);
console.log(
  `(no resources-monitor.lock — that's runtime state created only while the plugin process is actually running)`
);
