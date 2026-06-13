import { Skeleton } from "@/components/Skeleton/Skeleton";
import s from "@/components/Skeleton/skeletonLayout.module.scss";

export default function MarketDetailLoading() {
  return (
    <div className={s.stack}>
      <Skeleton w="8rem" h="0.9rem" radius="pill" />
      <Skeleton w="70%" h="1.6rem" />
      <div className={s.row}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={s.card}>
            <Skeleton w="3.5rem" h="0.75rem" radius="pill" />
            <Skeleton w="5rem" h="1.3rem" />
          </div>
        ))}
      </div>
      <div className={s.panel}>
        <Skeleton w="100%" h="320px" radius="md" />
      </div>
      <div className={s.panel}>
        <div className={s.tableRows}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} w="100%" h="1.6rem" />
          ))}
        </div>
      </div>
    </div>
  );
}
