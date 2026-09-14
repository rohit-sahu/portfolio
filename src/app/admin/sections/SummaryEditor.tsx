"use client";

import { useState } from "react";
import { saveSummary } from "../actions";
import { useSectionSave } from "../useSectionSave";
import { SectionCard, SaveBar, removeButtonClass, addButtonClass } from "../AdminUI";

export default function SummaryEditor({ initialSummary }: { initialSummary: string[] }) {
  const [paragraphs, setParagraphs] = useState(initialSummary);
  const { save, isPending, message } = useSectionSave(saveSummary);

  return (
    <SectionCard title="Summary" description="Paragraphs shown in the About section.">
      <div className="space-y-3">
        {paragraphs.map((text, i) => (
          <div key={i} className="flex items-start gap-2">
            <textarea
              value={text}
              onChange={(e) =>
                setParagraphs(paragraphs.map((p, idx) => (idx === i ? e.target.value : p)))
              }
              rows={3}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-[rgb(var(--accent-rgb))]"
            />
            <button
              type="button"
              onClick={() => setParagraphs(paragraphs.filter((_, idx) => idx !== i))}
              className={removeButtonClass}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => setParagraphs([...paragraphs, ""])} className={addButtonClass}>
        + Add paragraph
      </button>
      <SaveBar isPending={isPending} message={message} onSave={() => save(paragraphs)} />
    </SectionCard>
  );
}
