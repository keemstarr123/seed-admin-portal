"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { adminFetch } from "@/lib/admin-fetch";

const PAGE_SIZE = 6;

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone_number: string | null;
  status: string | null;
  date_of_birth: string | null;
  microbusiness_owner?: { business_name?: string | null; type?: string | null } | null;
};

function calcAge(dob: string | null): string {
  if (!dob) return "-";
  const diff = Date.now() - new Date(dob).getTime();
  const age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  return age > 0 ? `${age} yrs` : "-";
}

export default function UsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const url = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    return `/api/admin/users?${params.toString()}`;
  }, [status, search]);

  useEffect(() => {
    setPage(1);
    adminFetch<UserRow[]>(url).then(setRows).catch((err) => setError(err.message));
  }, [url]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const paged = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <PageHeader title="User Accounts" subtitle="Approve pending registrations and review low AI score cases." />
      {error ? <p className="notice">{error}</p> : null}
      <section className="card table-wrap">
        <div className="toolbar">
          <div className="filters">
            <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="suspended">Suspended</option>
            </select>
            <input className="input" placeholder="Search name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Business</th>
                <th>Status</th>
                <th>Age</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {paged.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.name || "Unnamed user"}</strong>
                    <div style={{ color: "var(--seed-muted)" }}>{row.email}</div>
                  </td>
                  <td>{row.microbusiness_owner?.business_name ?? "-"}</td>
                  <td><StatusBadge value={row.status} /></td>
                  <td>{calcAge(row.date_of_birth)}</td>
                  <td><Link className="button secondary" href={`/users/${row.id}`}>View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <div className="empty">No users found.</div> : null}
        </div>
        {totalPages > 1 ? (
          <div className="pagination">
            <button className="page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹ Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} className={`page-btn${p === page ? " page-btn-active" : ""}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="page-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next ›</button>
            <span className="page-info">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, rows.length)} of {rows.length}</span>
          </div>
        ) : null}
      </section>
    </>
  );
}
