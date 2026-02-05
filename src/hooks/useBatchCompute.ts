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
  });

  const pauseRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const loadOrigins = useCallback(async () => {
    const res = await fetch("/api/travel-time/origins");
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
    }));
    return origins;
  }, []);

  const start = useCallback(async (limit?: number) => {
    pauseRef.current = false;
    const origins = await loadOrigins();

    setState((s) => ({ ...s, status: "running" }));

    let pending = origins.filter((o) => o.status !== "done");
    if (limit !== undefined && limit > 0) {
      pending = pending.slice(0, limit);
    }
    const times: number[] = [];

    for (const origin of pending) {
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

    setState((s) => ({ ...s, status: "done", current: null }));
  }, [loadOrigins]);

  const pause = useCallback(() => {
    pauseRef.current = true;
    abortRef.current?.abort();
  }, []);

  const retryErrors = useCallback(async () => {
    setState((s) => ({
      ...s,
      errors: 0,
      origins: s.origins.map((o) =>
        o.status === "error" ? { ...o, status: "pending" as const, error: undefined } : o
      ),
    }));
    // Start will pick up pending origins
    await start();
  }, [start]);

  return { state, loadOrigins, start, pause, retryErrors };
}
