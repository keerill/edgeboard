import { Skeleton } from "@/components/Skeleton/Skeleton";
import s from "@/components/Skeleton/skeletonLayout.module.scss";

export default function SettingsLoading() {
  return (
    <div className={s.stack}>
      <Skeleton w="9rem" h="1.6rem" />
      <Skeleton w="22rem" h="0.9rem" />

      {/* Appearance */}
      <div className={s.panel}>
        <div className={s.tableRows}>
          <Skeleton w="8rem" h="1.2rem" />
          <Skeleton w="14rem" h="2.2rem" radius="md" />
        </div>
      </div>

      {/* Plan limits */}
      <div className={s.panel}>
        <div className={s.tableRows}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} w="100%" h="1.4rem" />
          ))}
        </div>
      </div>

      {/* Alerts */}
      <div className={s.panel}>
        <div className={s.tableRows}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} w="100%" h="2rem" />
          ))}
        </div>
      </div>
    </div>
  );
}
