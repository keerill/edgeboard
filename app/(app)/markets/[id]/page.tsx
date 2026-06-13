import { Placeholder } from "@/components/Placeholder/Placeholder";

export default async function MarketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Placeholder title={`Market ${id}`}>
      Price-history chart with whale-trade markers arrives in Phase 3.
    </Placeholder>
  );
}
