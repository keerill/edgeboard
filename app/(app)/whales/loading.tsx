import { Skeleton } from "@/components/Skeleton/Skeleton";
import s from "@/components/Skeleton/skeletonLayout.module.scss";

export default function WhalesLoading() {
  return (
    <div className={s.stack}>
      <Skeleton w="10rem" h="1.6rem" />
      <div className={s.row}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} w="5rem" h="2rem" radius="pill" />
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
