# Giải Pháp Nâng Cấp Các Tab — Binatech NDT ERP (v2.0)

> Nguồn tham khảo: Video ["Advanced Inventory Management System Web App"](https://www.youtube.com/watch?v=OTys9yjVgX4) của PK: An Excel Expert.
> Góc nhìn: Chuyên gia phần mềm cho lĩnh vực NDT / Welding Inspection.
> Cập nhật: 15/07/2026 — v2.0 nâng cấp toàn bộ đề xuất, kèm spec chi tiết cho từng giai đoạn.

---

## 1. Phân Tích Hệ Thống Trong Video

Video giới thiệu **Web-based Advanced Inventory Management System** — web app Google Apps Script + Google Sheets làm database. Kiến trúc giống Binatech (browser front-end + Sheets backend), nên các pattern áp dụng được trực tiếp:

| Tính năng trong video | Giá trị | Trạng thái ở Binatech |
|---|---|---|
| Login + role-based access | Phân quyền dữ liệu | ✅ Có sẵn (Admin/Manager/Employee) |
| Google Sheets làm database | Chi phí thấp, dễ audit | ✅ Có sẵn (`/api/sheets/:module`) |
| Export Excel qua SheetJS (browser-side) | Bàn giao dữ liệu cho client/audit | ✅ **ĐÃ LÀM** (Giai đoạn 1) |
| Import có validation + template | Nhập liệu hàng loạt an toàn | ✅ **ĐÃ LÀM** (Giai đoạn 1) |
| Filter theo trường + sort cột | Tra cứu nhanh | ✅ **ĐÃ LÀM** (Giai đoạn 1) |
| Master data điều khiển dropdown | Dữ liệu sạch, nhất quán | ✅ **ĐÃ LÀM** (GĐ2 — §4.1) |
| Ledger — audit trail mọi giao dịch | Truy vết | ✅ **ĐÃ LÀM** (GĐ2 — §4.2, §4.5) |
| 14+ báo cáo dựng sẵn | Ra quyết định | ✅ **ĐÃ LÀM** (GĐ2 — §4.3, 14 báo cáo) |
| Song ngữ 1-toggle | Đa ngôn ngữ | ✅ Đã có (EN/VI toggle) |

## 2. Giai Đoạn 1 — ĐÃ TRIỂN KHAI

### 2.1. Schema 9 tab — độ sâu enterprise + chuyên ngành NDT (`src/lib/schemas.ts`)

- **NDT Reports** (lõi nghiệp vụ): Drawing/ISO No., Welder ID + Full Name, Inspection Segment, WPS No., Material Spec, Thickness, Diameter, Sensitivity (%), Film/Probe Spec, **Acceptance Criteria** (ASME VIII / B31.3 / API 1104 / API 650 / AWS D1.1 / ISO 5817), **Defect Type** (Porosity, Slag, LOF, IP, Crack, Undercut, Tungsten, Burn Through), **Repair Status (R1/R2/Cut-out)**, **Review Status** (Draft → Checked by Inspector → Approved by Level III).
- **Equipment**: Manufacturer, Model, Serial, Cal. Cert No., Cal. Agency, Purchase/Depreciation, Last Service, **Radiation Hazard flag, Isotope Source (Ir-192/Se-75/Co-60/X-Ray), Source Activity (Ci)**, Storage Warehouse.
- **HR (Personnel)**: Cert Scheme (ASNT/ISO 9712/CSWIP/AWS CWI/API), Radiation Safety Expiry + Card No., Eye Test Date, cùng nhóm trường nhân sự (DOB, National ID, Social Insurance, Bank, Salary, Allowance, Employment Status).
- **Project Control**: Contract/PO, Site, Methods, Contract Value, PM, Actual Cost, Expected Margin, Priority, Client Feedback.
- **Technical Dossier**: Revision, Prepared/Reviewed/Approved By (Level III), Next Audit Review, Confidentiality Level.
- **Marketing / Accounting / Training / Tender**: Lead Source, Win Probability, Competitors, Invoice Type, Payment Method, Paid/Balance, Tax Code, Training Cost/Score/Sponsor, Bid Bond, Competitor Bids...
- Field type mới `textarea` cho ghi chú dài.

### 2.2. Export Excel (`ModuleView.tsx`)

Nút **Export Excel** trên mọi tab — xuất đúng dữ liệu **đang hiển thị** (sau search + filter + sort) ra `.xlsx` bằng SheetJS, header theo label, tự set độ rộng cột.

### 2.3. Import nâng cấp (`ImportModal.tsx`)

Nhận **.csv/.xlsx/.xls**; validation trước import (thiếu Primary Key → loại, thiếu trường bắt buộc → cảnh báo, trùng ID trong file → báo ghi đè); nút **tải template import .xlsx** đúng cấu trúc module; sau import tự đồng bộ lên Google Sheets (POST/PUT theo ID).

### 2.4. Sort + Filter thật

Click header để sort asc/desc (số + chữ); panel Filter theo mọi trường select, đếm số filter đang bật, Clear all.

### 2.5. Dependency

`xlsx@^0.18.5` (SheetJS) đã thêm vào `package.json`.

---

## 3. ✅ Việc Cần Làm Ngay — ĐÃ TRIỂN KHAI

1. **Phân quyền theo trường (field-level security)** — ✅ ĐÃ LÀM: thêm `roles?: UserRole[]` vào `FieldDef` (`types.ts`); 6 trường nhạy cảm HR (National ID, Social Insurance, Bank Account/Name, Base Salary, Allowance) đánh dấu `roles: ['Admin']` (`schemas.ts`); `App.tsx` lọc schema theo role **trước khi** truyền vào ModuleView → grid, form, Export Excel, Import template đều tự động tuân thủ quyền. `localizeSchema` giữ nguyên `roles` nên hoạt động cả EN/VI.
2. **Grid 5 cột đầu** — ✅ đã rà soát: 5 field đầu mỗi module đều là cột định danh + trạng thái chính.
3. **Sửa lỗi phát sinh từ code song song** — ✅ import thiếu `DEFAULT_DISCIPLINES` (HRPersonnel), prop `lang` chưa khai báo (Dashboard, Settings), type JSON config Firebase, thêm `src/vite-env.d.ts` cho `import.meta.env`.
4. **Chạy verify local** (xem §7) — tsc đã pass cho toàn bộ file Giai đoạn 1 (ModuleView, ImportModal, schemas, types, App).

## 4. Giai Đoạn 2 — ✅ ĐÃ TRIỂN KHAI

**Tóm tắt triển khai (15/07/2026):**

- **§4.1 Masters:** `FieldDef.lookupSource` + autosuggest `<datalist>` trong ModuleView. Các lookup đã nối master: Client → Marketing, Project → Project Control, Employee/Inspector → HR, Procedure → Technical Dossier, **Welder → tab Welders mới** (10 trường: stamp no, process, WPS qualified, positions, WQT cert, expiry...).
- **§4.2 Weld Ledger:** tab mới "Weld Ledger" (11 sự kiện vòng đời: Fit-up → Final Accept). Mỗi lần lưu NDT Report có Joint No. **tự sinh 1 dòng ledger** (Accept → "NDT Done - Accept"; Reject → map theo Repair Status R1/R2/Cut-out) — giống pattern Stock Ledger trong video.
- **§4.3 Reports Center:** tab mới "Reports" với **14 báo cáo dựng sẵn** chia 3 nhóm (NDT/Welding, Compliance & Safety, Finance & Business): Weld Summary, Reject Rate theo Welder/Method, Defect Pareto, RT Film Log, Repair Log, Cert Expiry 90d, Radiation Matrix, Calibration Due, **Isotope Decay** (tính activity theo half-life Ir-192/Se-75/Co-60), Training Compliance, Project P&L, AR Aging, Tender Win/Loss. Mỗi báo cáo có preview + Export Excel.
- **§4.4 Expiry Alerts:** thanh cảnh báo 3 mức (🔴 quá hạn / 🟠 ≤30d / 🟡 sắp đến hạn) trên đầu Reports Center, quét cert HR + calibration Equipment.
- **§4.5 Delete + Audit:** nút **Delete** (chỉ Admin, có confirm) với route `DELETE /api/sheets/:sheetName` mới ở backend (Google Sheets `deleteDimension` + fallback local db); **Audit trail** (`lib/audit.ts`) ghi Create/Update/Delete/Import vào sheet "Audit Log" (best-effort) + localStorage.

**⚠️ Thiết lập Google Sheets:** khi dùng cloud sync, tạo thêm 3 sheet mới với dòng header là **tên field** (không phải label): `Welders`, `Weld Ledger`, `Audit Log`. Chế độ local db không cần làm gì.

### Spec chi tiết (tham chiếu)

### 4.1. Masters Module (học trực tiếp từ video)

**Vấn đề:** các trường `lookup` (Client, Inspector, WPS No., Procedure No., Welder) đang là text tự do → sai chính tả là mất traceability.

**Thiết kế:**
- Sheet mới: `Masters_Clients`, `Masters_Welders` (welderId, name, stampNo, qualifiedWPS, expiry), `Masters_Inspectors` (map từ HR, lọc cert còn hạn), `Masters_Standards`.
- `FieldDef` thêm `lookupSource?: { module: string; valueField: string; labelField: string }`.
- ModuleView render lookup thành **combobox autosuggest** đọc từ master (cache localStorage, refresh khi mở form).
- Ràng buộc chéo: chọn Welder → tự điền Welder Full Name; chọn Project → lọc danh sách Drawing.

**Acceptance criteria:** không thể lưu NDT Report với Welder/WPS không tồn tại trong master. **Effort:** ~3-4 ngày.

### 4.2. Weld Ledger — Joint Traceability (tương đương Stock Ledger trong video)

**Vấn đề:** NDT Reports ghi theo báo cáo, không theo vòng đời mối hàn → không trả lời được "joint X đã qua những bước nào, còn nợ NDT gì".

**Thiết kế:**
- Sheet `Weld_Ledger`: mỗi dòng = 1 sự kiện của 1 joint: `jointId, projectId, drawingNo, event (Fit-up → Welded → NDT Requested → RT/UT Done → Accept/Reject → R1 → Re-test → PWHT → Final Accept), date, refReportNo, welderId, remark`.
- Mỗi lần lưu NDT Report tự sinh 1 dòng ledger (như video: transfer sinh 2 ledger entries).
- View mới "Weld Status": pivot theo joint, cột trạng thái mới nhất, % hoàn thành NDT theo drawing, danh sách joint đang treo repair.

**Giá trị NDT:** đáp ứng yêu cầu traceability của ASME/API audit; tính **reject rate theo welder** làm căn cứ tăng/giảm tỷ lệ chụp (5% → 100% theo B31.3). **Effort:** ~5 ngày.

### 4.3. Reports Tab — bộ báo cáo dựng sẵn (mục tiêu 14+ như video)

Mỗi báo cáo = filter cố định + Export Excel (tái dùng engine đã có ở §2.2):

| # | Báo cáo | Nguồn | Người dùng |
|---|---|---|---|
| 1 | Weld Summary theo Project | NDT Reports | Client / QA |
| 2 | Reject Rate theo Welder | NDT Reports | QC Manager |
| 3 | Reject Rate theo Method | NDT Reports | Level III |
| 4 | Defect Distribution (Pareto khuyết tật) | NDT Reports | Level III |
| 5 | RT Film Log / Daily Report | NDT Reports (method=RT) | Site |
| 6 | Repair Log (R1/R2/Cut-out đang mở) | NDT Reports | QC |
| 7 | Cert Expiry 30/60/90 ngày | HR | Admin/HR |
| 8 | Radiation Safety Matrix (card, dose, eye test) | HR + Equipment | RSO |
| 9 | Calibration Due | Equipment | QC |
| 10 | Isotope Decay Tracking (activity theo half-life) | Equipment | RSO |
| 11 | Project P&L (Contract Value vs Actual Cost) | Project + Accounting | BOD |
| 12 | AR Aging (công nợ theo tuổi) | Accounting | Kế toán |
| 13 | Tender Win/Loss Analysis | Tender | BOD |
| 14 | Training Compliance theo Method | Training + HR | HR |

**Effort:** ~4-5 ngày (khung + 14 preset).

### 4.4. Expiry Alert Engine

- Quét định kỳ khi mở Dashboard: cert/medical/radiation (HR), nextCal (Equipment), nextReviewDate (Dossier), deadline (Tender).
- Ba mức: 🔴 quá hạn / 🟠 ≤30 ngày / 🟡 ≤90 ngày. Tile "Documents Expiring" trên Dashboard click vào ra danh sách chi tiết thay vì chỉ hiện con số.
- Giai đoạn sau: gửi email digest hằng tuần qua server. **Effort:** ~2 ngày.

### 4.5. CRUD hoàn chỉnh + Audit Trail

- Thêm **Delete** (confirm 2 bước, chỉ Admin) — hiện ModuleView chưa xoá được dòng.
- Sheet `Audit_Log`: `timestamp, user, module, recordId, action (Create/Update/Delete/Import), changedFields` — ghi tự động ở server. Bắt buộc để qua audit ISO 9001/17025. **Effort:** ~2-3 ngày.

## 5. Giai Đoạn 3 — ✅ ĐÃ TRIỂN KHAI (15/07/2026)

### 5.1. In / Xuất PDF báo cáo — ✅ ĐÃ LÀM
Nút **"In / PDF"** trong panel chi tiết của mọi module (`lib/printReport.ts`): mở bản in chuẩn form có logo Binatech, bảng thông số đầy đủ. Riêng **NDT Reports** có layout báo cáo kiểm tra chuẩn: banner KẾT QUẢ Accept/Reject màu, **3 khối chữ ký** (NDT Technician / Level III Review / Client Representative). Người dùng bấm Print → chọn "Save as PDF". Không cần dependency mới, chạy được offline.

### 5.2. Song ngữ EN/VI + tách label/value — ✅ ĐÃ LÀM
Toggle EN/VI đã có sẵn. Đã **sửa lỗi nghiêm trọng về dữ liệu**: trước đây giá trị select bị dịch rồi lưu vào Sheets (VD `Đạt (Accept)`), làm filter/báo cáo lệch giữa 2 ngôn ngữ. Nay `translateOption()` chỉ dịch khi **hiển thị** — giá trị lưu luôn là tiếng Anh gốc, dữ liệu độc lập ngôn ngữ. Grid, form, filter đều hiển thị tiếng Việt nhưng lưu chuẩn EN.

> ⚠️ **Dữ liệu cũ:** các bản ghi đã lưu bằng giá trị tiếng Việt trước đây (nếu có) cần sửa lại thành giá trị EN trong Sheets để filter/báo cáo nhận đúng.

### 5.3. Mobile data-entry cho site — 🔜 Giai đoạn sau
Form nhập NDT Report rút gọn tối ưu điện thoại. Nền tảng đã sẵn sàng (offline localStorage + auto-sync), chỉ cần thêm layout responsive.

## 6. Lộ Trình Đề Xuất

| Sprint | Nội dung | Trạng thái |
|---|---|---|
| 1 | Schema NDT + Export/Import/Filter/Sort | ✅ Xong |
| 2 | Field-level security (§3.1) + Delete + Audit Log (§4.5) | ✅ Xong |
| 3 | Masters Module (§4.1) + Expiry Alerts (§4.4) | ✅ Xong |
| 4 | Weld Ledger (§4.2) | ✅ Xong |
| 5 | Reports Tab 14 báo cáo (§4.3) | ✅ Xong |
| 6 | In/PDF báo cáo (§5.1) + tách label/value i18n (§5.2) | ✅ Xong |
| 7+ | Mobile data-entry (§5.3), email digest cảnh báo, file upload thật lên Drive | 🔜 Tiếp theo |

## 7. ✅ CHECKLIST NGHIỆM THU (dành cho người không chuyên code)

### Bước 1 — Khởi động app (làm 1 lần)

Mở **Command Prompt / Terminal** tại thư mục `D:\binatechapp` và chạy lần lượt:

```bash
npm install
npm run dev
```

Mở trình duyệt vào địa chỉ hiện ra (thường `http://localhost:5173`). Nếu báo lỗi khi chạy: xoá thư mục `node_modules` rồi chạy lại `npm install`.

### Bước 2 — Checklist test từng tính năng (tick ✔ khi PASS)

| # | Tính năng | Cách test | Kết quả mong đợi |
|---|---|---|---|
| ☐ 1 | Đăng nhập + đổi ngôn ngữ | Nút EN/VI góc sidebar | Toàn bộ label đổi ngôn ngữ |
| ☐ 2 | Trường nhập liệu mới | Mở tab NDT Reports → New Record | Thấy đủ trường: WPS No., Thickness, Acceptance Criteria, Defect Type, Repair Status... |
| ☐ 3 | Lưu bản ghi | Điền form → Save | Bản ghi xuất hiện trong bảng |
| ☐ 4 | Export Excel | Nút "Xuất Excel" trên mỗi tab | Tải về file .xlsx mở được bằng Excel |
| ☐ 5 | Import Excel/CSV | Nút "Nhập CSV/Excel" → tải template → điền → upload | Báo số dòng hợp lệ, import xong thấy dữ liệu |
| ☐ 6 | Sort + Filter | Click tiêu đề cột; nút "Bộ lọc" | Bảng sắp xếp/lọc đúng |
| ☐ 7 | Autosuggest master | NDT Reports → New → gõ vào ô Project ID / Welder ID | Hiện gợi ý từ danh sách có sẵn |
| ☐ 8 | Weld Ledger tự động | Lưu 1 NDT Report có Joint No. → mở tab "Sổ theo dõi Mối hàn" | Có dòng sự kiện mới tương ứng |
| ☐ 9 | Trung tâm Báo cáo | Tab "Reports" → click từng báo cáo | 14 báo cáo hiện dữ liệu + Export Excel được |
| ☐ 10 | Cảnh báo hết hạn | Đầu trang Reports | Thấy số đếm 🔴 quá hạn / 🟠 ≤30 ngày / 🟡 sắp đến hạn |
| ☐ 11 | In / PDF | Chọn 1 bản ghi NDT Report → nút "In / PDF" | Bản in có logo, banner kết quả, 3 khối chữ ký → Save as PDF |
| ☐ 12 | Xóa bản ghi (Admin) | Chọn bản ghi → nút "Xóa" đỏ → confirm | Bản ghi biến mất (Manager/Employee không thấy nút này) |
| ☐ 13 | Phân quyền trường lương | Đổi role sang Manager → mở tab HR qua ModuleView / Export | Không thấy các cột Lương, Tài khoản NH, CCCD |
| ☐ 14 | Offline | Tắt server → thao tác tiếp | App vẫn hoạt động, hiện badge OFFLINE, dữ liệu lưu cục bộ |

### Bước 3 — Nếu dùng Google Sheets cloud sync

Tạo thêm 3 sheet trong spreadsheet: `Welders`, `Weld Ledger`, `Audit Log` — dòng đầu là **tên field** (welderId, name... / ledgerId, jointId... / auditId, timestamp, user, role, module, recordId, action, detail).

## 8. Files Đã Thay Đổi (Giai đoạn 1 + v2.0)

| File | Thay đổi |
|---|---|
| `src/lib/types.ts` | Thêm field type `textarea`; thêm `UserRole` + `roles` cho field-level security |
| `src/lib/schemas.ts` | Schema 9 module chuẩn NDT + enterprise; sửa options trùng lặp; gắn `roles: ['Admin']` cho 6 trường nhạy cảm HR |
| `src/App.tsx` | Lọc schema theo role trước khi truyền vào ModuleView |
| `src/components/ModuleView.tsx` | Export Excel, sort cột, filter panel, textarea, sync import lên Sheets |
| `src/components/ImportModal.tsx` | Đọc xlsx/xls, validation, template download |
| `src/components/HRPersonnel.tsx` | Fix import thiếu `DEFAULT_DISCIPLINES` |
| `src/components/Dashboard.tsx`, `Settings.tsx` | Khai báo prop `lang` |
| `src/firebase.ts` | Fix type khi đọc `firestoreDatabaseId` từ JSON config |
| `src/vite-env.d.ts` | Mới — types `vite/client` cho `import.meta.env` |
| `package.json` | Thêm `xlsx` |

**Giai đoạn 2 (mới):**

| File | Thay đổi |
|---|---|
| `src/lib/types.ts` | Thêm `LookupSource` cho master-data lookup |
| `src/lib/schemas.ts` | Gắn `lookupSource` cho 10 trường lookup; thêm 2 module `Welders`, `Weld Ledger` |
| `src/lib/audit.ts` | Mới — audit trail (Create/Update/Delete/Import) |
| `src/lib/dataClient.ts` | Mới — helper tải dữ liệu module + `daysUntil` |
| `src/components/ReportsTab.tsx` | Mới — Reports Center: 14 báo cáo + expiry alerts + export |
| `src/components/ModuleView.tsx` | Lookup autosuggest (datalist), nút Delete (Admin), hook audit + weld ledger |
| `src/App.tsx` | 3 tab mới: Weld Ledger, Welders, Reports |
| `src/lib/translations.ts` | Bản dịch VI cho 3 tab mới |
| `server.ts` | Route `DELETE /api/sheets/:sheetName` |
| `src/server/lib/googleSheets.ts` | `deleteRow` (deleteDimension + fallback local) |
| `src/server/lib/localDb.ts` | `deleteLocalRow` + seed data Welders/Weld Ledger |

**Giai đoạn 3 (mới):**

| File | Thay đổi |
|---|---|
| `src/lib/printReport.ts` | Mới — bản in chuẩn form NDT với khối chữ ký, print-to-PDF |
| `src/lib/translations.ts` | Tách label/value: `translateOption()` chỉ dịch khi hiển thị, giá trị lưu luôn là EN |
| `src/components/ModuleView.tsx` | Nút "In / PDF"; grid/form/filter hiển thị option đã dịch nhưng lưu giá trị gốc |

**Giai đoạn 4 (mới - 15/07/2026):**

| File | Thay đổi |
|---|---|
| `src/components/BinatechLogo.tsx` | Mới — component logo BinaTech vector SVG, hỗ trợ collapsed/expanded và dark/light |
| `src/components/DriveSyncModal.tsx` | Thêm nút exit/close trên màn hình lỗi, cho phép đóng modal khi sync thất bại |
| `src/App.tsx` | Thanh Status Bar (ONLINE/OFFLINE, LIVE SYNCS, REFRESH, SYNC DRIVE), nút 3 gạch (Menu Pin sidebar), hiển thị version v2.1 |
| `src/components/ModuleView.tsx` | Lắng nghe event `binatech-refresh-data` để tải lại dữ liệu, dispatch `binatech-sync-event-added` khi ghi đè offline |
| `api/index.ts` | Mới — serverless function chứa API cho Vercel |
| `vercel.json` | Cập nhật routing `/api/*` tới serverless function của Vercel |
| `NANG_CAP_TABS_SOLUTION.md` | Tài liệu hóa Giai đoạn 4 |

## 5. Giai Đoạn 4 — ✅ ĐÃ TRIỂN KHAI (15/07/2026)

- **§5.1 Logo & Sidebar Toggle Pin Button:**
  - Tạo component `<BinatechLogo />` vẽ logo thương hiệu BinaTech dạng vector SVG, nhấp vào logo để trở về trang chủ Dashboard.
  - Tích hợp nút 3 gạch (hamburger `Menu` icon) ở header Sidebar để cho phép người dùng nhấp ghim (Pin) cố định Sidebar mở rộng (`w-64`) hoặc nhấp lần nữa để trả về chế độ co giãn tự động khi hover (`w-20` -> `w-64`).
- **§5.2 Status Bar đồng bộ thời gian thực:**
  - Bổ sung thanh trạng thái mỏng nằm ở đầu vùng nội dung chính.
  - Hiển thị chấm tròn nhấp nháy **ONLINE / OFFLINE** dựa trên trạng thái kết nối mạng thực tế.
  - Hiển thị **LIVE SYNCS** event counter đếm số sự thay đổi dữ liệu chưa đồng bộ cùng thời gian cập nhật cuối.
  - Tích hợp nút **SYNC DRIVE** để mở popup Drive và nút **REFRESH DATA** để chủ động tải lại dữ liệu Google Sheets + đồng bộ dữ liệu cục bộ.
- **§5.3 Vercel Serverless Backend & Fix 405:**
  - Tạo file `api/index.ts` chứa toàn bộ logic API Express (Sheets, Drive, Docs, Calendar).
  - Cập nhật `vercel.json` định tuyến các yêu cầu `/api/*` tới serverless function này. Khắc phục triệt để lỗi `Sync request failed with status 405` trên Vercel.
  - Thêm nút **Exit / Close** vào `DriveSyncModal` khi gặp lỗi đồng bộ để tránh kẹt màn hình.
- **§5.4 Versioning:**
  - Thêm hiển thị phiên bản `v2.1` và ngày cập nhật `15/07/2026` ở góc dưới Sidebar.

**Trạng thái verify (15/07/2026):** Tất cả các file đã được biên dịch thành công 100% không có lỗi (`npm run build` đã test pass). Đã push lên GitHub và cập nhật live trên Vercel.

