export const API_BASE = 'http://localhost:8000';
export async function apiFetch(
  path: string,
  options: RequestInit = {},
  token?: string | null
) {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Chỉ set Content-Type JSON nếu không phải FormData
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    let detail = `Lỗi ${res.status}`;
    try {
      const err = await res.json();
      detail = err.detail || detail;
    } catch { /* ignore */ }
    throw new Error(detail);
  }

  return res.json();
}
// src/lib/api.ts

// Đảm bảo rằng bạn đã export đúng function fetchUsers
export const fetchUsers = async () => {
  const response = await fetch('/api/admin/users');  // Địa chỉ API của bạn
  const data = await response.json();
  return data;
};