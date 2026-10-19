# Settings & Billing → Guide me

Khảo sát ngày 2026-10-19, nguồn [full preview](https://www.affectui.com/screens/settings-billing/full). Đích: `/personalize?section=settings`. Sidebar giữ navigation CRM để chuyển qua Companies và Reports; Settings cũng mở từ menu tài khoản. `settings-tab=general`, `members`, `api-keys` deep-link tới tab; mặc định Billing. Back/Forward giữ đúng trạng thái tab.

## Bằng chứng và bố cục

Các file `billing/general/members/api-keys.html`, `.txt` và `source-*.png` lưu DOM/text/hình trực tiếp từ preview công khai. `styles.css`, `icons.json`, `usage.json`, `daily-samples.json` lưu CSS, SVG và số liệu quan sát. Không tải mã nguồn Pro, không chạy bundle sản phẩm gốc trong bản dựng.

Column chính rộng tối đa 1040px, gutter 32px; title22px, body13–13.5px Inter. Thanh tab sticky có fade24px phía dưới. Card14px, tray18px. Usage Meter chia2 cột khi main container≥901px; plan/payment và3 tier xếp dọc khi main≤900px. Field General xếp label phía trên khi≤640px; mobile gutter16px. Invoices cuộn ngang bên trong, trang không tràn viewport. Sidebar/drawer/theme kế thừa shell CRM.

## File sở hữu

| File | Nội dung |
| --- | --- |
| `src/components/sites/affectui-settings/SettingsBilling.tsx` | Tab/history, usage adapter, plan/cycle/cancel/resume, payment/email, invoices |
| `SettingsTabs.tsx` | General upload/name/region; Members invite/roles/remove; API key create/copy/rename/revoke |
| `settings-reference.css`, `icons.json`, `usage-seed.json` | Reference CSS/SVG và30 ngày dữ liệu từ DOM |
| `settings-overrides.css`, `settings-tabs.css` | Tích hợp React, responsive và trạng thái tương tác bổ sung |
| `../affectui-usage-meter/UsageMeter.tsx` | Dùng lại meter đã có, không sửa component dùng trong iPhone Stripe |
| `../affectui-analytics/AnimatedNumber.tsx` | Motion value cho giá, cập nhật DOM mà không rerender toàn Settings |
| `../affectui-crm/Crm.tsx`, `workspace-state.ts` | Sidebar/account entry, lazy import, workspace name/logo, section route |

CSS reference được sinh bởi `scripts/forensics/affectui-settings-prepare.mjs` từ `inspect.mjs`. Chỉnh sửa CSS tại overrides, không tại reference. Không thêm dependency.

## Tương tác và dữ liệu

- General: tên workspace cập nhật sidebar, upload PNG/JPEG/WebP/GIF≤2MB, preview logo, chọn3 region, Discard/Save; giữ thay đổi sau refresh.
- Members:5 seed người trong Acme; workspace mới có1 owner. Invite lưu Pending, ngăn email trùng và vượt số seat. Admin/Member/Viewer có menu bàn phím, removal có xác nhận; Owner giữ nguyên.
- Billing: monthly/yearly−20%, giá19/49/99 và15/39/79, current-plan halo, xác nhận chuyển gói, cập nhật credit/seat/storage limit, cancel/resume, sửa last4/expiry và email hợp lệ. Gói/cycle/thẻ/email lưu riêng workspace.
- Invoices:5 dòng dữ liệu nguồn; download từng dòng hoặc toàn bộ thành CSV gồm workspace/email/amount/status thực tế đang hiển thị.
- API keys: seed giữ mask gốc; clipboard là giá trị `sk-demo-local-*`. Create sinh random bằng Web Crypto, hiển thị giá trị demo để copy; rename/revoke có dialog, state riêng workspace.
- Browser localStorage giữ dữ liệu; không gửi email, gọi API thật, xử lý thẻ hoặc thu tiền. Dialog/toast giải thích ngay tại hành động liên quan. Các ngày hóa đơn/reset/renew và usage sample là snapshot nguồn ngày khảo sát.
- Appearance/notifications cũ giữ tại menu **Appearance & notifications**; **Settings** mở trang đầy đủ.

## Motion và hiệu năng

Shared layout pill cho tab và billing frequency; crossfade/rise khi đổi nội dung; list layout/entry/exit khi mời/xóa/key; native dialog/backdrop; counter/bar1200ms khi xuất hiện,650ms khi quota đổi; giá700ms. Hover/keyboard/touch trên usage categories và daily bars đều hoạt động. Tôn trọng `prefers-reduced-motion`; rAF và observers được hủy khi unmount. Không có polling hoặc cập nhật usage giả liên tục.

`next/dynamic` tách toàn Settings khỏi lần mở Companies. Meter được memo hóa, callback Upgrade ổn định; thay đổi giá dùng MotionValue nên không rerender meter mỗi frame.

Đo Chrome headless, production Next16.3.8,1440×1100 trên máy hiện tại: Settings tải thêm1 JS chunk **14,837 bytes encoded**,54,541 decoded sau khi bấm navigation. Trong268 frame đo khi đổi chu kỳ, median6.1ms/p95**6.4ms**,1 frame>25ms, không long task. Cửa sổ idle2 giây có **0 DOM mutation,0 long task**. Đây là phép đo tại máy này, không chứng minh vượt các sản phẩm/máy khác. Chi tiết: `qa/performance.json`.

## Kiểm tra và khác biệt có chủ đích

`comparison/metrics.json`:20 so sánh main panel tại1440,1920,1024,768,390px. General0%; Members/API keys≤0.024%; Billing0.084–0.180%. `details.json`: invoices/yearly ởdesktop/mobile0.085–0.295%. Ảnh source/local/diff cùng viewport, scroll và settled state; sidebar loại khỏi phép đo vì dùng CRM shell. Các tỷ lệ chỉ áp dụng state đã chụp.

Source meter hiển thị8 seats trong khi Members có5 người. Local meter tính số người thật (ban đầu5), cập nhật theo pending invite/removal và plan limit; đây là phần khác biệt thị giác cố ý. Source chuyển gói không cập nhật quota; local cập nhật quota theo gói. Source Update/Download chỉ có toast; local có form thẻ mẫu và CSV download. Invitation/API dialog và confirmation là luồng bổ sung, không giả định có backend của affectUI.

QA `qa/billing-results.json`:11 nhóm cho billing, usage input, keyboard/history, validation, invoice payload, refresh, isolation, mobile/reduced motion. `qa/tabs-results.json`:9 nhóm cho General/Members/API CRUD, clipboard, logo/sidebar, mobile và6 so sánh riêng. Không page error. CRM11 nhóm và workspace/Reports17 nhóm regression đều pass.

`npm run check` pass (lint/typecheck/build);5 warnings có sẵn ở Stripe/forensics ngoài phần Settings. Chạy lại:

```powershell
node scripts/qa/affectui-settings.mjs
node scripts/qa/affectui-settings-tabs.mjs
node scripts/forensics/affectui-settings-compare.mjs
node scripts/forensics/affectui-settings-detail-compare.mjs
node scripts/forensics/affectui-settings-performance.mjs http://localhost:3197
```

Lệnh cuối cần production server đang chạy ở URL truyền vào; không đo dev/HMR như production.
