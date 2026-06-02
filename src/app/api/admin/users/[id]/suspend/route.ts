import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, requireAdmin, writeAuditLog } from "@/lib/supabase-admin";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const body = await request.json().catch(() => ({}));
  const reason = String(body.reason ?? "").trim();
  if (!reason) return NextResponse.json({ error: "Suspension reason is required." }, { status: 422 });

  const supabase = createAdminSupabase();
  const { data: beforeData } = await supabase.from("users").select("*").eq("id", params.id).single();
  const { data, error } = await supabase
    .from("users")
    .update({ status: "suspended" })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAuditLog({
    adminUserId: admin.id,
    action: "user.suspended",
    entityType: "users",
    entityId: params.id,
    beforeData,
    afterData: data,
    reason
  });
  return NextResponse.json({ data });
}
