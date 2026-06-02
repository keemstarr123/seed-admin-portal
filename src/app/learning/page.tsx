"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { adminFetch } from "@/lib/admin-fetch";

type Course = {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  is_mandatory: boolean | null;
  module_chapters?: { id: string }[];
};

export default function LearningPage() {
  const [rows, setRows] = useState<Course[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    adminFetch<Course[]>("/api/admin/learning/courses").then(setRows).catch((err) => setError(err.message));
  }, []);

  return (
    <>
      <PageHeader
        title="Learning Materials"
        subtitle="Manage courses, chapters and quiz content used by the mobile Learning Hub."
        action={<Link className="button purple" href="/learning/new"><Plus size={18} /> Add course</Link>}
      />
      {error ? <p className="notice">{error}</p> : null}
      <section className="card table-wrap fit-table">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Course</th>
                <th className="col-small">Chapters</th>
                <th className="col-small">Mandatory</th>
                <th className="col-small">Status</th>
                <th className="col-action" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.name}</strong>
                  </td>
                  <td>{row.module_chapters?.length ?? 0}</td>
                  <td>{row.is_mandatory ? "Yes" : "No"}</td>
                  <td><span className="badge published">visible in app</span></td>
                  <td><Link className="button secondary" href={`/learning/${row.id}`}>Edit</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <div className="empty">No courses found.</div> : null}
        </div>
      </section>
    </>
  );
}
