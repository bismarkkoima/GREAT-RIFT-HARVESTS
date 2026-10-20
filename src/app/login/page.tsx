import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect(next?.startsWith("/") && !next.startsWith("//") ? next : "/account");
  return (
    <div className="container-page max-w-md py-16">
      <h1 className="text-center text-4xl font-semibold">Welcome back</h1>
      <p className="mb-8 mt-2 text-center text-stone-500">Sign in to track orders and save favourites.</p>
      <AuthForm mode="login" next={next} />
    </div>
  );
}
