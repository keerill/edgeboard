"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { Spinner } from "@/components/Spinner/Spinner";
import styles from "./submitButton.module.scss";

// Submit button that reflects its parent <form>'s pending state via
// useFormStatus. The app's server actions all end in redirect(), so `pending`
// stays true for the whole round-trip — `disabled` blocks double-submit and the
// inline spinner / pendingText shows progress. MUST be a descendant of the
// <form> it submits.
//
// The idle render is structurally identical to a plain <button> (no wrapper),
// so existing button styles are untouched; the flex wrapper appears only while
// pending, to space the spinner from the label.
type Props = {
  children: ReactNode;
  pendingText?: string;
  spinner?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function SubmitButton({
  children,
  pendingText,
  spinner = true,
  className,
  ...rest
}: Props) {
  const { pending } = useFormStatus();

  if (pending) {
    return (
      <button
        {...rest}
        type="submit"
        className={className}
        disabled
        aria-busy
      >
        <span className={styles.inner}>
          {spinner ? <Spinner size={14} /> : null}
          {pendingText ?? children}
        </span>
      </button>
    );
  }

  return (
    <button {...rest} type="submit" className={className}>
      {children}
    </button>
  );
}
