"use server";

import crypto from "node:crypto";
import { auth } from "@/auth";
import {
  buildRegistrationOptions,
  verifyRegistration,
  credentialIdFromRegistration,
  publicKeyFromRegistration,
} from "@/lib/webauthn";
import { storeChallenge, consumeChallenge } from "@/lib/webauthn-challenges";
import { addCredential, listCredentialsForEmail, removeCredential } from "@/lib/webauthn-store";
import type { RegistrationResponseJSON } from "@simplewebauthn/types";

// Derives a stable (but non-reversible, non-PII) WebAuthn userID from the
// admin's email — lets the same admin register multiple passkeys (phone,
// laptop, security key) that the browser/OS recognize as belonging to the
// same account, without storing the email itself as the WebAuthn user
// handle.
function userIdForEmail(email: string): string {
  return crypto.createHash("sha256").update(email.toLowerCase()).digest("hex");
}

async function requireAdminEmail(): Promise<string> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) throw new Error("Not authenticated");
  return email.toLowerCase();
}

export type PasskeySummary = {
  id: string;
  name: string;
  deviceType: "singleDevice" | "multiDevice";
  createdAt: string;
};

export async function listMyPasskeys(): Promise<PasskeySummary[]> {
  const email = await requireAdminEmail();
  const creds = await listCredentialsForEmail(email);
  return creds.map((c) => ({ id: c.id, name: c.name, deviceType: c.deviceType, createdAt: c.createdAt }));
}

export async function getPasskeyRegistrationOptions() {
  const email = await requireAdminEmail();
  const existingCredentials = await listCredentialsForEmail(email);
  const options = await buildRegistrationOptions({
    userId: userIdForEmail(email),
    email,
    existingCredentials,
  });
  const nonce = await storeChallenge({ challenge: options.challenge, purpose: "registration", email });
  return { options, nonce };
}

export type RegisterPasskeyState = { error?: string; success?: boolean } | undefined;

export async function completePasskeyRegistration(
  nonce: string,
  attestationJson: string,
  label: string
): Promise<RegisterPasskeyState> {
  const email = await requireAdminEmail();

  const challengeDoc = await consumeChallenge(nonce, "registration");
  // The challenge must have been minted for THIS admin — prevents a
  // still-valid nonce leaked/observed elsewhere from being redeemed under a
  // different signed-in session.
  if (!challengeDoc || challengeDoc.email !== email) {
    return { error: "This registration request expired or is invalid. Please try again." };
  }

  let attestation: RegistrationResponseJSON;
  try {
    attestation = JSON.parse(attestationJson);
  } catch {
    return { error: "Malformed passkey response." };
  }

  let verification;
  try {
    verification = await verifyRegistration(attestation, challengeDoc.challenge);
  } catch (err) {
    console.error("WebAuthn registration verification threw:", err);
    return { error: "Couldn't verify that passkey. Please try again." };
  }

  if (!verification.verified || !verification.registrationInfo) {
    return { error: "Couldn't verify that passkey. Please try again." };
  }

  const info = verification.registrationInfo;
  await addCredential({
    id: credentialIdFromRegistration(info),
    email,
    publicKey: publicKeyFromRegistration(info),
    counter: info.counter,
    transports: attestation.response.transports,
    deviceType: info.credentialDeviceType,
    backedUp: info.credentialBackedUp,
    name: label.trim() || "Passkey",
    createdAt: new Date().toISOString(),
  });

  return { success: true };
}

export async function deleteMyPasskey(credentialId: string): Promise<{ error?: string } | undefined> {
  const email = await requireAdminEmail();
  const removed = await removeCredential(email, credentialId);
  if (!removed) return { error: "Passkey not found." };
  return undefined;
}
