"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { adminFetch } from "@/lib/admin-fetch";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";
import type { DashboardMetrics } from "@/types/admin";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminFetch<DashboardMetrics>("/api/admin/dashboard").then(setMetrics).catch((err) => setError(err.message));
  }, []);

  return (
    <div className="dashboard-page">
      <div>
        <PageHeader
          title="Dashboard"
          subtitle="Operational view for registrations, learning content and loan agent coverage."
          action={<button className="button" onClick={() => window.location.reload()}>Refresh</button>}
        />
        {error ? <p className="notice">{error}</p> : null}
      </div>

      <section className="grid grid-3">
        <Metric label="Total Users" value={metrics?.totalUsers} featured delta="Live count" href="/users" />
        <Metric label="Pending Registrations" value={metrics?.pendingUsers} delta="Needs action" href="/users" />
        <Metric label="Learning Courses" value={metrics?.courses} delta={`${metrics?.totalChapters ?? 0} chapters total`} href="/learning" />
      </section>

      <section className="dashboard-grid">
        <div className="card card-pad wide-panel">
          <div className="chart-title">
            <div>
              <h2>Platform Operations</h2>
              <p className="page-subtitle">Current workload across account review, learning and loan operations.</p>
            </div>
            <div className="filters">
              <span className="badge active">Users</span>
              <span className="badge draft">Learning</span>
              <span className="badge pending">Loans</span>
            </div>
          </div>
          <BarChart metrics={metrics} />
        </div>

        <div className="card card-pad">
          <div className="chart-title">
            <h2>User Status</h2>
            <span className="badge">live</span>
          </div>
          <DonutChart items={metrics?.userStatus ?? []} center={`${metrics?.totalUsers ?? 0}\nusers`} />
        </div>
      </section>

      <section className="dashboard-grid dashboard-bottom">
        <div className="card card-pad">
          <div className="chart-title">
            <h2>New Registrations</h2>
            <Link href="/users" className="button secondary">View all</Link>
          </div>
          <RecentUsers items={metrics?.recentUsers ?? []} />
        </div>

        <div className="card card-pad">
          <div className="chart-title">
            <h2>Recent Activity</h2>
            <Link href="/audit-logs" className="button secondary">View all</Link>
          </div>
          <AuditLog items={metrics?.recentAuditLogs ?? []} />
        </div>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  featured,
  delta,
  href,
}: {
  label: string;
  value?: number;
  featured?: boolean;
  delta: string;
  href?: string;
}) {
  return (
    <div className={`metric-card${featured ? " metric-card-featured" : ""}`}>
      <div className="metric-card-header">
        <span className="metric-card-label">{label}</span>
        <Link href={href ?? "#"} className="metric-card-arrow">
          <ArrowUpRight size={14} />
        </Link>
      </div>
      <div className="metric-card-value">{value ?? "…"}</div>
      <div className="metric-card-delta">
        <TrendingUp size={12} />
        <span>{delta}</span>
      </div>
    </div>
  );
}

function BarChart({ metrics }: { metrics: DashboardMetrics | null }) {
  const bars = [
    { label: "Pending", primary: metrics?.pendingUsers ?? 0, secondary: metrics?.lowScoreUsers ?? 0 },
    { label: "Active", primary: metrics?.approvedUsers ?? 0, secondary: metrics?.totalUsers ?? 0 },
    { label: "Courses", primary: metrics?.courses ?? 0, secondary: metrics?.totalChapters ?? 0 },
    { label: "Mandatory", primary: metrics?.mandatoryCourses ?? 0, secondary: metrics?.courses ?? 0 },
    { label: "Agents", primary: metrics?.activeLoanAgents ?? 0, secondary: Math.ceil(metrics?.avgAgentExperience ?? 0) },
    { label: "Rejected", primary: metrics?.rejectedUsers ?? 0, secondary: metrics?.suspendedUsers ?? 0 },
    { label: "Review", primary: metrics?.reviewQueue?.length ?? 0, secondary: metrics?.lowScoreUsers ?? 0 },
    { label: "Banks", primary: metrics?.loanBankMix?.length ?? 0, secondary: metrics?.activeLoanAgents ?? 0 }
  ];
  const max = Math.max(1, ...bars.flatMap((bar) => [bar.primary, bar.secondary]));

  return (
    <div className="bar-chart">
      {bars.map((bar) => (
        <div className="bar-group" key={bar.label}>
          <div className="bar-pair">
            <div className="bar" style={{ height: `${Math.max(8, (bar.primary / max) * 170)}px`, background: "#40BBFF" }} />
            <div className="bar" style={{ height: `${Math.max(8, (bar.secondary / max) * 170)}px`, background: "#FFB284" }} />
          </div>
          <div className="bar-label">{bar.label}</div>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ items, center }: { items: Array<{ label: string; value: number; color: string }>; center: string }) {
  const total = Math.max(1, items.reduce((sum, item) => sum + item.value, 0));
  let cursor = 0;
  const gradient =
    items.length === 0
      ? "#E2F4FD 0 100%"
      : items
          .map((item) => {
            const start = cursor;
            cursor += (item.value / total) * 100;
            return `${item.color} ${start}% ${cursor}%`;
          })
          .join(", ");

  return (
    <div className="donut-row">
      <div className="donut" style={{ background: `conic-gradient(${gradient})` }}>
        <div className="donut-hole">{center.split("\n").map((line) => <span key={line}>{line}<br /></span>)}</div>
      </div>
      <div className="legend">
        {items.map((item) => (
          <div className="legend-item" key={item.label}>
            <span className="legend-left"><span className="dot" style={{ background: item.color }} />{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentUsers({ items }: { items: DashboardMetrics["recentUsers"] }) {
  if (items.length === 0) return <div className="empty">No users registered yet.</div>;
  return (
    <div className="recent-list">
      {items.map((user) => {
        const initials = (user.name ?? "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
        return (
          <Link href={`/users/${user.id}`} key={user.id} className="recent-item">
            <div className="recent-avatar">{initials}</div>
            <div className="recent-info">
              <strong>{user.name ?? "Unnamed"}</strong>
              <span>{user.email ?? "—"}</span>
            </div>
            <div className="recent-meta">
              <StatusBadge value={user.status} />
              <span className="recent-date">{formatDate(user.created_at)}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function AuditLog({ items }: { items: DashboardMetrics["recentAuditLogs"] }) {
  if (items.length === 0) return <div className="empty">No recent activity.</div>;
  return (
    <div className="recent-list">
      {items.map((log) => (
        <div key={log.id} className="recent-item">
          <div className="audit-dot" />
          <div className="recent-info">
            <strong>{log.action ?? "Action"}</strong>
            <span>{log.target_type ?? "—"} · {log.admin_email ?? "system"}</span>
          </div>
          <span className="recent-date">{formatDate(log.created_at)}</span>
        </div>
      ))}
    </div>
  );
}

