import type { Metadata } from "next";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = { title: "Contact us" };

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ subject?: string }> }) {
  const { subject } = await searchParams;
  return (
    <div className="container-page grid gap-12 py-16 lg:grid-cols-2">
      <div>
        <h1 className="text-4xl font-semibold">Let&apos;s talk flowers</h1>
        <p className="mt-4 text-lg text-stone-600 dark:text-stone-400">
          Questions about an order, planning a wedding, or looking for wholesale pricing? Send us a message and our team will reply within one business day.
        </p>
        <dl className="mt-8 space-y-4">
          <div><dt className="font-semibold">Farm &amp; studio</dt><dd className="text-stone-500">Moi South Lake Road, Naivasha, Kenya</dd></div>
          <div><dt className="font-semibold">Email</dt><dd className="text-stone-500">hello@greatriftharvests.co.ke</dd></div>
          <div><dt className="font-semibold">Hours</dt><dd className="text-stone-500">Mon–Sat, 7am – 6pm EAT</dd></div>
        </dl>
      </div>
      <ContactForm defaultSubject={subject} />
    </div>
  );
}
