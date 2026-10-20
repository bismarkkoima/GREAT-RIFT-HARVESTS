import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Create account" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect(next?.startsWith("/") && !next.startsWith("//") ? next : "/account");
  return (
    <div className="container-page max-w-md py-16">
      <h1 className="text-center text-4xl font-semibold">Create your account</h1>
      <p className="mb-8 mt-2 text-center text-stone-500">Faster checkout, order history and a wishlist of your favourite blooms.</p>
      <AuthForm mode="register" next={next} />
    </div>
  );
}
