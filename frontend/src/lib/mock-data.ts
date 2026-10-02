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

export const mockWallet = {
  balanceKpoint: 1_250_000,
  reservedKpoint: 550_000,
  lifetimeFlow: 4_120_000,
};

export const mockTransactions = [
  {
    id: 'TX-9901',
    time: '2026-10-02 16:30',
    label: 'Nạp tiền qua VietQR',
    amount: 500_000,
    balanceAfter: 1_250_000,
    method: 'SePay (MB Bank)',
    status: 'SUCCESS' as const,
  },
  {
    id: 'TX-9844',
    time: '2026-10-01 11:20',
    label: 'Khóa quỹ Campaign CP-101',
    amount: -550_000,
    balanceAfter: 750_000,
    method: 'Ví nội bộ',
    status: 'RESERVED' as const,
  },
  {
    id: 'TX-9802',
    time: '2026-09-30 09:15',
    label: 'Thưởng Review CP-98',
    amount: 60_000,
    balanceAfter: 1_300_000,
    method: 'Auto-Approve 48h',
    status: 'SUCCESS' as const,
  },
  {
    id: 'TX-9780',
    time: '2026-09-28 14:02',
    label: 'Nạp Buy Me a Coffee — đã duyệt',
    amount: 1_200_000,
    balanceAfter: 1_240_000,
    method: 'Buy Me a Coffee (USD)',
    status: 'SUCCESS' as const,
  },
];

export const mockCampaigns: {
  id: string;
  name: string;
  platform: PlatformKey;
  location: string;
  slots: number;
  slotsFilled: number;
  rewardPerSlot: number;
  dripFeedPerDay: number;
  trustScoreRequired: number;
  status: 'active' | 'archived';
}[] = [
  {
    id: 'CP-101',
    name: 'Trải nghiệm & Đánh giá Cà phê The Artisan Roastery',
    platform: 'GOOGLE_MAPS',
    location: 'Quận 1, TP. Hồ Chí Minh',
    slots: 20,
    slotsFilled: 16,
    rewardPerSlot: 60_000,
    dripFeedPerDay: 5,
    trustScoreRequired: 80,
    status: 'active',
  },
  {
    id: 'CP-102',
    name: 'Check-in Trải nghiệm Phòng Khám Răng Tiêu Chuẩn Quốc Tế',
    platform: 'FACEBOOK',
    location: 'Cầu Giấy, Hà Nội',
    slots: 15,
    slotsFilled: 7,
    rewardPerSlot: 90_000,
    dripFeedPerDay: 3,
    trustScoreRequired: 85,
    status: 'active',
  },
  {
    id: 'CP-103',
    name: 'Feedback chân thực Tai nghe Chống ồn Pro Wireless',
    platform: 'SHOPEE',
    location: 'Toàn quốc (Online)',
    slots: 50,
    slotsFilled: 48,
    rewardPerSlot: 45_000,
    dripFeedPerDay: 10,
    trustScoreRequired: 70,
    status: 'active',
  },
  {
    id: 'CP-104',
    name: 'Đánh giá Khách Sạn & Resort Biển Sunrise Boutique',
    platform: 'GOOGLE_MAPS',
    location: 'Bãi Cháy, Quảng Ninh',
    slots: 10,
    slotsFilled: 3,
    rewardPerSlot: 120_000,
    dripFeedPerDay: 2,
    trustScoreRequired: 90,
    status: 'active',
  },
  {
    id: 'CP-105',
    name: 'Trải nghiệm Dịch vụ Chăm sóc Da & Spa Thư Giãn',
    platform: 'FACEBOOK',
    location: 'Hải Châu, Đà Nẵng',
    slots: 25,
    slotsFilled: 12,
    rewardPerSlot: 70_000,
    dripFeedPerDay: 4,
    trustScoreRequired: 75,
    status: 'active',
  },
  {
    id: 'CP-106',
    name: 'Review Video Trải Nghiệm Chuỗi Lẩu Băng Chuyền',
    platform: 'TIKTOK',
    location: 'Bình Thạnh, TP. Hồ Chí Minh',
    slots: 10,
    slotsFilled: 9,
    rewardPerSlot: 150_000,
    dripFeedPerDay: 2,
    trustScoreRequired: 88,
    status: 'active',
  },
  {
    id: 'CP-087',
    name: 'Dùng thử app giao đồ ăn NhanhNhanh',
    platform: 'GOOGLE_MAPS',
    location: 'Toàn quốc (Online)',
    slots: 50,
    slotsFilled: 50,
    rewardPerSlot: 15_000,
    dripFeedPerDay: 8,
    trustScoreRequired: 60,
    status: 'archived',
  },
];

export const mockApplicants = [
  {
    id: 'APP-902',
    name: 'Le Thi C',
    trustScore: 88,
    status: 'pending' as const,
    surveyAnswer:
      'Tôi đã từng uống cà phê tại quán 2 lần tuần trước, hiện vẫn giữ hóa đơn thanh toán qua MoMo.',
    deviceHash: 'a918ff02',
    ip: '14.161.x.x',
  },
  {
    id: 'APP-887',
    name: 'Trần Văn Khoa',
    trustScore: 78,
    status: 'invited' as const,
    surveyAnswer: 'Đã dùng dịch vụ 1 lần tháng trước, có hóa đơn VNPay.',
    deviceHash: 'b204ac91',
    ip: '27.72.x.x',
  },
  {
    id: 'APP-854',
    name: 'Lê Minh Anh',
    trustScore: 65,
    status: 'rejected' as const,
    surveyAnswer: 'Chưa từng ghé quán, muốn trải nghiệm thử.',
    deviceHash: 'f10aa221',
    ip: '118.70.x.x',
  },
];

export const mockSubmissions = [
  {
    id: 'SUB-881',
    campaignId: 'CP-101',
    applicant: 'Nguyen Van B',
    trustScore: 94,
    hoursLeft: 23,
    minutesLeft: 15,
    proofNote: 'Ảnh hóa đơn 65.000đ & Ly Capuchino tại quán',
    watermark: 'UID:pub-104 • CP-101 • TIMESTAMP: 2026-10-02 14:20',
    reviewUrl: 'google.maps/review/pub-104',
    reward: 60_000,
  },
];

export const mockMyTasks = [
  {
    id: 'PR-55',
    campaignId: 'CP-101',
    campaign: 'The Artisan Roastery',
    platform: 'GOOGLE_MAPS' as PlatformKey,
    requirement: 'Viết review tối thiểu 50 chữ kèm 2 ảnh thực tế (1 ảnh hóa đơn, 1 ảnh đồ uống).',
    reward: 60_000,
    status: 'awaiting_proof' as const,
    deadline: 'Còn 24 giờ',
  },
  {
    id: 'PR-49',
    campaignId: 'CP-105',
    campaign: 'Spa & Thẩm Mỹ Viện',
    platform: 'FACEBOOK' as PlatformKey,
    requirement: 'Check-in công khai tại fanpage kèm ảnh phiếu dịch vụ được xác nhận.',
    reward: 70_000,
    status: 'awaiting_proof' as const,
    deadline: 'Còn 18 giờ',
  },
  {
    id: 'PR-41',
    campaignId: 'CP-087',
    campaign: 'App giao đồ ăn NhanhNhanh',
    platform: 'GOOGLE_MAPS' as PlatformKey,
    requirement: 'Đã nộp — chờ Bên A duyệt.',
    reward: 15_000,
    status: 'approved' as const,
    deadline: 'Đã cộng KPoint',
  },
];

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
