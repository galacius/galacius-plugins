import { queryClient } from "./api/query.client";
import { QUERY_KEY_LIVE_SAMPLE } from "./api/api.const";
import type { ResourcesSample } from "./api/resources";

export const eventHandlers = {
  "plugins.resources-monitor.metrics:sample": (payload: ResourcesSample) => {
    queryClient.setQueryData([QUERY_KEY_LIVE_SAMPLE], payload);
  },
};
