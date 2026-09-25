import "server-only";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import type {
  AuthenticatorDevice,
  AuthenticatorTransportFuture,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/types";

// Thin wrapper around @simplewebauthn/server tying it to this app's RP
// (Relying Party) identity, derived from NEXT_PUBLIC_SITE_URL so it stays in
// sync with the deployed domain without a second place to configure it.
// Override with WEBAUTHN_RP_ID / WEBAUTHN_ORIGIN / WEBAUTHN_RP_NAME only if
// you're running behind a setup where those can't be derived automatically
// (e.g. a non-standard port reverse proxy).

function siteUrl(): URL {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  try {
    return new URL(raw);
  } catch {
    return new URL("http://localhost:3000");
  }
}

// RP ID must be the bare domain (no scheme/port) and must equal or be a
// registrable parent of the domain the browser sees in its address bar —
// this is what ties a passkey to "this website" and what makes it available
// again (including via cross-device/hybrid) on any domain-matching origin.
export function getRpId(): string {
  return process.env.WEBAUTHN_RP_ID || siteUrl().hostname;
}

// Origin must match the browser's origin EXACTLY (scheme + host + port).
export function getExpectedOrigin(): string {
  return process.env.WEBAUTHN_ORIGIN || siteUrl().origin;
}

export function getRpName(): string {
  return process.env.WEBAUTHN_RP_NAME || process.env.ADMIN_TOTP_ISSUER || "Portfolio Admin";
}

export type StoredCredential = {
  id: string; // base64url credential ID — also this record's Mongo _id
  email: string;
  publicKey: string; // base64url-encoded COSE public key
  counter: number;
  transports?: AuthenticatorTransportFuture[];
  deviceType: "singleDevice" | "multiDevice";
  backedUp: boolean;
  name: string;
  createdAt: string;
};

// excludeCredentials/allowCredentials take the credential ID as raw bytes
// (BufferSource), not the base64url string form stored in Mongo/sent to the
// browser — convert at the boundary each time rather than storing two forms.
function toDescriptor(cred: Pick<StoredCredential, "id" | "transports">) {
  return {
    id: isoBase64URL.toBuffer(cred.id),
    type: "public-key" as const,
    transports: cred.transports,
  };
}

export async function buildRegistrationOptions(params: {
  userId: string;
  email: string;
  existingCredentials: StoredCredential[];
}): Promise<PublicKeyCredentialCreationOptionsJSON> {
  return generateRegistrationOptions({
    rpName: getRpName(),
    rpID: getRpId(),
    userID: params.userId,
    userName: params.email,
    userDisplayName: params.email,
    attestationType: "none",
    excludeCredentials: params.existingCredentials.map(toDescriptor),
    // residentKey "required" => a discoverable/"resident" credential, which
    // is what enables usernameless sign-in and the QR-code/hybrid
    // cross-device flow from the login page (no email needed up front).
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "preferred",
    },
  });
}

export async function verifyRegistration(
  response: RegistrationResponseJSON,
  expectedChallenge: string
): Promise<VerifiedRegistrationResponse> {
  return verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: getExpectedOrigin(),
    expectedRPID: getRpId(),
  });
}

// No allowCredentials => the browser prompts the user to pick from any
// discoverable passkey for this site, on this device OR (via the OS's
// native QR-code/Bluetooth hybrid transport) a nearby phone. This single
// call is what powers both "unlock with Face ID/Touch ID/Windows Hello" and
// "scan this QR code with your phone" — there's no separate API for each.
export async function buildAuthenticationOptions(): Promise<PublicKeyCredentialRequestOptionsJSON> {
  return generateAuthenticationOptions({
    rpID: getRpId(),
    userVerification: "preferred",
  });
}

export async function verifyAuthentication(
  response: AuthenticationResponseJSON,
  expectedChallenge: string,
  credential: StoredCredential
): Promise<VerifiedAuthenticationResponse> {
  const authenticator: AuthenticatorDevice = {
    credentialID: isoBase64URL.toBuffer(credential.id),
    credentialPublicKey: isoBase64URL.toBuffer(credential.publicKey),
    counter: credential.counter,
    transports: credential.transports,
  };
  return verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: getExpectedOrigin(),
    expectedRPID: getRpId(),
    authenticator,
  });
}

export function credentialIdFromRegistration(info: NonNullable<VerifiedRegistrationResponse["registrationInfo"]>): string {
  return isoBase64URL.fromBuffer(info.credentialID);
}

export function publicKeyFromRegistration(info: NonNullable<VerifiedRegistrationResponse["registrationInfo"]>): string {
  return isoBase64URL.fromBuffer(info.credentialPublicKey);
}
