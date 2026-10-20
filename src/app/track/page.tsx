import type { Metadata } from "next";
import { TrackForm } from "./track-form";

export const metadata: Metadata = { title: "Track your order" };

export default function TrackPage() {
  return (
    <div className="container-page max-w-lg py-16">
      <h1 className="text-center text-4xl font-semibold">Track your order</h1>
      <p className="mt-2 text-center text-stone-500">Enter the order number from your confirmation and the email you used.</p>
      <TrackForm />
    </div>
  );
}
