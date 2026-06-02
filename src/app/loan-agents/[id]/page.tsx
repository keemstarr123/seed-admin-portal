"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Field } from "@/components/Field";
import { adminFetch } from "@/lib/admin-fetch";

type AgentForm = {
  user_id?: string;
  agent_name: string;
  bank_affiliated: string;
  years_experience: number;
  biodata: string;
  whatsapp_number: string;
  // user row fields
  user_name: string;
  user_email: string;
  user_phone: string;
  user_ic_number: string;
  user_date_of_birth: string;
  user_gender: string;
  user_home_address: string;
  user_status: string;
  user_verified_status: boolean;
};

type LoanService = {
  id: string;
  title: string;
  description: string | null;
};

type ProductSelection = {
  service_id: string;
  eligibility: string;
};

type NewService = {
  title: string;
  description: string;
};

const emptyAgent: AgentForm = {
  agent_name: "",
  bank_affiliated: "",
  years_experience: 0,
  biodata: "",
  whatsapp_number: "",
  user_name: "",
  user_email: "",
  user_phone: "",
  user_ic_number: "",
  user_date_of_birth: "",
  user_gender: "",
  user_home_address: "",
  user_status: "pending",
  user_verified_status: false
};

export default function LoanAgentEditorPage() {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const agentId = params?.id;
  const isNew = !agentId;

  const [form, setForm] = useState<AgentForm>(emptyAgent);
  const [allServices, setAllServices] = useState<LoanService[]>([]);
  const [selected, setSelected] = useState<ProductSelection[]>([]);
  const [newServices, setNewServices] = useState<NewService[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (isNew) {
      adminFetch<any>("/api/admin/loan-agents/new")
        .then((payload) => setAllServices(payload.services ?? []))
        .catch(() => {});
      return;
    }
    adminFetch<any>(`/api/admin/loan-agents/${agentId}`)
      .then((payload) => {
        setForm({
          user_id: payload.agent.user_id,
          agent_name: payload.agent.agent_name ?? "",
          bank_affiliated: payload.agent.bank_affiliated ?? "",
          years_experience: payload.agent.years_experience ?? 0,
          biodata: payload.agent.biodata ?? "",
          whatsapp_number: payload.agent.whatsapp_number ?? "",
          user_name: payload.user?.name ?? "",
          user_email: payload.user?.email ?? "",
          user_phone: payload.user?.phone_number ?? "",
          user_ic_number: payload.user?.ic_number ?? "",
          user_date_of_birth: payload.user?.date_of_birth ?? "",
          user_gender: payload.user?.gender ?? "",
          user_home_address: payload.user?.home_address ?? "",
          user_status: payload.user?.status ?? "pending",
          user_verified_status: payload.user?.verified_status ?? false
        });
        setAllServices(payload.services ?? []);
        setSelected(
          (payload.products ?? []).map((p: any) => ({
            service_id: p.services_id,
            eligibility: p.eligibility ?? ""
          }))
        );
      })
      .catch((err) => setError(err.message));
  }, [agentId, isNew]);

  function toggleService(serviceId: string) {
    setSelected((prev) => {
      const exists = prev.find((p) => p.service_id === serviceId);
      if (exists) return prev.filter((p) => p.service_id !== serviceId);
      return [...prev, { service_id: serviceId, eligibility: "" }];
    });
  }

  function patchEligibility(serviceId: string, value: string) {
    setSelected((prev) =>
      prev.map((p) => (p.service_id === serviceId ? { ...p, eligibility: value } : p))
    );
  }

  function addNewService() {
    setNewServices((prev) => [...prev, { title: "", description: "" }]);
  }

  function patchNewService(index: number, patch: Partial<NewService>) {
    setNewServices((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function removeNewService(index: number) {
    setNewServices((prev) => prev.filter((_, i) => i !== index));
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const body = {
        ...form,
        selected_products: selected,
        new_services: newServices.filter((s) => s.title.trim())
      };
      if (isNew) {
        await adminFetch("/api/admin/loan-agents", { method: "POST", body: JSON.stringify(body) });
      } else {
        await adminFetch(`/api/admin/loan-agents/${agentId}`, { method: "PUT", body: JSON.stringify(body) });
      }
      setToast("Loan agent saved successfully");
      setTimeout(() => router.push("/loan-agents"), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!agentId || !window.confirm("Delete this loan agent?")) return;
    await adminFetch(`/api/admin/loan-agents/${agentId}`, { method: "DELETE" });
    router.push("/loan-agents");
  }

  const selectedIds = new Set(selected.map((p) => p.service_id));

  return (
    <>
      <PageHeader
        title={isNew ? "Add Loan Agent" : "Edit Loan Agent"}
        subtitle="Changes affect who appears in the mobile loan browsing flow."
      />
      {error ? <p className="notice">{error}</p> : null}

      {/* Agent details */}
      <section className="card card-pad grid">
        {isNew ? (
          <Field label="User ID / Agent ID">
            <input
              className="input"
              placeholder="Leave empty to auto-generate"
              value={form.user_id ?? ""}
              onChange={(e) => setForm({ ...form, user_id: e.target.value })}
            />
          </Field>
        ) : null}
        <div className="form-grid">
          <Field label="Agent name">
            <input className="input" value={form.agent_name} onChange={(e) => setForm({ ...form, agent_name: e.target.value })} />
          </Field>
          <Field label="Bank / agency">
            <select className="select" value={form.bank_affiliated} onChange={(e) => setForm({ ...form, bank_affiliated: e.target.value })}>
              <option value="">— Select bank —</option>
              <option>Maybank</option>
              <option>CIMB Bank</option>
              <option>Public Bank</option>
              <option>RHB Bank</option>
              <option>Hong Leong Bank</option>
              <option>AmBank</option>
              <option>Bank Islam</option>
              <option>Bank Rakyat</option>
              <option>BSN (Bank Simpanan Nasional)</option>
              <option>HSBC Bank Malaysia</option>
              <option>OCBC Bank Malaysia</option>
              <option>Standard Chartered Malaysia</option>
              <option>UOB Malaysia</option>
              <option>Alliance Bank</option>
              <option>Affin Bank</option>
            </select>
          </Field>
          <Field label="Years experience">
            <input className="input" type="number" value={form.years_experience} onChange={(e) => setForm({ ...form, years_experience: Number(e.target.value) })} />
          </Field>
          <Field label="WhatsApp number">
            <div className="phone-input">
              <span className="phone-prefix">+60</span>
              <input className="input" style={{ borderLeft: "none", borderRadius: "0 12px 12px 0" }} value={form.whatsapp_number.replace(/^\+?60/, "")} onChange={(e) => setForm({ ...form, whatsapp_number: "+60" + e.target.value.replace(/^\+?60/, "") })} placeholder="112345678" />
            </div>
          </Field>
        </div>
        <Field label="Biodata">
          <textarea className="textarea" value={form.biodata} onChange={(e) => setForm({ ...form, biodata: e.target.value })} />
        </Field>
      </section>

      {/* User account details */}
      <section className="card card-pad grid" style={{ marginTop: 18 }}>
        <h2 style={{ margin: "0 0 16px" }}>User Account</h2>
        <div className="form-grid">
          <Field label="Full name">
            <input className="input" value={form.user_name} onChange={(e) => setForm({ ...form, user_name: e.target.value })} />
          </Field>
          <Field label="Email">
            <input className="input" type="email" value={form.user_email} onChange={(e) => setForm({ ...form, user_email: e.target.value })} />
          </Field>
          <Field label="Phone number">
            <div className="phone-input">
              <span className="phone-prefix">+60</span>
              <input className="input" style={{ borderLeft: "none", borderRadius: "0 12px 12px 0" }} value={form.user_phone.replace(/^\+?60/, "")} onChange={(e) => setForm({ ...form, user_phone: "+60" + e.target.value.replace(/^\+?60/, "") })} placeholder="112345678" />
            </div>
          </Field>
          <Field label="IC number">
            <input className="input" value={form.user_ic_number} onChange={(e) => setForm({ ...form, user_ic_number: e.target.value })} />
          </Field>
          <Field label="Date of birth">
            <input className="input" type="date" value={form.user_date_of_birth} onChange={(e) => setForm({ ...form, user_date_of_birth: e.target.value })} />
          </Field>
          <Field label="Gender">
            <select className="select" value={form.user_gender} onChange={(e) => setForm({ ...form, user_gender: e.target.value })}>
              <option value="">— select —</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Account status">
            <select className="select" value={form.user_status} onChange={(e) => setForm({ ...form, user_status: e.target.value })}>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="suspended">Suspended</option>
            </select>
          </Field>
          <Field label="Verified">
            <label style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44, fontWeight: 700 }}>
              <input
                type="checkbox"
                checked={form.user_verified_status}
                onChange={(e) => setForm({ ...form, user_verified_status: e.target.checked })}
                style={{ width: 18, height: 18, accentColor: "var(--seed-success)" }}
              />
              KYC verified
            </label>
          </Field>
        </div>
        <Field label="Home address">
          <textarea className="textarea" value={form.user_home_address} onChange={(e) => setForm({ ...form, user_home_address: e.target.value })} />
        </Field>
      </section>

      {/* Loan products */}
      <section className="card card-pad grid" style={{ marginTop: 18 }}>
        <div className="toolbar" style={{ padding: 0, borderBottom: 0 }}>
          <div>
            <h2 style={{ margin: 0 }}>Loan Products</h2>
            <p className="page-subtitle">Select services this agent offers. Multiple agents can share the same service.</p>
          </div>
          <button className="button secondary" onClick={addNewService}>+ New service</button>
        </div>

        {/* Existing services — checkbox list */}
        {allServices.length > 0 ? (
          <div className="service-list" style={{ marginTop: 14 }}>
            {allServices.map((svc) => {
              const isChecked = selectedIds.has(svc.id);
              const sel = selected.find((p) => p.service_id === svc.id);
              return (
                <div key={svc.id} className={`service-row${isChecked ? " service-row-active" : ""}`}>
                  <label className="service-checkbox-label">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleService(svc.id)}
                      style={{ width: 18, height: 18, accentColor: "var(--seed-purple)", flexShrink: 0 }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ fontSize: 14 }}>{svc.title}</strong>
                      {svc.description ? <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--seed-muted)" }}>{svc.description}</p> : null}
                    </div>
                  </label>
                  {isChecked ? (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--seed-border)" }}>
                      <Field label="Eligibility criteria (optional)">
                        <input
                          className="input"
                          value={sel?.eligibility ?? ""}
                          onChange={(e) => patchEligibility(svc.id, e.target.value)}
                          placeholder="e.g. Min income RM3,000 / month"
                        />
                      </Field>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ color: "var(--seed-muted)", fontSize: 14, marginTop: 8 }}>No services yet — add one below.</p>
        )}

        {/* New services inline form */}
        {newServices.length > 0 ? (
          <div className="grid" style={{ marginTop: 14 }}>
            {newServices.map((svc, i) => (
              <div key={i} className="quiz-card">
                <div className="quiz-card-header">
                  <span style={{ fontWeight: 700, fontSize: 14 }}>New service {i + 1}</span>
                  <button className="button ghost" style={{ minHeight: 32, padding: "4px 12px", fontSize: 12 }} onClick={() => removeNewService(i)}>Remove</button>
                </div>
                <div className="form-grid">
                  <Field label="Service title">
                    <input className="input" value={svc.title} onChange={(e) => patchNewService(i, { title: e.target.value })} placeholder="e.g. Personal Loan" />
                  </Field>
                  <Field label="Description">
                    <input className="input" value={svc.description} onChange={(e) => patchNewService(i, { description: e.target.value })} placeholder="Short description…" />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <div className="filters" style={{ marginTop: 18 }}>
        <button className="button purple" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save"}</button>
        {!isNew ? <button className="button danger" onClick={remove}>Delete</button> : null}
        <button className="button ghost" onClick={() => router.push("/loan-agents")}>Cancel</button>
      </div>

      {toast ? (
        <div className="save-toast">
          <span>✓</span> {toast}
        </div>
      ) : null}
    </>
  );
}
