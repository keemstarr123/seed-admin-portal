import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import type { AdminRole, AdminUser } from "@/types/admin";

export function createAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase server environment variables.");
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export async function requireAdmin(request: NextRequest): Promise<AdminUser | NextResponse> {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Missing bearer token." }, { status: 401 });
  }

  const supabase = createAdminSupabase();
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const user = userData.user;

  if (userError || !user) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  const { data: rolesData, error: rolesError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (rolesError) {
    return NextResponse.json({ error: rolesError.message }, { status: 500 });
  }

  const roles = (rolesData ?? []).map((row) => row.role as AdminRole);
  if (roles.length === 0) {
    return NextResponse.json({ error: "This account is not an admin." }, { status: 403 });
  }

  return {
    id: user.id,
    email: user.email ?? null,
    roles
  };
}

export function hasRole(admin: AdminUser, allowed: AdminRole[]) {
  return admin.roles.includes("super_admin") || admin.roles.some((role) => allowed.includes(role));
}

export async function writeAuditLog(input: {
  adminUserId: string;
  action: string;
  entityType: string;
  entityId?: string;
  beforeData?: unknown;
  afterData?: unknown;
  reason?: string;
}) {
  const supabase = createAdminSupabase();
  await supabase.from("admin_audit_logs").insert({
    admin_user_id: input.adminUserId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    before_data: input.beforeData ?? null,
    after_data: input.afterData ?? null,
    reason: input.reason ?? null
  });
}
