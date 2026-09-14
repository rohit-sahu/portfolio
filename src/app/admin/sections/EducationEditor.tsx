"use client";

import { useState } from "react";
import type { EducationItem } from "@/data/resume";
import { saveEducation } from "../actions";
import { useSectionSave } from "../useSectionSave";
import { SectionCard, SaveBar, inputClass, labelClass, removeButtonClass, addButtonClass } from "../AdminUI";

export default function EducationEditor({ initialEducation }: { initialEducation: EducationItem[] }) {
  const [items, setItems] = useState(initialEducation);
  const { save, isPending, message } = useSectionSave(saveEducation);

  function update(i: number, patch: Partial<EducationItem>) {
    setItems(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  return (
    <SectionCard title="Education" description="Academic history shown in the Education section.">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((ed, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-white/10 p-3">
            <div className="flex items-center justify-between">
              <label className={labelClass}>Entry {i + 1}</label>
              <button
                type="button"
                onClick={() => setItems(items.filter((_, idx) => idx !== i))}
                className={removeButtonClass}
              >
                Remove
              </button>
            </div>
            <input value={ed.year} onChange={(e) => update(i, { year: e.target.value })} placeholder="Year" className={inputClass} />
            <input value={ed.degree} onChange={(e) => update(i, { degree: e.target.value })} placeholder="Degree" className={inputClass} />
            <input value={ed.school} onChange={(e) => update(i, { school: e.target.value })} placeholder="School" className={inputClass} />
            <input value={ed.marks} onChange={(e) => update(i, { marks: e.target.value })} placeholder="Marks" className={inputClass} />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setItems([...items, { year: "", degree: "", school: "", marks: "" }])}
        className={addButtonClass}
      >
        + Add entry
      </button>
      <SaveBar isPending={isPending} message={message} onSave={() => save(items)} />
    </SectionCard>
  );
}
