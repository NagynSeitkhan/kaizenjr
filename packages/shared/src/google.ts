import { google } from "googleapis";
import { prisma } from "@course-dashboard/db";
import { decrypt, encrypt } from "./crypto";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
];

function baseOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function getAuthUrl(): string {
  const client = baseOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES,
  });
}

export async function storeTokensFromCode(code: string): Promise<void> {
  const client = baseOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error(
      "No refresh token returned by Google. Revoke prior access at https://myaccount.google.com/permissions and try connecting again."
    );
  }
  await prisma.integrationCredential.upsert({
    where: { provider: "google" },
    create: {
      provider: "google",
      refreshTokenEnc: encrypt(tokens.refresh_token),
      accessTokenEnc: tokens.access_token ? encrypt(tokens.access_token) : null,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      lastSuccessAt: new Date(),
    },
    update: {
      refreshTokenEnc: encrypt(tokens.refresh_token),
      accessTokenEnc: tokens.access_token ? encrypt(tokens.access_token) : null,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      lastSuccessAt: new Date(),
      lastErrorAt: null,
      lastErrorMsg: null,
    },
  });
}

export async function getAuthorizedGoogleClient() {
  const cred = await prisma.integrationCredential.findUnique({ where: { provider: "google" } });
  if (!cred?.refreshTokenEnc) {
    throw new Error("Google is not connected yet. Visit /api/auth/google to connect.");
  }
  const client = baseOAuthClient();
  client.setCredentials({ refresh_token: decrypt(cred.refreshTokenEnc) });
  return client;
}

export async function markGoogleSyncResult(error?: string): Promise<void> {
  await prisma.integrationCredential.update({
    where: { provider: "google" },
    data: error
      ? { lastErrorAt: new Date(), lastErrorMsg: error }
      : { lastSuccessAt: new Date(), lastErrorAt: null, lastErrorMsg: null },
  });
}
