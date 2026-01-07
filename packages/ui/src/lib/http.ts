const API_URL = "/api";

export class FetchError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "FetchError";
  }

  static isFetchError(error: unknown): error is FetchError {
    return error instanceof FetchError;
  }
}

export async function httpGet<T>(
  url: string,
  params?: Record<string, string>
): Promise<T> {
  const searchParams = params
    ? `?${new URLSearchParams(params).toString()}`
    : "";
  const response = await fetch(`${API_URL}${url}${searchParams}`);

  if (!response.ok) {
    const text = await response.text();
    throw new FetchError(response.status, text);
  }

  return response.json();
}

export async function httpPost<T>(
  url: string,
  body: Record<string, unknown>
): Promise<T> {
  const response = await fetch(`${API_URL}${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new FetchError(response.status, text);
  }

  return response.json();
}

export async function httpPatch<T>(
  url: string,
  body: Record<string, unknown>
): Promise<T> {
  const response = await fetch(`${API_URL}${url}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new FetchError(response.status, text);
  }

  return response.json();
}

export async function httpDelete<T>(url: string): Promise<T> {
  const response = await fetch(`${API_URL}${url}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new FetchError(response.status, text);
  }

  return response.json();
}
