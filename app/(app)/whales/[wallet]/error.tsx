"use client";

import { Crown } from "lucide-react";

import { RouteError } from "@/components/RouteError/RouteError";

export default function WhaleDetailError({
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
      icon={Crown}
      title="Couldn't load this wallet"
      description="Something went wrong loading this wallet's trade history. Try again."
    />
  );
}
