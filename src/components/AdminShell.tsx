"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, ClipboardList, LayoutDashboard, LogOut, ScrollText, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { adminFetch } from "@/lib/admin-fetch";
import type { AdminUser } from "@/types/admin";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/users", label: "User Accounts", icon: Users },
  { href: "/learning", label: "Learning Materials", icon: BookOpen },
  { href: "/loan-agents", label: "Loan Agents", icon: ClipboardList },
  { href: "/audit-logs", label: "Audit Logs", icon: ScrollText }
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/login");
        return;
      }

      try {
        const me = await adminFetch<AdminUser>("/api/admin/me");
        if (mounted) setAdmin(me);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "Unable to verify admin access.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return <div className="empty">Loading admin portal...</div>;
  }

  if (error) {
    return (
      <main className="empty">
        <p className="notice">{error}</p>
        <button className="button" onClick={signOut}>
          Back to login
        </button>
      </main>
    );
  }

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="brand">
          <Image src="/seed-logo.png" alt="SEED" width={44} height={44} style={{ borderRadius: 14, objectFit: "contain" }} />
          <div>
            <strong>SEED Admin</strong>
            <div style={{ color: "var(--seed-muted)", fontSize: 12 }}>{admin?.email}</div>
          </div>
        </div>
        <nav className="nav">
          {links.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link key={link.href} href={link.href} className={`nav-link ${active ? "active" : ""}`}>
                <Icon size={18} />
                {link.label}
              </Link>
            );
          })}
          <button className="nav-link" onClick={signOut} style={{ border: 0, background: "transparent" }}>
            <LogOut size={18} />
            Sign out
          </button>
        </nav>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
