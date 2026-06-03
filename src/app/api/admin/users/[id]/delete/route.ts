import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, requireAdmin, writeAuditLog } from "@/lib/supabase-admin";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const supabase = createAdminSupabase();
  const userId = params.id;

  const { data: beforeData } = await supabase.from("users").select("*").eq("id", userId).single();
  if (!beforeData) return NextResponse.json({ error: "User not found." }, { status: 404 });

  // ── 1. Direct user-level records ─────────────────────────────────────────
  await supabase.from("video_watch_progress").delete().eq("user_id", userId);
  await supabase.from("learning_progress").delete().eq("user_id", userId);
  await supabase.from("quiz_attempts").delete().eq("user_id", userId);
  await supabase.from("activity_log").delete().eq("user_id", userId);

  // ── 2. Microbusiness owner cascade ───────────────────────────────────────
  const { data: business } = await supabase
    .from("microbusiness_owners")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (business) {
    const businessId = business.user_id;

    // Business-level records
    await supabase.from("content_ratings").delete().eq("business_id", businessId);
    await supabase.from("learning_activity_log").delete().eq("business_id", businessId);
    await supabase.from("ai_insights").delete().eq("business_id", businessId);
    await supabase.from("product_import_jobs").delete().eq("business_id", businessId);

    // Verification documents → verification requests
    const { data: verifications } = await supabase
      .from("verification_requests")
      .select("id")
      .eq("microbusiness_id", businessId);
    for (const v of verifications ?? []) {
      await supabase.from("verification_documents").delete().eq("verification_id", v.id);
    }
    await supabase.from("verification_requests").delete().eq("microbusiness_id", businessId);

    // Loan documents → loan requests
    const { data: loanRequests } = await supabase
      .from("loan_requests")
      .select("id")
      .eq("microbusiness_id", businessId);
    for (const lr of loanRequests ?? []) {
      await supabase.from("loan_documents").delete().eq("loan_request_id", lr.id);
    }
    await supabase.from("loan_requests").delete().eq("microbusiness_id", businessId);

    // Order details → orders
    const { data: orders } = await supabase
      .from("orders")
      .select("id")
      .eq("business_id", businessId);
    for (const o of orders ?? []) {
      await supabase.from("order_details").delete().eq("transaction_id", o.id);
    }
    await supabase.from("orders").delete().eq("business_id", businessId);

    // Products → categories
    const { data: categories } = await supabase
      .from("categories")
      .select("id")
      .eq("business_id", businessId);
    for (const c of categories ?? []) {
      await supabase.from("products").delete().eq("category_id", c.id);
    }
    await supabase.from("categories").delete().eq("business_id", businessId);

    await supabase.from("microbusiness_owners").delete().eq("user_id", businessId);
  }

  // ── 3. Loan agent cascade ─────────────────────────────────────────────────
  const { data: agent } = await supabase
    .from("loan_agents")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (agent) {
    const agentId = agent.user_id;

    const { data: agentVerifications } = await supabase
      .from("verification_requests")
      .select("id")
      .eq("agent_id", agentId);
    for (const v of agentVerifications ?? []) {
      await supabase.from("verification_documents").delete().eq("verification_id", v.id);
    }
    await supabase.from("verification_requests").delete().eq("agent_id", agentId);

    const { data: agentLoanRequests } = await supabase
      .from("loan_requests")
      .select("id")
      .eq("agent_id", agentId);
    for (const lr of agentLoanRequests ?? []) {
      await supabase.from("loan_documents").delete().eq("loan_request_id", lr.id);
    }
    await supabase.from("loan_requests").delete().eq("agent_id", agentId);
    await supabase.from("loan_agent_products").delete().eq("agent_id", agentId);
    await supabase.from("loan_agents").delete().eq("user_id", agentId);
  }

  // ── 4. Administrator cascade ──────────────────────────────────────────────
  await supabase.from("administrators").delete().eq("user_id", userId);

  // ── 5. Finally delete the user ────────────────────────────────────────────
  const { error } = await supabase.from("users").delete().eq("id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog({
    adminUserId: admin.id,
    action: "user.deleted",
    entityType: "users",
    entityId: userId,
    beforeData,
    afterData: null,
    reason: "Deleted by admin"
  });

  return NextResponse.json({ success: true });
}
