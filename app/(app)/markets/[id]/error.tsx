"use client";

import { LineChart } from "lucide-react";

import { RouteError } from "@/components/RouteError/RouteError";

export default function MarketDetailError({
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
      icon={LineChart}
      title="Couldn't load this market"
      description="Something went wrong loading this market's price history and trades. Try again."
    />
  );
}
