import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin/admin-nav";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[14rem_1fr] lg:px-8">
      <AdminNav />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
