# 🧩 PROMPT NÂNG CẤP — Tích hợp "HR CV Management" vào Binatech NDT ERP

> **Dán prompt này cho coding agent (Claude Code) chạy TRONG repo `Binatechapp`.**
> Mục tiêu: đưa toàn bộ năng lực của app tham chiếu `HR_CVs_App.html` (Oil & Gas / Offshore CV Manager) vào module **HR (Personnel)** của Binatech ERP, chạy **client-only**, deploy qua **GitHub + Vercel**. Làm theo **từng Phase**, tuân thủ tư duy **critical-thinking** và **lessons-learned**.

---

## 0. Ràng buộc bắt buộc (đọc trước khi làm gì)

1. **Đọc `LESSONS_LEARNED.md` đầu tiên**, và sau MỖI lỗi thì cập nhật nó (qua agent `.claude/agents/lesson-keeper.md`).
2. **Dùng các subagent** trong `.claude/agents/`:
   - `critical-reviewer` — review trước khi commit (GO/NO-GO).
   - `deploy-vercel` — chuẩn bị & kiểm tra deploy.
   - `lesson-keeper` — ghi bài học sau mỗi sự cố.
3. **Client-only + Vercel:** không thêm phụ thuộc vào tiến trình server dài hạn cho tính năng bắt buộc. Mọi `fetch('/api/...')` phải có `try/catch` + fallback localStorage (LL-01, LL-02).
4. **Git:** chỉ `add/commit/push` + read-only `status/diff/log`. **KHÔNG** `pull/checkout/merge/rebase/reset` (LL-11).
5. **Giao tiếp tiếng Việt**, ngắn gọn, có căn cứ. Không đoán locator/không hardcode secret.
6. **Verify là bắt buộc:** mỗi Phase kết thúc bằng `npm run build` PASS + smoke test thủ công + `critical-reviewer` cho verdict GO.

---

## 1. Nguồn tham chiếu — Tính năng của `HR_CVs_App.html`

App gốc là SPA 1 file (jQuery + Bootstrap) cho tuyển dụng Dầu khí/Offshore, gồm các khối:

| # | Tính năng | Mô tả |
|---|---|---|
| A | **CV Extraction (AI)** | Kéo-thả nhiều CV `.pdf/.docx`, Gemini bóc tách 12 trường theo `responseSchema`, tự gán *discipline*, phát hiện trùng, chờ review. |
| B | **Review side-by-side** | Modal: trái là text/PDF gốc, phải là field AI để sửa; nút Keep / Approve & Commit. |
| C | **Smart Search** | Lọc theo keyword + discipline + min/max năm kinh nghiệm. |
| D | **Personnel Directory** | Danh bạ ứng viên đã duyệt, xem chi tiết. |
| E | **AI Tools** | 3 công cụ: *Spellcheck*, *Deep Review* (so JD + cert filter + suitability score), *Suggest/Match* (tìm top-3 ứng viên cho 1 JD). |
| F | **Company Templates → Word** | Nạp template `.docx`, "trám" dữ liệu ứng viên, xuất CV chuẩn công ty. |
| G | **Dashboard & Reports** | Thống kê CV mới theo tháng, phân bố ngành, biểu đồ kinh nghiệm, activity log, export pivot Excel. |
| H | **Disciplines mgmt** | Admin thêm/sửa ngành + keyword để auto-detect discipline. |
| I | **Roles** | Admin / Editor(Recruiter) / Viewer — phân quyền menu & hành động. |
| J | **Cloud sync** | Google Drive backup `cv_extractor_backup.json` + log về Google Sheet (audit). |

**Schema trích xuất (giữ nguyên tên trường):** `candidate_name, years_of_experience, education, work_fields, specialized_field, current_position, certifications, key_skills, contact_info, phone, languages, ai_summary`. Lưu ý `responseSchema` dùng kiểu **chữ thường** (LL-05).

---

## 2. Phase 1 — ĐÃ HOÀN THÀNH ✅ (cốt lõi, client-only)

Đã tích hợp sẵn trong repo (dùng làm mẫu kiến trúc cho các Phase sau):

- `src/lib/cv.ts` — types, storage localStorage (`binatech_hr_cv_db`), `detectDiscipline`, `findDuplicate`, parse PDF (pdf.js) / DOCX (mammoth) client-side, `callGeminiExtract` (schema + model fallback + demo fallback khi 429), `toCvRecord`.
- `src/components/HRPersonnel.tsx` — 3 sub-tab **CV Extraction / Personnel Directory / Smart Search** + **Review modal side-by-side** + duplicate confirm + toast + trạng thái record (`pending_review/reviewed/approved`).
- `src/App.tsx` — nhánh render `activeTab === 'HR (Personnel)' → <HRPersonnel/>`.
- `index.html` — nạp pdf.js + mammoth qua CDN.
- `package.json`/`vercel.json` — build tĩnh `vite build`, SPA rewrites.

> ⇒ Tương ứng tính năng **A, B, C, D** và một phần **H, I** (discipline mặc định, đọc role từ localStorage).

---

## 3. Phase 2 — CẦN LÀM (nâng cao, vẫn client-only)

### 3.1. AI Tools (tính năng E) — ưu tiên cao
Tạo sub-tab **AI Tools** trong `HRPersonnel.tsx`. 3 chế độ, gọi Gemini `gemini-2.0-flash` (text, temperature 0.3), render markdown → HTML, cho export TXT/Excel:
- **Spellcheck:** proofread tiếng Anh CV đã chọn, liệt kê lỗi + sửa.
- **Deep Review:** nhập/nạp JD (`.txt/.docx` qua mammoth) + chọn cert filter chip → báo cáo markdown: Executive Summary, Strengths & Fit, Gap Analysis, Certification Status, **Suitability Score 0-100**. Lưu `aiReviewReport` vào record.
- **Suggest/Match:** với 1 JD, quét pool ứng viên `approved/reviewed`, trả **Top-3** kèm % match + thiếu gì.

*(Prompt mẫu đầy đủ có trong `HR_CVs_App.html` hàm `runAiTool` — bám sát để giữ chất lượng.)*

### 3.2. Templates → Word (tính năng F)
- Dùng `docxtemplater` + `pizzip` (đã có trong deps). Cho upload template `.docx` với placeholder `{candidate_name}`, `{certifications}`…; chọn ứng viên → render → tải về. Lưu template vào localStorage/IndexedDB (base64).

### 3.3. Dashboard & Reports HR (tính năng G)
- Thêm khối thống kê trong tab HR (hoặc bơm số liệu HR vào `Dashboard.tsx`): tổng CV, CV mới trong tháng, phân bố theo discipline (recharts — đã có), phân bố năm KN, **Activity Log** (mảng sự kiện trong localStorage: ai upload/duyệt lúc nào), export **pivot Excel**.

### 3.4. Disciplines management (tính năng H)
- Trong **Settings** (Admin): CRUD disciplines + keywords, lưu vào `binatech_hr_cv_db.disciplines`. Ảnh hưởng `detectDiscipline`.

### 3.5. Role-based UI (tính năng I)
- Đọc `BINATECH_USER_ROLE`. Map: **Admin**=full, **Manager**≈Editor/Recruiter (extract/edit, không sửa Settings/Disciplines), **Employee**=Viewer (chỉ xem Directory/Search/Dashboard). Ẩn nút theo role.

---

## 4. Phase 3 — CẦN LÀM (tùy chọn: khôi phục backend đám mây)

Chỉ làm nếu cần realtime cloud & audit. Chuyển `server.ts` (Express) → **Vercel Serverless Functions** trong thư mục `/api` (mỗi route 1 file `export default handler`). Giữ frontend gọi `/api/*` như cũ (đã có fallback localStorage). Cấu hình secrets qua Vercel Env, KHÔNG commit.
- `/api/sheets/[name].ts` (GET/POST/PUT) — Google Sheets làm DB.
- `/api/drive/*` — backup `cv_extractor_backup.json` + phân loại CV vào folder.
- Log audit về Google Sheet `App_Logs`.
> Cập nhật `vercel.json`/OAuth origins tương ứng. Ghi lại mọi lỗi gặp phải vào `LESSONS_LEARNED.md`.

---

## 5. Quy trình làm việc mỗi Phase (critical-thinking loop)

```
1. Đọc LESSONS_LEARNED.md + code liên quan (không đoán).
2. Implement theo spec, bám kiến trúc Phase 1.
3. npm run build  → PASS. Sửa tới khi xanh.
4. Smoke test thủ công đúng kịch bản người dùng.
5. Gọi subagent `critical-reviewer` → nhận GO/NO-GO. NO-GO thì sửa.
6. Nếu gặp lỗi mới → `lesson-keeper` ghi vào LESSONS_LEARNED.md.
7. `deploy-vercel`: git add/commit/push → Vercel auto-deploy → smoke test trên domain.
```

---

## 6. Definition of Done (mỗi Phase)

- [ ] `npm run build` PASS, không lỗi TypeScript.
- [ ] Không `console.log` debug, không code chết, không import thừa, không hardcode secret.
- [ ] Mọi `fetch` có fallback; app không crash khi offline/không key/hết quota.
- [ ] Tính năng chạy đúng trên **domain Vercel thật**, reload không 404.
- [ ] `critical-reviewer` cho verdict **GO**.
- [ ] Bài học mới (nếu có) đã ghi vào `LESSONS_LEARNED.md`.
- [ ] Đã `git push` lên `khanhtruong-web/Binatechapp`; Vercel deploy xanh.

---

## 7. Lệnh deploy nhanh (tham khảo `DEPLOY_GITHUB_VERCEL.md`)

```bash
npm install && npm run build      # verify local
git add -A && git commit -m "feat(hr): <phase> ..." && git push
# Vercel: import repo khanhtruong-web/Binatechapp (Framework: Vite, Output: dist)
# Env: VITE_GOOGLE_CLIENT_ID (nếu dùng Google login). Gemini key nhập trong app.
```
