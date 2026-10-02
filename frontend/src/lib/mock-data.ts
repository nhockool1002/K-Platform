// Dữ liệu mẫu dùng chung cho toàn bộ wireframe — KHÔNG kết nối backend thật.
// Khớp với bảng/trường trong README.md Section VII (Database Schema).

export const mockWallet = {
  balanceKpoint: 1_250_000,
  reservedKpoint: 320_000,
};

export const mockTransactions = [
  {
    id: 'TX-2031',
    label: 'Nạp SePay — VietQR',
    date: '28/09/2026',
    amount: 500_000,
    direction: 'in' as const,
  },
  {
    id: 'TX-2030',
    label: 'Giải ngân — Chiến dịch "Review quán cà phê Lữ"',
    date: '27/09/2026',
    amount: -150_000,
    direction: 'out' as const,
  },
  {
    id: 'TX-2029',
    label: 'Thưởng Proof — Review nhà hàng Hải Sản Biển Đông',
    date: '25/09/2026',
    amount: 45_000,
    direction: 'in' as const,
  },
  {
    id: 'TX-2028',
    label: 'Phí khởi tạo Campaign',
    date: '24/09/2026',
    amount: -80_000,
    direction: 'out' as const,
  },
  {
    id: 'TX-2027',
    label: 'Nạp Buy Me a Coffee — đã duyệt',
    date: '20/09/2026',
    amount: 1_200_000,
    direction: 'in' as const,
  },
];

export const mockCampaigns = [
  {
    id: 'CP-101',
    name: 'Review quán cà phê Lữ — chi nhánh Q.1',
    platform: 'Google Maps',
    slots: 20,
    slotsFilled: 14,
    rewardPerSlot: 25_000,
    status: 'active' as const,
  },
  {
    id: 'CP-098',
    name: 'Trải nghiệm phòng Gym FitZone quận 7',
    platform: 'Facebook',
    slots: 15,
    slotsFilled: 15,
    rewardPerSlot: 40_000,
    status: 'active' as const,
  },
  {
    id: 'CP-087',
    name: 'Dùng thử app giao đồ ăn NhanhNhanh',
    platform: 'Google Maps',
    slots: 50,
    slotsFilled: 50,
    rewardPerSlot: 15_000,
    status: 'archived' as const,
  },
];

export const mockApplicants = [
  { id: 'AP-88', name: 'Nguyễn Thị Hạnh', trustScore: 92, status: 'pending' as const },
  { id: 'AP-87', name: 'Trần Văn Khoa', trustScore: 78, status: 'invited' as const },
  { id: 'AP-85', name: 'Lê Minh Anh', trustScore: 65, status: 'rejected' as const },
  { id: 'AP-82', name: 'Phạm Quốc Bảo', trustScore: 88, status: 'invited' as const },
];

export const mockMyTasks = [
  {
    id: 'PR-55',
    campaignId: 'CP-101',
    campaign: 'Review quán cà phê Lữ — chi nhánh Q.1',
    reward: 25_000,
    status: 'awaiting_proof' as const,
    deadline: 'Còn 32 giờ',
  },
  {
    id: 'PR-49',
    campaignId: 'CP-098',
    campaign: 'Trải nghiệm phòng Gym FitZone quận 7',
    reward: 40_000,
    status: 'pending_review' as const,
    deadline: 'Đã nộp — chờ Bên A duyệt',
  },
  {
    id: 'PR-41',
    campaignId: 'CP-087',
    campaign: 'Dùng thử app giao đồ ăn NhanhNhanh',
    reward: 15_000,
    status: 'approved' as const,
    deadline: 'Đã cộng KPoint',
  },
];

export const mockDisputes = [
  {
    id: 'DSP-12',
    submission: 'PR-55',
    campaign: 'Review quán cà phê Lữ — chi nhánh Q.1',
    reason: 'Bên A từ chối với lý do "ảnh mờ, không thấy biển hiệu"',
    status: 'open' as const,
    amount: 25_000,
  },
  {
    id: 'DSP-11',
    submission: 'PR-49',
    campaign: 'Trải nghiệm phòng Gym FitZone quận 7',
    reason: 'Khiếu nại thời gian xử lý quá hạn 48h',
    status: 'recommended' as const,
    amount: 40_000,
  },
  {
    id: 'DSP-09',
    submission: 'PR-41',
    campaign: 'Dùng thử app giao đồ ăn NhanhNhanh',
    reason: 'Tranh chấp nội dung review không khớp trải nghiệm thực tế',
    status: 'resolved' as const,
    amount: 15_000,
  },
];

export const mockBmcTopups = [
  {
    id: 'TP-99',
    user: 'advertiser@kplatform.dev',
    amountUsd: 50,
    kpointAmount: 1_200_000,
    txnId: 'BMC-99231',
    status: 'pending' as const,
  },
  {
    id: 'TP-97',
    user: 'bizco@company.com',
    amountUsd: 120,
    kpointAmount: 2_880_000,
    txnId: 'BMC-99187',
    status: 'pending' as const,
  },
];

export const mockAuditLogs = [
  {
    id: 1420,
    actor: 'admin@kplatform.dev',
    action: 'MANUAL_TOPUP',
    resource: 'bmc_topups/TP-98',
    level: 'info' as const,
    time: '09:41 · 01/10/2026',
  },
  {
    id: 1419,
    actor: 'root@kplatform.dev',
    action: 'UPDATE',
    resource: 'roles_permissions/MODERATOR',
    level: 'critical' as const,
    time: '09:02 · 01/10/2026',
  },
  {
    id: 1418,
    actor: 'moderator@kplatform.dev',
    action: 'DISPUTE_RESOLVE',
    resource: 'disputes/DSP-09',
    level: 'warning' as const,
    time: '18:47 · 30/09/2026',
  },
  {
    id: 1417,
    actor: 'unknown · 118.70.x.x',
    action: 'CREATE',
    resource: 'sessions/login_attempt',
    level: 'critical' as const,
    time: '03:12 · 30/09/2026',
  },
];

export const mockRoles = [
  { name: 'Root Administrator', users: 1, permissions: 'Toàn quyền hệ thống' },
  { name: 'Administrator', users: 3, permissions: 'Duyệt thanh toán, phán quyết tranh chấp' },
  { name: 'Super / Moderator', users: 6, permissions: 'Thẩm định tranh chấp, quản lý campaign' },
  { name: 'Bên A — Advertiser', users: 1248, permissions: 'Tạo campaign, nạp/rút ví' },
  { name: 'Bên B — Publisher', users: 9031, permissions: 'Ứng tuyển, nộp proof, rút ví' },
];
