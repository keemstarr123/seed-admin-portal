import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, requireAdmin, writeAuditLog } from "@/lib/supabase-admin";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const supabase = createAdminSupabase();
  const [{ data: course, error }, { data: rawChapters }] = await Promise.all([
    supabase.from("micro_modules").select("*").eq("id", params.id).single(),
    supabase
      .from("module_chapters")
      .select("*, creator:creators(id, name, location, description)")
      .eq("module_id", params.id)
      .order("sequence_number", { ascending: true })
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  const chapterIds = (rawChapters ?? []).map((c: any) => c.id as string);

  // Step 1: quizzes keyed by chapter
  const { data: quizzes } = chapterIds.length
    ? await supabase
        .from("quizzes")
        .select("id, module_chapter_id")
        .in("module_chapter_id", chapterIds)
    : { data: [] };

  const quizIds = (quizzes ?? []).map((q: any) => q.id as string);

  // Step 2: quiz items for those quizzes
  const { data: quizItems } = quizIds.length
    ? await supabase
        .from("quiz_items")
        .select("id, quiz_id, question, option_a, option_b, option_c, option_d, correct_option, explanation")
        .in("quiz_id", quizIds)
    : { data: [] };

  const quizByChapter = new Map((quizzes ?? []).map((q: any) => [q.module_chapter_id as string, q]));
  const itemsByQuiz = new Map<string, any[]>();
  for (const item of quizItems ?? []) {
    const list = itemsByQuiz.get(item.quiz_id) ?? [];
    list.push(item);
    itemsByQuiz.set(item.quiz_id, list);
  }

  const chapters = (rawChapters ?? []).map((chapter: any) => {
    const quiz = quizByChapter.get(chapter.id) ?? null;
    return {
      ...chapter,
      quiz_id: quiz?.id ?? null,
      quiz_items: quiz ? (itemsByQuiz.get(quiz.id) ?? []) : []
    };
  });

  return NextResponse.json({ data: { course, chapters } });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const body = await request.json();
  const supabase = createAdminSupabase();
  const { data: beforeData } = await supabase.from("micro_modules").select("*").eq("id", params.id).single();

  const { data, error } = await supabase
    .from("micro_modules")
    .update({
      name: String(body.name ?? "").trim(),
      description: String(body.description ?? "").trim(),
      thumbnail_url: body.thumbnail_url || null,
      is_mandatory: Boolean(body.is_mandatory)
    })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (Array.isArray(body.chapters)) {
    for (const raw of body.chapters) {
      if (!String(raw.name ?? "").trim()) continue;

      // Upsert creator if author fields provided
      let creatorId: string | null = raw.creator_id ?? null;
      const creatorName = String(raw.creator_name ?? "").trim();
      if (creatorName) {
        if (creatorId) {
          await supabase.from("creators").update({
            name: creatorName,
            location: String(raw.creator_location ?? "").trim() || null,
            description: String(raw.creator_description ?? "").trim() || null,
          }).eq("id", creatorId);
        } else {
          const { data: newCreator } = await supabase.from("creators").insert({
            name: creatorName,
            location: String(raw.creator_location ?? "").trim() || null,
            description: String(raw.creator_description ?? "").trim() || null,
          }).select("id").single();
          creatorId = newCreator?.id ?? null;
        }
      }

      const chapter = {
        module_id: params.id,
        name: String(raw.name ?? "").trim(),
        description: String(raw.description ?? "").trim(),
        summary: String(raw.summary ?? "").trim(),
        video_url: raw.video_url || null,
        duration_minutes: Number(raw.duration_minutes ?? 0),
        sequence_number: Number(raw.sequence_number ?? 1),
        ...(creatorId ? { creator_id: creatorId } : {})
      };

      let chapterId = raw.id as string | undefined;
      if (raw.id) {
        await supabase.from("module_chapters").update(chapter).eq("id", raw.id);
      } else {
        const { data: createdChapter, error: chapterError } = await supabase
          .from("module_chapters")
          .insert(chapter)
          .select("id")
          .single();
        if (chapterError) return NextResponse.json({ error: chapterError.message }, { status: 500 });
        chapterId = createdChapter.id;
      }

      if (!chapterId) continue;
      const quizItems = Array.isArray(raw.quiz_items) ? raw.quiz_items : [];
      const { data: existingQuiz } = await supabase
        .from("quizzes")
        .select("id")
        .eq("module_chapter_id", chapterId)
        .maybeSingle();

      let quizId = existingQuiz?.id as string | undefined;
      if (quizItems.length > 0 && !quizId) {
        const { data: createdQuiz, error: quizError } = await supabase
          .from("quizzes")
          .insert({ module_chapter_id: chapterId })
          .select("id")
          .single();
        if (quizError) return NextResponse.json({ error: quizError.message }, { status: 500 });
        quizId = createdQuiz.id;
      }

      if (quizId) {
        await supabase.from("quiz_items").delete().eq("quiz_id", quizId);
        const rows = quizItems
          .map((item: Record<string, unknown>) => ({
            quiz_id: quizId,
            question: String(item.question ?? "").trim(),
            option_a: String(item.option_a ?? "").trim(),
            option_b: String(item.option_b ?? "").trim(),
            option_c: String(item.option_c ?? "").trim(),
            option_d: String(item.option_d ?? "").trim(),
            correct_option: String(item.correct_option ?? "A").toUpperCase(),
            explanation: String(item.explanation ?? "").trim()
          }))
          .filter((item: { question: string }) => item.question.length > 0);

        if (rows.length > 0) {
          const { error: itemError } = await supabase.from("quiz_items").insert(rows);
          if (itemError) return NextResponse.json({ error: itemError.message }, { status: 500 });
        }
      }
    }
  }

  await writeAuditLog({
    adminUserId: admin.id,
    action: "course.updated",
    entityType: "micro_modules",
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
  const { data: beforeData } = await supabase.from("micro_modules").select("*").eq("id", params.id).single();

  // Fetch chapter IDs so we can cascade-delete their children
  const { data: chapters } = await supabase
    .from("module_chapters").select("id").eq("module_id", params.id);
  const chapterIds = (chapters ?? []).map((c: any) => c.id as string);

  if (chapterIds.length > 0) {
    // Fetch quiz IDs for those chapters
    const { data: quizzes } = await supabase
      .from("quizzes").select("id").in("module_chapter_id", chapterIds);
    const quizIds = (quizzes ?? []).map((q: any) => q.id as string);

    if (quizIds.length > 0) {
      await supabase.from("quiz_items").delete().in("quiz_id", quizIds);
      await supabase.from("quiz_attempts").delete().in("quiz_id", quizIds);
      await supabase.from("quizzes").delete().in("id", quizIds);
    }

    await supabase.from("video_watch_progress").delete().in("module_id", chapterIds);
    await supabase.from("learning_activity_log").delete().in("module_chapter_id", chapterIds);
    await supabase.from("content_ratings").delete().in("module_chapter_id", chapterIds);
    await supabase.from("module_chapters").delete().in("id", chapterIds);
  }

  await supabase.from("learning_progress").delete().eq("module_id", params.id);

  const { error } = await supabase.from("micro_modules").delete().eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAuditLog({
    adminUserId: admin.id,
    action: "course.deleted",
    entityType: "micro_modules",
    entityId: params.id,
    beforeData
  });
  return NextResponse.json({ data: { id: params.id } });
}
