import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, writeAuditLog } from "@/lib/supabase-admin";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  await writeAuditLog({
    adminUserId: admin.id,
    action: "course.publish_requested",
    entityType: "micro_modules",
    entityId: params.id,
    reason: "Current mobile schema has no published flag; course is visible after save."
  });

  return NextResponse.json({
    data: {
      id: params.id,
      status: "published",
      note: "The current mobile schema has no published flag, so saved courses are available to the app."
    }
  });
}
