import { createServerSupabaseClient } from "../src/lib/supabase/server";

const EXPECTED_TEST_ORG_PREFIX = "Costivra authenticated E2E ";
const TEST_USER_PATTERNS = [
  /^costivra-auth-e2e-.*@example\.invalid$/i,
  /^pilot-[0-9a-f]{8}@costivra\.ai$/i,
];
const EXPLAINED_500_MARKERS = [
  "member_workspace_tutorials",
  "synthetic-org-cleanup",
];

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function isSyntheticOrganization(name: string): boolean {
  return name.startsWith(EXPECTED_TEST_ORG_PREFIX) || /^Test Pilot Org [0-9a-f]{8}$/.test(name);
}

function is500Event(value: unknown): boolean {
  const text = JSON.stringify(value);
  return /(?:statusCode|status|responseStatus|httpStatus)["']?\s*[:=]\s*["']?500\b/i.test(text);
}

function isExplained500(value: unknown): boolean {
  const text = JSON.stringify(value).toLowerCase();
  return EXPLAINED_500_MARKERS.some((marker) => text.includes(marker));
}

async function getVercelEvents(deploymentId: string, teamId: string, since: string): Promise<unknown[]> {
  const url = new URL(`https://api.vercel.com/v3/deployments/${deploymentId}/events`);
  url.searchParams.set("teamId", teamId);
  url.searchParams.set("limit", "100");
  url.searchParams.set("since", String(Date.parse(since)));

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${required("VERCEL_TOKEN")}` },
  });
  if (!response.ok) throw new Error(`Vercel events request failed: HTTP ${response.status}`);

  const body = await response.text();
  return body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as unknown];
      } catch {
        return [];
      }
    });
}

async function main() {
  const since = required("HYGIENE_RUN_STARTED_AT");
  const deploymentId = required("DEPLOYMENT_ID");
  const teamId = required("VERCEL_TEAM_ID");
  const db = createServerSupabaseClient();

  const [{ data: organizations, error: organizationsError }, { data: effects, error: effectsError }] = await Promise.all([
    db.from("organizations").select("id,name,created_at"),
    db.from("external_side_effects").select("id,organization_id,status,last_error,created_at"),
  ]);
  if (organizationsError) throw organizationsError;
  if (effectsError) throw effectsError;

  const syntheticOrganizations = (organizations ?? []).filter((row) => isSyntheticOrganization(row.name));
  const currentRunOrganizations = syntheticOrganizations.filter((row) => row.created_at >= since);
  const blockedDeliveryRows = (effects ?? []).filter((row) => row.last_error === "TEST_DOMAIN_LIVE_DELIVERY_BLOCKED");
  const currentRunEffects = (effects ?? []).filter((row) => row.created_at >= since);

  const users: string[] = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...(data.users ?? []).map((user) => user.email ?? ""));
    if (!data.users || data.users.length < 1000) break;
  }
  const syntheticUsers = users.filter((email) => TEST_USER_PATTERNS.some((pattern) => pattern.test(email)));

  const { data: activeAlerts, error: alertsError } = await db
    .from("operational_alerts")
    .select("id")
    .eq("status", "active");
  if (alertsError) throw alertsError;

  const events = await getVercelEvents(deploymentId, teamId, since);
  const serverErrors = events.filter(is500Event);
  const unexplained500s = serverErrors.filter((event) => !isExplained500(event));

  const result = {
    syntheticOrganizations: syntheticOrganizations.length,
    syntheticUsers: syntheticUsers.length,
    blockedDeliveryRows: blockedDeliveryRows.length,
    activeAlerts: activeAlerts?.length ?? 0,
    currentRunLeftovers: currentRunOrganizations.length + currentRunEffects.length,
    recent500s: serverErrors.length,
    unexplained500s: unexplained500s.length,
  };
  console.log(JSON.stringify(result));

  if (
    result.syntheticOrganizations !== 0 ||
    result.syntheticUsers !== 0 ||
    result.blockedDeliveryRows !== 0 ||
    result.activeAlerts !== 0 ||
    result.currentRunLeftovers !== 0 ||
    result.unexplained500s !== 0
  ) {
    throw new Error(`Production hygiene failed: ${JSON.stringify(result)}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
