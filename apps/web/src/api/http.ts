import { AuthRoutes } from "@config/routes";
import { createSSEParser } from "./sse";

const AUTH_TOKEN_KEY = "authToken";

const API_URL = import.meta.env.VITE_API_URL;

// Token is stored in localStorage and attached as a Bearer header.
export const getStoredToken = (): string | null => {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setStoredToken = (token: string) => {
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
};

export const clearStoredToken = () => {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    /* ignore */
  }
};

/** Absolute URL of a file the backend serves (e.g. an avatar under /uploads). */
export function uploadUrl(path?: string): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  // Uploads are served from the backend origin, outside the /api prefix.
  return `${API_URL.replace(/\/api\/?$/, "")}${path}`;
}

/**
 * The error a failed response rejects with: `Error.message` is the backend's
 * code (`{ "error": "<code>" }`), or a client code. The UI maps codes to
 * Romanian copy with errorMessage() from @utils/errors.
 *
 * A 401 on an authenticated request means the session is over: the token is
 * cleared and the browser goes to the login page (AUTH-11). A 401 from a
 * public endpoint (a wrong password) is that endpoint's answer, with its own
 * code, and signs nobody out.
 */
async function failure(response: Response, withAuth: boolean): Promise<Error> {
  if (response.status === 401 && withAuth) {
    clearStoredToken();
    if (
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith(AuthRoutes.Login)
    ) {
      window.location.assign(AuthRoutes.Login);
    }
    return new Error("unauthorized");
  }
  const body = await response.json().catch(() => ({}));
  return new Error(
    body.error ||
      body.message ||
      (response.status === 401 ? "unauthorized" : "request_failed"),
  );
}

export const HTTP = {
  async request<T>(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    url: string,
    options: {
      data?: unknown;
      withAuth?: boolean;
      headers?: Record<string, string>;
    } = {},
  ): Promise<T> {
    const { data, withAuth = true, headers = {} } = options;

    const requestHeaders = new Headers({
      ...headers,
    });

    if (!(data instanceof FormData)) {
      requestHeaders.set("Content-Type", "application/json");
    }

    if (withAuth) {
      const token = getStoredToken();
      if (token) {
        requestHeaders.set("Authorization", `Bearer ${token}`);
      }
    }

    const body =
      data instanceof FormData ? data : data ? JSON.stringify(data) : undefined;

    const response = await fetch(`${API_URL}${url}`, {
      method,
      headers: requestHeaders,
      body,
    });

    if (!response.ok) throw await failure(response, withAuth);

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  },

  post<T>(url: string, data?: unknown, withAuth: boolean = true) {
    return this.request<T>("POST", url, { data, withAuth });
  },

  get<T>(url: string, withAuth: boolean = true) {
    return this.request<T>("GET", url, { withAuth });
  },

  patch<T>(url: string, data?: unknown, withAuth: boolean = true) {
    return this.request<T>("PATCH", url, { data, withAuth });
  },

  delete(url: string, withAuth: boolean = true) {
    return this.request<void>("DELETE", url, { withAuth });
  },

  async *stream<TEvent extends string | null, TData>(
    url: string,
    options: { method: string; data: FormData | object; withAuth?: boolean },
  ): AsyncGenerator<{ event: TEvent; data: TData }> {
    const { method = "POST", data, withAuth = true } = options;

    const requestHeaders = new Headers({
      Accept: "text/event-stream",
    });

    if (!(data instanceof FormData)) {
      requestHeaders.set("Content-Type", "application/json");
    }

    if (withAuth) {
      const token = getStoredToken();
      if (token) {
        requestHeaders.set("Authorization", `Bearer ${token}`);
      }
    }

    const body =
      data instanceof FormData ? data : data ? JSON.stringify(data) : undefined;

    const response = await fetch(`${API_URL}${url}`, {
      method,
      headers: requestHeaders,
      body,
    });

    if (!response.ok) throw await failure(response, withAuth);

    if (!response.body) {
      throw new Error("streaming_not_supported");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    const parser = createSSEParser();

    while (true) {
      const { done, value } = await reader.read();
      const events = done
        ? parser.flush()
        : parser.push(decoder.decode(value, { stream: true }));
      for (const { event, data } of events) {
        yield { event: event as TEvent, data: data as TData };
      }
      if (done) break;
    }
  },
};
