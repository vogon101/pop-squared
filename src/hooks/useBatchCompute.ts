"use client";

import { useState, useRef, useCallback } from "react";

export interface OriginStatus {
  id: string;
  name: string;
  type: "city" | "airport";
  country: string;
  computed: boolean;
  cellCount: number | null;
  status: "pending" | "computing" | "done" | "error" | "skipped";
  error?: string;
}

export interface BatchState {
  status: "idle" | "running" | "paused" | "done";
  origins: OriginStatus[];
  current: string | null;
  completed: number;
  errors: number;
  total: number;
  avgTimeMs: number | null;
  loadError: string | null;
}

export function useBatchCompute() {
  const [state, setState] = useState<BatchState>({
    status: "idle",
    origins: [],
    current: null,
    completed: 0,
    errors: 0,
    total: 0,
    avgTimeMs: null,
    loadError: null,
  });

  const pauseRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const loadOrigins = useCallback(async () => {
    const res = await fetch("/api/travel-time/origins");
    if (!res.ok) {
      throw new Error(`Failed to load origins (HTTP ${res.status})`);
    }
    const data = await res.json();
    const origins: OriginStatus[] = data.origins.map(
      (o: OriginStatus & { computed: boolean }) => ({
        id: o.id,
        name: o.name,
        type: o.type,
        country: o.country,
        computed: o.computed,
        cellCount: o.cellCount,
        status: o.computed ? ("done" as const) : ("pending" as const),
      })
    );

    const completed = origins.filter((o) => o.status === "done").length;
    setState((s) => ({
      ...s,
      origins,
      total: origins.length,
      completed,
      errors: 0,
      loadError: null,
    }));
    return origins;
  }, []);

  const start = useCallback(async (limit?: number) => {
    pauseRef.current = false;
    let origins: OriginStatus[];
    try {
      origins = await loadOrigins();
    } catch (err) {
      setState((s) => ({
        ...s,
        loadError: err instanceof Error ? err.message : "Failed to load origins",
      }));
      return;
    }

    setState((s) => ({ ...s, status: "running" }));

    const allPending = origins.filter((o) => o.status !== "done");
    const batch = limit !== undefined && limit > 0
      ? allPending.slice(0, limit)
      : allPending;
    const times: number[] = [];

    for (const origin of batch) {
      if (pauseRef.current) {
        setState((s) => ({ ...s, status: "paused", current: null }));
        return;
      }

      setState((s) => ({
        ...s,
        current: origin.id,
        origins: s.origins.map((o) =>
          o.id === origin.id ? { ...o, status: "computing" as const } : o
        ),
      }));

      const controller = new AbortController();
      abortRef.current = controller;

      const startTime = performance.now();
      try {
        const res = await fetch("/api/travel-time/compute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ originId: origin.id }),
          signal: controller.signal,
        });

        const elapsed = performance.now() - startTime;
        times.push(elapsed);
        const avgTimeMs = times.reduce((a, b) => a + b, 0) / times.length;

        if (!res.ok) {
          const data = await res.json();
          setState((s) => ({
            ...s,
            errors: s.errors + 1,
            avgTimeMs,
            origins: s.origins.map((o) =>
              o.id === origin.id
                ? { ...o, status: "error" as const, error: data.error || `HTTP ${res.status}` }
                : o
            ),
          }));
        } else {
          const data = await res.json();
          setState((s) => ({
            ...s,
            completed: s.completed + 1,
            avgTimeMs,
            origins: s.origins.map((o) =>
              o.id === origin.id
                ? { ...o, status: "done" as const, computed: true, cellCount: data.cellCount }
                : o
            ),
          }));
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          setState((s) => ({
            ...s,
            status: "paused",
            current: null,
            origins: s.origins.map((o) =>
              o.id === origin.id ? { ...o, status: "pending" as const } : o
            ),
          }));
          return;
        }

        setState((s) => ({
          ...s,
          errors: s.errors + 1,
          origins: s.origins.map((o) =>
            o.id === origin.id
              ? { ...o, status: "error" as const, error: String(err) }
              : o
          ),
        }));
      }
    }

    // Only "done" if all origins are complete — otherwise "paused" (batch slice finished)
    setState((s) => {
      const stillPending = s.origins.some(
        (o) => o.status === "pending" || o.status === "computing"
      );
      return {
        ...s,
        status: stillPending ? "paused" : "done",
        current: null,
      };
    });
  }, [loadOrigins]);

  const pause = useCallback(() => {
    pauseRef.current = true;
    abortRef.current?.abort();
  }, []);

  const retryErrors = useCallback(async () => {
    // Reset error origins to pending, then start without limit
    setState((s) => ({
      ...s,
      errors: 0,
      origins: s.origins.map((o) =>
        o.status === "error" ? { ...o, status: "pending" as const, error: undefined } : o
      ),
    }));
    // Note: start() calls loadOrigins() which re-checks disk.
    // Origins that errored but have no file will still be pending.
    await start();
  }, [start]);

  return { state, loadOrigins, start, pause, retryErrors };
}
