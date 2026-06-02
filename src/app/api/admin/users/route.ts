import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, requireAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const supabase = createAdminSupabase();
  let query = supabase
    .from("users")
    .select("id, name, email, phone_number, avatar_url, verified_status, status, date_of_birth")
    .limit(100);

  if (status && status !== "all") query = query.eq("status", status);
  if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userIds = (data ?? []).map((user) => user.id);
  const [{ data: verifications }, { data: businesses }] = userIds.length
    ? await Promise.all([
        supabase
          .from("verification_requests")
          .select("microbusiness_id, verification_status, rejection_reason, metadata, request_date, last_update")
          .in("microbusiness_id", userIds),
        supabase
          .from("microbusiness_owners")
          .select("user_id, business_name, type")
          .in("user_id", userIds)
      ])
    : [{ data: [] }, { data: [] }];

  const verificationByUser = new Map((verifications ?? []).map((v) => [v.microbusiness_id, v]));
  const businessByUser = new Map((businesses ?? []).map((business) => [business.user_id, business]));
  const rows = (data ?? []).map((user) => ({
    ...user,
    microbusiness_owner: businessByUser.get(user.id) ?? null,
    verification: verificationByUser.get(user.id) ?? null
  }));

  return NextResponse.json({ data: rows });
}
