"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { isValidWalletAddress } from "@/lib/analytics/portfolio";
import { prisma } from "@/lib/db/prisma";

const LABEL_MAX = 80;

/**
 * Save a public wallet address to the signed-in user's tracked list (§8), then
 * select it. Addresses are public read-only strings — no wallet connect (§2).
 * Validates the address and dedupes silently (unique [userId, address]).
 */
export async function addTrackedWallet(formData: FormData): Promise<void> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/signin");

  const address = String(formData.get("address") ?? "")
    .trim()
    .toLowerCase();
  const rawLabel = String(formData.get("label") ?? "").trim();
  const label = rawLabel ? rawLabel.slice(0, LABEL_MAX) : null;

  if (!isValidWalletAddress(address)) {
    redirect("/dashboard?error=invalid-address");
  }

  try {
    await prisma.trackedWallet.create({ data: { userId, address, label } });
  } catch (error) {
    // Same wallet already tracked → not an error, just select it below.
    const isDuplicate =
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002";
    if (!isDuplicate) throw error;
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard?wallet=${address}`);
}

/** Remove a tracked wallet, scoped to the signed-in user (ownership check). */
export async function removeTrackedWallet(formData: FormData): Promise<void> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/signin");

  const id = String(formData.get("id") ?? "");
  if (id) {
    // deleteMany with the userId guard ensures users can only delete their own.
    await prisma.trackedWallet.deleteMany({ where: { id, userId } });
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
