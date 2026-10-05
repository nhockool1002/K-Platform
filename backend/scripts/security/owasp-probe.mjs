import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
const API = 'http://localhost:4000/api/v1';
const PASS = process.env.QA_PASS;
if (!PASS) throw new Error('Đặt QA_PASS (mật khẩu chung của user QA) trước khi chạy probe');
const results = [];
const check = (id, name, ok, detail = '') => results.push({ id, name, ok, detail });

async function req(path, { method = 'GET', token, body, headers = {}, raw } = {}) {
  const h = { ...headers };
  if (token) h.Authorization = `Bearer ${token}`;
  if (body !== undefined && !raw) h['Content-Type'] = 'application/json';
  const res = await fetch(API + path, {
    method,
    headers: h,
    body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, headers: res.headers, text, json };
}
async function login(email) {
  const r = await req('/auth/login', { method: 'POST', body: { email, password: PASS } });
  return r.json.accessToken;
}
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
function jwt(payload, secret, alg = 'HS256') {
  const head = b64u({ alg, typ: 'JWT' });
  const body = b64u(payload);
  if (alg === 'none') return `${head}.${body}.`;
  const sig = createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${sig}`;
}

const admin = await login('qa-admin@kplatform.dev');
const mod = await login('qa-mod@kplatform.dev');
const buyer = await login('qa-buyer@kplatform.dev');
const pub = await login('qa-pub@kplatform.dev');
const other = await login('qa-other@kplatform.dev');
const buyerId = JSON.parse(Buffer.from(buyer.split('.')[1], 'base64url')).sub;

// A07 — xác thực / JWT
const sub = buyerId;
check(
  'A07-1',
  'JWT alg=none bị từ chối',
  (
    await req('/auth/me', {
      token: jwt({ sub, email: 'x', role: 'ADMIN', activeMode: 'A' }, '', 'none'),
    })
  ).status === 401,
);
check(
  'A07-2',
  'JWT ký sai secret bị từ chối',
  (
    await req('/auth/me', {
      token: jwt({ sub, email: 'x', role: 'ADMIN', activeMode: 'A' }, 'wrong-secret'),
    })
  ).status === 401,
);
const expired = jwt(
  { sub, email: 'x', role: 'USER', activeMode: 'A', exp: Math.floor(Date.now() / 1000) - 60 },
  'dev-only-change-me-access',
);
check(
  'A07-3',
  'JWT hết hạn bị từ chối',
  (await req('/auth/me', { token: expired })).status === 401,
);
const refreshAsAccess = jwt(
  { sub, type: 'refresh', exp: Math.floor(Date.now() / 1000) + 600 },
  'dev-only-change-me-refresh',
);
check(
  'A07-4',
  'Refresh token không dùng làm access token',
  (await req('/profile/me', { token: refreshAsAccess })).status === 401,
);
const e1 = await req('/auth/login', {
  method: 'POST',
  body: { email: 'nobody-x@kplatform.dev', password: `x-${Date.now()}` },
});
const e2 = await req('/auth/login', {
  method: 'POST',
  body: { email: 'qa-buyer@kplatform.dev', password: `y-${Date.now()}` },
});
check(
  'A07-5',
  'Đăng nhập sai không lộ email tồn tại (thông điệp giống nhau)',
  e1.status === e2.status && e1.json?.message === e2.json?.message,
  `${e1.status}/${e2.status}`,
);

// A01 — kiểm soát truy cập / IDOR / leo quyền
check(
  'A01-1',
  'USER gọi /admin/users → 403',
  (await req('/admin/users', { token: buyer })).status === 403,
);
check(
  'A01-2',
  'USER gọi /admin/audit-logs → 403',
  (await req('/admin/audit-logs', { token: buyer })).status === 403,
);
check(
  'A01-3',
  'USER tạo nhóm quyền → 403',
  (
    await req('/admin/rbac/groups', {
      method: 'POST',
      token: buyer,
      body: { name: 'hack-group', permissions: [] },
    })
  ).status === 403,
);
check(
  'A01-4',
  'USER xem rút tiền toàn hệ thống → 403',
  (await req('/admin/withdrawals', { token: buyer })).status === 403,
);
check(
  'A01-5',
  'MODERATOR chỉnh cài đặt SePay → 403',
  (await req('/admin/settings/sepay', { token: mod })).status === 403,
);
check(
  'A01-6',
  'MODERATOR xoá tài khoản → 403',
  (await req('/admin/users/00000000-0000-4000-8000-000000000099', { method: 'DELETE', token: mod }))
    .status === 403,
);
check(
  'A01-7',
  'USER đọc biên lai BMC của người khác (admin route) → 403',
  (await req('/admin/bmc/topups/00000000-0000-4000-8000-000000000099/receipt', { token: pub }))
    .status === 403,
);
check(
  'A01-8',
  'USER không đổi được role của mình qua /profile',
  (await req('/profile/me', { method: 'PATCH', token: buyer, body: { role: 'ADMIN' } })).status ===
    400,
);
check(
  'A01-9',
  'Trang rbac/me không lộ quyền người khác',
  (await req('/admin/rbac/users/' + sub, { token: buyer })).status === 403,
);
check(
  'A01-10',
  'USER không đọc được chi tiết audit log',
  (await req('/admin/audit-logs/00000000-0000-4000-8000-000000000099', { token: other })).status ===
    403,
);

// A04/A08 — mass assignment
const reg = await req('/auth/register', {
  method: 'POST',
  body: {
    email: `qa-mass-${Date.now()}@kplatform.dev`,
    password: `m-${Date.now()}`,
    confirmPassword: 'Mass12345',
    fullName: 'Mass Test',
    phone: '0912345678',
    dateOfBirth: '1990-01-01',
    gender: 'MALE',
    province: 'Hà Nội',
    role: 'ADMIN',
    trustScore: 9999,
  },
});
check(
  'A04-1',
  'Đăng ký không nhận role/trustScore (mass assignment bị chặn)',
  reg.status === 400,
  `status ${reg.status}`,
);
check(
  'A04-2',
  'Profile không nhận trường ngoài danh sách (trustScore)',
  (await req('/profile/me', { method: 'PATCH', token: buyer, body: { trustScore: 9999 } }))
    .status === 400,
);

// A03 — injection
const countBefore = await req('/admin/rbac/users?pageSize=1', { token: admin });
const sqli1 = await req('/campaigns?search=%27%29%20OR%201%3D1%3B%20DROP%20TABLE%20users%3B--');
check(
  'A03-1',
  'SQLi trong tìm kiếm campaign không gây lỗi 5xx',
  sqli1.status < 500,
  `status ${sqli1.status}`,
);
const countAfter = await req('/admin/rbac/users?pageSize=1', { token: admin });
check(
  'A03-2',
  'Bảng users còn nguyên sau payload DROP TABLE',
  countAfter.status === 200 && countAfter.json.total === countBefore.json.total,
  `${countBefore.json?.total}→${countAfter.json?.total}`,
);
const sqli2 = await req('/auth/login', {
  method: 'POST',
  body: { email: "' OR '1'='1", password: "' OR '1'='1" },
});
check(
  'A03-3',
  'SQLi qua đăng nhập bị từ chối (400 do validate email, hoặc 401)',
  [400, 401].includes(sqli2.status),
  `status ${sqli2.status}`,
);
const sqli3 = await req('/admin/audit-logs?actor=' + encodeURIComponent("' OR 1=1 --"), {
  token: admin,
});
check(
  'A03-4',
  'SQLi qua bộ lọc audit log không lộ dữ liệu (không 5xx)',
  sqli3.status === 200 && sqli3.json.total === 0,
  `status ${sqli3.status} total ${sqli3.json?.total}`,
);
const xss = '<img src=x onerror=alert(1)>';
await req('/profile/me', { method: 'PATCH', token: buyer, body: { bio: xss } });
const readBack = await req('/profile/me', { token: buyer });
check(
  'A03-5',
  'Payload XSS lưu nguyên văn dưới dạng text (frontend phải escape)',
  readBack.json?.bio === xss,
  'lưu đúng; cần React escape — đã kiểm tra UI dùng textarea/text',
);

// A05 — cấu hình sai / header
const h = (await req('/health')).headers;
check('A05-1', 'Không lộ X-Powered-By', !h.get('x-powered-by'), h.get('x-powered-by') ?? 'none');
check(
  'A05-2',
  'Có X-Content-Type-Options: nosniff',
  h.get('x-content-type-options') === 'nosniff',
  h.get('x-content-type-options') ?? 'missing',
);
check(
  'A05-3',
  'Có X-Frame-Options',
  !!h.get('x-frame-options'),
  h.get('x-frame-options') ?? 'missing',
);
check(
  'A05-4',
  'Có Strict-Transport-Security',
  !!h.get('strict-transport-security'),
  h.get('strict-transport-security') ??
    'missing (HSTS do nginx/proxy cấu hình — cần kiểm trên staging)',
);
check(
  'A05-5',
  'Có Content-Security-Policy trên API',
  !!h.get('content-security-policy'),
  h.get('content-security-policy') ?? 'missing',
);
const trav = await req('/uploads/..%2F..%2F.env');
check(
  'A05-6',
  'Path traversal /uploads không đọc được .env',
  trav.status === 404 || !trav.text.includes('JWT_'),
  `status ${trav.status}`,
);
const trav2 = await req('/uploads/%2e%2e/%2e%2e/package.json');
check(
  'A05-7',
  'Path traversal (encoded) không đọc được file ngoài uploads',
  trav2.status === 404 || !trav2.text.includes('"name"'),
  `status ${trav2.status}`,
);
const cors = await fetch(API + '/health', { headers: { Origin: 'https://evil.example' } });
check(
  'A05-8',
  'CORS không phản hồi cho origin lạ',
  !cors.headers.get('access-control-allow-origin') ||
    cors.headers.get('access-control-allow-origin') !== 'https://evil.example',
);

// A02 — lộ dữ liệu nhạy cảm
const me = await req('/profile/me', { token: buyer });
check(
  'A02-1',
  'Hồ sơ không lộ passwordHash',
  !('passwordHash' in (me.json ?? {})) && !me.text.includes('password_hash'),
);
const list = await req('/admin/rbac/users?pageSize=5', { token: admin });
check(
  'A02-2',
  'Danh sách người dùng không lộ passwordHash',
  !list.text.includes('passwordHash') && !list.text.includes('$2a$') && !list.text.includes('$2b$'),
);
const bad = await req('/auth/login', {
  method: 'POST',
  raw: '{"email": ',
  headers: { 'Content-Type': 'application/json' },
});
check(
  'A02-3',
  'Lỗi JSON sai không lộ stack trace',
  bad.status === 400 && !/\s+at\s+\S+\s+\(/.test(bad.text),
  `status ${bad.status}`,
);

// A08 — upload file
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);
const fd = new FormData();
fd.append(
  'file',
  new Blob(['<script>alert(document.domain)</script>'], { type: 'image/png' }),
  'evil.html',
);
const up = await fetch(API + '/profile/me/avatar', {
  method: 'POST',
  headers: { Authorization: `Bearer ${buyer}` },
  body: fd,
});
const upJson = await up.json().catch(() => ({}));
check(
  'A08-1',
  'Upload file HTML giả mạo mime image/png bị từ chối',
  up.status !== 201,
  `status ${up.status} ${upJson.avatarUrl ?? ''}`,
);
if (up.status === 201 && upJson.avatarUrl) {
  const served = await fetch(API.replace('/api/v1', '') + upJson.avatarUrl);
  check(
    'A08-2',
    'File upload không được phục vụ với content-type thực thi',
    !/text\/html/.test(served.headers.get('content-type') ?? ''),
    served.headers.get('content-type'),
  );
}
const fd2 = new FormData();
fd2.append('file', new Blob([Buffer.alloc(3 * 1024 * 1024, 1)], { type: 'image/png' }), 'big.png');
const big = await fetch(API + '/profile/me/avatar', {
  method: 'POST',
  headers: { Authorization: `Bearer ${buyer}` },
  body: fd2,
});
check('A08-3', 'Ảnh vượt 2MB bị từ chối', big.status >= 400, `status ${big.status}`);

// A07 — rate limit login (P8-02)
let limited = 0;
const N = 150;
const t0 = Date.now();
await Promise.all(
  Array.from({ length: N }, () =>
    req('/auth/login', {
      method: 'POST',
      body: { email: 'qa-buyer@kplatform.dev', password: `z-${Date.now()}` },
    }).then((r) => {
      if (r.status === 429) limited++;
    }),
  ),
);
check(
  'P8-02',
  `Rate limit đăng nhập: ${N} lần sai đồng thời có bị 429`,
  limited > 0,
  `429 count=${limited}/${N} trong ${Date.now() - t0}ms`,
);

const fails = results.filter((r) => !r.ok);
console.log(
  JSON.stringify(
    results.map((r) => ({ id: r.id, ok: r.ok, name: r.name, detail: r.detail })),
    null,
    1,
  ),
);
console.log(
  `\nTổng ${results.length} · PASS ${results.length - fails.length} · FAIL ${fails.length}`,
);
