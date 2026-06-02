"use client";

import { createBrowserSupabase } from "@/lib/supabase-browser";

export async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const supabase = createBrowserSupabase();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    throw new Error("You are not signed in.");
  }

  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...(init?.headers ?? {})
    }
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed.");
  }

  return payload.data as T;
}
