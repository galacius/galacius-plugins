import { updateLiveSample } from "./stores/liveSampleStore";
import type { ResourcesSample } from "./api/resources";

export const eventHandlers = {
  "plugins.resources-monitor.metrics:sample": (payload: ResourcesSample) => {
    updateLiveSample(payload);
  },
};
