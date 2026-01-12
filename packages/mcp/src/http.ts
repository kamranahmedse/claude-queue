export const KANBAN_URL = process.env.KANBAN_SERVER_URL || "http://localhost:3333";

export async function httpGet<T>(url: string): Promise<T> {
  const response = await fetch(`${KANBAN_URL}${url}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

export async function httpPost<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${KANBAN_URL}${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

export async function httpPatch<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${KANBAN_URL}${url}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

export async function httpPut<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${KANBAN_URL}${url}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  return response.json();
}
