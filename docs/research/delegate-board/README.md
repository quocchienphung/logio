# Delegate Board → khung Project Management của Guide me

Ngày: 2026-10-20. Nguồn tham chiếu: preview công khai `https://www.affectui.com/components/delegate-board` (bản Pro).

## Phạm vi và nguồn

- Chỉ dùng thứ ai cũng thấy ở trang preview: docs/API công khai (props, phím tắt, a11y), DOM roots `ui-dbc*`, stylesheet mà trang phục vụ cho trình duyệt (số đo, màu, easing) và ảnh chụp. **Không** dùng CLI, registry, MCP, API cài đặt hay mã Pro; không import bundle nào của site đó. Mã React/CSS ở đây viết lại từ đầu.
- Bằng chứng: `source-preview.png` (ảnh preview), `observed-rules.css` (CSS đo được, chỉ để tham chiếu số đo; không import), `docs/research/affectui-library/pages/components--delegate-board.json` trong git history (commit `3d6c2c7^`; thư mục inventory đã bị xóa khỏi working tree).

## Phân tích component gốc

| Phần | Quy tắc quan sát được |
| --- | --- |
| Bar | ✦ + "Delegate" + gợi ý "Drag a task onto an agent" + công tắc **Auto** (switch 28×16). |
| Unassigned | Vùng xám nhạt (`rgba(0,0,0,.035)`) có đếm số; mỗi task là thẻ trắng (grip, tiêu đề, công cụ, `~N min`). |
| Agents | Mỗi agent: avatar, tên, model + giá/phút, thẻ **Free** (xanh) hoặc **Busy until HH:MM** (xám), hàng queue chip. Chip đầu là task đang chạy (xanh + spinner). Quá ba chip → chip `+N`, tooltip tối khi hover/focus. |
| Kéo thả | Thẻ bị nhấc nghiêng 1,5° + bóng sâu, bản gốc mờ 35%. Agent bên dưới con trỏ nhuộm xanh nhạt và **xem trước** giờ mới (+ giá hand-off). Thả vào vùng Unassigned = trả về (`agentId: null`). |
| Auto | Mỗi giây giao một task cho agent rảnh sớm nhất; hòa thì agent đứng trước. |
| Bàn phím | Enter nhấc, ↑/↓ chọn, Enter giao, Esc trả lại, 1–9 giao ngay (số hiện cạnh tên khi focus). |
| Thời gian | busy = phần còn lại của task đang chạy (`current`) + ước lượng các task sau. Demo gốc dùng đồng hồ cố định 09:00 (Busy until 09:20 / 09:36). |

## Áp vào Project Management (phần tự quyết)

- Khung cố định 380:401, nên board thiết kế **rộng 380** và co theo `--k = 100cqw / 380` như Agent Plan. Ở độ rộng này preview gốc xếp lại; bản này giữ hai cột nhưng chặt hơn (pile 136, queue chip nằm hàng riêng dưới avatar) để vừa 401 mà chữ vẫn đọc được (≈ 1× trên laptop, ≈ 0,92× trên iPhone).
- Agent → **thành viên nhóm** (Planner, Designer, Engineer, Analyst, dòng phụ "Team N", tên chung giống dữ liệu mẫu Mapping). Không có giá/phút nên tổng "in queues" cộng **thời gian** (`56 min`, `1 h 8 min`); khi agent có `rate` thì cộng tiền với `formatCost` như gốc.
- Logo hãng/công cụ (Notion, GitHub …) thay bằng 5 glyph chung (Docs, Code, Data, Chat, Design) vẽ bằng `currentColor`.
- Hint "Drag a task onto a teammate" vẫn hiện (gốc ẩn ở container ≤ 560px, nhưng ở 380px nó còn đủ chỗ và là chỉ dẫn duy nhất cho người dùng cảm ứng).
- Đồng hồ demo cố định 09:00 (`ProjectDelegateBoard.tsx`) để HTML server, mọi thiết bị và test cho cùng giờ. Component dùng đồng hồ thật khi không truyền `now` (store ngoài, server không render giờ nên không lệch hydrate).
- Thêm: phím `0` trả task về Unassigned; thông báo `aria-live`; focus theo task sau khi giao; FLIP trượt từ vị trí thả; dark mode qua `.dark`/`[data-theme=dark]`; `prefers-reduced-motion`.

## File

| File | Việc |
| --- | --- |
| `src/components/sites/affectui-delegate-board/delegate-model.ts` | Luật thuần: busy time, assign, auto-routing, tổng, nhãn giờ. Test: `delegate-model.test.mjs` (6 test). |
| `DelegateBoard.tsx`, `delegate-board.css` | Component (pointer drag, bàn phím, Auto, tooltip, FLIP) và CSS. API: `agents`, `tasks`, `onAssign`, `mode/defaultMode/onModeChange`, `suggestion`, `formatCost`, `now`, `title`, `agentLabel`, `agentsLabel`. Không có `onAssign` thì board tự di chuyển task. |
| `ProjectDelegateBoard.tsx` | Dữ liệu và nhãn của khung Project Management. |
| `guide-navigation/navigation-model.ts`, `GuideNavigation.tsx`, `guide-navigation.css` | Hàng 04 thành `live: "delegate-board"` (thay khung xám); khung live không phải link, bấm hàng (hoặc chạm lần hai) vẫn mở Mapping. |

Task và chip là `button` nên vuốt chuyển nhóm của Guide me bỏ qua cử chỉ bắt đầu ở đó; vuốt ở vùng khác của khung vẫn đổi nhóm.

## QA

`node scripts/qa/delegate-board.mjs [base-url]` — 25 kiểm tra: số liệu ban đầu, ngưỡng kéo 4px, ghost + xem trước khi kéo, thả/trả về Unassigned, thả ngoài board và Esc khi đang kéo, `+N` + tooltip nằm trong card, bàn phím (Enter/↑↓/Esc/số/0), Auto, **kéo cảm ứng thật** (CDP touch, không cuộn, không đổi nhóm), chạm `+N` mở và chạm ra ngoài đóng tooltip, vuốt ngoài board vẫn đổi nhóm, không lỗi console. Ảnh/kết quả: `qa/`. WebKit iPhone 13 qua IP LAN: hydrate đúng, render đúng (`qa/frame-webkit-iphone.png`); kéo cảm ứng chỉ kiểm bằng Chromium (Playwright không phát touch drag cho WebKit).
Unit: `node --experimental-strip-types --test src/components/sites/affectui-delegate-board/delegate-model.test.mjs`.

## Giới hạn

- Chưa thử trên iPhone thật; chưa so từng pixel với preview gốc (khác độ rộng thiết kế và nội dung nên so pixel không có nghĩa). Dark mode có CSS nhưng chưa chụp (trang Guide me là nền sáng).
- Tooltip `+N` mở bằng hover, focus hoặc chạm (chạm ra ngoài/Esc để đóng); phần chạm đã kiểm bằng Chromium giả lập cảm ứng, chưa kiểm trên iPhone thật.
- Không có backend: giao việc chỉ đổi state trong trình duyệt (và `onAssign` nếu truyền vào).
