const AUTH_SESSION_KEY = "pft.auth.session";

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: string;
  user: SessionUser;
}

interface ApiErrorPayload {
  message?: string;
  details?: Record<string, string>;
}

export class ApiClientError extends Error {
  status: number;
  details?: Record<string, string>;

  constructor(message: string, status: number, details?: Record<string, string>) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.details = details;
  }
}

let authSession: AuthSession | null = loadStoredSession();
let refreshPromise: Promise<AuthSession | null> | null = null;

function loadStoredSession(): AuthSession | null {
  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_KEY);

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

function persistSession(session: AuthSession | null) {
  try {
    if (!session) {
      window.localStorage.removeItem(AUTH_SESSION_KEY);
      return;
    }

    window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  } catch {
    // Ignore localStorage persistence errors.
  }
}

function getBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL ?? "";
  return configured.endsWith("/") ? configured.slice(0, -1) : configured;
}

function buildUrl(path: string) {
  return `${getBaseUrl()}${path}`;
}

function buildHeaders(initHeaders: HeadersInit | undefined, hasBody: boolean) {
  const headers = new Headers(initHeaders);

  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
}

async function parseErrorPayload(response: Response): Promise<ApiErrorPayload> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as ApiErrorPayload;
  }

  const text = await response.text();
  return text ? { message: text } : {};
}

async function refreshSession(): Promise<AuthSession | null> {
  if (!authSession?.refreshToken) {
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch(buildUrl("/api/auth/refresh"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refreshToken: authSession?.refreshToken,
        }),
      });

      if (!response.ok) {
        clearAuthSession();
        return null;
      }

      const next = (await response.json()) as AuthSession;
      setAuthSession(next);
      return next;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export interface ApiRequestOptions {
  auth?: boolean;
  responseType?: "json" | "blob" | "text";
  retryOnUnauthorized?: boolean;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    auth = true,
    responseType = "json",
    retryOnUnauthorized = true,
  } = options;

  const hasBody = init.body !== undefined && init.body !== null;
  const headers = buildHeaders(init.headers, hasBody);

  if (auth && authSession?.accessToken) {
    headers.set("Authorization", `Bearer ${authSession.accessToken}`);
  }

  const response = await fetch(buildUrl(path), {
    ...init,
    headers,
  });

  if (
    response.status === 401 &&
    auth &&
    retryOnUnauthorized &&
    !path.startsWith("/api/auth/")
  ) {
    const nextSession = await refreshSession();

    if (nextSession) {
      return apiRequest<T>(path, init, {
        ...options,
        retryOnUnauthorized: false,
      });
    }
  }

  if (!response.ok) {
    const payload = await parseErrorPayload(response);
    throw new ApiClientError(
      payload.message ?? `Request failed with status ${response.status}`,
      response.status,
      payload.details,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (responseType === "blob") {
    return (await response.blob()) as T;
  }

  if (responseType === "text") {
    return (await response.text()) as T;
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const text = await response.text();
    return (text as unknown) as T;
  }

  return (await response.json()) as T;
}

export function getAuthSession() {
  return authSession;
}

export function setAuthSession(session: AuthSession | null) {
  authSession = session;
  persistSession(session);
}

export function clearAuthSession() {
  authSession = null;
  persistSession(null);
}

export function toErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}
