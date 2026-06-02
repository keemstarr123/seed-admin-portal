import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;
  return NextResponse.json({ data: admin });
}
