import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, requireAdmin, writeAuditLog } from "@/lib/supabase-admin";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const supabase = createAdminSupabase();
  const [{ data: agent, error }, { data: user }, { data: products }, { data: services }] = await Promise.all([
    supabase.from("loan_agents").select("*").eq("user_id", params.id).single(),
    supabase.from("users").select("name, email, phone_number, ic_number, date_of_birth, gender, home_address, status, verified_status").eq("id", params.id).single(),
    supabase.from("loan_agent_products").select("*").eq("agent_id", params.id),
    supabase.from("loan_services").select("*").order("title", { ascending: true })
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ data: { agent, user: user ?? {}, products: products ?? [], services: services ?? [] } });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const body = await request.json();
  const supabase = createAdminSupabase();
  const { data: beforeData } = await supabase.from("loan_agents").select("*").eq("user_id", params.id).single();

  const [{ data, error }, { error: userError }] = await Promise.all([
    supabase
      .from("loan_agents")
      .update({
        agent_name: String(body.agent_name ?? "").trim(),
        bank_affiliated: String(body.bank_affiliated ?? "").trim(),
        years_experience: Number(body.years_experience ?? 0),
        biodata: String(body.biodata ?? "").trim(),
        whatsapp_number: String(body.whatsapp_number ?? "").trim()
      })
      .eq("user_id", params.id)
      .select()
      .single(),
    supabase
      .from("users")
      .update({
        name: String(body.user_name ?? "").trim() || undefined,
        email: String(body.user_email ?? "").trim() || undefined,
        phone_number: String(body.user_phone ?? "").trim() || null,
        ic_number: String(body.user_ic_number ?? "").trim() || null,
        date_of_birth: body.user_date_of_birth || null,
        gender: String(body.user_gender ?? "").trim() || null,
        home_address: String(body.user_home_address ?? "").trim() || null,
        status: String(body.user_status ?? "").trim() || undefined,
        verified_status: body.user_verified_status === true || body.user_verified_status === "true"
      })
      .eq("id", params.id)
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (userError) return NextResponse.json({ error: userError.message }, { status: 500 });

  // Sync verification_requests when verified_status changes
  const isVerified = body.user_verified_status === true || body.user_verified_status === "true";
  const { data: existingVerif } = await supabase
    .from("verification_requests")
    .select("id")
    .eq("agent_id", params.id)
    .maybeSingle();

  if (isVerified && !existingVerif) {
    await supabase.from("verification_requests").insert({
      agent_id: params.id,
      type: "loan_agent",
      verification_status: true,
      request_date: new Date().toISOString(),
      last_update: new Date().toISOString(),
      reviewed_at: new Date().toISOString(),
      metadata: { source: "admin_portal", final_score: 5 }
    });
  } else if (existingVerif) {
    await supabase.from("verification_requests")
      .update({ verification_status: isVerified, last_update: new Date().toISOString() })
      .eq("id", existingVerif.id);
  }

  // Create any new loan_services first
  const newServices: { title: string; description: string }[] = Array.isArray(body.new_services)
    ? body.new_services.filter((s: any) => String(s.title ?? "").trim())
    : [];

  const createdServiceIds: string[] = [];
  for (const svc of newServices) {
    const { data: created } = await supabase
      .from("loan_services")
      .insert({ title: String(svc.title).trim(), description: String(svc.description ?? "").trim() || null })
      .select("id")
      .single();
    if (created?.id) createdServiceIds.push(created.id);
  }

  // Sync loan_agent_products: delete existing, re-insert selected + newly created
  const selectedProducts: { service_id: string; eligibility: string }[] = Array.isArray(body.selected_products)
    ? body.selected_products
    : [];

  const allProductRows = [
    ...selectedProducts.map((p: any) => ({
      agent_id: params.id,
      services_id: p.service_id,
      eligibility: String(p.eligibility ?? "").trim() || null
    })),
    ...createdServiceIds.map((sid) => ({
      agent_id: params.id,
      services_id: sid,
      eligibility: null
    }))
  ];

  await supabase.from("loan_agent_products").delete().eq("agent_id", params.id);
  if (allProductRows.length > 0) {
    await supabase.from("loan_agent_products").insert(allProductRows);
  }

  await writeAuditLog({
    adminUserId: admin.id,
    action: "loan_agent.updated",
    entityType: "loan_agents",
    entityId: params.id,
    beforeData,
    afterData: data
  });
  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const supabase = createAdminSupabase();
  const { data: beforeData } = await supabase.from("loan_agents").select("*").eq("user_id", params.id).single();

  // Delete child rows first to satisfy FK constraints
  await supabase.from("loan_agent_products").delete().eq("agent_id", params.id);
  await supabase.from("verification_requests").delete().eq("agent_id", params.id);
  await supabase.from("loan_requests").delete().eq("agent_id", params.id);

  const { error } = await supabase.from("loan_agents").delete().eq("user_id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAuditLog({
    adminUserId: admin.id,
    action: "loan_agent.deleted",
    entityType: "loan_agents",
    entityId: params.id,
    beforeData
  });
  return NextResponse.json({ data: { id: params.id } });
}
