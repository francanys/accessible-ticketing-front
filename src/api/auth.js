// src/api/auth.js
const API_BASE = import.meta.env.VITE_API_BASE || "/api";

// helper so we don't crash if server returns HTML (not JSON)
async function readResponse(res) {
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  const data = isJson ? await res.json().catch(() => null) : null;
  const text = !isJson ? await res.text().catch(() => "") : "";
  return { data, text };
}

// Cookie-based session: register doesn't set cookie, login does.
// Always include credentials so cookie is sent/received.
export async function registerRequest({ email, password, isHost }) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password, isHost: !!isHost }),
  });

  const { data, text } = await readResponse(res);

  if (!res.ok || (data && data.ok === false)) {
    const message =
      (data && (data.error || data.message)) ||
      (text && text.slice(0, 200)) ||
      `Register failed (${res.status})`;
    throw new Error(message);
  }

  return data; 
}

export async function loginRequest({ email, password }) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", 
    body: JSON.stringify({ email, password }),
  });

  const { data, text } = await readResponse(res);

  if (!res.ok || (data && data.ok === false)) {
    const message =
      (data && (data.error || data.message)) ||
      (text && text.slice(0, 200)) ||
      `Login failed (${res.status})`;
    throw new Error(message);
  }

  if (!data?.user?.id) {
    throw new Error("Login response missing user");
  }

  return data; 
}

export async function meRequest() {
  const res = await fetch(`${API_BASE}/auth/me`, {
    credentials: "include", 
  });

  const { data, text } = await readResponse(res);

  if (!res.ok || (data && data.ok === false)) {
    const message =
      (data && (data.error || data.message)) ||
      (text && text.slice(0, 200)) ||
      `Not authenticated (${res.status})`;
    throw new Error(message);
  }

  return data; 
}
