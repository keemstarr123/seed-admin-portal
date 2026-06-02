import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, requireAdmin, writeAuditLog } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("loan_agents")
    .select("user_id, agent_name, bank_affiliated, years_experience, biodata, whatsapp_number, loan_agent_products(id, services_id, eligibility)")
    .order("agent_name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const body = await request.json();
  const supabase = createAdminSupabase();

  const agentName = String(body.agent_name ?? "").trim();
  if (!agentName) return NextResponse.json({ error: "Agent name is required." }, { status: 422 });

  const userId = body.user_id || crypto.randomUUID();

  // 1. Insert into public.users first (required by FK)
  const { error: userError } = await supabase.from("users").insert({
    id: userId,
    name: String(body.user_name ?? agentName).trim(),
    email: String(body.user_email ?? "").trim() || `agent_${userId.slice(0, 8)}@seed.local`,
    phone_number: String(body.user_phone ?? "").trim() || null,
    ic_number: String(body.user_ic_number ?? "").trim() || null,
    date_of_birth: body.user_date_of_birth || null,
    gender: String(body.user_gender ?? "").trim() || null,
    home_address: String(body.user_home_address ?? "").trim() || null,
    status: String(body.user_status ?? "active").trim(),
    verified_status: body.user_verified_status === true,
    password_hash: "admin_created"
  });
  if (userError) return NextResponse.json({ error: userError.message }, { status: 500 });

  // 2. Insert into loan_agents
  const { data, error } = await supabase.from("loan_agents").insert({
    user_id: userId,
    agent_name: agentName,
    bank_affiliated: String(body.bank_affiliated ?? "").trim(),
    years_experience: Number(body.years_experience ?? 0),
    biodata: String(body.biodata ?? "").trim(),
    whatsapp_number: String(body.whatsapp_number ?? "").trim()
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 3. Save loan products if provided
  const selectedProducts: { service_id: string; eligibility: string }[] = Array.isArray(body.selected_products) ? body.selected_products : [];
  const newServices: { title: string; description: string }[] = Array.isArray(body.new_services) ? body.new_services.filter((s: any) => String(s.title ?? "").trim()) : [];
  const createdServiceIds: string[] = [];
  for (const svc of newServices) {
    const { data: created } = await supabase.from("loan_services").insert({ title: String(svc.title).trim(), description: String(svc.description ?? "").trim() || null }).select("id").single();
    if (created?.id) createdServiceIds.push(created.id);
  }
  const productRows = [
    ...selectedProducts.map((p) => ({ agent_id: userId, services_id: p.service_id, eligibility: String(p.eligibility ?? "").trim() || null })),
    ...createdServiceIds.map((sid) => ({ agent_id: userId, services_id: sid, eligibility: null }))
  ];
  if (productRows.length > 0) await supabase.from("loan_agent_products").insert(productRows);

  // Auto-approve: create a verified verification_request so the agent appears in the mobile app
  await supabase.from("verification_requests").insert({
    agent_id: userId,
    type: "loan_agent",
    verification_status: true,
    request_date: new Date().toISOString(),
    last_update: new Date().toISOString(),
    reviewed_at: new Date().toISOString(),
    metadata: { source: "admin_portal", final_score: 5 }
  });

  await writeAuditLog({ adminUserId: admin.id, action: "loan_agent.created", entityType: "loan_agents", entityId: userId, afterData: data });
  return NextResponse.json({ data });
}
