// Kiểm thử tải P8-03/04/05 — chạy trên môi trường test (KHÔNG chạy trên staging/production).
// Cách dùng: node scripts/load/load-test.mjs <deposit|withdrawal|dispute|all>
// Biến môi trường: API (mặc định http://localhost:4000/api/v1), SEPAY_WEBHOOK_API_KEY,
// DB_URL (psql) để seed số dư/người dùng, QA_PASS (mật khẩu chung cho user QA).
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';

const API = process.env.API ?? 'http://localhost:4000/api/v1';
const SEPAY_KEY = process.env.SEPAY_WEBHOOK_API_KEY;
if (!SEPAY_KEY) throw new Error('Đặt SEPAY_WEBHOOK_API_KEY trước khi chạy kịch bản tải');
const PSQL = process.env.PSQL ?? 'docker';
const PSQL_ARGS = process.env.PSQL_ARGS?.split(' ') ?? [
  'exec',
  'kplatform-p5-pg',
  'psql',
  '-U',
  'test',
  '-d',
  'kplatform_p5',
  '-tA',
];
const QA_PASS = process.env.QA_PASS;
if (!QA_PASS)
  throw new Error('Đặt QA_PASS (mật khẩu chung của user QA) trước khi chạy kịch bản tải');
const TARGET_P95_MS = 500;

const sql = (q) => execFileSync(PSQL, [...PSQL_ARGS, '-c', q], { encoding: 'utf8' }).trim();

function pct(sorted, p) {
  if (!sorted.length) return null;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}
function summarize(name, latencies, errors, extra = {}) {
  const s = [...latencies].sort((a, b) => a - b);
  const out = {
    scenario: name,
    requests: latencies.length,
    errors,
    p50_ms: pct(s, 50),
    p95_ms: pct(s, 95),
    p99_ms: pct(s, 99),
    max_ms: s.at(-1) ?? null,
    ...extra,
  };
  out.p95_ok = out.p95_ms !== null && out.p95_ms < TARGET_P95_MS;
  return out;
}

// Chạy `tasks` (hàm trả về Promise) với tối đa `concurrency` tác vụ đồng thời.
async function pool(tasks, concurrency) {
  const results = new Array(tasks.length);
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
  return results;
}

async function call(path, { method = 'GET', token, body, raw, headers = {} } = {}) {
  const h = { ...headers };
  if (token) h.Authorization = `Bearer ${token}`;
  if (body !== undefined && !raw) h['Content-Type'] = 'application/json';
  const t0 = performance.now();
  const res = await fetch(API + path, {
    method,
    headers: h,
    body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  const ms = performance.now() - t0;
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, ms, json, text };
}

async function login(email) {
  const r = await call('/auth/login', { method: 'POST', body: { email, password: QA_PASS } });
  if (r.status !== 200) throw new Error(`login ${email} -> ${r.status} ${r.text}`);
  return r.json.accessToken;
}

// ---------- P8-03: nạp tiền (webhook SePay → cộng ví) ----------
async function scenarioDeposit({ total = 400, duplicates = 100, concurrency = 25 } = {}) {
  const buyer = await login('qa-buyer@kplatform.dev');
  const qr = await call('/payments/sepay-qr', { token: buyer });
  const code = qr.json.content.replace(/^KLP_/, '');
  const buyerId = sql(`SELECT id FROM users WHERE email='qa-buyer@kplatform.dev'`);
  const before = BigInt(sql(`SELECT balance_kpoint FROM wallets WHERE user_id='${buyerId}'`));

  const amount = 1000;
  const runId = randomBytes(4).toString('hex');
  const ids = Array.from({ length: total }, (_, i) => `qa-dep-${runId}-${i}`);
  const latencies = [];
  let errors = 0;
  let credited = 0;
  // id giao dịch SePay: số duy nhất theo lần chạy (base theo thời gian + chỉ số)
  const base = Date.now() * 1000;
  const send = (id, i) => () =>
    call('/payments/sepay-webhook', {
      method: 'POST',
      headers: { Authorization: `Apikey ${SEPAY_KEY}` },
      body: {
        id: base + i,
        content: `KLP_${code}`,
        transferAmount: amount,
        transferType: 'in',
        referenceCode: id,
      },
    });
  const tasks = ids.map((id, i) => send(id, i));
  const results = await pool(tasks, concurrency);
  for (const r of results) {
    latencies.push(r.ms);
    if (r.status !== 200) errors++;
    if (r.json?.credited) credited++;
  }
  // Replay trùng: phải KHÔNG cộng thêm
  const replay = await pool(
    ids.slice(0, duplicates).map((id, i) => send(id, i)),
    concurrency,
  );
  const replayCredited = replay.filter((r) => r.json?.credited).length;
  const after = BigInt(sql(`SELECT balance_kpoint FROM wallets WHERE user_id='${buyerId}'`));
  const expected = BigInt(credited) * BigInt(amount);
  return summarize('P8-03 nạp tiền (webhook SePay)', latencies, errors, {
    credited,
    duplicate_replays_credited: replayCredited,
    balance_delta: String(after - before),
    expected_delta: String(expected),
    ledger_consistent: after - before === expected && replayCredited === 0,
  });
}

// ---------- P8-04: rút tiền (tạo lệnh + Admin duyệt) ----------
async function createPublishers(n, startingBalance) {
  const emails = [];
  const runId = randomBytes(3).toString('hex');
  const hash = sql(`SELECT password_hash FROM users WHERE email='qa-pub@kplatform.dev'`);
  for (let i = 0; i < n; i++) {
    const email = `qa-load-${runId}-${i}@kplatform.dev`;
    sql(
      `INSERT INTO users (id,email,password_hash,active_mode,role,created_at,updated_at,trust_score,login_streak_days) VALUES (gen_random_uuid(),'${email}','${hash}','B','USER',now(),now(),100,0) ON CONFLICT DO NOTHING`,
    );
    sql(
      `INSERT INTO wallets (id,user_id,balance_kpoint,reserved_kpoint,updated_at) SELECT gen_random_uuid(), id, ${startingBalance}, 0, now() FROM users WHERE email='${email}' AND NOT EXISTS (SELECT 1 FROM wallets w WHERE w.user_id=users.id)`,
    );
    emails.push(email);
  }
  return emails;
}

async function scenarioWithdrawal({ users = 60, concurrency = 20 } = {}) {
  const emails = await createPublishers(users, 300000);
  const tokens = await pool(
    emails.map((e) => () => login(e)),
    10,
  );
  const amount = 100000;
  const reqs = await pool(
    tokens.map(
      (t) => () =>
        call('/payments/withdrawals', {
          method: 'POST',
          token: t,
          body: {
            amountKpoint: amount,
            bankId: 'MBBank',
            bankAccountNumber: '0123456789',
            bankAccountName: 'QA LOAD',
          },
        }),
    ),
    concurrency,
  );
  const reqLat = reqs.map((r) => r.ms);
  const reqErr = reqs.filter((r) => r.status >= 300).length;
  const ids = reqs.filter((r) => r.status === 201).map((r) => r.json.id);

  const adminToken = await login('qa-admin@kplatform.dev');
  const approve = await pool(
    ids.map(
      (id) => () =>
        call(`/admin/withdrawals/${id}/decision`, {
          method: 'PATCH',
          token: adminToken,
          body: { decision: 'APPROVE' },
        }),
    ),
    concurrency,
  );
  const apLat = approve.map((r) => r.ms);
  const apErr = approve.filter((r) => r.status !== 200).length;

  // Duyệt lần 2 đồng thời: chỉ được đúng 0 lần thành công (đã APPROVED)
  const twice = await pool(
    ids.slice(0, 20).map(
      (id) => () =>
        call(`/admin/withdrawals/${id}/decision`, {
          method: 'PATCH',
          token: adminToken,
          body: { decision: 'APPROVE' },
        }),
    ),
    concurrency,
  );
  const doubleOk = twice.filter((r) => r.status === 200).length;

  const ids2 = emails.map((e) => `'${e}'`).join(',');
  const wallets = sql(
    `SELECT u.email, w.balance_kpoint, w.reserved_kpoint FROM wallets w JOIN users u ON u.id=w.user_id WHERE u.email IN (${ids2})`,
  )
    .split('\n')
    .filter(Boolean);
  const bad = wallets.filter((l) => {
    const [, bal, res] = l.split('|');
    return BigInt(bal) !== BigInt(300000 - amount) || BigInt(res) !== 0n;
  });
  const createdLat = { ...summarize('P8-04 rút tiền — tạo lệnh', reqLat, reqErr) };
  const approveLat = summarize('P8-04 rút tiền — Admin duyệt', apLat, apErr, {
    approve_double_success: doubleOk,
    double_approve_ok: doubleOk === 0,
  });
  return {
    create: createdLat,
    approve: approveLat,
    wallet_invariant_violations: bad.length,
    wallets_checked: wallets.length,
  };
}

// ---------- P8-05: Dispute (tạo / đề xuất / phán quyết) ----------
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

async function scenarioDispute({ n = 20, concurrency = 10 } = {}) {
  const owner = await login('qa-buyer@kplatform.dev');
  sql(
    `UPDATE wallets SET balance_kpoint = balance_kpoint + 100000000 WHERE user_id=(SELECT id FROM users WHERE email='qa-buyer@kplatform.dev')`,
  );
  const pubs = await createPublishers(n, 1000);
  const pubTokens = await pool(
    pubs.map((e) => () => login(e)),
    10,
  );
  const cam = await call('/campaigns', {
    method: 'POST',
    token: owner,
    body: {
      title: `QA dispute ${Date.now()}`,
      platform: 'GOOGLE_MAPS',
      totalSlots: n,
      rewardPerSlot: 10000,
      dripFeedLimit: n,
    },
  });
  if (cam.status !== 201) throw new Error(`tạo campaign lỗi ${cam.status} ${cam.text}`);
  const campaignId = cam.json.id;

  // Setup: apply → invite → proof → reject (không đo tải ở bước này)
  const subs = await pool(
    pubTokens.map((t, i) => async () => {
      // Mỗi người dùng một IP giả lập (X-Forwarded-For, backend bật trust proxy) — tránh chặn multi-account P3-11 do mọi user test cùng localhost.
      const a = await call(`/campaigns/${campaignId}/apply`, {
        method: 'POST',
        token: t,
        headers: { 'X-Forwarded-For': `10.200.${Math.floor(i / 250)}.${(i % 250) + 1}` },
        body: { fingerprint: `qa-dis-${campaignId}-${i}`, surveyAnswers: {} },
      });
      if (a.status !== 201) throw new Error(`apply ${a.status} ${a.text}`);
      await call(`/campaigns/${campaignId}/applicants/${a.json.id}`, {
        method: 'PATCH',
        token: owner,
        body: { action: 'INVITE' },
      });
      const fd = new FormData();
      fd.append('file', new Blob([TINY_PNG], { type: 'image/png' }), 'p.png');
      const p = await fetch(`${API}/submissions/${a.json.id}/proof`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}` },
        body: fd,
      });
      if (p.status !== 201) throw new Error(`proof ${p.status}`);
      const rej = await call(`/submissions/${a.json.id}/decision`, {
        method: 'PATCH',
        token: owner,
        body: { action: 'REJECT', reason: 'QA load' },
      });
      if (rej.status !== 200) throw new Error(`reject ${rej.status}`);
      return { subId: a.json.id, token: t };
    }),
    5,
  );

  // ĐO TẢI 1: Bên B mở khiếu nại đồng thời
  const create = await pool(
    subs.map(
      (s) => () =>
        call('/disputes', {
          method: 'POST',
          token: s.token,
          body: { submissionId: s.subId, reason: 'QA load dispute' },
        }),
    ),
    concurrency,
  );
  const createLat = create.map((r) => r.ms);
  const createErr = create.filter((r) => r.status !== 201).length;
  const disputes = create.filter((r) => r.status === 201).map((r) => r.json.id);
  // Mở trùng 1 submission (đồng thời) — chỉ được 1
  const dup = await pool(
    subs.slice(0, 5).map(
      (s) => () =>
        call('/disputes', {
          method: 'POST',
          token: s.token,
          body: { submissionId: s.subId, reason: 'dup' },
        }),
    ),
    5,
  );
  const dupOk = dup.filter((r) => r.status === 201).length;

  // ĐO TẢI 2: Moderator đề xuất (cần quyền disputes:UPDATE — qa-mod có sẵn)
  const modToken = await login('qa-mod@kplatform.dev');
  const rec = await pool(
    disputes.map(
      (id) => () =>
        call(`/mod/disputes/${id}/recommend`, {
          method: 'PUT',
          token: modToken,
          body: { recommendation: 'PEND_APP' },
        }),
    ),
    concurrency,
  );
  const recLat = rec.map((r) => r.ms);
  const recErr = rec.filter((r) => r.status !== 200).length;

  // ĐO TẢI 3: Admin phán quyết
  const adminToken = await login('qa-admin@kplatform.dev');
  const res = await pool(
    disputes.map(
      (id) => () =>
        call(`/admin/disputes/${id}/resolve`, {
          method: 'POST',
          token: adminToken,
          body: { decision: 'APPROVE' },
        }),
    ),
    concurrency,
  );
  const resLat = res.map((r) => r.ms);
  const resErr = res.filter((r) => r.status !== 200 && r.status !== 201).length;

  const open = Number(
    sql(
      `SELECT count(*) FROM disputes WHERE id IN (${disputes.map((d) => `'${d}'`).join(',') || "''"}) AND status = 'OPEN'`,
    ),
  );
  return {
    create: summarize('P8-05 Dispute — tạo khiếu nại', createLat, createErr, {
      created: disputes.length,
      duplicate_open_accepted: dupOk,
      duplicate_ok: dupOk === 0,
    }),
    recommend: summarize('P8-05 Dispute — Moderator đề xuất', recLat, recErr),
    resolve: summarize('P8-05 Dispute — Admin phán quyết', resLat, resErr),
    disputes_not_closed_after_resolve: open,
  };
}

const which = process.argv[2] ?? 'all';
const report = {};
if (which === 'deposit' || which === 'all')
  report.deposit = await scenarioDeposit({
    total: Number(process.argv[3]) || 400,
    concurrency: Number(process.argv[4]) || 25,
  });
if (which === 'withdrawal' || which === 'all') report.withdrawal = await scenarioWithdrawal();
if (which === 'dispute' || which === 'all') report.dispute = await scenarioDispute();
console.log(JSON.stringify(report, null, 2));
