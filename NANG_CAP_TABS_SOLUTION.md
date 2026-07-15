# Giải Pháp Nâng Cấp Các Tab — Binatech NDT ERP

> Nguồn tham khảo: Video ["Advanced Inventory Management System Web App"](https://www.youtube.com/watch?v=OTys9yjVgX4) của PK: An Excel Expert.
> Góc nhìn: Chuyên gia phần mềm cho lĩnh vực NDT / Welding Inspection.
> Ngày: 14/07/2026

---

## 1. Phân Tích Hệ Thống Trong Video

Video giới thiệu **Web-based Advanced Inventory Management System** — web app Google Apps Script + Google Sheets làm database. Các điểm đáng học hỏi:

| Tính năng trong video | Giá trị | Áp dụng cho Binatech |
|---|---|---|
| Login + 2 roles (Admin/User) | Phân quyền dữ liệu | ✅ Đã có (Admin/Manager/Employee) |
| Google Sheets làm database | Chi phí thấp, dễ audit | ✅ Đã có (API `/api/sheets/:module`) |
| **14+ báo cáo export Excel qua SheetJS** (chạy trong browser) | Bàn giao dữ liệu cho khách hàng/audit | ⭐ **ÁP DỤNG** — trước đây thiếu hoàn toàn Export |
| **Import có validation** | Nhập liệu hàng loạt an toàn | ⭐ **ÁP DỤNG** — trước chỉ nhận CSV, không validate |
| **Filter theo trường + sort cột** | Tra cứu nhanh | ⭐ **ÁP DỤNG** — nút Filter/Sort trước đây chỉ là mockup |
| Master data (Warehouses/Suppliers) điều khiển dropdown | Dữ liệu sạch, nhất quán | 🔜 Giai đoạn 2 |
| Stock Ledger (audit trail mọi giao dịch) | Truy vết | 🔜 Giai đoạn 2 — Weld/Report Ledger |
| Song ngữ EN/FR | Đa ngôn ngữ | 🔜 Giai đoạn 3 — EN/VI |

## 2. Những Gì Đã Triển Khai (Giai Đoạn 1)

### 2.1. Schema các tab — bổ sung trường chuyên ngành welding inspection (`src/lib/schemas.ts`)

- **NDT Reports** (quan trọng nhất): thêm Drawing/ISO No., Welder ID, WPS No., Material Spec, Thickness, Diameter, NDT Procedure No., **Acceptance Criteria** (ASME VIII / B31.3 / API 1104 / AWS D1.1 / ISO 5817), **Defect Type** (Porosity, LOF, IP, Crack, Slag...), Defect Location, **Repair Status (R1/R2/Cut-out)**, Test Date. → Đủ trường để làm weld summary / RT log tiêu chuẩn dự án.
- **Equipment**: tách Model / Serial No., thêm Manufacturer, Cal. Certificate No., Calibration Agency, Location/Custodian; mở rộng loại thiết bị (TOFD Unit, Densitometer, Survey Meter, UV/White Light Meter, UTM Gauge...). → Đáp ứng audit ISO 17025 / yêu cầu client về calibration traceability.
- **HR (Personnel)**: thêm Cert Scheme (ASNT SNT-TC-1A / ISO 9712 / CSWIP / AWS CWI / API), Radiation Safety Expiry (bắt buộc với nhân sự RT), thêm method TOFD/ET/UTM.
- **Technical Dossier**: thêm Title, Revision, Approved By (Level III), Issue Date; loại tài liệu mở rộng (Technique Sheet, Calibration Procedure, Radiation Safety Plan); chuẩn mở rộng (API 650/653, ISO 17640, ISO 5817).
- **Project Control**: thêm Contract/PO No., Site, Status, NDT Methods, Contract Value.
- **Marketing / Accounting / Training / Tender**: thêm Industry, Phone/Email, VAT, Invoice/Payment Date, Provider, Result, Cert Expiry, Bid Value, Submission Date, Remarks...
- Thêm field type mới `textarea` cho các trường ghi chú dài (Scope, Meeting Logs, Maintenance Log, Remarks).

### 2.2. Export Excel (`ModuleView.tsx` — học từ video, dùng SheetJS)

- Nút **Export Excel** trên header mọi tab dùng ModuleView.
- Xuất đúng dữ liệu **đang hiển thị** (sau search + filter + sort) ra `.xlsx`, header là label của trường, tự động set độ rộng cột.

### 2.3. Import nâng cấp (`ImportModal.tsx`)

- Nhận **.csv, .xlsx, .xls** (SheetJS đọc Excel trực tiếp trong browser).
- **Validation trước khi import**: đếm dòng thiếu Primary Key (bị loại), thiếu trường bắt buộc (cảnh báo), trùng ID trong file.
- Nút **tải template import (.xlsx)** đúng cấu trúc từng module.
- Sau import: lưu local + **đồng bộ lên Google Sheets** (POST dòng mới / PUT dòng trùng ID).

### 2.4. Sort + Filter thật (`ModuleView.tsx`)

- Click header cột để sort asc/desc (hỗ trợ số và chữ).
- Panel Filter theo mọi trường dạng select (Status, Method, Result...), có đếm filter đang bật + Clear all.

### 2.5. Dependency mới

- `xlsx@^0.18.5` (SheetJS) — đã thêm vào `package.json` và cài đặt.

## 3. Đề Xuất Giai Đoạn Tiếp Theo

1. **Masters module** (học từ video): quản lý Clients / Welders / Inspectors / Standards tập trung → các trường `lookup` (Client, Inspector, WPS No., Procedure No.) trở thành dropdown thật thay vì text tự do.
2. **Weld Ledger / Joint Traceability**: mỗi joint là một dòng ledger — trạng thái Fit-up → Welded → NDT → Accept/Repair (R1/R2) → PWHT → Final. Dashboard đọc reject rate theo welder/method từ ledger này (tương tự Stock Ledger trong video).
3. **Reports tab**: bộ báo cáo dựng sẵn export Excel — Weld Summary theo project, Reject Rate theo welder, Cert Expiry 30/60/90 ngày, Calibration Due, Daily Progress.
4. **Song ngữ EN/VI**: toggle 1 chạm như EN/FR trong video (từ điển label tập trung trong schemas).
5. **Delete record + xác nhận**: hiện chưa có xoá dòng trong ModuleView.

## 4. Verify Trên Máy Local (BẮT BUỘC trước khi commit)

```bash
npm install        # cài xlsx + khôi phục binary đúng platform (esbuild/rollup)
npm run lint       # tsc --noEmit
npm run dev        # test UI: Export Excel, Import xlsx/csv, Sort cột, Filter panel
```

> Lưu ý: nếu `npm run dev` báo lỗi esbuild/rollup platform mismatch, chạy: xoá `node_modules` rồi `npm install` lại.

## 5. Files Đã Thay Đổi

| File | Thay đổi |
|---|---|
| `src/lib/types.ts` | Thêm field type `textarea` |
| `src/lib/schemas.ts` | Viết lại toàn bộ schema 9 module theo chuẩn NDT |
| `src/components/ModuleView.tsx` | Export Excel, sort cột, filter panel, textarea, sync import lên Sheets |
| `src/components/ImportModal.tsx` | Đọc xlsx/xls, validation, template download |
| `package.json` | Thêm `xlsx` |
