import { Skeleton } from "@/components/Skeleton/Skeleton";
import s from "@/components/Skeleton/skeletonLayout.module.scss";

export default function DashboardLoading() {
  return (
    <div className={s.stack}>
      <Skeleton w="12rem" h="1.6rem" />
      <div className={s.tiles}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={s.card}>
            <Skeleton w="4rem" h="0.75rem" radius="pill" />
            <Skeleton w="5.5rem" h="1.4rem" />
          </div>
        ))}
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
