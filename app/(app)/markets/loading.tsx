import { Skeleton } from "@/components/Skeleton/Skeleton";
import s from "@/components/Skeleton/skeletonLayout.module.scss";

export default function MarketsLoading() {
  return (
    <div className={s.stack}>
      <div className={s.row}>
        <Skeleton w="14rem" h="2.25rem" radius="md" />
      </div>
      <div className={s.row}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} w="5.5rem" h="2rem" radius="pill" />
        ))}
      </div>
      <div className={s.cards}>
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className={s.card}>
            <Skeleton w="4.5rem" h="0.9rem" radius="pill" />
            <Skeleton w="90%" h="1.1rem" />
            <Skeleton w="70%" h="1.1rem" />
            <div className={s.row}>
              <Skeleton w="3.5rem" h="1.4rem" />
              <Skeleton w="3.5rem" h="1.4rem" />
              <Skeleton w="3.5rem" h="1.4rem" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
