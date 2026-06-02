import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, requireAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const supabase = createAdminSupabase();
  const [{ data: user, error }, { data: business }, { data: verifications }, { data: documents }] =
    await Promise.all([
      supabase.from("users").select("*").eq("id", params.id).single(),
      supabase.from("microbusiness_owners").select("*").eq("user_id", params.id).maybeSingle(),
      supabase
        .from("verification_requests")
        .select("*")
        .eq("microbusiness_id", params.id)
        .order("request_date", { ascending: false }),
      supabase
        .from("verification_documents")
        .select("*")
        .order("uploaded_at", { ascending: false })
        .limit(20)
    ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ data: { user, business, verifications: verifications ?? [], documents: documents ?? [] } });
}
