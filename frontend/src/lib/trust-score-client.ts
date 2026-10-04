'use client';

// Client cho B-05 Trust Score (backend/src/trust-score). Chỉ Admin/Root Admin.

import { apiFetch } from './auth-client';

export interface TrustScoreRule {
  id: string;
  code: string;
  label: string;
  points: number;
  isSystem: boolean;
  active: boolean;
}

export interface TrustScoreTransaction {
  id: string;
  delta: number;
  ruleCode: string | null;
  note: string | null;
  actor: { id: string; email: string } | null;
  createdAt: string;
}

export interface TrustScoreLeaderboardEntry {
  id: string;
  email: string;
  trustScore: number;
}

export async function listTrustScoreRules(): Promise<TrustScoreRule[]> {
  return apiFetch<TrustScoreRule[]>('/admin/trust-score/rules', { auth: true });
}

export async function createTrustScoreRule(input: {
  code: string;
  label: string;
  points: number;
}): Promise<TrustScoreRule> {
  return apiFetch<TrustScoreRule>('/admin/trust-score/rules', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(input),
  });
}

export async function updateTrustScoreRule(
  id: string,
  input: { label?: string; points?: number; active?: boolean },
): Promise<TrustScoreRule> {
  return apiFetch<TrustScoreRule>(`/admin/trust-score/rules/${id}`, {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify(input),
  });
}

export async function deleteTrustScoreRule(id: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/admin/trust-score/rules/${id}`, {
    method: 'DELETE',
    auth: true,
  });
}

export async function getTrustScoreHistory(userId: string): Promise<TrustScoreTransaction[]> {
  return apiFetch<TrustScoreTransaction[]>(`/admin/trust-score/${userId}/history`, { auth: true });
}

export async function adjustTrustScore(
  userId: string,
  input: { delta: number; ruleCode?: string; note?: string },
): Promise<{ id: string; trustScore: number }> {
  return apiFetch(`/admin/trust-score/${userId}/adjust`, {
    method: 'POST',
    auth: true,
    body: JSON.stringify(input),
  });
}

export async function getTrustScoreLeaderboard(limit = 10): Promise<TrustScoreLeaderboardEntry[]> {
  return apiFetch<TrustScoreLeaderboardEntry[]>(`/admin/trust-score/leaderboard?limit=${limit}`, {
    auth: true,
  });
}
