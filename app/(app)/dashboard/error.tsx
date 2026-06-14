"use client";

import { Wallet } from "lucide-react";

import { RouteError } from "@/components/RouteError/RouteError";

export default function DashboardError({
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
      icon={Wallet}
      title="Couldn't load your portfolio"
      description="Something went wrong fetching your tracked wallets. This is usually temporary — try again."
    />
  );
}
