import { appWideAPI } from "@galacius/core";
import { Activity } from "@galacius/design-system";
import { PLUGIN_ID } from "./const";
import { ResourcesFooterWidget } from "./components/ResourcesFooterWidget";
import { ResourcesMonitorSettingsTab } from "./components/ResourcesMonitorSettingsTab";
import { eventHandlers } from "./events";

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

appWideAPI.registerEvents(PLUGIN_ID, eventHandlers);
