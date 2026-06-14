"use client";

import { BarChart3 } from "lucide-react";

import { RouteError } from "@/components/RouteError/RouteError";

export default function MarketsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      error={error}
      reset={reset}
      icon={BarChart3}
      title="Couldn't load markets"
      description="Something went wrong loading the market list. This is usually temporary — try again."
    />
  );
}
