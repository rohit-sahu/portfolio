"use client";

import { useState } from "react";
import type { Experience } from "@/data/resume";
import { saveExperiences } from "../actions";
import { useSectionSave } from "../useSectionSave";
import { SectionCard, SaveBar, inputClass, labelClass, removeButtonClass, addButtonClass } from "../AdminUI";

type EditableExperience = {
  company: string;
  location: string;
  title: string;
  period: string;
  pointsText: string;
};

function toEditable(experiences: Experience[]): EditableExperience[] {
  return experiences.map((e) => ({ ...e, pointsText: e.points.join("\n") }));
}

export default function ExperienceEditor({ initialExperiences }: { initialExperiences: Experience[] }) {
  const [items, setItems] = useState<EditableExperience[]>(() => toEditable(initialExperiences));
  const { save, isPending, message } = useSectionSave(saveExperiences);

  function update(i: number, patch: Partial<EditableExperience>) {
    setItems(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  function handleSave() {
    save(
      items.map((it) => ({
        company: it.company,
        location: it.location,
        title: it.title,
        period: it.period,
        points: it.pointsText.split("\n").map((p) => p.trim()).filter(Boolean),
      }))
    );
  }

  return (
    <SectionCard title="Experience" description="Work history shown in the Experience timeline.">
      <div className="space-y-5">
        {items.map((exp, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-white/10 p-3">
            <div className="flex items-center justify-between">
              <label className={labelClass}>Role {i + 1}</label>
              <button
                type="button"
                onClick={() => setItems(items.filter((_, idx) => idx !== i))}
                className={removeButtonClass}
              >
                Remove
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                value={exp.company}
                onChange={(e) => update(i, { company: e.target.value })}
                placeholder="Company"
                className={inputClass}
              />
              <input
                value={exp.title}
                onChange={(e) => update(i, { title: e.target.value })}
                placeholder="Title"
                className={inputClass}
              />
              <input
                value={exp.location}
                onChange={(e) => update(i, { location: e.target.value })}
                placeholder="Location"
                className={inputClass}
              />
              <input
                value={exp.period}
                onChange={(e) => update(i, { period: e.target.value })}
                placeholder="Period (e.g. Jan 2025 – Present)"
                className={inputClass}
              />
            </div>
            <textarea
              value={exp.pointsText}
              onChange={(e) => update(i, { pointsText: e.target.value })}
              placeholder="One bullet point per line"
              rows={4}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-[rgb(var(--accent-rgb))]"
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() =>
          setItems([...items, { company: "", location: "", title: "", period: "", pointsText: "" }])
        }
        className={addButtonClass}
      >
        + Add role
      </button>
      <SaveBar isPending={isPending} message={message} onSave={handleSave} />
    </SectionCard>
  );
}
