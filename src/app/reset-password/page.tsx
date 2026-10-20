import type { Metadata } from "next";
import Link from "next/link";
import { findValidResetToken } from "@/lib/password-reset";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const valid = Boolean(await findValidResetToken(token));
  return (
    <div className="container-page max-w-md py-16">
      <h1 className="text-center text-4xl font-semibold">Choose a new password</h1>
      {valid ? (
        <>
          <p className="mb-8 mt-2 text-center text-stone-500">Pick something at least 8 characters long.</p>
          <ResetForm token={token} />
        </>
      ) : (
        <div className="card mt-8 p-8 text-center">
          <p className="text-5xl">⌛</p>
          <p className="mt-4">This reset link is invalid or has expired.</p>
          <Link href="/forgot-password" className="btn-primary mt-6">Request a new link</Link>
        </div>
      )}
    </div>
  );
}
