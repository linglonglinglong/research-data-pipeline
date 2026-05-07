const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

async function request(endpoint: string, options: RequestInit = {}) {
  const headers = {
    "X-API-Key": API_KEY,
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || "API Error");
  }
  
  return response.json();
}

export const apiClient = {
  get: (url: string) => request(url, { method: "GET" }),
  
  post: (url: string, body: any) => request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }),
  
  upload: (url: string, formData: FormData) => request(url, {
    method: "POST",
    body: formData, // The browser automatically sets the multipart/form-data boundary
  }),
};