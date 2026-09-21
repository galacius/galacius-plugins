import { useQuery } from "@tanstack/react-query";
import { GetCapabilities } from "../../api/bridge";
import { DEFAULT_QUERY_OPTIONS } from "../../api/api";
import { QUERY_KEY_CAPABILITIES } from "../../api/api.const";
import type { Capabilities } from "../../api/resources";

export const useGetCapabilities = () =>
  useQuery<Capabilities, Error>({
    queryKey: [QUERY_KEY_CAPABILITIES],
    queryFn: () => GetCapabilities(),
    ...DEFAULT_QUERY_OPTIONS,
  });
