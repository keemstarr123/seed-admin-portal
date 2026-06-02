"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { adminFetch } from "@/lib/admin-fetch";
import { formatDate } from "@/lib/format";

type AuditLog = {
  id: string;
  admin_user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  reason: string | null;
  created_at: string;
};

export default function AuditLogsPage() {
  const [rows, setRows] = useState<AuditLog[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    adminFetch<AuditLog[]>("/api/admin/audit-logs").then(setRows).catch((err) => setError(err.message));
  }, []);

  return (
    <>
      <PageHeader title="Audit Logs" subtitle="Sensitive admin actions are recorded here." />
      {error ? <p className="notice">{error}</p> : null}
      <section className="card table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th>Entity</th>
                <th>Reason</th>
                <th>Admin</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td><strong>{row.action}</strong></td>
                  <td>{row.entity_type} {row.entity_id ? `/${row.entity_id}` : ""}</td>
                  <td>{row.reason ?? "-"}</td>
                  <td>{row.admin_user_id}</td>
                  <td>{formatDate(row.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <div className="empty">No audit logs found.</div> : null}
        </div>
      </section>
    </>
  );
}
