import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { CommandPalette } from "@/components/CommandPalette/CommandPalette";
import { Sidebar } from "@/components/Shell/Sidebar";
import { MeshGradient } from "@/components/motion/MeshGradient";
import { PageTransition } from "@/components/motion/PageTransition";
import styles from "./app.module.scss";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/markets", label: "Markets" },
  { href: "/whales", label: "Whales" },
  { href: "/settings", label: "Settings" },
];

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  // Belt-and-suspenders: middleware already gates these routes.
  if (!session?.user) {
    redirect("/signin");
  }

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div className={styles.page}>
      <MeshGradient />
      <CommandPalette />
      <Sidebar
        items={NAV}
        email={session.user.email ?? session.user.name ?? ""}
        signOutAction={signOutAction}
      />

      <div className={styles.content}>
        <main className={styles.main}>
          <PageTransition>{children}</PageTransition>
        </main>
        <footer className={styles.footer}>
          <div className={styles.footerInner}>
            Information only, not financial advice.
          </div>
        </footer>
      </div>
    </div>
  );
}
