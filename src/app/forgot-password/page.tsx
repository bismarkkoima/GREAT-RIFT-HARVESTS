import type { Metadata } from "next";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <div className="container-page max-w-md py-16">
      <h1 className="text-center text-4xl font-semibold">Forgot your password?</h1>
      <p className="mb-8 mt-2 text-center text-stone-500">Enter your email and we&apos;ll send you a link to choose a new one.</p>
      <ForgotForm />
    </div>
  );
}
