import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { useMutation } from "@tanstack/react-query";
import { SaveSettings } from "../../api/bridge";
import { QUERY_KEY_SETTINGS } from "../../api/api.const";
import { queryClient } from "../../api/query.client";
import type { Settings } from "../../api/resources";

export const useSaveSettings = () =>
  useMutation({
    mutationFn: (settings: Settings) => SaveSettings(settings),
    onSuccess: (updated) => {
      queryClient.setQueryData([QUERY_KEY_SETTINGS], updated);
      renderSuccessToast({
        title: "Settings saved",
        description: "Resources monitor settings have been updated.",
      });
    },
    onError: (err) =>
      renderErrorToast({
        title: "Failed to save settings",
        description: String(err),
      }),
  });
