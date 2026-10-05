import { PermissionAction } from '../prisma/client.js';

export const ALL_ACTIONS: PermissionAction[] = [
  PermissionAction.READ,
  PermissionAction.CREATE,
  PermissionAction.UPDATE,
  PermissionAction.DELETE,
  PermissionAction.APPROVE,
];

export const ACTION_LABEL: Record<PermissionAction, string> = {
  READ: 'Xem',
  CREATE: 'Tạo',
  UPDATE: 'Sửa',
  DELETE: 'Xoá',
  APPROVE: 'Duyệt / Quyết định',
};

// Danh mục tài nguyên CMS và hành động áp dụng được. Mọi route quản trị phải khai
// báo @RequirePermission(resource, action) theo đúng bảng này.
export const PERMISSION_RESOURCES = {
  dashboard_overview: {
    label: 'Tổng quan KPI (SCR-09)',
    area: 'Tổng quan',
    actions: [PermissionAction.READ],
  },
  reports: {
    label: 'Thống kê doanh thu',
    area: 'Tổng quan',
    actions: [PermissionAction.READ],
  },
  accounts: {
    label: 'Quản trị tài khoản',
    area: 'Người dùng',
    actions: [
      PermissionAction.READ,
      PermissionAction.CREATE,
      PermissionAction.UPDATE,
      PermissionAction.DELETE,
    ],
  },
  trust_score: {
    label: 'Trust Score (lý do & điều chỉnh điểm)',
    area: 'Người dùng',
    actions: [
      PermissionAction.READ,
      PermissionAction.CREATE,
      PermissionAction.UPDATE,
      PermissionAction.DELETE,
    ],
  },
  campaigns: {
    label: 'Quản trị Campaign (phân công Moderator)',
    area: 'Campaign',
    actions: [PermissionAction.READ, PermissionAction.UPDATE],
  },
  disputes: {
    label: 'Dispute Center (SCR-11)',
    area: 'Tranh chấp',
    actions: [PermissionAction.READ, PermissionAction.UPDATE, PermissionAction.APPROVE],
  },
  withdrawals: {
    label: 'Duyệt lệnh rút tiền',
    area: 'Thanh toán',
    actions: [PermissionAction.READ, PermissionAction.APPROVE],
  },
  payments_reconciliation: {
    label: 'Đối soát nạp tiền (SCR-10)',
    area: 'Thanh toán',
    actions: [PermissionAction.READ, PermissionAction.APPROVE],
  },
  international_packages: {
    label: 'Gói nạp quốc tế (BMC)',
    area: 'Thanh toán',
    actions: [
      PermissionAction.READ,
      PermissionAction.CREATE,
      PermissionAction.UPDATE,
      PermissionAction.DELETE,
    ],
  },
  settings: {
    label: 'Cài đặt hệ thống (SePay, phí kích hoạt, tỷ giá, SLA)',
    area: 'Cài đặt',
    actions: [PermissionAction.READ, PermissionAction.UPDATE],
  },
  rbac: {
    label: 'Phân quyền & nhóm quyền (SCR-12)',
    area: 'Hệ thống',
    actions: [
      PermissionAction.READ,
      PermissionAction.CREATE,
      PermissionAction.UPDATE,
      PermissionAction.DELETE,
    ],
  },
  audit_logs: {
    label: 'Nhật ký Audit Logs (SCR-13)',
    area: 'Hệ thống',
    actions: [PermissionAction.READ],
  },
} as const;

export type ResourceKey = keyof typeof PERMISSION_RESOURCES;

export const RESOURCE_KEYS = Object.keys(PERMISSION_RESOURCES) as ResourceKey[];

export function permissionKey(resource: string, action: PermissionAction): string {
  return `${resource}:${action}`;
}

export function isValidPermission(resource: string, action: PermissionAction): boolean {
  const def = PERMISSION_RESOURCES[resource as ResourceKey];
  return Boolean(def && (def.actions as readonly PermissionAction[]).includes(action));
}

// Quyền mặc định của nhóm hệ thống "Moderator" (role MODERATOR). Quản trị viên
// có toàn bộ quyền; Root có toàn quyền và không bị hạn chế bởi bảng này.
export const MODERATOR_DEFAULT_PERMISSIONS: [ResourceKey, PermissionAction][] = [
  ['dashboard_overview', PermissionAction.READ],
  ['disputes', PermissionAction.READ],
  ['disputes', PermissionAction.UPDATE],
  ['campaigns', PermissionAction.READ],
];

export function allCatalogPermissions(): [ResourceKey, PermissionAction][] {
  const out: [ResourceKey, PermissionAction][] = [];
  for (const r of RESOURCE_KEYS) {
    for (const a of PERMISSION_RESOURCES[r].actions) out.push([r, a]);
  }
  return out;
}
