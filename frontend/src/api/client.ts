/**
 * Typed fetch wrapper for VisibilityOS `/api/v1`.
 * Same-origin in production (CloudFront /api/*); Vite proxies in local dev.
 */

const API_BASE = import.meta.env.VITE_API_BASE || "/api/v1";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export type Membership = {
  workspace_id: string;
  role: string;
  status: string;
  workspace_name: string;
  brand_name: string;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  avatar_url?: string | null;
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
  memberships: Membership[];
};

let accessToken: string | null =
  typeof sessionStorage !== "undefined"
    ? sessionStorage.getItem("vos_access_token")
    : null;

let activeWorkspaceId: string | null =
  typeof sessionStorage !== "undefined"
    ? sessionStorage.getItem("vos_workspace_id")
    : null;

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) sessionStorage.setItem("vos_access_token", token);
  else sessionStorage.removeItem("vos_access_token");
}

export function getAccessToken() {
  return accessToken;
}

export function setActiveWorkspaceId(id: string | null) {
  activeWorkspaceId = id;
  if (id) sessionStorage.setItem("vos_workspace_id", id);
  else sessionStorage.removeItem("vos_workspace_id");
}

export function getActiveWorkspaceId() {
  return activeWorkspaceId;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (activeWorkspaceId) headers.set("X-Workspace-Id", activeWorkspaceId);

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* ignore */
    }
    const detail =
      typeof body === "object" &&
      body &&
      "detail" in body &&
      typeof (body as { detail: unknown }).detail === "string"
        ? (body as { detail: string }).detail
        : res.statusText;
    throw new ApiError(res.status, detail, body);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function login(email: string, password: string) {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function register(payload: {
  email: string;
  password: string;
  name: string;
  organization_name: string;
  brand_name: string;
}) {
  return apiFetch<LoginResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchMe() {
  return apiFetch<{ user: AuthUser; memberships: Membership[] }>("/auth/me");
}

export async function logout() {
  try {
    await apiFetch<{ ok: boolean }>("/auth/logout", { method: "POST" });
  } finally {
    setAccessToken(null);
    setActiveWorkspaceId(null);
  }
}

export type WorkspaceCreatePayload = {
  name: string;
  brand_name: string;
  brand_domains?: string[];
  monitoring_frequency?: string;
  timezone?: string;
  competitors?: string[];
  categories?: string[];
  regions?: string[];
};

export type WorkspaceOut = {
  id: string;
  name: string;
  brand_name: string;
  brand_domains: string[];
  monitoring_frequency: string;
  timezone: string;
  onboarding_completed_at: string | null;
};

export async function createWorkspace(payload: WorkspaceCreatePayload) {
  const workspace = await apiFetch<WorkspaceOut>("/workspaces", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setActiveWorkspaceId(workspace.id);
  return workspace;
}

export type PromptOut = {
  id: string;
  workspace_id: string;
  text: string;
  category_id: string | null;
  status: string;
  samples_per_run: number;
  archived_at: string | null;
};

export type PromptCreatePayload = {
  text: string;
  category_id?: string | null;
  status?: string;
  samples_per_run?: number;
};

export type RunPromptPayload = {
  model_ids?: string[] | null;
};

export type AnswerSummaryOut = {
  id: string;
  prompt_id: string;
  model_id: string;
  status: string;
  brand_position: number | null;
  outcome: string;
  sentiment_label: string;
  parser_version: number;
  created_at: string;
};

export type AnswerListOut = AnswerSummaryOut & {
  prompt_text: string | null;
  raw_text: string | null;
};

export type MetricOut = {
  metric_key: string;
  value: number;
  sample_size: number;
  model_id: string | null;
  category_id: string | null;
  competitor_id: string | null;
};

export type DashboardOverviewOut = {
  workspace_id: string;
  metrics: MetricOut[];
};

export type MonitoringOverviewOut = {
  workspace_id: string;
  active_prompts: number;
  total_answers: number;
  latest_answer_at: string | null;
  sync_scans: boolean;
};

export async function listPrompts() {
  return apiFetch<PromptOut[]>("/prompts");
}

export async function createPrompt(payload: PromptCreatePayload) {
  return apiFetch<PromptOut>("/prompts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function runPrompt(promptId: string, payload?: RunPromptPayload) {
  return apiFetch<AnswerSummaryOut[]>(`/prompts/${promptId}/run`, {
    method: "POST",
    body: payload ? JSON.stringify(payload) : undefined,
  });
}

export async function fetchDashboardOverview() {
  return apiFetch<DashboardOverviewOut>("/dashboard/overview");
}

export async function fetchAnswers() {
  return apiFetch<AnswerListOut[]>("/answers");
}

export async function runMonitoringScan(payload?: {
  workspace_id?: string | null;
  prompt_id?: string | null;
  model_ids?: string[] | null;
}) {
  return apiFetch<AnswerSummaryOut[]>("/monitoring/scans", {
    method: "POST",
    body: payload ? JSON.stringify(payload) : undefined,
  });
}

export async function fetchMonitoringOverview() {
  return apiFetch<MonitoringOverviewOut>("/monitoring/overview");
}

export async function fetchModels() {
  return apiFetch<
    Array<{
      id: string;
      name: string;
      long_name: string;
      badge: string;
      measurement_method: string;
      enabled: boolean;
    }>
  >("/reference/models");
}

/** True when the API process is reachable (used to toggle live vs demo mode). */
export async function probeApi(): Promise<boolean> {
  try {
    const res = await fetch("/healthz", { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}
