import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { formatDate, formatKsh } from "@/lib/format";
import { setUserRole } from "@/app/actions/admin";

export default async function AdminCustomers() {
  const me = await requireAdmin();
  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { orders: { where: { status: { not: "CANCELLED" } }, select: { total: true } } },
  });
  return (
    <div>
      <h1 className="mb-6 text-3xl font-semibold">Customers</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-200 text-xs uppercase text-stone-500 dark:border-stone-800">
            <tr><th className="p-4">Name</th><th className="p-4">Email</th><th className="p-4">Joined</th><th className="p-4">Orders</th><th className="p-4">Spent</th><th className="p-4">Role</th></tr>
          </thead>
          <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="p-4 font-medium">{u.name}</td>
                <td className="p-4">{u.email}</td>
                <td className="p-4 whitespace-nowrap">{formatDate(u.createdAt)}</td>
                <td className="p-4">{u.orders.length}</td>
                <td className="p-4 whitespace-nowrap">{formatKsh(u.orders.reduce((n, o) => n + o.total, 0))}</td>
                <td className="p-4">
                  {u.id === me.id ? (
                    <span className="badge bg-stone-900 text-white dark:bg-white dark:text-stone-900">Admin (you)</span>
                  ) : (
                    <form action={setUserRole.bind(null, u.id, u.role === "ADMIN" ? "CUSTOMER" : "ADMIN")}>
                      <button className="btn-secondary px-3 py-1 text-xs">{u.role === "ADMIN" ? "Admin · revoke" : "Make admin"}</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
