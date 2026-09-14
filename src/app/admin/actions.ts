"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { updateResumeData } from "@/lib/resume-data";
import type { Profile, Stat, SkillGroup, Experience, EducationItem } from "@/data/resume";
import {
  profileSchema,
  summarySchema,
  statsSchema,
  skillGroupsSchema,
  experiencesSchema,
  educationSchema,
} from "@/lib/resume-schema";

export type ActionResult = { success: true } | { success: false; error: string };

// Server Actions are reachable as their own POST endpoint regardless of
// whether the invoking page is rendered, so every action re-checks auth
// itself rather than relying on middleware alone.
async function requireAdmin() {
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized");
  }
}

function afterSave(): ActionResult {
  revalidatePath("/");
  revalidatePath("/admin");
  return { success: true };
}

export async function saveProfile(profile: Profile): Promise<ActionResult> {
  await requireAdmin();
  const parsed = profileSchema.safeParse(profile);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid profile" };

  await updateResumeData({ profile: parsed.data });
  return afterSave();
}

export async function saveSummary(summary: string[]): Promise<ActionResult> {
  await requireAdmin();
  const parsed = summarySchema.safeParse(summary);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid summary" };

  await updateResumeData({ summary: parsed.data });
  return afterSave();
}

export async function saveStats(stats: Stat[]): Promise<ActionResult> {
  await requireAdmin();
  const parsed = statsSchema.safeParse(stats);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid stats" };

  await updateResumeData({ stats: parsed.data });
  return afterSave();
}

export async function saveSkillGroups(skillGroups: SkillGroup[]): Promise<ActionResult> {
  await requireAdmin();
  const parsed = skillGroupsSchema.safeParse(skillGroups);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid skills" };

  await updateResumeData({ skillGroups: parsed.data });
  return afterSave();
}

export async function saveExperiences(experiences: Experience[]): Promise<ActionResult> {
  await requireAdmin();
  const parsed = experiencesSchema.safeParse(experiences);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid experience" };

  await updateResumeData({ experiences: parsed.data });
  return afterSave();
}

export async function saveEducation(education: EducationItem[]): Promise<ActionResult> {
  await requireAdmin();
  const parsed = educationSchema.safeParse(education);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid education" };

  await updateResumeData({ education: parsed.data });
  return afterSave();
}
