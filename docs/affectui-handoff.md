# affectUI → Guide me: bàn giao cho Claude Code

Ngày khảo sát: 2026-10-19. Bắt đầu bằng `AGENTS.md` và `.agents/skills/clone-website/SKILL.md`.

## Kết quả và route

| Nguồn công khai | Route cục bộ | Phạm vi |
| --- | --- | --- |
| https://www.affectui.com/screens/crm | `/personalize` | Dựng app CRM trong preview, không dựng trang marketing/documentation bao ngoài |
| https://www.affectui.com/screens/crm/full | `/personalize` | Reference toàn màn hình cho đối chiếu trực tiếp |
| 109 trang thư viện | `docs/research/affectui-library/` | Hồ sơ khảo sát; chưa dựng 108 item còn lại thành route mới |

Navigation desktop giữ tên và biểu tượng **Guide me**, link `/personalize`. Menu mobile có cùng link trong callout Company CRM. Trong menu tài khoản CRM có **Back to Stripe** để quay lại `/`.

Đây là bản dựng độc lập từ giao diện và hành vi preview công khai. Không có quyền truy cập mã nguồn Pro, API cài đặt có xác thực hoặc toàn bộ engine nội bộ của affectUI. Những phần đó chưa được lấy và không cần thiết để chạy CRM cục bộ.

## Clone engine của repo thực sự là gì?

Repo không có một hàm tự động chuyển mọi website thành React. Engine là workflow quan sát → lưu bằng chứng → dựng mã nguồn → kiểm tra:

1. `.agents/skills/clone-website/` là workflow chung cho Codex/Cursor/OpenCode/Claude. `.claude/commands/clone-website.md` chỉ dẫn tới workflow này.
2. `scripts/forensics/` dùng Playwright để khảo sát DOM, computed styles, assets, animation và chụp hình; `pixelmatch`/`pngjs` để so sánh.
3. Clone Stripe hiện có dùng DOM port + CSS reference được phân vùng + React controllers cho tương tác; Three.js xử lý các phần WebGL. Đọc ba tài liệu `docs/stripe-*` ghi trong AGENTS trước khi thay đổi Stripe.
4. Các stylesheet `src/styles/stripe/generated/` và `hds-*.css` là đầu ra được sinh. Sửa tại file overrides tương ứng, không ghi đè stylesheet gốc.
5. Next.js đang cài là **16.3.8**. Đọc guide trong `node_modules/next/dist/docs/` trước khi thay đổi conventions/router. Page là Server Component; CRM là client boundary.

Không thay homepage hoặc layout toàn cục khi thêm affectUI. Giao diện affectUI có namespace riêng và font Inter riêng.

## Bản đồ UI engine affectUI quan sát được

Toàn bộ danh mục công khai được lưu trong [inventory](research/affectui-library/README.md): **54 components, 12 screens, 11 blocks, 24 illustrations, 8 motion effects**. `engine-map.json` cho biết CSS module và namespace xuất hiện ở trang nào. Đây là bản đồ quan sát, không phải import graph từ source nội bộ: stylesheet toàn cục có thể xuất hiện dù component không hiển thị; đối chiếu thêm DOM roots và trạng thái trước khi tái dùng.

Những quy tắc xác minh trực tiếp trên CRM:

- **Shell `.ui-as` / `.ui-as-app`:** CSS variables `--page`, `--panel`, `--card`, `--ink`, `--line`, `--accent`, `--ease`; sidebar 220px, khoảng frame 8px, panel bo 18px. Main panel giữ toàn bộ chiều cao container.
- **Responsive theo container:** `@container ui-as (max-width: 900px)` đổi sidebar thành drawer; tới 600px giảm inset. Bảng giữ min-width 880px, cuộn bên trong. Không scale nguyên desktop thành mobile.
- **Dark mode:** selector ancestor `.dark` hoặc `[data-theme="dark"]` đổi token của shell và từng component. Local CRM dùng data-theme trên `.crm-page`, không đổi theme toàn bộ Stripe.
- **Chữ/icon:** Inter 400/500/600 đã có trong repo; SVG source là Hugeicons và logo công ty. Không thay toàn bộ bằng bộ icon khác nếu cần bám hình.
- **Motion:** layout sidebar 420ms, nội dung rise 380–420ms, easing `cubic-bezier(0.22,1,0.36,1)`, hover 140ms; tôn trọng reduced motion.
- **Composition:** CRM dùng shell + tab bar + `.ui-dt` table. Team strategy là board suy ra từ cùng danh sách company; Pixel integration là snippet và trạng thái kết nối; Sales docs dùng document cover bằng CSS.
- **State tách view:** không suy diễn chức năng backend từ preview. Public API của CRM có `workspace`, `user`, `className`, `onNavigate(label)`.

## File sở hữu và phần đã thực thi

| File | Trách nhiệm |
| --- | --- |
| `src/app/personalize/page.tsx` | Route, metadata, mount CRM |
| `src/components/sites/affectui-crm/Crm.tsx` | Shell, sidebar, drawer, workspace/user/view menus, favorite, onboarding, search |
| `crm-engine.ts` | Company schema, seed, cell conversion, lịch sử undo/redo dùng reducer |
| `CrmTable.tsx` | Spreadsheet: edit, tag picker, cell/range selection, bàn phím, TSV copy/paste, sort, bulk duplicate/delete, add row |
| `CrmViews.tsx` | Board, pixel demo, document covers và dialog |
| `reference.css` | CSS quan sát từ public preview; được sinh lại bởi prepare script |
| `crm-overrides.css` | Tích hợp và điều chỉnh cục bộ |
| `CrmIcon.tsx`, `icons.json`, `seed.json` | SVG tĩnh và dữ liệu lấy từ DOM công khai; không chạy remote bundle |
| `src/components/sites/affectui-fonts.css` | Inter dùng chung với hai affectUI component đã tồn tại |
| `src/components/stripe/Navigation/Navigation.tsx` | Entry Guide me desktop/mobile |

History giới hạn 100 snapshot. Thay đổi company cập nhật board trong cùng session. Refresh tải lại seed; hiện không có database/persistence. Dữ liệu CRM là dữ liệu demo đúng nội dung gốc.

Bàn phím: Enter/F2 sửa ô, Enter lưu và xuống hàng, Tab lưu và chuyển ô, Escape hủy, Arrow chuyển ô, Shift+Arrow chọn vùng, Delete/Backspace xóa vùng, Ctrl/Cmd+C/V cho TSV, Ctrl/Cmd+Z và Ctrl/Cmd+Shift+Z undo/redo. Ctrl/Cmd+K mở tìm kiếm. Board hỗ trợ kéo thả; có select Move to khi focus để dùng bàn phím.

## Nguồn bằng chứng

- `docs/research/affectui-crm/source-*.png`: desktop, mobile, drawer, bốn tab và các menu.
- `*-strategy.html`, `*-integration.html`, `sales-docs.html`, `stage-picker.html` và các `*.txt`: DOM/nội dung từng trạng thái.
- `assets.json`: URL asset thực tế đã tải. Fonts local dùng `/sites/affectui-usage-meter/fonts/inter-latin-{400,500,600}-normal.woff2`.
- `observed-styles.css`: CSS inject trong preview CRM. `icons.json`: SVG xuất từ DOM, không từ endpoint mã nguồn Pro.
- `comparison/`: ảnh source/local/diff, `metrics.json` ghi viewport, hình học và tỷ lệ pixel khác; `states.json` cho các tab phụ.
- `qa/results.json`: danh sách workflow đã kiểm tra và lỗi runtime.
- `docs/research/affectui-library/pages/<family>--<slug>.json`: nội dung docs/API công khai, controls, asset URLs, namespaces và style hashes của từng item. File PNG kế bên là viewport ban đầu. Chưa phải chứng cứ đầy đủ cho mọi animation/state của item đó.

## Lệnh làm việc

```powershell
npm run dev
# Mở http://localhost:3000/personalize, hoặc bấm Guide me trên homepage.

node scripts/forensics/affectui-inspect.mjs
node scripts/forensics/affectui-prepare.mjs
node scripts/forensics/affectui-library.mjs
node scripts/forensics/affectui-engine-map.mjs

node scripts/forensics/affectui-compare.mjs http://localhost:3000
node scripts/qa/affectui-crm.mjs http://localhost:3000
npm run check
```

Không chạy lại prepare sau khi sửa trực tiếp `reference.css`, `icons.json` hoặc `seed.json`: nó sẽ sinh lại các file đó. Sửa CSS mới trong overrides. Không commit production JS bundle của website làm implementation.

## Giới hạn và cách tiếp tục

- Pixel connection là mô phỏng; snippet Acme được hiển thị như văn bản, không được thực thi và không gửi tracking event. Document gốc không được preview cung cấp; local có cover và dialog thông tin.
- Contacts/Reports và các thao tác tài khoản là callback/toast của demo, chưa phải app backend hoàn chỉnh. Workspace là state cục bộ. Local bổ sung tìm kiếm, chuyển theme và return link trong menu.
- New view/All views có menu mở các tab trong bản local. Public preview được khảo sát chưa cho thấy trạng thái tương ứng của hai nút này; đây là phần bổ sung có chức năng, không phải state đã đối chiếu ảnh.
- Board kéo thả và lựa chọn stage dùng chung model table; không giả định đó là toàn bộ nghiệp vụ của sản phẩm gốc.
- Classic variants, toàn bộ trạng thái của 108 item khác, animation timeline và backend không được inventory desktop ban đầu xác minh. Phải khảo sát thêm item đang dựng.
- Kiểm tra pixel chỉ áp dụng viewport/state đã ghi trong JSON; không coi phần trăm này là bằng chứng mọi state giống tuyệt đối.
- `npm run check` có thể in 4 warning có sẵn ở `capture-nav-menus.mjs`, `products/build_css.mjs`, `Footer.tsx`, `Stats.tsx`. Phần CRM mới phải không có lint error.

Kết quả bàn giao: `npm run check` thành công (0 lint error, 4 warning cũ), 11 nhóm workflow trong `qa/results.json` thành công, không có page error. So ảnh trạng thái ban đầu: 0,056–0,159% pixel khác ở 390/768/900/1440/1920; tab phụ 0,013–0,152% tại 1440. Xem [báo cáo hình ảnh và QA](research/affectui-crm/README.md).

## Prompt tiếp nối cho Claude Code

> Đọc AGENTS.md, docs/affectui-handoff.md và skill clone-website. Mở docs/research/affectui-library/README.md và tìm item cần dựng trong manifest/engine-map. Đọc JSON, ảnh và CSS hash của item đó; khảo sát thêm public preview để ghi rõ trigger/state/responsive. Tái dùng shell/tokens/fonts và cơ chế state phù hợp của affectui-crm, viết React/TypeScript có thể sửa, không import bundle production. Giữ nguyên các route Stripe. Chạy workflow thật bằng Playwright, so ảnh cùng viewport/state, sau đó npm run check. Báo rõ phần chưa quan sát hoặc đang mô phỏng.
