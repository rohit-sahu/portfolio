"use client";

import { useState } from "react";
import type { SkillGroup } from "@/data/resume";
import { saveSkillGroups } from "../actions";
import { useSectionSave } from "../useSectionSave";
import { SectionCard, SaveBar, inputClass, labelClass, removeButtonClass, addButtonClass } from "../AdminUI";

const ICON_KEYS = [
  "code",
  "server",
  "database",
  "stream",
  "search",
  "network",
  "layout",
  "storage",
  "cloud",
  "shield",
  "tool",
];

type EditableGroup = { category: string; icon: string; skillsText: string };

function toEditable(groups: SkillGroup[]): EditableGroup[] {
  return groups.map((g) => ({ category: g.category, icon: g.icon, skillsText: g.skills.join(", ") }));
}

export default function SkillGroupsEditor({ initialSkillGroups }: { initialSkillGroups: SkillGroup[] }) {
  const [groups, setGroups] = useState<EditableGroup[]>(() => toEditable(initialSkillGroups));
  const { save, isPending, message } = useSectionSave(saveSkillGroups);

  function update(i: number, patch: Partial<EditableGroup>) {
    setGroups(groups.map((g, idx) => (idx === i ? { ...g, ...patch } : g)));
  }

  function handleSave() {
    save(
      groups.map((g) => ({
        category: g.category,
        icon: g.icon,
        skills: g.skillsText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      }))
    );
  }

  return (
    <SectionCard title="Skills" description="Grouped skill categories shown in the Skills section.">
      <div className="space-y-4">
        {groups.map((group, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-white/10 p-3">
            <div className="flex items-center justify-between">
              <label className={labelClass}>Group {i + 1}</label>
              <button
                type="button"
                onClick={() => setGroups(groups.filter((_, idx) => idx !== i))}
                className={removeButtonClass}
              >
                Remove
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
              <input
                value={group.category}
                onChange={(e) => update(i, { category: e.target.value })}
                placeholder="Category name"
                className={inputClass}
              />
              <select
                value={group.icon}
                onChange={(e) => update(i, { icon: e.target.value })}
                className={inputClass}
              >
                {ICON_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
            </div>
            <input
              value={group.skillsText}
              onChange={(e) => update(i, { skillsText: e.target.value })}
              placeholder="Skills, comma separated"
              className={inputClass}
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setGroups([...groups, { category: "", icon: "code", skillsText: "" }])}
        className={addButtonClass}
      >
        + Add group
      </button>
      <SaveBar isPending={isPending} message={message} onSave={handleSave} />
    </SectionCard>
  );
}
