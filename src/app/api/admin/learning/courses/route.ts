import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, requireAdmin, writeAuditLog } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("micro_modules")
    .select("id, name, description, thumbnail_url, is_mandatory, module_chapters(id)");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const body = await request.json();
  const supabase = createAdminSupabase();
  const payload = {
    name: String(body.name ?? "").trim(),
    description: String(body.description ?? "").trim(),
    thumbnail_url: body.thumbnail_url || null,
    is_mandatory: Boolean(body.is_mandatory)
  };

  if (!payload.name) return NextResponse.json({ error: "Course title is required." }, { status: 422 });

  const { data, error } = await supabase.from("micro_modules").insert(payload).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const moduleId = data.id as string;

  // Save chapters (same logic as PUT)
  if (Array.isArray(body.chapters)) {
    for (const raw of body.chapters) {
      if (!String(raw.name ?? "").trim()) continue;

      let creatorId: string | null = null;
      const creatorName = String(raw.creator_name ?? "").trim();
      if (creatorName) {
        const { data: newCreator } = await supabase.from("creators").insert({
          name: creatorName,
          location: String(raw.creator_location ?? "").trim() || null,
          description: String(raw.creator_description ?? "").trim() || null,
        }).select("id").single();
        creatorId = newCreator?.id ?? null;
      }

      const chapter = {
        module_id: moduleId,
        name: String(raw.name ?? "").trim(),
        description: String(raw.description ?? "").trim(),
        summary: String(raw.summary ?? "").trim(),
        video_url: raw.video_url || null,
        duration_minutes: Number(raw.duration_minutes ?? 0),
        sequence_number: Number(raw.sequence_number ?? 1),
        ...(creatorId ? { creator_id: creatorId } : {})
      };

      const { data: createdChapter, error: chapterError } = await supabase
        .from("module_chapters").insert(chapter).select("id").single();
      if (chapterError) continue;

      const quizItems = Array.isArray(raw.quiz_items) ? raw.quiz_items.filter((i: any) => String(i.question ?? "").trim()) : [];
      if (quizItems.length > 0) {
        const { data: createdQuiz } = await supabase
          .from("quizzes").insert({ module_chapter_id: createdChapter.id }).select("id").single();
        if (createdQuiz) {
          await supabase.from("quiz_items").insert(
            quizItems.map((item: any) => ({
              quiz_id: createdQuiz.id,
              question: String(item.question ?? "").trim(),
              option_a: String(item.option_a ?? "").trim(),
              option_b: String(item.option_b ?? "").trim(),
              option_c: String(item.option_c ?? "").trim(),
              option_d: String(item.option_d ?? "").trim(),
              correct_option: String(item.correct_option ?? "A").toUpperCase(),
              explanation: String(item.explanation ?? "").trim()
            }))
          );
        }
      }
    }
  }

  await writeAuditLog({
    adminUserId: admin.id,
    action: "course.created",
    entityType: "micro_modules",
    entityId: moduleId,
    afterData: data
  });
  return NextResponse.json({ data });
}
