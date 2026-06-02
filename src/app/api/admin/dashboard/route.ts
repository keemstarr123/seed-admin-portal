import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, requireAdmin } from "@/lib/supabase-admin";
import type { DashboardMetrics } from "@/types/admin";

async function count(table: string, apply?: (query: any) => any) {
  const supabase = createAdminSupabase();
  let query = supabase.from(table).select("*", { count: "exact", head: true });
  if (apply) query = apply(query);
  const { count: value, error } = await query;
  if (error) throw error;
  return value ?? 0;
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  try {
    const [pendingUsers, approvedUsers, rejectedUsers, suspendedUsers, courses, activeLoanAgents] = await Promise.all([
      count("users", (q) => q.eq("status", "pending")),
      count("users", (q) => q.eq("status", "active")),
      count("users", (q) => q.eq("status", "rejected")),
      count("users", (q) => q.eq("status", "suspended")),
      count("micro_modules"),
      count("loan_agents")
    ]);

    const supabase = createAdminSupabase();
    const [{ data: users }, { data: lowScoreRows }, { data: modules }, { data: agents }, { data: recentUsersRaw }, { data: recentLogsRaw }] = await Promise.all([
      supabase.from("users").select("id, status, verified_status").limit(2000),
      supabase
        .from("verification_requests")
        .select("id, verification_status, request_date, metadata")
        .limit(1000),
      supabase.from("micro_modules").select("id, is_mandatory, module_chapters(id)").limit(1000),
      supabase.from("loan_agents").select("user_id, bank_affiliated, years_experience").limit(1000),
      supabase.from("users").select("id, name, email, status, created_at").order("created_at", { ascending: false }).limit(3),
      supabase.from("admin_audit_logs").select("id, action, entity_type, admin_user_id, created_at").order("created_at", { ascending: false }).limit(5)
    ]);

    const lowScoreUsers = (lowScoreRows ?? []).filter((row) => {
      const score = Number((row.metadata as any)?.final_score ?? 0);
      return score > 0 && score < 4;
    }).length;

    const totalUsers = users?.length ?? 0;
    const statusCount = new Map<string, number>();
    for (const user of users ?? []) {
      const status = String(user.status ?? "pending");
      statusCount.set(status, (statusCount.get(status) ?? 0) + 1);
    }

    const mandatoryCourses = (modules ?? []).filter((module) => module.is_mandatory === true).length;
    const totalChapters = (modules ?? []).reduce((sum, module) => {
      const chapters = Array.isArray(module.module_chapters) ? module.module_chapters.length : 0;
      return sum + chapters;
    }, 0);

    const agentExperienceValues = (agents ?? [])
      .map((agent) => Number(agent.years_experience ?? 0))
      .filter((value) => Number.isFinite(value));
    const avgAgentExperience =
      agentExperienceValues.length === 0
        ? 0
        : agentExperienceValues.reduce((sum, value) => sum + value, 0) / agentExperienceValues.length;

    const bankCount = new Map<string, number>();
    for (const agent of agents ?? []) {
      const bank = String(agent.bank_affiliated || "Independent");
      bankCount.set(bank, (bankCount.get(bank) ?? 0) + 1);
    }

    const metrics: DashboardMetrics = {
      pendingUsers,
      lowScoreUsers,
      approvedUsers,
      courses,
      activeLoanAgents,
      totalUsers,
      rejectedUsers,
      suspendedUsers,
      mandatoryCourses,
      totalChapters,
      avgAgentExperience,
      userStatus: [
        { label: "Active", value: statusCount.get("active") ?? 0, color: "#40BBFF" },
        { label: "Pending", value: statusCount.get("pending") ?? 0, color: "#FF9800" },
        { label: "Rejected", value: statusCount.get("rejected") ?? 0, color: "#EF4444" },
        { label: "Suspended", value: statusCount.get("suspended") ?? 0, color: "#7E57C2" }
      ],
      learningMix: [
        { label: "Mandatory", value: mandatoryCourses, color: "#7E57C2" },
        { label: "Optional", value: Math.max(courses - mandatoryCourses, 0), color: "#40BBFF" },
        { label: "Chapters", value: totalChapters, color: "#FFB284" }
      ],
      loanBankMix: Array.from(bankCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([label, value], index) => ({
          label,
          value,
          color: ["#40BBFF", "#7E57C2", "#FF9800", "#B69AEE", "#FFB284", "#38B6FF"][index] ?? "#64748B"
        })),
      recentUsers: (recentUsersRaw ?? []).map((u) => ({
        id: u.id,
        name: u.name ?? null,
        email: u.email ?? null,
        status: u.status ?? null,
        created_at: u.created_at ?? null,
      })),
      recentAuditLogs: (recentLogsRaw ?? []).map((l) => ({
        id: l.id,
        action: l.action ?? null,
        target_type: l.entity_type ?? null,
        admin_email: l.admin_user_id ? `…${String(l.admin_user_id).slice(-8)}` : null,
        created_at: l.created_at ?? null,
      })),
      reviewQueue: (lowScoreRows ?? [])
        .map((row) => ({
          id: row.id,
          score: Number((row.metadata as any)?.final_score ?? 0),
          status: row.verification_status === true ? "approved" : "review",
          date: row.request_date ?? null
        }))
        .filter((row) => row.score > 0 && row.score < 4)
        .slice(0, 5)
    };

    return NextResponse.json({ data: metrics });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load dashboard." },
      { status: 500 }
    );
  }
}
