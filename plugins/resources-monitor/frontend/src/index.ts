import { appWideAPI } from "@galacius/core";
import { Activity } from "@galacius/design-system";
import { PLUGIN_ID } from "./const";
import { ResourcesFooterWidget } from "./components/ResourcesFooterWidget";
import { ResourcesMonitorSettingsTab } from "./components/ResourcesMonitorSettingsTab";
import type { ResourcesSample } from "./api/resources";

appWideAPI.registerStylesheets(PLUGIN_ID, [import("./style.css")]);

appWideAPI.registerSettingsTab(PLUGIN_ID, {
  id: PLUGIN_ID,
  label: "Resources",
  icon: Activity,
  component: ResourcesMonitorSettingsTab,
});

appWideAPI.registerFooterWidget(PLUGIN_ID, {
  id: PLUGIN_ID,
  component: ResourcesFooterWidget,
});

appWideAPI.registerEvents(PLUGIN_ID, {
  "plugins.resources-monitor.metrics:sample": (data: ResourcesSample) => {
    // Event handler for the metrics sample event
    // The actual handling is done in the liveSampleStore
  },
});
