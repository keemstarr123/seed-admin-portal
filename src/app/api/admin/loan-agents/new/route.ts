import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, requireAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const supabase = createAdminSupabase();
  const { data: services } = await supabase
    .from("loan_services")
    .select("id, title, description")
    .order("title", { ascending: true });

  return NextResponse.json({ data: { services: services ?? [] } });
}
