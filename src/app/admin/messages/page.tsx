import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { deleteMessage, setMessageRead } from "@/app/actions/admin";

export default async function AdminMessages() {
  const messages = await db.contactMessage.findMany({ orderBy: [{ read: "asc" }, { createdAt: "desc" }] });
  return (
    <div>
      <h1 className="mb-6 text-3xl font-semibold">Messages</h1>
      {messages.length === 0 && <p className="card p-8 text-center text-stone-500">No messages yet.</p>}
      <ul className="space-y-4">
        {messages.map((m) => (
          <li key={m.id} className={`card p-6 ${m.read ? "opacity-70" : "border-l-4 border-l-brand-600"}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{m.subject}</p>
                <p className="text-sm text-stone-500">
                  {m.name} · <a href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject)}`} className="hover:underline">{m.email}</a>
                  {m.phone && <> · {m.phone}</>} · {formatDate(m.createdAt)}
                </p>
              </div>
              <div className="flex gap-2">
                <form action={setMessageRead.bind(null, m.id, !m.read)}><button className="btn-secondary px-3 py-1.5 text-xs">{m.read ? "Mark unread" : "Mark read"}</button></form>
                <form action={deleteMessage.bind(null, m.id)}><button className="btn-secondary px-3 py-1.5 text-xs text-blush-600">Delete</button></form>
              </div>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm">{m.message}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
