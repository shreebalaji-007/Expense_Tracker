let refreshing: Promise<unknown> | null = null;
export async function api<T = any>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const response = await fetch("/api/" + path, {
    ...options,
    credentials: "include",
    headers: {
      ...(!(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });
  if (response.status === 401 && retry && !path.startsWith("auth/")) {
    refreshing ??= api(
      "auth/refresh",
      { method: "POST", body: "{}" },
      false,
    ).finally(() => {
      refreshing = null;
    });
    try {
      await refreshing;
      return api(path, options, false);
    } catch {
      window.dispatchEvent(new Event("session-expired"));
      throw new Error("Your session expired. Please sign in.");
    }
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("Unable to connect to the service.");
  }
  if (!response.ok) throw new Error(result.message ?? "Request failed");
  return result.data;
}
export const save = (path: string, value: any, method = "POST") =>
  api(path, { method, body: JSON.stringify(value) });
