# HƯỚNG DẪN CẤU HÌNH GOOGLE + PLAN NÂNG CẤP ỔN ĐỊNH — Binatech NDT ERP

> Dành cho Admin. Cập nhật: 15/07/2026.
> Trả lời: cách nhập 4 trường cấu hình (1 lần duy nhất), fix lỗi "Sync request failed with status 500", chiến lược đồng bộ + phân quyền, dark mode, và plan nâng cấp.

---

## PHẦN 1 — HƯỚNG DẪN NHẬP CẤU HÌNH (làm 1 lần duy nhất)

### 1.0. App có 2 chế độ — hiểu trước khi nhập

| Chế độ | Khi nào | Dữ liệu lưu ở đâu |
|---|---|---|
| **OFFLINE** (mặc định) | Chưa nhập cấu hình | Trình duyệt (localStorage) + file `local_db.json` trên server. App vẫn dùng đầy đủ. |
| **CLOUD** | Đã nhập đủ cấu hình bên dưới | Google Sheets (database) + Google Drive (hồ sơ) — nhiều người dùng chung |

### 1.1. Chuẩn bị trên Google Cloud (≈15 phút, làm 1 lần)

**Bước 1 — Tạo project:** vào [console.cloud.google.com](https://console.cloud.google.com) → chọn/tạo project (VD `binatech-erp`).

**Bước 2 — Bật 2 API bắt buộc:** menu **APIs & Services → Library** → tìm và bấm **Enable** cho:
- ✅ **Google Sheets API**
- ✅ **Google Drive API**
- (Tuỳ chọn: Google Docs API, Google Calendar API nếu dùng tính năng tạo Docs/lịch)

**Bước 3 — Tạo Service Account (tài khoản robot cho app):**
1. **APIs & Services → Credentials → Create Credentials → Service Account**
2. Đặt tên (VD `binatech-erp-bot`) → Create → Done (không cần gán role)
3. Bấm vào service account vừa tạo → tab **Keys → Add Key → Create new key → JSON** → tải file `.json` về
4. **Ghi lại email của service account** (dạng `binatech-erp-bot@binatech-erp.iam.gserviceaccount.com`) — sẽ dùng ở Bước 5

**Bước 4 — Tạo OAuth Client ID (cho nút đăng nhập Google):**
1. **Credentials → Create Credentials → OAuth client ID** → loại **Web application**
2. **Authorized JavaScript origins** thêm: `http://localhost:5173`, `http://localhost:3000`, và domain thật nếu có (VD `https://binatechapp.vercel.app`)
3. Copy chuỗi **Client ID** (dạng `xxxx.apps.googleusercontent.com`)

**Bước 5 — Tạo Google Sheet database + share quyền (QUAN TRỌNG NHẤT):**
1. Tạo 1 Google Spreadsheet mới (VD tên `Binatech ERP Database`)
2. Tạo đủ **12 sheet** (tab dưới cùng), tên chính xác: `Marketing`, `Accounting`, `HR (Personnel)`, `Project Control`, `Technical Dossier`, `Training`, `Equipment`, `NDT Reports`, `Tender Dossier`, `Welders`, `Weld Ledger`, `Audit Log`
3. Dòng 1 của mỗi sheet = **tên field** (VD sheet NDT Reports: `reportNo | projectId | jointNo | method | result | ...` — xem đủ danh sách trong `src/lib/schemas.ts`)
4. Bấm **Share** → dán **email service account** ở Bước 3 → quyền **Editor** → Send
5. Lấy **Spreadsheet ID** từ URL: `https://docs.google.com/spreadsheets/d/`**`1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`**`/edit` (phần in đậm)

**Bước 6 — Lấy Gemini API Key (cho AI Assistant):** vào [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → Create API key → copy.

### 1.2. Nhập vào app — tab Settings (nhập 1 lần, lưu 2 nơi)

| Ô nhập | Dán gì vào | Thiếu thì lỗi gì |
|---|---|---|
| **VITE_GOOGLE_CLIENT_ID** | Client ID Bước 4 | Không đăng nhập được bằng Google (vẫn vào được bằng Demo) |
| **GEMINI_API_KEY** | Key Bước 6 | AI Assistant / trích xuất CV không chạy |
| **GOOGLE_SHEETS_DATABASE_ID** | Spreadsheet ID Bước 5 | Mọi tab rơi về OFFLINE MODE |
| **GOOGLE_SERVICE_ACCOUNT_JSON** | **Toàn bộ nội dung** file `.json` Bước 3 (mở bằng Notepad → Ctrl+A → Ctrl+C → dán) | **Sync Drive báo 500**, Sheets không đồng bộ |

Bấm **Save** → app lưu đồng thời vào trình duyệt (localStorage) **và** file `server-config.json` trên server → **từ nay không phải nhập lại**, kể cả đổi máy trình duyệt khác (miễn là cùng server).

> 🔒 Bảo mật: file JSON là "chìa khoá" — không gửi qua chat/email công khai, không commit lên GitHub (`.gitignore` đã chặn `server-config.json`? — xem checklist Phần 4).

---

## PHẦN 2 — FIX LỖI "Sync request failed with status 500"

**Nguyên nhân gốc:** nút Sync Google Drive gọi API tạo thư mục trên Drive, nhưng server **không có thông tin xác thực** — bạn chưa đăng nhập Google (OAuth) VÀ chưa nhập Service Account JSON. Server không biết "tạo thư mục bằng tài khoản nào" → trả 500.

**Cần nhập gì để fix (chọn 1 trong 2):**

| Cách | Làm gì | Thư mục tạo trong Drive của ai |
|---|---|---|
| **Cách 1 — OAuth (khuyên dùng)** | Đăng nhập bằng nút "Sign in with Google Workspace" ở màn Login (cần VITE_GOOGLE_CLIENT_ID) → Retry Sync | **Drive của bạn** — thấy ngay thư mục |
| **Cách 2 — Service Account** | Nhập GOOGLE_SERVICE_ACCOUNT_JSON + GOOGLE_SHEETS_DATABASE_ID trong Settings → Save → Retry Sync | Drive của service account (muốn thấy phải share lại) — nên dùng cách 1 cho Drive |

Vẫn lỗi? Kiểm tra lần lượt: (1) **Google Drive API đã Enable** chưa (Bước 2); (2) JSON dán **đủ toàn bộ** (bắt đầu `{` kết thúc `}`); (3) xem log server (cửa sổ chạy `npm run dev:server`) — dòng lỗi cụ thể nằm ở đó.

**Đã cập nhật vào app hôm nay:** popup Sync khi lỗi giờ hiển thị đúng hướng dẫn 2 cách trên (không còn báo 500 khô khan).

---

## PHẦN 3 — CÁC CẬP NHẬT ỔN ĐỊNH ĐÃ CODE (15/07/2026)

| # | Tính năng | Mô tả |
|---|---|---|
| 1 | **Health check `/api/health`** | Server tự kiểm tra: có Service Account chưa, có Sheets ID chưa, kết nối được spreadsheet không, **thiếu sheet nào trong 12 sheet bắt buộc** |
| 2 | **Banner cảnh báo Admin** | Chỉ Admin thấy, hiện ngay dưới thanh trạng thái: báo thiếu cấu hình / mất kết nối / thiếu sheet — kèm nút "Mở Settings". Cảnh báo TRƯỚC khi người dùng gặp lỗi |
| 3 | **Thông báo lỗi Sync 500 có hướng dẫn** | Popup sync hiển thị 2 cách khắc phục cụ thể thay vì mã lỗi |
| 4 | **Dark mode (màu tương phản tối)** 🌙 | Nút mặt trăng/mặt trời trên thanh trạng thái — đổi toàn bộ giao diện sang nền tối tương phản cao, lưu lựa chọn, giữ nguyên khi mở lại app |

---

## PHẦN 4 — CHIẾN LƯỢC ĐỒNG BỘ & PHÂN QUYỀN (quan trọng nhất)

### 4.1. Hiện trạng — phải nói thẳng 3 rủi ro

1. **Phân quyền chỉ ở giao diện (client-side):** role lưu trong localStorage trình duyệt — người biết kỹ thuật có thể tự đổi `BINATECH_USER_ROLE` thành Admin. Server `/api/sheets/*` hiện **không kiểm tra ai gọi** — ai truy cập được server là đọc/ghi/xoá được mọi module, kể cả cột lương.
2. **Đồng bộ "best-effort":** khi mất mạng, dữ liệu lưu local nhưng **không có hàng đợi tự đẩy lại** — phải thao tác lại khi có mạng; 2 người sửa cùng 1 dòng thì người lưu sau ghi đè người trước (không cảnh báo).
3. **Deploy Vercel = mất server** (bài học LL-01): bản Vercel hiện là static — không có `/api/*` → mọi tính năng cloud sync chết trên bản deploy, chỉ chạy đủ khi chạy local `npm run dev`.

### 4.2. Chiến lược nâng cấp 3 phase

**PHASE A — Phân quyền thật ở server (ưu tiên cao nhất, ~1 tuần):**
- Tạo sheet `Users` (email, role, active) làm nguồn phân quyền duy nhất.
- Server verify **Google OAuth token** ở mọi request `/api/*` → tra email trong sheet Users → gắn role thật (không tin role client gửi lên).
- Middleware chặn theo role: `DELETE` chỉ Admin; `Accounting` chỉ Admin; ghi `NDT Reports` cần Manager+...
- **Field-level ở server:** response của HR tự cắt cột lương/bank khi role ≠ Admin (hiện mới cắt ở client).
- Audit Log ghi email thật từ token (hiện user tự khai — giả mạo được).

**PHASE B — Đồng bộ bền vững (~1 tuần):**
- **Offline queue:** thao tác khi mất mạng vào hàng đợi localStorage, tự đẩy lại (retry + exponential backoff) khi có mạng — đèn "LIVE SYNCS" hiển thị số item chờ thật.
- **Chống ghi đè:** thêm cột `updatedAt` mỗi sheet; PUT kèm giá trị cũ — server từ chối nếu dòng đã bị người khác sửa (optimistic locking) → báo "dữ liệu đã thay đổi, tải lại".
- **Batch import:** import N dòng = 1 request `values.append` (hiện N request — dễ chạm quota 429).
- Backoff tự động khi Google trả 429/503.

**PHASE C — Hạ tầng production (~2 tuần, chọn 1):**
- **C1 (khuyên dùng):** chuyển `/api/*` thành **Vercel Serverless Functions** — bản deploy có backend thật, secrets đặt trong Vercel Environment Variables (đúng các ô ở ảnh bạn gửi), không còn phụ thuộc máy local.
- **C2:** chuyển hẳn sang **Firebase** (đã có sẵn `firebase.ts`): Firestore làm database + Security Rules phân quyền tại tầng dữ liệu (mạnh nhất), Google Sheets chỉ còn là kênh export.

### 4.3. Checklist cảnh báo cho Admin TRƯỚC KHI BUILD (tránh app lỗi)

| ☐ | Kiểm tra | Lệnh / cách xem |
|---|---|---|
| ☐ | Type-check sạch | `npm run lint` không lỗi đỏ |
| ☐ | Build thành công | `npm run build` kết thúc không lỗi |
| ☐ | Banner cảnh báo Admin không hiện mục đỏ | Mở app bằng role Admin |
| ☐ | Không lộ secrets | `git status` KHÔNG thấy `server-config.json`, `.env*`, file key `.json` |
| ☐ | OAuth origins có domain mới | Google Cloud → Credentials → OAuth client (bài học LL-04) |
| ☐ | 12 sheet đủ + đúng header | Banner Admin báo "thiếu sheet" nếu sai |
| ☐ | Backup trước nâng cấp lớn | File → Make a copy spreadsheet |

---

## PHẦN 5 — PLAN CẬP NHẬT TỔNG THỂ (khung analysis-planning)

### 5.1. Lộ trình

| Sprint | Nội dung | Effort | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| S1-S6 | GĐ1-3: schema NDT, import/export, phân quyền UI, Weld Ledger, 14 báo cáo, In/PDF, i18n | — | — | ✅ Xong |
| S7 | Ổn định: health check, banner Admin, dark mode, fix thông báo 500 | 1 ngày | — | ✅ Xong hôm nay |
| S8 | **Phase A — Phân quyền server** (sheet Users, verify token, middleware role, cắt field ở server) | 5-7 ngày | OAuth Client ID hoạt động | 🔴 Ưu tiên 1 |
| S9 | **Phase B — Sync bền vững** (offline queue, optimistic locking, batch, backoff) | 5-7 ngày | S8 | 🟠 Ưu tiên 2 |
| S10 | **Phase C — Vercel Serverless** hoặc Firebase | 10-14 ngày | S8, S9, quyết định C1/C2 | 🟡 |
| S11 | Mobile data-entry + email digest cảnh báo hết hạn | 5 ngày | S10 | 🟢 |

### 5.2. Rủi ro & phụ thuộc (risk log)

| Rủi ro | Ảnh hưởng | Giảm thiểu |
|---|---|---|
| Quota Google Sheets API (60 req/phút/user) | Import lớn bị 429 | Batch + backoff (S9); cache 60s đã có |
| Secrets lộ khi push GitHub | Mất an toàn toàn hệ thống | Checklist §4.3; xoay key ngay nếu lộ |
| 2 người sửa cùng dòng | Mất dữ liệu thầm lặng | Optimistic locking (S9) |
| Role client bị sửa tay | Lộ lương/xoá dữ liệu | Phase A — không thể trì hoãn |
| Vercel static không có API | Tính năng cloud chết trên bản deploy | Phase C1; tạm thời ghi rõ "bản deploy = demo offline" |
| Dữ liệu cũ lưu giá trị tiếng Việt | Filter/báo cáo lệch | Sửa 1 lần trong Sheets về giá trị EN gốc |

### 5.3. Tiêu chí nghiệm thu từng phase

- **Phase A đạt khi:** đổi `BINATECH_USER_ROLE` trong localStorage → server vẫn từ chối thao tác vượt quyền; Employee gọi thẳng API `/api/sheets/HR (Personnel)` không nhận được cột lương.
- **Phase B đạt khi:** tắt mạng → tạo 5 bản ghi → bật mạng → cả 5 tự lên Sheets không thao tác lại; 2 tab sửa cùng dòng → tab sau bị chặn kèm thông báo.
- **Phase C đạt khi:** bản deploy trên domain thật dùng được đầy đủ Sheets/Drive sync mà không cần máy local nào đang chạy.

---

## PHỤ LỤC — Files thay đổi hôm nay (S7)

| File | Thay đổi |
|---|---|
| `src/server/lib/googleSheets.ts` | Thêm `checkHealth()` — kiểm tra config + spreadsheet + sheet thiếu |
| `server.ts` | Route `GET /api/health` |
| `src/components/AdminHealthBanner.tsx` | Mới — banner cảnh báo cấu hình cho Admin |
| `src/components/DriveSyncModal.tsx` | Thông báo lỗi 500 kèm 2 cách khắc phục |
| `src/App.tsx` | Nút dark mode 🌙 + gắn banner Admin |
| `src/index.css` | Theme tối tương phản (`html.dark`) |
