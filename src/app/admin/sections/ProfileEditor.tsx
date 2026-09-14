"use client";

import { useState } from "react";
import type { Profile } from "@/data/resume";
import { saveProfile } from "../actions";
import { useSectionSave } from "../useSectionSave";
import { SectionCard, SaveBar, inputClass, labelClass } from "../AdminUI";

const fields: { key: keyof Profile; label: string; type?: string }[] = [
  { key: "name", label: "Name" },
  { key: "role", label: "Role" },
  { key: "tagline", label: "Tagline" },
  { key: "location", label: "Location" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email", type: "email" },
  { key: "github", label: "GitHub URL", type: "url" },
  { key: "linkedin", label: "LinkedIn URL", type: "url" },
  { key: "resumeUrl", label: "Resume file URL (e.g. /Resume.pdf, or a Google Drive direct-download link)" },
  { key: "photoUrl", label: "Profile photo URL (e.g. /profile.jpg, or https://lh3.googleusercontent.com/d/FILE_ID=w1000 for Google Drive)" },
];

export default function ProfileEditor({ initialProfile }: { initialProfile: Profile }) {
  const [profile, setProfile] = useState(initialProfile);
  const { save, isPending, message } = useSectionSave(saveProfile);

  return (
    <SectionCard title="Profile" description="Core identity shown in the hero, contact, and footer sections.">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map(({ key, label, type }) => (
          <div key={key} className={key === "tagline" ? "sm:col-span-2" : undefined}>
            <label className={labelClass} htmlFor={key}>
              {label}
            </label>
            <input
              id={key}
              type={type ?? "text"}
              value={profile[key]}
              onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
              className={`${inputClass} mt-1`}
            />
          </div>
        ))}
      </div>
      <SaveBar isPending={isPending} message={message} onSave={() => save(profile)} />
    </SectionCard>
  );
}
