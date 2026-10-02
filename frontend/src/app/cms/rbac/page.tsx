import { ShieldCheck, UserPlus } from 'lucide-react';
import { CmsShell } from '@/components/layout/CmsShell';
import { Badge } from '@/components/ui/Badge';
import { Table, Thead, Th, Tbody, Td } from '@/components/ui/Table';
import { mockStaff } from '@/lib/mock-data';

const ROLE_BADGE = {
  ROOT_ADMIN: 'bg-rose-100 text-rose-800',
  ADMIN: 'bg-purple-100 text-purple-800',
  MODERATOR: 'bg-blue-100 text-blue-800',
} as const;

export default function RbacPage() {
  return (
    <CmsShell active="/cms/rbac">
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              SCR-12: Quản Lý Phân Quyền RBAC &amp; Root Administrator
            </h3>
            <p className="text-xs text-slate-500">
              Mô hình phân cấp: Root Admin → Admin → Super/Moderator → Bên A / Bên B
            </p>
          </div>
        </div>

        {/* Root Administrator Protected Box */}
        <div className="flex flex-col gap-3 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-brand-blue p-4 text-white shadow-md sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-gold text-slate-950">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <strong className="font-mono text-sm text-amber-300">
                  Root Administrator (ID: root_001)
                </strong>
                <span className="rounded border border-emerald-500/40 bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
                  IMMUTABLE / HARDCODED
                </span>
              </div>
              <span className="block text-xs text-slate-300">
                Quy tắc SRS: Tài khoản bất biến, không thể bị xóa hay hạ cấp bởi bất kỳ API hay Quản
                trị viên nào khác.
              </span>
            </div>
          </div>
          <span className="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-center font-mono text-xs font-bold text-white">
            Toàn quyền hệ thống
          </span>
        </div>

        {/* Staff table */}
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <h4 className="font-mono text-xs font-extrabold text-slate-800 uppercase">
              Danh Sách Nhân Sự &amp; Phân Quyền Nội Bộ
            </h4>
            <button className="flex items-center gap-1 rounded-xl bg-brand-blue px-3 py-1 text-xs font-bold text-white transition hover:bg-brand-blue-dark">
              <UserPlus className="h-3.5 w-3.5" />
              <span>Thêm Moderator</span>
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <Table>
              <Thead>
                <Th>User ID</Th>
                <Th>Họ tên / Email</Th>
                <Th>Vai trò (Role)</Th>
                <Th>Campaign phân công</Th>
                <Th>Quyền hạn cốt lõi</Th>
                <Th className="text-right">Thao tác</Th>
              </Thead>
              <Tbody>
                {mockStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-50">
                    <Td className="font-mono font-bold text-slate-900">{staff.id}</Td>
                    <Td className="font-semibold text-slate-800">
                      {staff.name}
                      <br />
                      <span className="font-normal text-slate-400">{staff.email}</span>
                    </Td>
                    <Td>
                      <Badge className={`${ROLE_BADGE[staff.role]} border-transparent`}>
                        {staff.role}
                      </Badge>
                    </Td>
                    <Td className="font-mono text-slate-500">{staff.scope}</Td>
                    <Td className="text-slate-600">{staff.permissions}</Td>
                    <Td className="text-right">
                      {staff.protected ? (
                        <span className="text-slate-400 italic">Khóa bảo vệ</span>
                      ) : (
                        <button className="font-bold text-brand-blue hover:underline">
                          Sửa quyền
                        </button>
                      )}
                    </Td>
                  </tr>
                ))}
              </Tbody>
            </Table>
          </div>
        </div>
      </div>
    </CmsShell>
  );
}
