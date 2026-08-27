import { useCallback, useEffect, useRef, useState } from "react";
import { api, extractErrorMessage } from "@/services/api";

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: ReadonlyArray<unknown> = [],
): ApiState<T> & { refetch: () => void } {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });
  const [tick, setTick] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let active = true;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    fetcherRef
      .current()
      .then((data) => {
        if (active) setState({ data, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (active)
          setState({ data: null, loading: false, error: extractErrorMessage(err) });
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { ...state, refetch };
}

export type BackendStatus = "checking" | "online" | "offline";

export function useBackendStatus(): BackendStatus {
  const [status, setStatus] = useState<BackendStatus>("checking");

  useEffect(() => {
    let active = true;

    // Use an API endpoint that is already confirmed to work
    // from the deployed Vercel frontend.
    api
      .get("/api/dashboard/summary", {
        timeout: 15000,
      })
      .then(() => {
        if (active) setStatus("online");
      })
      .catch(() => {
        if (active) setStatus("offline");
      });

    return () => {
      active = false;
    };
  }, []);

  return status;
}