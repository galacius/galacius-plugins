import { useQuery } from "@tanstack/react-query";
import { GetSnapshot } from "../../api/bridge";
import { QUERY_KEY_LIVE_SAMPLE } from "../../api/api.const";
import type { ResourcesSample } from "../../api/resources";

export const useGetLiveSample = () =>
  useQuery<ResourcesSample, Error>({
    queryKey: [QUERY_KEY_LIVE_SAMPLE],
    queryFn: () => GetSnapshot(),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });
