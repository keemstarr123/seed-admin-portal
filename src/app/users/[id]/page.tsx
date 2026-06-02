"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { adminFetch } from "@/lib/admin-fetch";
import { formatDate, scoreLabel } from "@/lib/format";

type UserDetail = {
  user: Record<string, any>;
  business: Record<string, any> | null;
  verifications: Record<string, any>[];
  documents: Record<string, any>[];
};

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [error, setError] = useState("");
  const latestVerification = detail?.verifications?.[0];

  async function reload() {
    adminFetch<UserDetail>(`/api/admin/users/${params.id}`).then(setDetail).catch((err) => setError(err.message));
  }

  useEffect(() => {
    reload();
  }, [params.id]);

  async function action(path: string, body?: unknown) {
    await adminFetch(`/api/admin/users/${params.id}/${path}`, {
      method: "POST",
      body: JSON.stringify(body ?? {})
    });
    await reload();
  }

  return (
    <>
      <PageHeader title="User Review" subtitle="Inspect registration details, AI risk metadata, and decision history." />
      {error ? <p className="notice">{error}</p> : null}
      {!detail ? <div className="empty">Loading user...</div> : (
        <div className="grid grid-2">
          <section className="card card-pad">
            <h2>{detail.user.name || "Unnamed user"}</h2>
            <p><StatusBadge value={detail.user.status} /></p>
            <p><strong>Email:</strong> {detail.user.email}</p>
            <p><strong>Phone:</strong> {detail.user.phone_number ?? "-"}</p>
            <p><strong>Joined:</strong> {formatDate(detail.user.created_at)}</p>
            <div className="filters">
              <button className="button" onClick={() => action("approve")}>Approve</button>
              <button
                className="button orange"
                onClick={() => {
                  const reason = window.prompt("Reason for rejection?");
                  if (reason) action("reject", { reason });
                }}
              >
                Reject
              </button>
              <button
                className="button danger"
                onClick={() => {
                  const reason = window.prompt("Reason for suspension?");
                  if (reason) action("suspend", { reason });
                }}
              >
                Suspend
              </button>
              <button className="button ghost" onClick={() => router.back()}>Back</button>
            </div>
          </section>

          <section className="card card-pad">
            <h2>Business</h2>
            <p><strong>Name:</strong> {detail.business?.business_name ?? "-"}</p>
            <p><strong>Type:</strong> {detail.business?.type ?? "-"}</p>
            <p><strong>Trigger word:</strong> {detail.business?.trigger_word ?? "-"}</p>
          </section>

          <section className="card card-pad">
            <h2>AI Review</h2>
            <p><strong>Final score:</strong> {scoreLabel(latestVerification?.metadata?.final_score)}</p>
            <p><strong>Rejected reason:</strong> {latestVerification?.rejection_reason ?? "-"}</p>
            <pre style={{ whiteSpace: "pre-wrap", color: "var(--seed-muted)" }}>
              {JSON.stringify(latestVerification?.metadata ?? {}, null, 2)}
            </pre>
          </section>

          <section className="card card-pad">
            <h2>Verification Records</h2>
            {detail.verifications.map((item) => (
              <p key={item.id}>
                <StatusBadge value={item.verification_status} /> {formatDate(item.request_date)}
              </p>
            ))}
          </section>
        </div>
      )}
    </>
  );
}
