// Dữ liệu mẫu dùng chung cho toàn bộ wireframe — KHÔNG kết nối backend thật.
// Khớp với bảng/trường trong README.md Section VII (Database Schema) + Prisma schema.

export type PlatformKey = 'GOOGLE_MAPS' | 'FACEBOOK' | 'SHOPEE' | 'TIKTOK';

export const PLATFORM_LABEL: Record<PlatformKey, string> = {
  GOOGLE_MAPS: 'Google Maps',
  FACEBOOK: 'Facebook Check-in',
  SHOPEE: 'Shopee Mall',
  TIKTOK: 'TikTok Video',
};

export const PLATFORM_BADGE: Record<PlatformKey, string> = {
  GOOGLE_MAPS: 'bg-rose-50 text-rose-700 border-rose-200',
  FACEBOOK: 'bg-blue-50 text-blue-700 border-blue-200',
  SHOPEE: 'bg-amber-50 text-amber-800 border-amber-200',
  TIKTOK: 'bg-purple-50 text-purple-700 border-purple-200',
};

// Campaign/Applicant/Submission (Phase 3 + Phase 4 Proof) và Wallet/SePay
// (Phase 2) đã nối API thật — xem src/lib/campaigns-client.ts /
// src/lib/wallet-client.ts / src/lib/submissions-client.ts. Mock bên dưới
// chỉ còn phục vụ các màn hình thuộc Phase 5/6/7 (Dispute, BMC, Audit, RBAC)
// chưa có API thật.

export const mockDisputes = [
  {
    id: 'DSP-12',
    submissionId: 'SUB-881',
    campaign: 'The Artisan Roastery (CP-101)',
    amountLocked: 60_000,
    status: 'open' as const,
    partyA: {
      name: 'The Artisan Cafe',
      uid: 'adv-882',
      reason: 'Ảnh chụp hóa đơn bị mờ, không nhìn rõ mã thanh toán 50k.',
    },
    partyB: {
      name: 'Nguyen Van B',
      uid: 'pub-104',
      trustScore: 94,
      appeal: 'Tôi đã chụp lại ảnh rõ nét và gắn kèm link review Maps công khai.',
      watermark: 'UID:pub-104 • CP-101 • 2026-10-02',
    },
  },
];

export const mockBmcTopups = [
  {
    id: 'BMC-88219-TX',
    user: 'Cty TNHH Truyền Thông Nam Việt',
    uid: '9f81a7-usr',
    amountUsd: 50,
    kpointAmount: 1_250_000,
    status: 'PENDING_VERIFY' as const,
  },
  {
    id: 'BMC-88220-TX',
    user: 'Boutique Hotel Da Nang',
    uid: '3b12cc-usr',
    amountUsd: 100,
    kpointAmount: 2_500_000,
    status: 'PENDING_VERIFY' as const,
  },
];

export const mockAuditLogs = [
  {
    id: 'LOG-9021',
    time: '2026-10-02 18:45:12',
    actor: 'root_001',
    action: 'MANUAL_TOPUP' as const,
    resource: 'wallets:uid-namviet',
    ip: '14.161.22.8',
    fingerprint: 'fp_981ab23',
    level: 'critical' as const,
    diffOld: { balance_kpoint: 0, reserved_kpoint: 0 },
    diffNew: {
      balance_kpoint: 1_250_000,
      reserved_kpoint: 0,
      topup_source: 'BUY_ME_A_COFFEE',
      txn_id: 'BMC-88219-TX',
    },
  },
  {
    id: 'LOG-9018',
    time: '2026-10-02 17:20:05',
    actor: 'adm_024',
    action: 'DISPUTE_RESOLVE' as const,
    resource: 'disputes:DSP-12',
    ip: '118.69.14.92',
    fingerprint: 'fp_442ee01',
    level: 'warning' as const,
    diffOld: { status: 'RECOMMENDED', mod_recommendation: 'PEND_APP' },
    diffNew: {
      status: 'RESOLVED',
      final_decision: 'APPROVE',
      released_to: 'pub-104',
      kpoint: 60_000,
    },
  },
  {
    id: 'LOG-9010',
    time: '2026-10-02 14:10:33',
    actor: 'adv_theartisan',
    action: 'CAMPAIGN_CREATE' as const,
    resource: 'campaigns:CP-101',
    ip: '171.244.10.15',
    fingerprint: 'fp_bb1293c',
    level: 'info' as const,
    diffOld: null,
    diffNew: {
      id: 'CP-101',
      slots: 20,
      reward: 60_000,
      reserved_kpoint: 550_000,
      status: 'ACTIVE',
    },
  },
];

export const ROOT_ADMIN = {
  id: 'root_001',
  name: 'Root System Admin',
  email: 'root@kplatform.dev',
};

export const mockStaff = [
  {
    id: 'root_001',
    name: 'Root System Admin',
    email: 'root@kplatform.dev',
    role: 'ROOT_ADMIN' as const,
    scope: 'Toàn bộ (Global)',
    permissions: 'Toàn quyền + Quản lý RBAC + Can thiệp DB',
    protected: true,
  },
  {
    id: 'adm_024',
    name: 'Tran Van Admin',
    email: 'tran.admin@kplatform.dev',
    role: 'ADMIN' as const,
    scope: 'Toàn bộ',
    permissions: 'Duyệt BMC, Phán quyết Dispute, Quản lý Ví',
    protected: false,
  },
  {
    id: 'mod_108',
    name: 'Nguyen Thi Moderator',
    email: 'mod.nguyen@kplatform.dev',
    role: 'MODERATOR' as const,
    scope: 'CP-101, CP-102',
    permissions: 'Thẩm định Dispute (Pend App / Pend Reject)',
    protected: false,
  },
];
