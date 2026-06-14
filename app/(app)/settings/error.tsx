"use client";

import { Settings } from "lucide-react";

import { RouteError } from "@/components/RouteError/RouteError";

export default function SettingsError({
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
      icon={Settings}
      title="Couldn't load settings"
      description="Something went wrong loading your subscription and alerts. Try again."
    />
  );
}
