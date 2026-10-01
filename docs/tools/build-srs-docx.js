// Build SRS_K-PLATFORM-v1.0.docx from the standardized SRS content.
// Run: node docs/tools/build-srs-docx.js
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, ImageRun, Header, Footer, PageNumber,
  TableOfContents, ShadingType, VerticalAlign, PageBreak, PageOrientation,
  LevelFormat, convertInchesToTwip, ExternalHyperlink, LineRuleType,
} = require("docx");

const ROOT = path.resolve(__dirname, "..", "..");
const ASSETS = path.join(ROOT, "docs", "assets");
const DIAGRAMS = path.join(ROOT, "docs", "diagrams", "out");

const NAVY = "1d4e89";
const NAVY_DARK = "13324f";
const BLUE = "2f6ca2";
const GOLD = "e8a93a";
const LIGHT_BG = "eaf1f8";
const TEXT_DARK = "1a1a1a";

function img(file, w, h) {
  return fs.readFileSync(path.join(DIAGRAMS, file)).buffer
    ? { data: fs.readFileSync(path.join(DIAGRAMS, file)), w, h }
    : null;
}
function loadImg(absPath) {
  return fs.readFileSync(absPath);
}

// ---- native pixel sizes (from `identify`) ----
const NATIVE = {
  "role-hierarchy.png": [4200, 573],
  "flow-advertiser.png": [4200, 345],
  "flow-publisher.png": [4200, 483],
  "flow-payment.png": [4200, 654],
  "flow-dispute.png": [4200, 378],
  "erd.png": [3108, 4200],
  "seq-switch-mode.png": [4200, 1788],
  "seq-sepay-topup.png": [4200, 2058],
  "seq-bmc-topup-approval.png": [4200, 2271],
  "seq-campaign-creation.png": [4200, 1854],
  "seq-submission-auto-approve.png": [4200, 2229],
  "seq-dispute-lifecycle.png": [4200, 2100],
};

function fitBox(name, maxW, maxH) {
  const [nw, nh] = NATIVE[name];
  const scale = Math.min(maxW / nw, maxH / nh);
  return { width: Math.round(nw * scale), height: Math.round(nh * scale) };
}

// Landscape content box (A4 landscape, 0.6in margins): ~ 10.47in x 7.47in -> px@96dpi
const MAXW = 900;
const MAXH = 560;

function diagram(name, caption, maxW = MAXW, maxH = MAXH) {
  const size = fitBox(name, maxW, maxH);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 160, after: 80 },
      children: [
        new ImageRun({
          data: loadImg(path.join(DIAGRAMS, name)),
          transformation: size,
          type: "png",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({ text: caption, italics: true, size: 18, color: "555555" }),
      ],
    }),
  ];
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    outlineLevel: 0,
    spacing: { before: 320, after: 160 },
    children: [new TextRun({ text })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    outlineLevel: 1,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text })],
  });
}
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    outlineLevel: 2,
    spacing: { before: 180, after: 100 },
    children: [new TextRun({ text })],
  });
}
function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 160 },
    children: Array.isArray(text)
      ? text
      : [new TextRun({ text, ...opts })],
  });
}
function bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullet-list", level: 0 },
    spacing: { after: 100 },
    children: [new TextRun({ text })],
  });
}
function note(text) {
  return new Paragraph({
    spacing: { before: 80, after: 200 },
    shading: { type: ShadingType.CLEAR, fill: "FDF1DD" },
    border: {
      left: { style: BorderStyle.SINGLE, size: 18, color: GOLD },
    },
    indent: { left: 160 },
    children: [new TextRun({ text, italics: true, size: 20, color: "6b4e14" })],
  });
}

function cell(text, { header = false, width, bold = false, size = 19, align = AlignmentType.LEFT, shade } = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: header
      ? { type: ShadingType.CLEAR, fill: NAVY }
      : shade
      ? { type: ShadingType.CLEAR, fill: shade }
      : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: (Array.isArray(text) ? text : [text]).map((line) =>
      new Paragraph({
        alignment: align,
        children: [
          new TextRun({
            text: line,
            bold: header || bold,
            color: header ? "FFFFFF" : TEXT_DARK,
            size,
          }),
        ],
      })
    ),
  });
}

function dataTable(headers, rows, ratios, totalWidth = 13000) {
  const widths = ratios.map((r) => Math.round((r / ratios.reduce((a, b) => a + b, 0)) * totalWidth));
  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: headers.map((hd, i) => cell(hd, { header: true, width: widths[i] })),
      }),
      ...rows.map(
        (r, ri) =>
          new TableRow({
            cantSplit: true,
            children: r.map((val, i) =>
              cell(val, { width: widths[i], shade: ri % 2 === 1 ? "F4F7FB" : undefined })
            ),
          })
      ),
    ],
  });
}

// ---------------------------------------------------------------------------
// Header / Footer (branding on every page)
// ---------------------------------------------------------------------------
const logoBuf = loadImg(path.join(ASSETS, "kplatform-logo-trimmed.png"));

function buildHeader() {
  return new Header({
    children: [
      new Paragraph({
        tabStops: [{ type: "right", position: convertInchesToTwip(10.0) }],
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: NAVY } },
        spacing: { after: 120 },
        children: [
          new ImageRun({ data: logoBuf, transformation: { width: 22, height: 22 }, type: "png" }),
          new TextRun({ text: "   K-POINT PLATFORM", bold: true, color: NAVY, size: 20 }),
          new TextRun({ text: "\tSRS — Official Specification", italics: true, color: "666666", size: 18 }),
        ],
      }),
    ],
  });
}

function buildFooter() {
  return new Footer({
    children: [
      new Paragraph({
        tabStops: [{ type: "right", position: convertInchesToTwip(10.0) }],
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" } },
        spacing: { before: 80 },
        children: [
          new TextRun({ text: "Tháng 10 / 2026 · Document Edition v1.0", size: 16, color: "888888" }),
          new TextRun({ text: "\tTrang ", size: 16, color: "888888" }),
          new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "888888" }),
          new TextRun({ text: " / ", size: 16, color: "888888" }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: "888888" }),
        ],
      }),
    ],
  });
}

// ---------------------------------------------------------------------------
// Title page
// ---------------------------------------------------------------------------
const titlePageChildren = [
  new Paragraph({ spacing: { before: 400 }, children: [] }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new ImageRun({ data: loadImg(path.join(ASSETS, "kplatform-logo.png")), transformation: { width: 150, height: 150 }, type: "png" })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 300 },
    children: [new TextRun({ text: "K-POINT PLATFORM", bold: true, size: 56, color: NAVY })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 300 },
    children: [new TextRun({ text: "Nền tảng Kết nối Khảo sát & Trải nghiệm Thực tế", italics: true, size: 30, color: BLUE })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text: "TÀI LIỆU ĐẶC TẢ YÊU CẦU PHẦN MỀM (SRS)", bold: true, size: 32, color: TEXT_DARK })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 500 },
    children: [new TextRun({ text: "Document Edition v1.0  ·  Nội dung tham chiếu: SRS v2.0 (Official Specification)", size: 22, color: "555555" })],
  }),
  dataTable(
    ["Dữ liệu", "Thông tin chi tiết"],
    [
      ["Tên dự án", "Nền tảng KPoint Platform (Web/App Cross-Platform)"],
      ["Nội dung gốc tham chiếu", "SRS v2.0 (Official Specification)"],
      ["Phiên bản tài liệu (Edition)", "v1.0 — Chuẩn hóa định dạng, bổ sung Branding, Mục lục, User Flow & Sequence Diagram"],
      ["Ngày cập nhật", "Tháng 10 / 2026"],
      ["Tác giả", "Chuyên viên Phân tích Hệ thống (System Analyst)"],
      ["Trạng thái", "Đã phê duyệt kiến trúc & Sẵn sàng bàn giao Dev"],
    ],
    [3, 6],
    9000
  ),
  new Paragraph({ children: [new PageBreak()] }),
];

// ---------------------------------------------------------------------------
// TOC page
// ---------------------------------------------------------------------------
const tocPageChildren = [
  h1("Mục lục"),
  new TableOfContents("Mục lục", {
    hyperlink: true,
    headingStyleRange: "1-3",
  }),
  new Paragraph({ children: [new PageBreak()] }),
];

// ---------------------------------------------------------------------------
// Body content (landscape)
// ---------------------------------------------------------------------------
const body = [];

body.push(h1("Thông tin tài liệu & Lịch sử phiên bản"));
body.push(
  dataTable(
    ["Dữ liệu", "Thông tin chi tiết"],
    [
      ["Tên dự án", "Nền tảng KPoint Platform (Web/App Cross-Platform)"],
      ["Nội dung gốc tham chiếu", "SRS v2.0 (Official Specification)"],
      ["Phiên bản tài liệu (Edition)", "v1.0 — Bản chuẩn hóa, bổ sung Branding, Mục lục, User Flow & Sequence Diagram"],
      ["Ngày cập nhật", "Tháng 10 / 2026"],
      ["Tác giả", "Chuyên viên Phân tích Hệ thống (System Analyst)"],
      ["Trạng thái", "Đã phê duyệt kiến trúc & Sẵn sàng bàn giao Dev"],
    ],
    [3, 7]
  )
);
body.push(p(""));
body.push(
  dataTable(
    ["Phiên bản", "Ngày", "Mô tả thay đổi"],
    [
      ["SRS v2.0", "Tháng 10 / 2026", "Bản đặc tả gốc: Tổng quan, RBAC, Thanh toán quốc tế, Audit Logs, Screen/Function/API List, Database Schema."],
      ["Document Edition v1.0", "Tháng 10 / 2026", "Chuẩn hóa định dạng theo khung SRS chuẩn, thêm Branding header, Mục lục liên kết, User Flow (4 luồng) và Sequence Diagram (6 luồng kỹ thuật)."],
    ],
    [2, 2, 6]
  )
);
body.push(new Paragraph({ children: [new PageBreak()] }));

// I. Tổng quan
body.push(h1("I. Tổng quan nền tảng & Mô hình tài chính"));
body.push(
  p(
    "Nền tảng KPoint là ứng dụng kết nối trung gian giữa Doanh nghiệp/Cá nhân có nhu cầu gia tăng feedback/review thực tế (Bên A) và Người tiêu dùng trải nghiệm sản phẩm/dịch vụ (Bên B). Hệ thống ưu tiên phát triển 100% Web Responsive trong giai đoạn 1, đồng thời mở rộng ứng dụng di động (React Native) trong giai đoạn tiếp theo."
  )
);
body.push(h3("1. Đơn vị tiền tệ nội bộ"));
body.push(bullet("Sử dụng đơn vị tiền tệ duy nhất: KPoint (Tỷ lệ quy đổi tiêu chuẩn: 1 KPoint = 1 VNĐ, có thể điều chỉnh tỷ giá linh hoạt trong CMS Admin)."));
body.push(bullet("Phí khởi tạo Campaign: 50.000 – 100.000 KPoint (Cấu hình bởi Admin)."));
body.push(h3("2. Mô hình & Phương thức Thanh toán"));
body.push(bullet("Thanh toán Nội địa (Tự động 24/7): Tích hợp cổng SePay qua mã QR chuyển khoản ngân hàng. Webhook SePay gạch nợ tự động và cộng KPoint vào Ví ngay lập tức."));
body.push(bullet("Thanh toán Quốc tế (Duyệt thủ công): Tích hợp luồng nạp điểm qua Buy Me a Coffee. Doanh nghiệp thực hiện thanh toán USD qua Buy Me a Coffee, nhập mã giao dịch (Transaction ID) và tải ảnh Hóa đơn/Receipt lên hệ thống. Đội ngũ Quản trị viên (Party C) kiểm tra, đối soát và phê duyệt cộng KPoint thủ công."));
body.push(new Paragraph({ children: [new PageBreak()] }));

// II. RBAC
body.push(h1("II. Hệ thống phân quyền (RBAC & Switch Mode)"));
body.push(
  p(
    "Hệ thống áp dụng Phân quyền dựa trên Vai trò (Role-Based Access Control). Cả Bên A và Bên B có thể dùng chung 1 tài khoản và sử dụng tính năng Switch Mode linh hoạt."
  )
);
body.push(...diagram("role-hierarchy.png", "Hình 1 — Sơ đồ phân cấp vai trò RBAC & Switch Mode", 820, 260));
body.push(
  dataTable(
    ["Role / Nhóm", "Quyền hạn & Phạm vi Thao tác", "Ràng buộc & Quy tắc Bảo mật"],
    [
      ["Bên A (Advertiser)", "Tạo Campaign, nạp KPoint, thiết lập Survey màng lọc, duyệt/từ chối Proof của Bên B.", "Không có quyền xóa Campaign cũ (chỉ Archive). Tiền tạm khóa ngay khi Active."],
      ["Bên B (Publisher)", "Làm Survey ứng tuyển, thực hiện Review, nộp Proof (ảnh/video), rút KPoint, Khiếu nại (Dispute).", "Chỉ nhận tối đa 1 slot/campaign. Ảnh proof tự động bị chèn Watermark định danh."],
      ["Switch Mode", "Chuyển đổi qua lại giữa giao diện Bên A và Bên B chỉ với 1 thao tác bấm nút.", "Ví KPoint dùng chung. Lịch sử giao dịch tách biệt theo chế độ."],
      ["Root Administrator", "Toàn quyền hệ thống. Phân quyền, nâng/hạ cấp các Admin khác, can thiệp mọi tài nguyên.", "Hard-code ID trong DB, không thể bị xóa khỏi hệ thống bởi bất kỳ API nào."],
      ["Administrator", "Cấu hình hệ thống, phê duyệt thanh toán Buy Me a Coffee, chốt phán quyết khiếu nại (Dispute).", "Quyết định cuối cùng trong việc cộng/trừ KPoint tranh chấp."],
      ["Super / Moderator", "Quản lý Campaign được phân công, thẩm định các ca khiếu nại (Dispute).", "Chỉ được chuyển trạng thái sang Pend Approval / Pend Reject. Không trực tiếp duyệt chi."],
    ],
    [2, 4, 4]
  )
);
body.push(new Paragraph({ children: [new PageBreak()] }));

// III. Payment + Audit
body.push(h1("III. Đặc tả tính năng mở rộng: Thanh toán quốc tế & Audit Logs"));
body.push(h3("1. Quy trình Thanh toán Quốc tế via Buy Me a Coffee (Duyệt thủ công)"));
[
  "Khởi tạo: Bên A truy cập trang Nạp KPoint → Chọn phương thức Buy Me a Coffee (International).",
  "Hướng dẫn & Nhập liệu: Hệ thống hiển thị liên kết Buy Me a Coffee của nền tảng + Tỷ giá quy đổi USD/KPoint. Bên A thực hiện thanh toán trên Buy Me a Coffee, tải ảnh Hóa đơn/Receipt và nhập Transaction ID vào Form.",
  "Chờ xác nhận: Yêu cầu nạp tiền chuyển sang trạng thái PENDING_MANUAL_VERIFICATION.",
  "Đối soát CMS: Admin nhận thông báo, mở màn hình CMS Duyệt Thanh toán Quốc tế, đối soát biến động trên tài khoản Buy Me a Coffee thực tế.",
  "Thực thi — Approve: Admin bấm Phê duyệt → Hệ thống thực hiện ACID Transaction cộng KPoint vào ví Bên A, gửi email thông báo và ghi Audit Log. Reject: Admin bấm Từ chối kèm lý do → Hệ thống gửi thông báo hủy giao dịch cho Bên A.",
].forEach((t, i) => body.push(p([new TextRun({ text: `${i + 1}. `, bold: true }), new TextRun({ text: t })])));
body.push(note("Xem chi tiết kỹ thuật tại Sequence Diagram 9.3 — Nạp & Duyệt Buy Me a Coffee."));

body.push(h3("2. Màn hình Quản lý Audit Logs (Nhật ký Hệ thống)"));
body.push(p("Nhật ký Audit Logs ghi lại toàn bộ các thao tác nhạy cảm của Quản trị viên, Moderator và biến động tài chính của người dùng nhằm phục vụ công tác truy vết và bảo mật."));
body.push(
  dataTable(
    ["Thành phần Màn hình", "Đặc tả Chi tiết & Chức năng"],
    [
      ["Bộ lọc Tra cứu (Filters)", "Lọc theo Khoảng thời gian, User ID / Email, Role, Loại hành động (CREATE, UPDATE, DELETE, DISPUTE_RESOLVE, MANUAL_TOPUP), Mức độ cảnh báo (INFO, WARNING, CRITICAL)."],
      ["Bảng hiển thị Nhật ký", "Hiển thị Timestamp, Actor (Người thực hiện), Target Resource (Tài nguyên bị tác động), Action Type, IP Address, Device Fingerprint, Old Value vs New Value (JSON Diff)."],
      ["Màn hình Chi tiết (Log Detail)", "Pop-up xem toàn bộ payload JSON request/response, địa chỉ IP, User-Agent, và dữ liệu so sánh chi tiết trước/sau khi thay đổi."],
      ["Cảnh báo Bất thường", "Đánh dấu màu đỏ đối với các hành vi CRITICAL: Hạ cấp Admin, Thay đổi số dư thủ công, Duyệt khiếu nại giá trị lớn, Đăng nhập từ IP lạ."],
    ],
    [3, 7]
  )
);
body.push(new Paragraph({ children: [new PageBreak()] }));

// IV. Screen list
body.push(h1("IV. Danh sách màn hình (Screen List)"));
body.push(
  dataTable(
    ["Mã MH", "Tên Màn hình", "Phân vùng", "Mô tả Chức năng Màn hình"],
    [
      ["SCR-01", "Trang chủ & Public Campaigns", "End-User", "Hiển thị danh sách chiến dịch nổi bật, thanh tìm kiếm, bộ lọc nền tảng (Google Maps / Facebook)."],
      ["SCR-02", "Đăng ký / Đăng nhập / OAuth", "End-User", "Đăng nhập email/pass, Google/Facebook OAuth2, quên mật khẩu."],
      ["SCR-03", "Dashboard Bên A (Advertiser)", "Bên A", "Thống kê Campaign, tổng KPoint đã chi, lượt review hoàn thành, lối tắt tạo camp."],
      ["SCR-04", "Tạo Campaign & Survey Filter", "Bên A", "Form cấu hình yêu cầu review, cài đặt Drip-feed, tạo câu hỏi Survey sàng lọc Bên B."],
      ["SCR-05", "Quản lý Campaign & Appliers", "Bên A", "Xem danh sách Bên B nộp Survey, bấm Invite/Reject, duyệt Proof bài viết."],
      ["SCR-06", "Dashboard Bên B (Publisher)", "Bên B", "Thống kê KPoint kiếm được, nhiệm vụ đang làm, số dư ví khả dụng."],
      ["SCR-07", "Làm Survey & Submit Proof", "Bên B", "Form trả lời survey ứng tuyển, form tải lên hình ảnh/video bằng chứng review."],
      ["SCR-08", "Quản lý Ví & Nạp/Rút KPoint", "End-User", "Nạp SePay QR, Nạp Buy Me a Coffee (upload receipt), lập lệnh rút tiền về ngân hàng."],
      ["SCR-09", "CMS Overview & Thống kê", "Admin/Mod", "Tổng quan KPoint lưu thông, số lượt review/ngày, doanh thu phí khởi tạo."],
      ["SCR-10", "CMS Duyệt Nạp Tiền Quốc Tế", "Admin", "Danh sách giao dịch Buy Me a Coffee chờ duyệt, xem file đính kèm receipt, Approve/Reject."],
      ["SCR-11", "CMS Tranh chấp (Dispute Center)", "Mod/Admin", "Xem chứng cứ 2 bên, Moderator chọn Pend App/Reject, Admin duyệt phán quyết."],
      ["SCR-12", "CMS Quản lý RBAC & Root Admin", "Root/Admin", "Tạo role, gán permission, gán quyền Admin/Mod, phân công Campaign cho Mod."],
      ["SCR-13", "CMS Quản lý Audit Logs", "Admin/Root", "Màn hình tra cứu nhật ký thao tác toàn hệ thống, bộ lọc nâng cao, JSON viewer."],
    ],
    [1.2, 3, 1.5, 4.3]
  )
);

// V. Function list
body.push(h1("V. Danh sách chức năng (Function List)"));
body.push(
  dataTable(
    ["Mã FN", "Tên Chức năng", "Actor", "Mô tả Chi tiết Luồng Xử lý Kỹ thuật"],
    [
      ["FN-AUTH-01", "Switch Role Mode", "Bên A / B", "Chuyển đổi context làm việc giữa Advertiser và Publisher mà không thay đổi Session JWT."],
      ["FN-PAY-01", "Nạp SePay Tự động", "Bên A", "Tạo mã QR VietQR kèm nội dung KPOINT <UserID>. Webhook SePay gọi API tự động cộng điểm."],
      ["FN-PAY-02", "Nạp BuyMeACoffee", "Bên A", "Lưu Form thông tin thanh toán quốc tế + ảnh receipt. Đẩy trạng thái PENDING_VERIFY cho Admin."],
      ["FN-PAY-03", "Duyệt Nạp Quốc tế", "Admin", "Admin xem ảnh receipt, bấm Duyệt → Hệ thống gọi Transaction ACID cộng balance KPoint."],
      ["FN-CAMP-01", "Khởi tạo Campaign", "Bên A", "Tính Tổng KPoint = Phí tạo + (Slots × Price). Khóa số dư trong Wallet, lưu cấu hình Drip-feed."],
      ["FN-CAMP-02", "Ứng tuyển Survey", "Bên B", "Kiểm tra Fingerprint, IP, Trust Score. Lưu câu trả lời survey + ảnh hóa đơn trải nghiệm."],
      ["FN-TASK-01", "Nộp Proof & Watermark", "Bên B", "Tải lên ảnh/video review. Backend tự động đóng dấu chèn mã UserID + CampaignID lên file."],
      ["FN-TASK-02", "Auto-Approve 48h", "System", "Cronjob chạy định kỳ kiểm tra task quá 48h chưa duyệt → Tự động Approve và trả thưởng."],
      ["FN-DISP-01", "Tạo Khiếu nại (Dispute)", "Bên B", "Kích hoạt khi Bên A từ chối. Phong tỏa tiền slot, tạo Ticket tranh chấp chuyển cho Moderator."],
      ["FN-DISP-02", "Thẩm định Tranh chấp", "Moderator", "Xem bằng chứng 2 bên, chọn Pend Approval hoặc Pend Reject. Gửi thông báo cho Admin."],
      ["FN-DISP-03", "Phán quyết Tranh chấp", "Admin", "Chốt phán quyết cuối cùng. Giải phóng KPoint bị phong tỏa về Ví của Bên A hoặc Bên B."],
      ["FN-LOG-01", "Ghi Audit Logs", "System", "Interceptor bắt các sự kiện Mutation (POST/PUT/DELETE/DISPUTE), lưu chi tiết JSON Diff và IP."],
    ],
    [1.2, 2, 1.3, 4.5]
  )
);
body.push(new Paragraph({ children: [new PageBreak()] }));

// VI. API list
body.push(h1("VI. Danh sách API Endpoints (API List)"));
body.push(
  dataTable(
    ["Method", "Endpoint URL", "Auth / Role", "Input / Body Payload", "Output / Response Payload"],
    [
      ["POST", "/api/v1/auth/switch-mode", "JWT (User)", '{ "targetRole": "A"|"B" }', '{ "success": true, "activeRole": "A" }'],
      ["POST", "/api/v1/payments/sepay-webhook", "API Key", "SePay Webhook Payload", '{ "status": 200, "credited": true }'],
      ["POST", "/api/v1/payments/bmc-topup", "JWT (Bên A)", '{ "amountUsd": 50, "txnId": "BMC123", "receiptUrl": "..." }', '{ "topupId": "TP-99", "status": "PENDING" }'],
      ["POST", "/api/v1/admin/payments/bmc/:id/approve", "JWT (Admin)", '{ "note": "Đã đối soát ví BMC" }', '{ "success": true, "newBalance": 1250000 }'],
      ["POST", "/api/v1/campaigns", "JWT (Bên A)", "Campaign JSON config & Survey", '{ "campaignId": "CP-101", "reservedPoints": 550000 }'],
      ["POST", "/api/v1/campaigns/:id/apply", "JWT (Bên B)", '{ "surveyAnswers": [...], "billProofUrl": "..." }', '{ "applicationId": "AP-88", "status": "PENDING" }'],
      ["POST", "/api/v1/submissions/:id/proof", "JWT (Bên B)", "Multipart: image/video", '{ "proofId": "PR-55", "watermarkedUrl": "..." }'],
      ["POST", "/api/v1/disputes", "JWT (Bên B)", '{ "submissionId": "PR-55", "reason": "Duyệt sai" }', '{ "disputeId": "DSP-12", "status": "OPEN" }'],
      ["PUT", "/api/v1/mod/disputes/:id/recommend", "JWT (Mod)", '{ "recommendation": "PEND_APP"|"PEND_REJ" }', '{ "disputeId": "DSP-12", "status": "RECOMMENDED" }'],
      ["POST", "/api/v1/admin/disputes/:id/resolve", "JWT (Admin)", '{ "decision": "APPROVE"|"REJECT" }', '{ "disputeId": "DSP-12", "resolved": true }'],
      ["GET", "/api/v1/admin/audit-logs", "JWT (Admin)", "Query: page, actorId, action, level", '{ "logs": [...], "total": 1420 }'],
    ],
    [0.7, 2.4, 1.1, 2.6, 2.2],
    13200
  )
);
body.push(new Paragraph({ children: [new PageBreak()] }));

// VII. DB schema
body.push(h1("VII. Thiết kế cơ sở dữ liệu cốt lõi (Database Schema)"));
body.push(...diagram("erd.png", "Hình 2 — Sơ đồ ERD (Entity-Relationship Diagram) cơ sở dữ liệu cốt lõi", 560, 540));
body.push(
  dataTable(
    ["Tên Bảng (Table)", "Các Trường Cốt lõi (Key Fields)", "Khóa ngoại & Khóa chính (PK/FK)"],
    [
      ["users", "id, email, password_hash, active_mode, is_root, trust_score, fingerprint_hash", "PK: id"],
      ["roles_permissions", "id, role_name, permission_code", "PK: id"],
      ["wallets", "id, user_id, balance_kpoint, reserved_kpoint, updated_at", "PK: id, FK: user_id → users.id"],
      ["bmc_topups", "id, user_id, amount_usd, kpoint_amount, txn_id, receipt_url, status, verified_by", "PK: id, FK: user_id, verified_by → users.id"],
      ["campaigns", "id, owner_id, platform, total_slots, reward_per_slot, drip_feed_limit, status", "PK: id, FK: owner_id → users.id"],
      ["submissions", "id, campaign_id, publisher_id, proof_url, watermark_url, status, auto_approve_at", "PK: id, FK: campaign_id, publisher_id"],
      ["disputes", "id, submission_id, mod_id, mod_recommendation, admin_id, final_decision, status", "PK: id, FK: submission_id, mod_id, admin_id"],
      ["audit_logs", "id, actor_id, target_resource, action_type, level, payload_before, payload_after, ip", "PK: id, FK: actor_id → users.id"],
    ],
    [1.6, 4.5, 2.9]
  )
);
body.push(new Paragraph({ children: [new PageBreak()] }));

// VIII. User flows
body.push(h1("VIII. User Flows (Luồng nghiệp vụ người dùng)"));
body.push(note("Phần bổ sung mới trong Document Edition v1.0, minh họa trải nghiệm đầu-cuối (end-to-end) của từng actor dựa trên các đặc tả Section I–VII."));

body.push(h2("8.1. Luồng Bên A — Advertiser"));
body.push(...diagram("flow-advertiser.png", "Hình 3 — User Flow: Bên A (Advertiser)"));

body.push(h2("8.2. Luồng Bên B — Publisher"));
body.push(...diagram("flow-publisher.png", "Hình 4 — User Flow: Bên B (Publisher)"));

body.push(h2("8.3. Luồng Nạp KPoint (SePay & Buy Me a Coffee)"));
body.push(...diagram("flow-payment.png", "Hình 5 — User Flow: Nạp KPoint (Nội địa & Quốc tế)"));

body.push(h2("8.4. Luồng Xử lý Khiếu nại (Dispute)"));
body.push(...diagram("flow-dispute.png", "Hình 6 — User Flow: Xử lý Khiếu nại (Dispute)"));
body.push(new Paragraph({ children: [new PageBreak()] }));

// IX. Sequence diagrams
body.push(h1("IX. Sequence Diagrams (Luồng xử lý kỹ thuật)"));
body.push(note("Phần bổ sung mới trong Document Edition v1.0, mô tả tương tác giữa Frontend, Backend API, các dịch vụ bên thứ ba (SePay, Buy Me a Coffee) và cơ sở dữ liệu cho từng chức năng tại Section V."));

body.push(h2("9.1. Switch Role Mode"));
body.push(p("Tương ứng FN-AUTH-01.", { italics: true, size: 19, color: "555555" }));
body.push(...diagram("seq-switch-mode.png", "Hình 7 — Sequence Diagram: Switch Role Mode"));

body.push(h2("9.2. Nạp SePay tự động"));
body.push(p("Tương ứng FN-PAY-01.", { italics: true, size: 19, color: "555555" }));
body.push(...diagram("seq-sepay-topup.png", "Hình 8 — Sequence Diagram: Nạp SePay tự động"));

body.push(h2("9.3. Nạp & Duyệt Buy Me a Coffee"));
body.push(p("Tương ứng FN-PAY-02, FN-PAY-03.", { italics: true, size: 19, color: "555555" }));
body.push(...diagram("seq-bmc-topup-approval.png", "Hình 9 — Sequence Diagram: Nạp & Duyệt Buy Me a Coffee"));

body.push(h2("9.4. Khởi tạo Campaign"));
body.push(p("Tương ứng FN-CAMP-01.", { italics: true, size: 19, color: "555555" }));
body.push(...diagram("seq-campaign-creation.png", "Hình 10 — Sequence Diagram: Khởi tạo Campaign"));

body.push(h2("9.5. Nộp Proof & Auto-Approve 48h"));
body.push(p("Tương ứng FN-CAMP-02, FN-TASK-01, FN-TASK-02.", { italics: true, size: 19, color: "555555" }));
body.push(...diagram("seq-submission-auto-approve.png", "Hình 11 — Sequence Diagram: Nộp Proof & Auto-Approve 48h"));

body.push(h2("9.6. Vòng đời Dispute"));
body.push(p("Tương ứng FN-DISP-01, FN-DISP-02, FN-DISP-03.", { italics: true, size: 19, color: "555555" }));
body.push(...diagram("seq-dispute-lifecycle.png", "Hình 12 — Sequence Diagram: Vòng đời Dispute"));

body.push(
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 400 },
    children: [new TextRun({ text: "© 2026 K-Point Platform — Tài liệu nội bộ, bảo mật theo chính sách công ty.", italics: true, size: 18, color: "888888" })],
  })
);

// ---------------------------------------------------------------------------
// Assemble document
// ---------------------------------------------------------------------------
const PORTRAIT_SIZE = { width: 11906, height: 16838 };
const MARGIN_PORTRAIT = { top: 900, bottom: 900, left: 1134, right: 1134, header: 420, footer: 420 };
const MARGIN_LANDSCAPE = { top: 720, bottom: 720, left: 850, right: 850, header: 380, footer: 380 };

const doc = new Document({
  creator: "K-Point Platform",
  title: "K-Point Platform — SRS v1.0",
  description: "Software Requirements Specification — K-Point Platform",
  features: { updateFields: true },
  styles: {
    default: {
      document: { run: { font: "Calibri", size: 21 }, paragraph: { spacing: { line: 280, lineRule: LineRuleType.AUTO } } },
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { bold: true, size: 30, color: NAVY, font: "Calibri" },
        paragraph: { spacing: { before: 320, after: 160 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: GOLD, space: 4 } } },
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { bold: true, size: 25, color: BLUE, font: "Calibri" },
        paragraph: { spacing: { before: 240, after: 120 } },
      },
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { bold: true, size: 22, color: NAVY_DARK, font: "Calibri" },
        paragraph: { spacing: { before: 180, after: 100 } },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: "bullet-list",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 420, hanging: 260 } } } }],
      },
    ],
  },
  sections: [
    {
      properties: { page: { size: PORTRAIT_SIZE, margin: MARGIN_PORTRAIT } },
      headers: { default: buildHeader() },
      footers: { default: buildFooter() },
      children: titlePageChildren,
    },
    {
      properties: { page: { size: PORTRAIT_SIZE, margin: MARGIN_PORTRAIT } },
      headers: { default: buildHeader() },
      footers: { default: buildFooter() },
      children: tocPageChildren,
    },
    {
      properties: {
        page: {
          size: { ...PORTRAIT_SIZE, orientation: PageOrientation.LANDSCAPE },
          margin: MARGIN_LANDSCAPE,
        },
      },
      headers: { default: buildHeader() },
      footers: { default: buildFooter() },
      children: body,
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  const outPath = path.join(ROOT, "SRS_K-PLATFORM-v1.0.docx");
  fs.writeFileSync(outPath, buffer);
  console.log("Written:", outPath);
});
