import { useQuery } from "@tanstack/react-query";
import { GetSettings } from "../../api/bridge";
import { DEFAULT_QUERY_OPTIONS } from "../../api/api";
import { QUERY_KEY_SETTINGS } from "../../api/api.const";
import type { Settings } from "../../api/resources";

export const useGetSettings = () =>
  useQuery<Settings, Error>({
    queryKey: [QUERY_KEY_SETTINGS],
    queryFn: () => GetSettings(),
    ...DEFAULT_QUERY_OPTIONS,
  });
