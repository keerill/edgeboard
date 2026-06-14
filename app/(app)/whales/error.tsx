"use client";

import { Waves } from "lucide-react";

import { RouteError } from "@/components/RouteError/RouteError";

export default function WhalesError({
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
      icon={Waves}
      title="Couldn't load whale activity"
      description="Something went wrong loading the whale feed and leaderboard. This is usually temporary — try again."
    />
  );
}
