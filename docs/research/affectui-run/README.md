# Agent Run → Guide me / Run

Khảo sát nguồn [Agent Run full](https://www.affectui.com/screens/agent-run/full), ngày2026-10-19. Route cục bộ: **`/personalize?section=run`**, nằm ngay dưới **Reports** và trên Settings trong sidebar CRM. Không thay homepage hoặc navigation hiện có của Stripe.

## Cách dựng và file sở hữu

Giao diện được dựng bằng React, CSS và SVG tĩnh, không có ảnh chụp, iframe, canvas hay bundle từ website gốc làm giao diện. Ảnh trong thư mục research chỉ dùng để kiểm tra. Reference lấy từ DOM, CSS runtime/CSSOM và thao tác trên preview công khai, không phải mã nguồn Pro.

| File trong `src/components/sites/affectui-run/` | Trách nhiệm |
| --- | --- |
| `AgentRun.tsx` | Bố cục, status/header, panel, menu, clipboard, Share/export, transcript, focus/keyboard |
| `run-types.ts`, `run-seed.ts` | Contract typed và5 bước/8 tool calls/approval/dữ liệu thực từ preview |
| `run-model.ts` | Pure reducer: tick/start/stop/approve/deny/retry/rename/move/remove/add |
| `useRunEngine.ts` | Clock driver100ms khi running, cleanup, browser persistence và replay |
| `RunClock.tsx` | Text clock riêng khi waiting; engine và localStorage không tick lúc chờ duyệt |
| `RunPlan.tsx` | Plan, progress, retry, edit/drag/keyboard/add/remove |
| `RunActivity.tsx` | Timeline, group/card disclosure, JSON syntax, copy arguments/result, loader |
| `RunApproval.tsx` | Risk/details, keyboard approve/deny, pending→resolved motion |
| `RunDraft.tsx` |9 diff suggestions, review popover, Y/N, prev/next, bulk actions, Undo |
| `RunIcon.tsx`, `icons.json` | SVG công khai xuất từ DOM, không fetch icon khi chạy |
| `run-reference.css` | CSS được sinh bởi prepare script, không sửa tay |
| `run-overrides.css`, `run-plan-activity.css`, `run-draft.css` | Tích hợp React và các trạng thái bổ sung |

Entry/shell ở `../affectui-crm/Crm.tsx`, section/history ở `workspace-state.ts`. Dùng lại `WorkspaceDialog`, browser-storage và download helpers; không thêm dependency. Next dynamic import được đặt trong client boundary theo guide của Next16.3.8 đang cài.

## Layout và responsive

Main toolbar52px. Column plan/activity rộng tối đa680px, padding32px desktop; panel360px, hai cột scroll độc lập. Plan card423px với5 hàng ở trạng thái đầu; tray bo18px, card14px, timeline marker23px. Inter/font/icon kế thừa đúng reference.

Khi main area≤1000px, panel chuyển thành lớp bên phải, có scrim; default đóng trên màn hẹp. Người dùng mở bằng Show side panel hoặc link Waiting for your approval trong activity. Mobile≤600px: padding16px, panel full main width, header rút gọn, diff không tràn viewport. Local bổ sung nút Close trên panel mobile, focus trap và trả focus về toggle; source chỉ có toggle ở phía sau panel.

Dark mode dùng token của CRM; không đổi theme Stripe. `prefers-reduced-motion` tắt chuyển động trong khi workflow vẫn hoạt động.

## State và workflow

1. Read Stripe revenue/churn → search/read Q2 memo → write revenue/churn draft.
2. Dừng ở **gmail.send**, không thực thi call hoặc bước calendar khi chưa duyệt.
3. Approve hoặc Ctrl/Cmd+Enter tiếp tục email demo và calendar demo; Deny/Escape dừng tại bước đó. Card co lại thành Approved/Denied; activity giữ quyết định.
4. Stop hủy progression; Retry from here giữ bước đã xong, reset bước hiện tại/các bước sau và yêu cầu duyệt lại. Run again chạy lại plan hiện tại và reset draft review.
5. Run options có Copy run link, Share và View in Chat. Copy dùng clipboard thật; Share tải JSON chứa run/draft; Chat mở transcript từ dữ liệu hiện tại. Link mở workflow cục bộ, không giả vờ đồng bộ progress sang máy khác.
6. Edit plan là extension trong menu: dừng run để sửa tên bằng Enter/F2/double-click, Alt+Arrow để đổi thứ tự, Delete để xóa, kéo grip và thêm bước. Các bước tùy chỉnh cũng chạy bằng model và xuất được trong JSON.

Runtime status: pending/running/waiting/done/denied/stopped. Model giữ riêng execution time và approval waiting time: đồng hồ tiếp tục chạy khi waiting, nhưng calls không tiến triển; thời gian chờ được cộng một lần khi approve/deny/stop. Tab ẩn tạm dừng execution ticks; unmount dọn timer/observer. Refresh giữ trạng thái và draft theo workspace; Acme và Personal độc lập.

`RunActivity` group đang chạy mở, xong thì thu lại; card mở payload, copy JSON/text thật, thông báo fallback nếu clipboard bị chặn. Thinking loader bám đúng trạng thái; stopped/denied bỏ loader, done giữ Done in … như source.

Draft giữ9 token-level suggestions của nguồn. Original: “Revenue grew 18% in Q3 to $4.2M, mostly driven by new enterprise customers. Churn stayed flat at 2.1%, and we expect the pipeline to carry into Q4 without changes to the plan.” Suggested: “Revenue grew 21% in Q3 to $4.3M, driven by six new enterprise customers. Churn fell to 1.8%, and the pipeline supports raising the Q4 target by 5%.” Accept/Reject từng thay đổi, bulk chỉ áp dụng pending, Undo quay về action trước, history tối đa50 snapshot.

Đây là simulation cục bộ giống preview: không query Stripe thật, gửi email, gọi calendar hay chạy LLM. JSON payload/source dates/cost0.14 là dữ liệu mẫu từ reference. Muốn nối backend: giữ `RunSnapshot`/UI contract, thay clock driver bằng event của dịch vụ và nối các action approval vào API đã xác thực.

## Motion và hiệu năng

Spinner/rays và gradient shimmer khi running; timeline entry rise, card/group grid disclosure, draw-check khi hoàn tất, pill status, loader label/width transition, approval collapse/crossfade, draft mark/color/toolbar/popover transition, panel420ms và shell sidebar420ms. Các chuyển động chạy bằng DOM/CSS/Motion; không dùng video hoặc ảnh để mô phỏng.

Memo hóa Draft/tool cards; thời gian chờ chạy ở text component riêng. Settings/Reports và Stripe engine không bị thay thế. Run chỉ tải khi mở section. Phép đo production Chrome headless1440×1000 tại máy này:1 chunk **20,057 bytes encoded**,94,728 decoded;592 frames khi chạy, median6.1ms/p956.2ms,0 frame>25ms,0 long task. Sau Stop và chờ ổn định:0 DOM mutation trong2 giây. Không suy rộng thành benchmark mọi máy hay khẳng định vượt sản phẩm khác. Số liệu: `qa/performance.json`.

## Kiểm tra và bằng chứng

- `initial/time-*/approval-email/email-approved/done/denied/stopped/mobile*.html`, `.txt`, `source-*.png`: các trạng thái nguồn.
- `styles-settled.css`, `tool-call.css`, `approval-parts.json`, `icons*.json`: CSS/SVG/DOM có xuất xứ. Script inspect/save không được import vào app.
- `comparison/metrics.json`: source/local/diff theo viewport/state toàn main; `comparison/draft/metrics.json`:8 so sánh desktop/mobile cho initial, hover active, accepted, rejected đều0% tại threshold0.15. `tool-arguments-comparison.json`: expanded Arguments0% khác pixel và cùng622×165.125px.
- Main comparison loại sidebar CRM có chủ đích; ẩn đồng thời clock text và transient toast trên cả source/local vì thời gian thao tác khác nhau. Trên panel mobile full-width, setup source dùng toggle DOM quan sát được để đóng panel vốn không có nút đóng phía trước; QA local dùng input pointer/keyboard thật.
-4 model tests kiểm tra thứ tự calls, approval gate, deny/retry, accounting thời gian chờ và plan mutations.
- `qa/results.json`:10 nhóm workflow end-to-end; `qa/draft-results.json`:7 nhóm diff/clipboard/refresh/workspace/mobile; `plan-activity-qa.json`:11 nhóm plan/payload/retry/drag. Không runtime page error ở các lượt pass.
- `npm run check` pass, với5 warning có sẵn ở Stripe/forensics ngoài phần Run. Reports/workspace17 nhóm và Settings11 nhóm regression pass. Run main workflow cũng pass trên production.

Chạy lại với dev server đang mở:

```powershell
node scripts/qa/affectui-run.mjs
node scripts/qa/affectui-run-draft.mjs
node scripts/forensics/affectui-run-plan-inspect.mjs
node --experimental-strip-types --test src/components/sites/affectui-run/run-model.test.mjs
node scripts/forensics/affectui-run-compare.mjs
```

Performance cần production server và URL riêng: `node scripts/forensics/affectui-run-performance.mjs http://localhost:3197`. Các tỷ lệ so sánh chỉ áp dụng viewport/state đã đo, không phải cam kết mọi frame giống tuyệt đối.
