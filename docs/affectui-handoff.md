# affectUI → Guide me: bàn giao cho Claude Code

Ngày khảo sát: 2026-10-19. Bắt đầu bằng `AGENTS.md` và `.agents/skills/clone-website/SKILL.md`.

## Kết quả và route

| Nguồn công khai | Route cục bộ | Phạm vi |
| --- | --- | --- |
| https://www.affectui.com/screens/crm | `/personalize` | Dựng app CRM trong preview, không dựng trang marketing/documentation bao ngoài |
| https://www.affectui.com/screens/crm/full | `/personalize` | Reference toàn màn hình cho đối chiếu trực tiếp |
| https://www.affectui.com/screens/analytics/full | `/personalize?section=reports` | Analytics trong Reports, dùng sidebar CRM |
| https://www.affectui.com/screens/settings-billing/full | `/personalize?section=settings` | Settings đầy đủ4 tab, dùng sidebar CRM |
| https://www.affectui.com/screens/agent-run/full | `/personalize?section=run` | Run dưới Reports: workflow, plan/activity, approval, inline diff |
| 109 trang thư viện | `docs/research/affectui-library/` | Hồ sơ khảo sát; đã dựng CRM + Analytics + Settings & Billing + Agent Run, còn 105 item tham khảo |

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
| `WorkspacePages.tsx` | Home, Contacts CRUD, Deals và các pipeline có filter/export |
| `WorkspaceDocuments.tsx` | Folder, tạo/sửa/upload/download tài liệu |
| `WorkspaceEditors.tsx`, `WorkspaceDialog.tsx` | Profile, appearance/notifications, feedback, changelog, tạo workspace/view và native dialog có animation |
| `workspace-state.ts` | State lưu theo key trong browser, history/query navigation, CSV/download helpers |
| `workspace-interactions.css` | Motion và các màn tương tác mở rộng, được scope trong CRM |
| `src/components/sites/affectui-analytics/` | Reports: 3 period dataset, chart SVG tương tác, morph đường/số, CSV và saved reports |
| `src/components/sites/affectui-settings/` | Settings lazy-loaded: General, Members, Billing, API keys; xem brief riêng |
| `src/components/sites/affectui-run/` | Run lazy-loaded: simulation model, plan/activity, approval, draft diff; xem brief riêng |
| `reference.css` | CSS quan sát từ public preview; được sinh lại bởi prepare script |
| `crm-overrides.css` | Tích hợp và điều chỉnh cục bộ |
| `CrmIcon.tsx`, `icons.json`, `seed.json` | SVG tĩnh và dữ liệu lấy từ DOM công khai; không chạy remote bundle |
| `src/components/sites/affectui-fonts.css` | Inter dùng chung với hai affectUI component đã tồn tại |
| `src/components/stripe/Navigation/Navigation.tsx` | Entry Guide me desktop/mobile |

History undo/redo giới hạn 100 snapshot trong session. Company, contact, view tùy chỉnh, tài liệu/folder, saved report, kỳ báo cáo, checklist và favorite được lưu trong localStorage riêng từng workspace. Profile/preferences dùng chung tài khoản cục bộ. Refresh giữ dữ liệu; không có backend hoặc đồng bộ đa thiết bị. Acme khởi tạo bằng seed, Personal và workspace mới khởi tạo rỗng. Dữ liệu Analytics 7/30/90 ngày lấy từ preview gốc, độc lập với số liệu pipeline CRM.

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
node scripts/forensics/affectui-analytics-compare.mjs http://localhost:3000
node scripts/qa/affectui-workspace.mjs http://localhost:3000
npm run check
```

Không chạy lại prepare sau khi sửa trực tiếp `reference.css`, `icons.json` hoặc `seed.json`: nó sẽ sinh lại các file đó. Sửa CSS mới trong overrides. Không commit production JS bundle của website làm implementation.

## Giới hạn và cách tiếp tục

- Pixel connection là mô phỏng; snippet Acme được hiển thị như văn bản, không được thực thi và không gửi tracking event. Trạng thái kết nối được giữ khi chuyển tab/refresh.
- Document gốc không được preview cung cấp. Bản local giữ cover gốc và bổ sung **workspace draft** có thể sửa/lưu/download; Pipeline Forecast có thể khởi tạo từ company hiện tại. File upload của người dùng được đọc/lưu cục bộ, giới hạn 2 MB mỗi file.
- Contacts có create/edit/delete/search/export. Profile và Appearance & notifications có form lưu thực tế trong browser; Help lưu feedback trên thiết bị, không gửi tới người khác. Full changelog mở nội dung chi tiết.
- New view tạo tab table/board có filter owner và lưu theo workspace. All views mở các tab. Preset Account executive/Partner manager lọc owner tương ứng. Đây là các workflow cục bộ bổ sung ngoài những state đã quan sát được trong public CRM demo.
- Board kéo thả và lựa chọn stage dùng chung model table; không giả định đó là toàn bộ nghiệp vụ của sản phẩm gốc.
- Reports có tooltip chuột/bàn phím/cảm ứng, chọn 7/30/90 ngày, ẩn/hiện series, thông tin metric/product, CSV thật và báo cáo đặt tên có thể mở/xóa. Xem [Analytics brief](research/affectui-analytics/README.md) cho đối chiếu và file ownership.
- Settings có General upload/name/region, member invite/role/remove, plan/cycle/cancel/resume, masked card/email, invoice CSV và demo API key create/copy/rename/revoke. State riêng workspace; không gửi email/thu tiền/cấp quyền API thật. Menu Settings và sidebar mở trang đầy đủ; appearance cũ giữ riêng. Xem [Settings brief](research/affectui-settings/README.md) cho kiểm tra20 viewport/state, regression và production performance.
- Run được đặt ngay dưới Reports và dựng hoàn toàn bằng React/CSS/SVG. Có5 bước/8 tool calls, đồng hồ, stop/retry/replay, approval gate, plan editing/drag, payload disclosure/clipboard và9 diff suggestions/Undo. Run và draft lưu riêng theo workspace. Share xuất JSON thật; View in Chat mở transcript cục bộ. Không gửi email/calendar hoặc gọi LLM thật. Xem [Run brief](research/affectui-run/README.md) cho kiến trúc, motion và QA.
- Motion chạy theo tương tác: shared selection pill, crossfade màn/tab/menu, layout animation khi sort/thêm/xóa/di chuyển card, accordion, native dialog, số và SVG path morph khi đổi period. Tôn trọng reduced motion; không có vòng lặp cập nhật dữ liệu giả khi người dùng không thao tác.
- Classic variants, toàn bộ trạng thái của 105 item khác và backend không được inventory desktop ban đầu xác minh. Phải khảo sát thêm item đang dựng.
- Kiểm tra pixel chỉ áp dụng viewport/state đã ghi trong JSON; không coi phần trăm này là bằng chứng mọi state giống tuyệt đối.
- `npm run check` có thể in 4 warning có sẵn ở `capture-nav-menus.mjs`, `products/build_css.mjs`, `Footer.tsx`, `Stats.tsx`. Phần CRM mới phải không có lint error.

Kết quả bản mở rộng: 11 nhóm workflow CRM và 17 nhóm workspace/Analytics đã qua, không có page error. Bộ workspace kiểm tra cả dữ liệu sau refresh, tách workspace, file export/upload và intermediate frame của path animation. Analytics so riêng phần main content vì sidebar cố ý giữ CRM: 0,052–0,308% pixel khác ở 390/768/1024/1440/1920. Số đo hiện hành nằm trong các `comparison/metrics.json`; ảnh Sales docs có thêm toolbar chức năng ngoài reference gốc.

## Prompt tiếp nối cho Claude Code

> Đọc AGENTS.md, docs/affectui-handoff.md và skill clone-website. Mở docs/research/affectui-library/README.md và tìm item cần dựng trong manifest/engine-map. Đọc JSON, ảnh và CSS hash của item đó; khảo sát thêm public preview để ghi rõ trigger/state/responsive. Tái dùng shell/tokens/fonts và cơ chế state phù hợp của affectui-crm, viết React/TypeScript có thể sửa, không import bundle production. Giữ nguyên các route Stripe. Chạy workflow thật bằng Playwright, so ảnh cùng viewport/state, sau đó npm run check. Báo rõ phần chưa quan sát hoặc đang mô phỏng.
