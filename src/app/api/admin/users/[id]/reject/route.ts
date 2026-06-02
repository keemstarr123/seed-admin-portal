import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, requireAdmin, writeAuditLog } from "@/lib/supabase-admin";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const body = await request.json().catch(() => ({}));
  const reason = String(body.reason ?? "").trim();
  if (!reason) return NextResponse.json({ error: "Rejection reason is required." }, { status: 422 });

  const supabase = createAdminSupabase();
  const { data: beforeData } = await supabase.from("users").select("*").eq("id", params.id).single();
  const { data, error } = await supabase
    .from("users")
    .update({ status: "rejected", verified_status: false })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase
    .from("verification_requests")
    .update({ verification_status: false, rejection_reason: reason, last_update: new Date().toISOString() })
    .eq("microbusiness_id", params.id);
  await writeAuditLog({
    adminUserId: admin.id,
    action: "user.rejected",
    entityType: "users",
    entityId: params.id,
    beforeData,
    afterData: data,
    reason
  });
  return NextResponse.json({ data });
}
