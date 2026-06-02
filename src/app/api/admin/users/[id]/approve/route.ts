import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, requireAdmin, writeAuditLog } from "@/lib/supabase-admin";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const supabase = createAdminSupabase();
  const { data: beforeData } = await supabase.from("users").select("*").eq("id", params.id).single();
  const { data, error } = await supabase
    .from("users")
    .update({ status: "active", verified_status: true })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAuditLog({
    adminUserId: admin.id,
    action: "user.approved",
    entityType: "users",
    entityId: params.id,
    beforeData,
    afterData: data
  });
  return NextResponse.json({ data });
}
