import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { useMutation } from "@tanstack/react-query";
import { GetSettings, ResetSettings } from "../../api/bridge";
import { QUERY_KEY_SETTINGS } from "../../api/api.const";
import { queryClient } from "../../api/query.client";

export const useResetSettings = () =>
  useMutation({
    mutationFn: async () => {
      await ResetSettings();
      return GetSettings();
    },
    onSuccess: (updated) => {
      queryClient.setQueryData([QUERY_KEY_SETTINGS], updated);
      renderSuccessToast({
        title: "Settings reset",
        description: "Resources monitor settings have been reset to defaults.",
      });
    },
    onError: (err) =>
      renderErrorToast({
        title: "Failed to reset settings",
        description: String(err),
      }),
  });
