import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { mockRoles } from '@/lib/mock-data';

export default function RbacPage() {
  return (
    <AppShell role="admin" active="/cms/rbac">
      <PageHeader
        title="Phân quyền & Root Admin"
        description="Root Administrator được hard-code trong DB — không thể xóa hay hạ cấp qua bất kỳ API nào."
        actions={<Button>+ Tạo Role mới</Button>}
      />

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-line border-b">
            <th className="text-ink-muted px-3 py-2 text-xs font-medium">Role</th>
            <th className="text-ink-muted px-3 py-2 text-xs font-medium">Số người dùng</th>
            <th className="text-ink-muted px-3 py-2 text-xs font-medium">Quyền hạn</th>
            <th className="text-ink-muted px-3 py-2 text-xs font-medium" />
          </tr>
        </thead>
        <tbody>
          {mockRoles.map((role) => (
            <tr key={role.name} className="ledger-row">
              <td className="text-ink px-3 py-3 font-medium">{role.name}</td>
              <td className="font-ledger text-ink px-3 py-3">
                {role.users.toLocaleString('vi-VN')}
              </td>
              <td className="text-ink-muted px-3 py-3">{role.permissions}</td>
              <td className="px-3 py-3 text-right">
                <button className="text-navy text-xs font-medium">Gán quyền</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-line bg-paper-raised mt-10 border p-5">
        <h2 className="font-display text-ink text-base font-medium">
          Phân công Campaign cho Moderator
        </h2>
        <p className="text-ink-muted mt-1 text-sm">
          Chọn Moderator phụ trách từng Campaign để thẩm định tranh chấp liên quan.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <select className="border-line text-ink border bg-transparent px-3 py-2 text-sm">
            <option>CP-101 — Review quán cà phê Lữ</option>
          </select>
          <select className="border-line text-ink border bg-transparent px-3 py-2 text-sm">
            <option>Moderator: moderator@kplatform.dev</option>
          </select>
          <Button>Phân công</Button>
        </div>
      </div>
    </AppShell>
  );
}
