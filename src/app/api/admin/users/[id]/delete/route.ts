import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, requireAdmin, writeAuditLog } from "@/lib/supabase-admin";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const supabase = createAdminSupabase();
  const { data: beforeData } = await supabase.from("users").select("*").eq("id", params.id).single();

  if (!beforeData) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const { error } = await supabase.from("users").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog({
    adminUserId: admin.id,
    action: "user.deleted",
    entityType: "users",
    entityId: params.id,
    beforeData,
    afterData: null,
    reason: "Deleted by admin"
  });

  return NextResponse.json({ success: true });
}
