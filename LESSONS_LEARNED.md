# 📚 LESSONS LEARNED — Binatech NDT ERP

> Nhật ký "bài học kinh nghiệm" theo tư duy **critical thinking**. Mỗi khi một prompt/lần triển khai gặp lỗi, ghi lại **triệu chứng → nguyên nhân gốc → cách khắc phục → quy tắc phòng ngừa**. Các agent trong `.claude/agents/` BẮT BUỘC đọc file này trước khi hành động để không lặp lại lỗi cũ.

**Cách dùng:** Trước khi code/deploy, đọc mục liên quan. Sau khi xong một task, agent `lesson-keeper` bổ sung bài học mới vào đây (append, không xoá lịch sử).

---

## 🔴 Nhóm 1 — Deploy Vercel

### LL-01. Express `app.listen` KHÔNG chạy trên Vercel
- **Triệu chứng:** Build OK nhưng site trắng / 404 / function crash; `server.ts` không phục vụ request.
- **Nguyên nhân gốc:** Vercel là serverless — không giữ tiến trình `app.listen()` sống như VPS. `npm run dev = tsx server.ts` chỉ đúng cho local.
- **Khắc phục:** Deploy dạng **static SPA**: `build = vite build`, output `dist`, thêm `vercel.json` (`framework: vite`). Mọi tính năng cốt lõi chạy client-only (Gemini gọi trực tiếp từ browser, dữ liệu ở localStorage). Backend Google Workspace (nếu cần) tách sang `/api/*` serverless functions ở phase sau.
- **Quy tắc phòng ngừa:** Không phụ thuộc tiến trình server dài hạn cho tính năng bắt buộc. Kiểm tra `package.json > scripts.build` KHÔNG được bundle server cho bản Vercel.

### LL-02. Route `/api/*` 404 trên host tĩnh
- **Triệu chứng:** Console đỏ `Failed to load /api/sheets/...`, `/api/settings/save`.
- **Nguyên nhân gốc:** Không có server trên bản static.
- **Khắc phục:** Mọi `fetch('/api/...')` phải bọc `try/catch` + fallback localStorage (ModuleView/Dashboard đã làm đúng). App vẫn "fully functional" ở OFFLINE MODE.
- **Quy tắc phòng ngừa:** Không bao giờ để một `fetch` thất bại làm crash cả tab. Luôn có nhánh fallback.

### LL-03. SPA route reload → 404
- **Khắc phục:** `vercel.json > rewrites` trỏ về `/index.html`. Đã cấu hình `"/((?!assets/).*)" → "/index.html"` để không nuốt static asset.

### LL-04. Biến môi trường & OAuth origin sau khi lên domain mới
- **Triệu chứng:** Đăng nhập Google báo `redirect_uri_mismatch` / `origin not allowed`; Gemini call 403.
- **Khắc phục:** Sau khi có domain Vercel (vd `binatechapp.vercel.app`): thêm domain vào **Authorized JavaScript origins** trong Google Cloud OAuth client; đặt `VITE_GOOGLE_CLIENT_ID` trong Vercel → Settings → Environment Variables; `GEMINI_API_KEY` do người dùng nhập trong tab Settings (lưu localStorage), KHÔNG hardcode.
- **Quy tắc phòng ngừa:** Key nhạy cảm không commit; `.gitignore` phải chặn `.env*` (đã có, giữ `!.env.example`).

---

## 🔴 Nhóm 2 — Gemini / AI

### LL-05. `responseSchema` dùng SAI kiểu chữ HOA
- **Triệu chứng:** Gemini trả 400 `Invalid JSON payload ... responseSchema`.
- **Nguyên nhân gốc:** `responseSchema` yêu cầu kiểu **chữ thường** (`string/object/number`), KHÁC với tool declaration (`STRING/OBJECT`).
- **Khắc phục:** Dùng `type: 'string'` (thường). Xem `src/lib/cv.ts > CV_SCHEMA`.
- **Quy tắc phòng ngừa:** Có nhánh retry: nếu 400 do schema → gọi lại không schema; nếu 429 quota → fallback dữ liệu DEMO để UI không vỡ.

### LL-06. Quota 429 làm hỏng cả batch
- **Khắc phục:** Vòng lặp model fallback `gemini-2.0-flash → 1.5-flash → 1.5-flash-latest`; hết quota thì trả bản DEMO + toast cảnh báo, đánh dấu record để review, không dừng cả hàng đợi.

---

## 🔴 Nhóm 3 — Parse file phía client

### LL-07. pdf.js không set `workerSrc`
- **Triệu chứng:** `Setting up fake worker failed` / treo khi đọc PDF.
- **Khắc phục:** Set `pdfjsLib.GlobalWorkerOptions.workerSrc` tới đúng CDN pdf.worker (đã làm trong `cv.ts > ensurePdfWorker`). Version worker phải TRÙNG version pdf.min.js (3.11.174).
- **Quy tắc phòng ngừa:** Nạp pdf.js + mammoth qua `<script>` CDN trong `index.html` (không import npm để tránh cấu hình worker phức tạp với Vite).

### LL-08. CV scan ảnh → text rỗng
- **Khắc phục:** Nếu text < 20 ký tự → báo lỗi rõ "CV scan ảnh?" thay vì gửi chuỗi rỗng cho AI. (Phase sau: OCR.)

### LL-09. Trùng ứng viên khi upload lại
- **Khắc phục:** `findDuplicate` so khớp tên đã chuẩn hoá; hỏi overwrite/bỏ qua trước khi ghi. Không tạo bản ghi trùng.

---

## 🔴 Nhóm 4 — Môi trường dev & Git

### LL-10. Sửa file bằng editor nhưng sandbox/mount đọc bản CŨ
- **Triệu chứng:** `npm install` báo `package.json Unterminated string` dù file trên đĩa đã đúng.
- **Nguyên nhân gốc:** Độ trễ đồng bộ giữa file trên máy (D:\) và mount Linux của sandbox; bản edit chưa flush.
- **Khắc phục:** Với file cấu hình sống-còn (package.json, index.html), ghi lại trực tiếp từ shell rồi validate bằng `python -c "import json;json.load(...)"` TRƯỚC khi `npm install`.
- **Quy tắc phòng ngừa:** Luôn `json.load` kiểm tra package.json/vercel.json trước khi build.

### LL-11. TUYỆT ĐỐI không `git pull/checkout/merge/reset`
- **Nguyên nhân gốc:** Code trên server có thể chưa cập nhật; pull sẽ ghi đè code local đang sửa (theo `CLAUDE.md`).
- **Khắc phục:** Chỉ dùng read-only `git status/diff/log`. Khi cần đẩy lên GitHub: `git add` → `git commit` → `git push` (KHÔNG pull). Nếu remote lệch, xử lý thủ công với người dùng.

### LL-12. Lộ credentials khi push
- **Khắc phục:** `.gitignore` chặn `.env*` (trừ `.env.example`), `firebase-applet-config.json` nếu chứa secret thật; không commit `node_modules`, `dist`.

---

## 🔴 Nhóm 5 — Tích hợp React/TS

### LL-13. Thêm module mới nhưng App không render
- **Khắc phục:** Tab đi qua nhánh `activeSchema` (data-grid) mặc định; module custom (như HR CV) phải có nhánh riêng TRƯỚC `activeSchema` trong `App.tsx`. Đã thêm `activeTab === 'HR (Personnel)' → <HRPersonnel/>`.

### LL-14. Giữ nhất quán localStorage key
- **Khắc phục:** Gemini key dùng đúng 1 key `GEMINI_API_KEY` (Settings.tsx ghi, cv.ts đọc). Role dùng `BINATECH_USER_ROLE`. Không đặt key trùng lặp mỗi nơi một kiểu.

### LL-15. React 19 đổi kiểu `useRef` → lỗi type khi truyền ref qua prop
- **Triệu chứng:** `npx tsc --noEmit` báo `TS2322: Type 'RefObject<HTMLInputElement | null>' is not assignable to type 'RefObject<HTMLInputElement>'`.
- **Nguyên nhân gốc:** Ở React 19 + @types/react 19, `useRef<T>(null)` trả về `RefObject<T | null>` (khác React 18 là `RefObject<T>`). Prop nhận ref khai báo `RefObject<HTMLInputElement>` sẽ lệch kiểu.
- **Khắc phục:** Khai báo prop là `React.RefObject<HTMLInputElement | null>` (đã sửa trong `HRPersonnel.tsx > ExtractionView`).
- **Quy tắc phòng ngừa:** Với repo React 19, mọi prop/biến giữ ref DOM khởi tạo `null` phải dùng `RefObject<T | null>`. Verify bằng `tsc --noEmit` (strict) trước khi build, đừng chỉ dựa vào `vite build` (esbuild bỏ qua type).

---

### LL-16. Mount sandbox "đóng băng" file đã sửa in-place → không typecheck được trong sandbox
- **Triệu chứng:** Sau nhiều lần Edit `cv.ts`/`HRPersonnel.tsx`, bản đọc từ sandbox mount đứng yên ở số dòng cũ (vd 329), dù bản trên ổ D:\ đã đúng và đầy đủ. `tsc` trên bản copy từ mount báo lỗi cú pháp giả (Expression expected, JSX no closing tag).
- **Nguyên nhân gốc:** Cơ chế sync D:\ ↔ mount của môi trường: file MỚI tạo thì sync; nhưng file bị sửa in-place nhiều lần có thể vào trạng thái conflict và ngừng sync (kể cả ghi đè toàn bộ). Mount `outputs` là mount khác nên vẫn sync bình thường.
- **Khắc phục:** Coi ổ D:\ (đọc trực tiếp) là nguồn sự thật; verify code bằng đọc kỹ + `tsc` cục bộ trên máy thật. Khi cần typecheck trong sandbox, ghi bản sao ra mount `outputs` (còn sync) rồi chạy `tsc` ở FS thuần (`/tmp`), tránh cài `npm` nặng (firebase/googleapis) trực tiếp trên mount (gây `ENOTEMPTY` do rename không nguyên tử).
- **Quy tắc phòng ngừa:** Gate cuối cùng là `npm run build` trên máy người dùng. Không kết luận "lỗi code" chỉ vì `tsc` trong sandbox đỏ — phải đối chiếu bản D:\ thật trước.

---

## 🔴 Nhóm 6 — Đa ngôn ngữ & Phân quyền UI

### LL-17. Đồng bộ trạng thái ngôn ngữ toàn cục (Global Language State)
- **Triệu chứng:** Thay đổi ngôn ngữ ở thanh điều hướng (Navbar) nhưng các tab nội dung bên trong không chuyển đổi tức thì hoặc bị reset khi chuyển tab.
- **Nguyên nhân gốc:** Trạng thái ngôn ngữ bị lưu lẻ tẻ ở từng component con hoặc không đồng bộ qua prop/context.
- **Khắc phục:** Định nghĩa kiểu `type Lang = 'vi' | 'en'` tập trung tại `src/lib/schemas.ts`, truyền prop `lang` từ `App.tsx` (state gốc) xuống các view/component con (`HRPersonnel`, `QuotationGenerator`, `ModuleView`). Chuyển đổi ngôn ngữ cập nhật state toàn cục và đồng bộ tất cả giao diện tức thời.
- **Quy tắc phòng ngừa:** Luôn giữ một nguồn sự thật (Single Source of Truth) cho ngôn ngữ toàn hệ thống. Mọi component mới phải thiết kế nhận prop `lang` để hỗ trợ đa ngôn ngữ.

### LL-18. Thiết kế Sidebar co giãn khi Hover mà không gây vỡ bố cục (Layout Shifts)
- **Triệu chứng:** Khi Sidebar co giãn từ `w-20` (80px) sang `w-64` (256px) bằng hover, nó đẩy nội dung bên phải và làm co giãn các biểu đồ Recharts hoặc nội dung bảng, gây hiệu ứng giật khung hình và tính toán lại chiều rộng.
- **Nguyên nhân gốc:** Sidebar thông thường tham gia vào dòng chảy tài liệu (document flow). Sự thay đổi kích thước của Sidebar làm thay đổi trực tiếp vùng chứa nội dung của phần còn lại.
- **Khắc phục:** Thiết lập Sidebar là vị trí tuyệt đối (`absolute`) có độ ưu tiên cao (`z-30`) và chuyển đổi chiều rộng mượt mà. Đồng thời, thêm một thanh đệm ẩn cố định có kích thước bằng Sidebar khi thu gọn (`w-20`) ở dòng chảy tài liệu chính. Khi hover qua, Sidebar sẽ mở rộng đè (overlay) lên trên phần nội dung bên phải chứ không đẩy nó sang bên, từ đó triệt tiêu hoàn toàn hiện tượng layout shift cho các component biểu đồ và bảng dữ liệu.

---

_Cập nhật lần cuối: Phase 3 hoàn thành nâng cấp Logo BinaTech Home Button, Sidebar co giãn khi Hover thông minh không gây vỡ bố cục, mở rộng các trường dữ liệu cho 9 phân hệ chuẩn ERP 1Office và Việt hóa / Anh hóa toàn bộ giá trị Dropdown. Build production cục bộ thành công 100%._

