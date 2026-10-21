import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = { title: "Our farm", description: "The story behind Great Rift Harvests." };

export default function AboutPage() {
  return (
    <>
      <section className="container-page grid items-center gap-12 py-16 md:grid-cols-2">
        <div>
          <span className="badge bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200">Our story</span>
          <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">Rooted in the Great Rift Valley</h1>
          <p className="mt-5 text-lg text-stone-600 dark:text-stone-400">
            Great Rift Harvests began with a simple idea: the flowers Kenya sends around the world should be just as easy to enjoy at home.
            Our farms sit at altitude near Lake Naivasha, where cool nights and bright equatorial sun grow stems with bigger heads, richer colour and a longer vase life.
          </p>
          <p className="mt-4 text-stone-600 dark:text-stone-400">
            Every bunch is cut at dawn, conditioned by hand, and delivered within hours — no cold-storage warehouses, no middlemen.
          </p>
        </div>
        <div className="relative aspect-4/3 overflow-hidden rounded-3xl shadow-xl">
          <Image src="/images/sunshinebouqet.jpeg" alt="Freshly cut flowers" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
        </div>
      </section>

      <section className="bg-white py-16 dark:bg-stone-900">
        <div className="container-page grid gap-8 text-center sm:grid-cols-3">
          {[
            { n: "2,000m", t: "above sea level" },
            { n: "< 6 hrs", t: "from field to your door" },
            { n: "100%", t: "Kenyan grown" },
          ].map((s) => (
            <div key={s.t}>
              <p className="font-display text-4xl font-semibold text-brand-700 dark:text-brand-400">{s.n}</p>
              <p className="mt-1 text-stone-500">{s.t}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page py-16">
        <h2 className="text-center text-3xl">What we stand for</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { title: "Sustainable growing", text: "Rainwater harvesting, integrated pest management and composting keep our soil — and the lake — healthy." },
            { title: "Fair work", text: "Our team earns fair wages with healthcare and training. Many have been with us since the first harvest." },
            { title: "Community first", text: "A share of every order supports schools and clean-water projects in the communities around our farms." },
          ].map((v) => (
            <div key={v.title} className="card p-6">
              <h3 className="text-xl">{v.title}</h3>
              <p className="mt-2 text-stone-600 dark:text-stone-400">{v.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link href="/shop" className="btn-primary px-8 py-3">Shop our flowers</Link>
        </div>
      </section>
    </>
  );
}
