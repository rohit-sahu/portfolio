"use client";

import { useState } from "react";
import type { Stat } from "@/data/resume";
import { saveStats } from "../actions";
import { useSectionSave } from "../useSectionSave";
import { SectionCard, SaveBar, inputClass, labelClass, removeButtonClass, addButtonClass } from "../AdminUI";

export default function StatsEditor({ initialStats }: { initialStats: Stat[] }) {
  const [stats, setStats] = useState(initialStats);
  const { save, isPending, message } = useSectionSave(saveStats);

  function update(i: number, patch: Partial<Stat>) {
    setStats(stats.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  return (
    <SectionCard title="Stats" description="Highlight numbers shown in the hero section.">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {stats.map((stat, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-white/10 p-3">
            <div className="flex items-center justify-between">
              <label className={labelClass}>Stat {i + 1}</label>
              <button type="button" onClick={() => setStats(stats.filter((_, idx) => idx !== i))} className={removeButtonClass}>
                Remove
              </button>
            </div>
            <input
              value={stat.value}
              onChange={(e) => update(i, { value: e.target.value })}
              placeholder="Value (e.g. 9+)"
              className={inputClass}
            />
            <input
              value={stat.label}
              onChange={(e) => update(i, { label: e.target.value })}
              placeholder="Label (e.g. Years of Experience)"
              className={inputClass}
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setStats([...stats, { label: "", value: "" }])}
        className={addButtonClass}
      >
        + Add stat
      </button>
      <SaveBar isPending={isPending} message={message} onSave={() => save(stats)} />
    </SectionCard>
  );
}
