# 🚀 Hướng dẫn Deploy Binatech NDT ERP lên GitHub + Vercel

> Bản build **client-only** (SPA tĩnh). Không cần server. Tính năng HR CV cốt lõi chạy hoàn toàn trong trình duyệt (Gemini gọi trực tiếp, dữ liệu ở localStorage).
>
> - **GitHub repo:** https://github.com/khanhtruong-web/Binatechapp
> - **Vercel account:** https://vercel.com/khanh-truong

---

## 0. Kiểm tra trước khi đẩy (1 phút)

```bash
cd D:\binatechapp
npm install          # cài mới sạch (node_modules cũ có thể lỗi, xoá đi nếu cần)
npm run build        # phải PASS, sinh thư mục dist\
```
Nếu `npm install` báo lỗi `ENOTEMPTY`/rename → xoá `node_modules` rồi cài lại:
```bash
rmdir /s /q node_modules   & npm install
```

---

## 1. Đẩy code lên GitHub

> ⚠️ Theo `CLAUDE.md`: **KHÔNG** dùng `git pull/checkout/merge/reset`. Chỉ `add/commit/push` + read-only `status/diff/log`.

> 🧹 **Bước dọn dẹp bắt buộc:** phiên trước để lại một thư mục `.git` **hỏng, rỗng** (do sandbox không có quyền ghi git trên ổ Windows). Xoá nó trước khi init:
> ```cmd
> cd /d D:\binatechapp
> rmdir /s /q .git
> ```

**Khởi tạo git repo:**
```bash
cd D:\binatechapp
git init
git add -A
git commit -m "feat(hr): CV Management client-only + Vercel deploy config"
git branch -M main
git remote add origin https://github.com/khanhtruong-web/Binatechapp.git
git push -u origin main
```

**Nếu ĐÃ có git & remote:**
```bash
git status
git add -A
git commit -m "feat(hr): CV Management client-only + Vercel deploy config"
git push
```
> Nếu `git push` bị từ chối vì remote đi trước (non-fast-forward): **đừng pull tự động**. Kiểm tra với chủ repo; nếu chắc chắn ghi đè an toàn thì dùng `git push --force-with-lease` (cân nhắc kỹ).

---

## 2. Deploy Vercel — Cách A: Dashboard (khuyến nghị)

1. Vào https://vercel.com/khanh-truong → **Add New… → Project**.
2. **Import Git Repository** → chọn `khanhtruong-web/Binatechapp` (cấp quyền GitHub nếu Vercel hỏi).
3. Cấu hình (thường Vercel tự nhận từ `vercel.json`):
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
4. **Environment Variables** (mục Settings khi import):
   - `VITE_GOOGLE_CLIENT_ID` = *(OAuth Client ID của bạn — chỉ cần nếu dùng đăng nhập Google)*
   - **Gemini API Key KHÔNG đặt ở đây.** Người dùng nhập trong app: tab **Settings → GEMINI_API_KEY** (lưu localStorage trình duyệt).
5. Bấm **Deploy**. Xong sẽ có domain, ví dụ `https://binatechapp.vercel.app`.

## 2. Deploy Vercel — Cách B: CLI

```bash
npm i -g vercel
cd D:\binatechapp
vercel            # lần đầu: link vào scope "khanh-truong", nhận cấu hình từ vercel.json
vercel --prod     # deploy production
```

---

## 3. Sau khi deploy — BẮT BUỘC làm nếu dùng đăng nhập Google

1. Mở **Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client**.
2. Thêm domain Vercel vào **Authorized JavaScript origins**:
   - `https://binatechapp.vercel.app` (và mọi domain preview nếu cần)
3. Lưu. (Tránh lỗi `redirect_uri_mismatch` / `origin not allowed` — xem `LESSONS_LEARNED.md` LL-04.)

---

## 4. Smoke test sau deploy (2 phút)

- [ ] Mở domain → app hiện, **không màn trắng**.
- [ ] Tab **Settings** → nhập Gemini API Key → Save.
- [ ] Tab **HR (Personnel) → CV Extraction** → kéo thả 1 CV `.pdf`/`.docx` → **Run AI Extraction** → có kết quả.
- [ ] Bấm nút bút chì **Review & Edit** → cửa sổ side-by-side hiện text gốc + field AI → **Approve & Commit**.
- [ ] Tab **Smart Search** lọc theo Discipline / Min Exp → ra đúng ứng viên.
- [ ] Reload trang ở tab bất kỳ → **không 404** (nhờ `rewrites`).
- [ ] Các tab khác (Dashboard, Accounting…) hiện **OFFLINE MODE** là bình thường (không có backend) — app vẫn chạy.

---

## 5. Ghi chú kiến trúc (vì sao client-only)

| Vấn đề | Xử lý |
|---|---|
| `server.ts` (`app.listen`) không chạy trên Vercel serverless | Build tĩnh `vite build`, bỏ server khỏi bản Vercel (LL-01) |
| Route `/api/*` 404 | Đã có fallback localStorage ở ModuleView/Dashboard (LL-02) |
| Reload SPA 404 | `vercel.json` rewrites về `index.html` (LL-03) |
| Secret lộ khi push | `.gitignore` chặn `.env*`; Gemini key nhập trong app, không hardcode (LL-12) |

> Muốn khôi phục backend Google Workspace (Sheets/Drive/Docs realtime)? Xem `PROMPT_NANG_CAP_HR_CV.md` phần **Phase 3 — Serverless API** để chuyển `server.ts` thành Vercel Functions trong `/api`.
