"use client";

import { useOptimistic, useTransition } from "react";

import styles from "./alertList.module.scss";

export type AlertItem = {
  id: string;
  typeLabel: string;
  description: string;
  channel: string;
  active: boolean;
};

type AlertAction = (formData: FormData) => void | Promise<void>;

type Patch = { kind: "toggle" | "remove"; id: string };

// Client-side alert list with optimistic pause/resume + delete. The toggle flips
// the badge and the delete removes the row *instantly*; the server actions
// (revalidatePath + redirect) then reconcile. Toggling a one-char state used to
// freeze the whole page on a server round-trip — this makes it feel instant.
export function AlertList({
  items,
  toggleAction,
  removeAction,
}: {
  items: AlertItem[];
  toggleAction: AlertAction;
  removeAction: AlertAction;
}) {
  const [isPending, startTransition] = useTransition();
  const [optimistic, applyPatch] = useOptimistic(
    items,
    (state, patch: Patch) =>
      patch.kind === "remove"
        ? state.filter((a) => a.id !== patch.id)
        : state.map((a) =>
            a.id === patch.id ? { ...a, active: !a.active } : a,
          ),
  );

  function toggle(item: AlertItem) {
    const fd = new FormData();
    fd.set("id", item.id);
    fd.set("active", item.active ? "false" : "true");
    startTransition(() => {
      applyPatch({ kind: "toggle", id: item.id });
      toggleAction(fd);
    });
  }

  function remove(item: AlertItem) {
    const fd = new FormData();
    fd.set("id", item.id);
    startTransition(() => {
      applyPatch({ kind: "remove", id: item.id });
      removeAction(fd);
    });
  }

  return (
    <ul className={styles.alertList} aria-busy={isPending}>
      {optimistic.map((a) => (
        <li key={a.id} className={styles.alertRow}>
          <div className={styles.alertInfo}>
            <span className={styles.alertTitle}>
              {a.typeLabel}
              {!a.active ? (
                <span className={styles.paused}> · paused</span>
              ) : null}
            </span>
            <span className={styles.alertDesc}>{a.description}</span>
            <span className={styles.alertMeta}>via {a.channel}</span>
          </div>
          <div className={styles.alertActions}>
            <button
              type="button"
              className={styles.smallBtn}
              onClick={() => toggle(a)}
            >
              {a.active ? "Pause" : "Resume"}
            </button>
            <button
              type="button"
              className={styles.smallBtn}
              onClick={() => remove(a)}
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
