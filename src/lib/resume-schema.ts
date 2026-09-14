import { z } from "zod";

export const profileSchema = z.object({
  name: z.string().trim().min(1).max(120),
  role: z.string().trim().min(1).max(160),
  tagline: z.string().trim().min(1).max(300),
  location: z.string().trim().min(1).max(160),
  phone: z.string().trim().min(1).max(40),
  email: z.string().trim().email().max(160),
  github: z.string().trim().url().max(300),
  linkedin: z.string().trim().url().max(300),
  resumeUrl: z.string().trim().min(1).max(300),
  photoUrl: z.string().trim().min(1).max(300),
});

export const statSchema = z.object({
  label: z.string().trim().min(1).max(80),
  value: z.string().trim().min(1).max(40),
});

export const skillGroupSchema = z.object({
  category: z.string().trim().min(1).max(80),
  icon: z.string().trim().min(1).max(40),
  skills: z.array(z.string().trim().min(1).max(80)).max(60),
});

export const experienceSchema = z.object({
  company: z.string().trim().min(1).max(160),
  location: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(160),
  period: z.string().trim().min(1).max(80),
  points: z.array(z.string().trim().min(1).max(600)).max(30),
});

export const educationItemSchema = z.object({
  year: z.string().trim().min(1).max(20),
  degree: z.string().trim().min(1).max(160),
  school: z.string().trim().min(1).max(200),
  marks: z.string().trim().min(1).max(40),
});

export const summarySchema = z.array(z.string().trim().min(1).max(600)).max(20);
export const statsSchema = z.array(statSchema).max(20);
export const skillGroupsSchema = z.array(skillGroupSchema).max(40);
export const experiencesSchema = z.array(experienceSchema).max(40);
export const educationSchema = z.array(educationItemSchema).max(20);
