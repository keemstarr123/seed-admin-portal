"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Field } from "@/components/Field";
import { adminFetch } from "@/lib/admin-fetch";

type Chapter = {
  id?: string;
  creator_id?: string;
  name: string;
  description: string;
  summary: string;
  video_url: string;
  duration_minutes: number;
  sequence_number: number;
  creator_name: string;
  creator_location: string;
  creator_description: string;
  quiz_items: QuizItem[];
};

type QuizItem = {
  id?: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "A" | "B" | "C" | "D";
  explanation: string;
};

type CourseState = {
  name: string;
  description: string;
  thumbnail_url: string;
  is_mandatory: boolean;
  chapters: Chapter[];
};

const emptyCourse: CourseState = {
  name: "",
  description: "",
  thumbnail_url: "",
  is_mandatory: false,
  chapters: []
};

export default function CourseEditorPage() {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const courseId = params?.id;
  const isNew = !courseId;
  const [form, setForm] = useState<CourseState>(emptyCourse);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (isNew) return;
    adminFetch<any>(`/api/admin/learning/courses/${courseId}`)
      .then((payload) => {
        setForm({
          name: payload.course.name ?? "",
          description: payload.course.description ?? "",
          thumbnail_url: payload.course.thumbnail_url ?? "",
          is_mandatory: Boolean(payload.course.is_mandatory),
          chapters: (payload.chapters ?? []).map((chapter: any, index: number) => ({
            id: chapter.id,
            creator_id: chapter.creator_id ?? undefined,
            name: chapter.name ?? "",
            description: chapter.description ?? "",
            summary: chapter.summary ?? "",
            video_url: chapter.video_url ?? "",
            duration_minutes: chapter.duration_minutes ?? 0,
            sequence_number: chapter.sequence_number ?? index + 1,
            creator_name: chapter.creator?.name ?? "",
            creator_location: chapter.creator?.location ?? "",
            creator_description: chapter.creator?.description ?? "",
            quiz_items: (chapter.quiz_items ?? []).map((item: any) => ({
              id: item.id,
              question: item.question ?? "",
              option_a: item.option_a ?? "",
              option_b: item.option_b ?? "",
              option_c: item.option_c ?? "",
              option_d: item.option_d ?? "",
              correct_option: item.correct_option ?? "A",
              explanation: item.explanation ?? ""
            }))
          }))
        });
      })
      .catch((err) => setError(err.message));
  }, [courseId, isNew]);

  function patchChapter(index: number, patch: Partial<Chapter>) {
    setForm((current) => ({
      ...current,
      chapters: current.chapters.map((chapter, i) => (i === index ? { ...chapter, ...patch } : chapter))
    }));
  }

  function patchQuizItem(chapterIndex: number, quizIndex: number, patch: Partial<QuizItem>) {
    setForm((current) => ({
      ...current,
      chapters: current.chapters.map((chapter, i) =>
        i === chapterIndex
          ? {
              ...chapter,
              quiz_items: chapter.quiz_items.map((item, j) => (j === quizIndex ? { ...item, ...patch } : item))
            }
          : chapter
      )
    }));
  }

  function addQuizItem(chapterIndex: number) {
    setForm((current) => ({
      ...current,
      chapters: current.chapters.map((chapter, i) =>
        i === chapterIndex
          ? {
              ...chapter,
              quiz_items: [
                ...chapter.quiz_items,
                {
                  question: "",
                  option_a: "",
                  option_b: "",
                  option_c: "",
                  option_d: "",
                  correct_option: "A",
                  explanation: ""
                }
              ]
            }
          : chapter
      )
    }));
  }

  function removeQuizItem(chapterIndex: number, quizIndex: number) {
    setForm((current) => ({
      ...current,
      chapters: current.chapters.map((chapter, i) =>
        i === chapterIndex
          ? {
              ...chapter,
              quiz_items: chapter.quiz_items.filter((_, j) => j !== quizIndex)
            }
          : chapter
      )
    }));
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      if (isNew) {
        await adminFetch<any>("/api/admin/learning/courses", {
          method: "POST",
          body: JSON.stringify(form)
        });
      } else {
        await adminFetch(`/api/admin/learning/courses/${courseId}`, {
          method: "PUT",
          body: JSON.stringify(form)
        });
      }
      setToast("Course saved successfully");
      setTimeout(() => {
        router.push("/learning");
      }, 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!courseId || !window.confirm("Delete this course?")) return;
    await adminFetch(`/api/admin/learning/courses/${courseId}`, { method: "DELETE" });
    router.push("/learning");
  }

  return (
    <>
      <PageHeader title={isNew ? "Add Course" : "Edit Course"} subtitle="Keep content aligned with the mobile Learning Hub." />
      {error ? <p className="notice">{error}</p> : null}
      <section className="card card-pad grid">
        <div className="form-grid">
          <Field label="Course title">
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Thumbnail URL">
            <input className="input" value={form.thumbnail_url} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} />
          </Field>
        </div>
        <Field label="Description">
          <textarea className="textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 800 }}>
          <input type="checkbox" checked={form.is_mandatory} onChange={(e) => setForm({ ...form, is_mandatory: e.target.checked })} />
          Mandatory course
        </label>
      </section>

      <section className="card card-pad grid" style={{ marginTop: 18 }}>
        <div className="toolbar" style={{ padding: 0, borderBottom: 0 }}>
          <h2>Chapters</h2>
          <button
            className="button secondary"
            onClick={() =>
              setForm({
                ...form,
                chapters: [
                  ...form.chapters,
                  {
                    name: "",
                    description: "",
                    summary: "",
                    video_url: "",
                    duration_minutes: 0,
                    sequence_number: form.chapters.length + 1,
                    creator_name: "",
                    creator_location: "",
                    creator_description: "",
                    quiz_items: []
                  }
                ]
              })
            }
          >
            Add chapter
          </button>
        </div>
        {form.chapters.map((chapter, index) => (
          <div className="card card-pad" key={chapter.id ?? index}>
            <div className="form-grid">
              <Field label="Chapter title">
                <input className="input" value={chapter.name} onChange={(e) => patchChapter(index, { name: e.target.value })} />
              </Field>
              <Field label="Video URL">
                <input className="input" value={chapter.video_url} onChange={(e) => patchChapter(index, { video_url: e.target.value })} />
              </Field>
              <Field label="Duration minutes">
                <input className="input" type="number" value={chapter.duration_minutes} onChange={(e) => patchChapter(index, { duration_minutes: Number(e.target.value) })} />
              </Field>
              <Field label="Sequence">
                <input className="input" type="number" value={chapter.sequence_number} onChange={(e) => patchChapter(index, { sequence_number: Number(e.target.value) })} />
              </Field>
            </div>
            <div className="form-grid" style={{ marginTop: 16 }}>
              <Field label="Description">
                <textarea className="textarea" value={chapter.description} onChange={(e) => patchChapter(index, { description: e.target.value })} />
              </Field>
              <Field label="Summary">
                <textarea className="textarea" value={chapter.summary} onChange={(e) => patchChapter(index, { summary: e.target.value })} />
              </Field>
            </div>

            {/* Author / Creator */}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--seed-border)" }}>
              <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--seed-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>Author</p>
              <div className="form-grid">
                <Field label="Author name">
                  <input className="input" value={chapter.creator_name} onChange={(e) => patchChapter(index, { creator_name: e.target.value })} placeholder="e.g. Ahmad bin Ali" />
                </Field>
                <Field label="Location (nation)">
                  <input className="input" value={chapter.creator_location} onChange={(e) => patchChapter(index, { creator_location: e.target.value })} placeholder="e.g. Malaysia" />
                </Field>
              </div>
              <div style={{ marginTop: 12 }}>
                <Field label="Author description">
                  <textarea className="textarea" value={chapter.creator_description} onChange={(e) => patchChapter(index, { creator_description: e.target.value })} placeholder="Short bio or credentials…" />
                </Field>
              </div>
            </div>

            <div className="quiz-section-header">
              <div>
                <h3 style={{ margin: 0 }}>Quiz Questions</h3>
                <p className="page-subtitle">{chapter.quiz_items.length} question{chapter.quiz_items.length !== 1 ? "s" : ""} · triggers fire at the specified video time</p>
              </div>
              <button className="button secondary" onClick={() => addQuizItem(index)}>+ Add question</button>
            </div>
            <div className="grid" style={{ marginTop: 14 }}>
              {chapter.quiz_items.map((item, quizIndex) => (
                <div className="quiz-card" key={item.id ?? quizIndex}>
                  {/* Header row */}
                  <div className="quiz-card-header">
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="quiz-q-number">Q{quizIndex + 1}</span>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>Question {quizIndex + 1}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="quiz-trigger-badge">⏱ auto-spaced</span>
                      <button className="button ghost" style={{ minHeight: 32, padding: "4px 12px", fontSize: 12 }} onClick={() => removeQuizItem(index, quizIndex)}>Remove</button>
                    </div>
                  </div>

                  {/* Question + trigger time */}
                  <div className="form-grid" style={{ marginBottom: 16 }}>
                    <Field label="Question text">
                      <input className="input" value={item.question} onChange={(e) => patchQuizItem(index, quizIndex, { question: e.target.value })} placeholder="Enter the quiz question…" />
                    </Field>
                  </div>

                  {/* Options A–D */}
                  <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--seed-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>Answer options</p>
                  <div className="options-grid">
                    {(["A", "B", "C", "D"] as const).map((letter) => {
                      const key = `option_${letter.toLowerCase()}` as keyof QuizItem;
                      const isCorrect = item.correct_option === letter;
                      return (
                        <div key={letter} className={`option-row${isCorrect ? " option-correct" : ""}`}>
                          <span className={`option-letter${isCorrect ? " option-letter-correct" : ""}`}>{letter}</span>
                          <input
                            className="input"
                            style={{ flex: 1, background: "transparent", border: "none", padding: "0 4px", outline: "none" }}
                            value={item[key] as string}
                            onChange={(e) => patchQuizItem(index, quizIndex, { [key]: e.target.value } as Partial<QuizItem>)}
                            placeholder={`Option ${letter}`}
                          />
                          <button
                            type="button"
                            className={`correct-btn${isCorrect ? " correct-btn-active" : ""}`}
                            onClick={() => patchQuizItem(index, quizIndex, { correct_option: letter })}
                            title="Mark as correct answer"
                          >
                            {isCorrect ? "✓ Correct" : "Mark correct"}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  <div style={{ marginTop: 14 }}>
                    <Field label="Explanation (shown after correct answer)">
                      <input className="input" value={item.explanation} onChange={(e) => patchQuizItem(index, quizIndex, { explanation: e.target.value })} placeholder="Optional explanation…" />
                    </Field>
                  </div>
                </div>
              ))}
              {chapter.quiz_items.length === 0 ? (
                <div className="empty" style={{ border: "1.5px dashed var(--seed-border)", borderRadius: 14 }}>
                  No quiz questions yet — click <strong>+ Add question</strong> to create one.
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </section>

      <div className="filters" style={{ marginTop: 18 }}>
        <button className="button purple" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
        {!isNew ? <button className="button danger" onClick={remove}>Delete</button> : null}
        <button className="button ghost" onClick={() => router.push("/learning")}>Cancel</button>
      </div>

      {toast ? (
        <div className="save-toast">
          <span>✓</span> {toast}
        </div>
      ) : null}
    </>
  );
}
