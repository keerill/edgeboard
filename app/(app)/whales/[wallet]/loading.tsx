import { Skeleton } from "@/components/Skeleton/Skeleton";
import s from "@/components/Skeleton/skeletonLayout.module.scss";

export default function WhaleDetailLoading() {
  return (
    <div className={s.stack}>
      <Skeleton w="6rem" h="0.9rem" radius="pill" />

      <div className={s.row}>
        <Skeleton w="44px" h="44px" radius="pill" />
        <Skeleton w="10rem" h="1.6rem" />
      </div>

      <div className={s.row}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={s.card}>
            <Skeleton w="4rem" h="0.75rem" radius="pill" />
            <Skeleton w="5.5rem" h="1.4rem" />
          </div>
        ))}
      </div>

      <div className={s.panel}>
        <div className={s.tableRows}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} w="100%" h="1.6rem" />
          ))}
        </div>
      </div>
    </div>
  );
}
