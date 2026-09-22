import { createPluginBridge } from "@galacius/core";
import { PLUGIN_ID } from "../const";
import type { Capabilities, ResourcesSample, Settings } from "./resources";

export type { PluginError } from "@galacius/core";

export const bridge = createPluginBridge(PLUGIN_ID);

export const GetSnapshot = (): Promise<ResourcesSample> =>
  bridge.fetchWithRetry<ResourcesSample>("getSnapshot", {});

export const GetSettings = (): Promise<Settings> =>
  bridge.fetchWithRetry<Settings>("getSettings", {});

export const SaveSettings = (settings: Settings): Promise<Settings> =>
  bridge.fetchWithRetry<Settings>("saveSettings", settings);

export const GetCapabilities = (): Promise<Capabilities> =>
  bridge.fetchWithRetry<Capabilities>("getCapabilities", {});

export const ResetSettings = (): Promise<{ status: string }> =>
  bridge.fetchWithRetry<{ status: string }>("resetSettings", {});
