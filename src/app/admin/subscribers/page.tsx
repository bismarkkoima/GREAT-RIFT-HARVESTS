import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";

export default async function AdminSubscribers() {
  const subs = await db.newsletterSubscriber.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Newsletter subscribers</h1>
        <a href="/api/admin/subscribers" className="btn-secondary">Export CSV</a>
      </div>
      <ul className="card divide-y divide-stone-200 dark:divide-stone-800">
        {subs.length === 0 && <li className="p-8 text-center text-stone-500">No subscribers yet.</li>}
        {subs.map((s) => (
          <li key={s.id} className="flex justify-between p-4 text-sm"><span>{s.email}</span><span className="text-stone-500">{formatDate(s.createdAt)}</span></li>
        ))}
      </ul>
    </div>
  );
}
