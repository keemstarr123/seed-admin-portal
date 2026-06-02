"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { adminFetch } from "@/lib/admin-fetch";

type Agent = {
  user_id: string;
  agent_name: string;
  bank_affiliated: string | null;
  years_experience: number | null;
  biodata: string | null;
  whatsapp_number: string | null;
  loan_agent_products?: { id: string }[];
};

export default function LoanAgentsPage() {
  const [rows, setRows] = useState<Agent[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    adminFetch<Agent[]>("/api/admin/loan-agents").then(setRows).catch((err) => setError(err.message));
  }, []);

  return (
    <>
      <PageHeader
        title="Loan Agents"
        subtitle="Manage the loan agents available inside the mobile loan flow."
        action={<Link className="button" href="/loan-agents/new"><Plus size={18} /> Add agent</Link>}
      />
      {error ? <p className="notice">{error}</p> : null}
      <section className="card table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Bank / Agency</th>
                <th>Experience</th>
                <th>WhatsApp</th>
                <th>Products</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.user_id}>
                  <td><strong>{row.agent_name}</strong></td>
                  <td>{row.bank_affiliated ?? "-"}</td>
                  <td>{row.years_experience ?? 0} years</td>
                  <td>{row.whatsapp_number ?? "-"}</td>
                  <td>{row.loan_agent_products?.length ?? 0}</td>
                  <td><Link className="button secondary" href={`/loan-agents/${row.user_id}`}>Edit</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <div className="empty">No loan agents found.</div> : null}
        </div>
      </section>
    </>
  );
}
