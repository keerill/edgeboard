import Link from "next/link";

import { signIn } from "@/auth";
import styles from "./signin.module.scss";

export default function SignInPage() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandMark} aria-hidden />
          EdgeBoard
        </Link>
        <p className={styles.subtitle}>Sign in to your account</p>
      </div>

      <div className={styles.card}>
        {/* Google OAuth */}
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/dashboard" });
          }}
        >
          <button type="submit" className={styles.googleBtn}>
            Continue with Google
          </button>
        </form>

        <div className={styles.divider}>
          <span className={styles.dividerLine} />
          or
          <span className={styles.dividerLine} />
        </div>

        {/* Email magic link (Resend) */}
        <form
          action={async (formData: FormData) => {
            "use server";
            const email = formData.get("email");
            await signIn("resend", {
              email: typeof email === "string" ? email : "",
              redirectTo: "/dashboard",
            });
          }}
          className={styles.form}
        >
          <input
            type="email"
            name="email"
            required
            placeholder="you@example.com"
            className={styles.input}
          />
          <button type="submit" className={styles.submitBtn}>
            Send magic link
          </button>
        </form>
      </div>

      <p className={styles.disclaimer}>
        Information only, not financial advice.
      </p>
    </div>
  );
}
