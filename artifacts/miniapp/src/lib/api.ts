const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API = `${BASE}/api`;

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Network error" }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export const api = {
  getUser: (telegramId: string) => apiRequest<any>(`/users/${telegramId}`),
  createOrGetUser: (data: any) => apiRequest<any>(`/users`, { method: "POST", body: JSON.stringify(data) }),
  createDeposit: (data: any) => apiRequest<any>(`/deposits`, { method: "POST", body: JSON.stringify(data) }),
  getInvestments: (telegramId: string) => apiRequest<any[]>(`/investments?telegramId=${telegramId}`),
  createInvestment: (data: any) => apiRequest<any>(`/investments`, { method: "POST", body: JSON.stringify(data) }),
  playGame: (data: any) => apiRequest<any>(`/games/play`, { method: "POST", body: JSON.stringify(data) }),
  getGameHistory: (telegramId: string) => apiRequest<any[]>(`/games/history?telegramId=${telegramId}&limit=20`),
  getDonations: () => apiRequest<any>(`/donations`),
  createDonation: (data: any) => apiRequest<any>(`/donations`, { method: "POST", body: JSON.stringify(data) }),
};
