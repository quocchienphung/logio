# Delegate Board → khung Project Management của Guide me

Ngày: 2026-10-20. Nguồn tham chiếu: preview công khai `https://www.affectui.com/components/delegate-board` (bản Pro).

## Phạm vi và nguồn

- Chỉ dùng thứ ai cũng thấy ở trang preview: docs/API công khai (props, phím tắt, a11y), DOM roots `ui-dbc*`, stylesheet mà trang phục vụ cho trình duyệt (số đo, màu, easing), SVG inline mà preview vẽ ra, và ảnh chụp. **Không** dùng CLI, registry, MCP, API cài đặt hay mã Pro; không import bundle nào của site đó. Mã React/CSS ở đây viết lại từ đầu.
- Bằng chứng: `source-preview.png` (ảnh lúc đầu), `source-wide-preview.png` (preview rộng với đủ logo, chụp 2026-10-20), `observed-rules.css` (CSS đo được, chỉ để tham chiếu số đo; không import), `docs/research/affectui-library/pages/components--delegate-board.json` trong git history (commit `3d6c2c7^`; thư mục inventory đã bị xóa khỏi working tree).

## Phân tích component gốc

| Phần | Quy tắc quan sát được |
| --- | --- |
| Bar | ✦ + "Delegate" + gợi ý "Drag a task onto an agent" + công tắc **Auto** (switch 28×16). Cao 12 + 28 + 12 = 52 (+0,5 viền). |
| Unassigned | Vùng xám nhạt (`rgba(0,0,0,.035)`) có đếm số; mỗi task là thẻ trắng (grip, tiêu đề, **logo công cụ**, `~N min`). |
| Agents | Mỗi agent: **ô avatar trắng có bóng chứa logo hãng** (Anthropic, OpenAI, Gemini), tên, model + giá/phút, thẻ **Free** (xanh) hoặc **Busy until HH:MM** (xám), hàng queue chip. Chip đầu là task đang chạy (xanh + spinner); chip còn lại hiện **logo công cụ** của task. Quá ba chip → chip `+N`, tooltip tối khi hover/focus. |
| Kéo thả | Thẻ bị nhấc nghiêng 1,5° + bóng sâu, bản gốc mờ 35%. Agent bên dưới con trỏ nhuộm xanh nhạt và **xem trước**: thẻ trắng chữ xanh `+12m until 20:59` và (khi có giá/phút) `+$0.36` bên trái. Task đang chọn nhuộm xanh có viền xanh. Thả vào Unassigned = trả về (`agentId: null`). |
| Auto | Mỗi giây giao một task cho agent rảnh sớm nhất; hòa thì agent đứng trước. |
| Bàn phím | Enter nhấc, ↑/↓ chọn, Enter giao, Esc trả lại, 1–9 giao ngay (số hiện cạnh tên). |
| Thời gian | busy = phần còn lại của task đang chạy (`current`) + ước lượng các task sau. Demo gốc dùng đồng hồ cố định 09:00 (Busy until 09:20 / 09:36). |

Các logo (Anthropic `#D97757`, OpenAI, Gemini gradient; Notion, GitHub, Slack, Figma, HubSpot, Stripe) được xuất nguyên văn từ SVG inline của preview bằng `scripts/forensics/affectui-delegate-board-icons.mjs` → `brand-icons.generated.ts`. Script kiểm tra mỗi icon tồn tại, hai biểu tượng GitHub trùng nhau, chỉ cho phép thẻ vẽ (path, g, defs, linearGradient, stop, rect, circle, clipPath), không có script/link/`on*`. Logo đen (Notion, GitHub, OpenAI) theo `--dgb-strong` nên đổi trắng ở dark mode và trong tooltip tối; id gradient Gemini đổi thành `dgb-gemini` (duy nhất trong trang). Không vẽ lại logo nào bằng tay.

**Chưa kiểm chứng:** công thức "$ in queues" của bản gốc. Hai ảnh chụp cho tổng $1.80 và $2.96 nhưng không đủ dữ liệu (ước lượng từng task, đồng hồ lúc chụp) để suy ra công thức; bản này tự định nghĩa: tổng = Σ giá/phút × số phút còn lại của mỗi hàng đợi, và chỉ dùng khi agent có `rate`. Khung Project Management không đặt giá nên không dùng.

## Áp vào Project Management (phần tự quyết)

- Khung cố định 380:401, nên board thiết kế **rộng 380** và co theo `--k = 100cqw / 380` như Agent Plan. Ở độ rộng này preview gốc xếp lại; bản này giữ hai cột nhưng chặt hơn (pile 136, hàng queue nằm dưới avatar, rộng bằng hàng trên) để vừa 401 mà chữ vẫn đọc được (≈ 1× trên laptop, ≈ 0,92× trên iPhone).
- Agent: **Planner** (Opus 5.5, Anthropic), **Writer** (Sonnet 5.5, Anthropic), **Coder** (GPT-6.1 Sol, OpenAI), **Ops** (Gemini). Tên model lấy từ `affectui-assistant/assistant-models.ts` (cùng danh sách composer chat), không tự đặt tên model. Không có giá/phút nên tổng "in queues" cộng **thời gian** (`56 min`, `1 h 8 min`).
- Công việc: Write release notes (Notion, GitHub), Fix checkout test (GitHub), Summarize churn calls (Slack, HubSpot), Update pricing page (Figma); đang chạy: Review roadmap, Refactor auth, Upgrade SDK (Stripe, GitHub). Đủ cả 6 logo công cụ.
- **Căn trục** (đo trong QA ở 6 kích thước): mép phải của công tắc Auto, tổng "in queues" và mọi thẻ Free/Busy trùng một đường (12 từ mép card); hai tiêu đề cột "Unassigned" và "Agents" cùng một dòng; lề trên của pile = lề dưới (8) nên hai cột chạm đáy cùng lúc; bốn agent mỗi người một **ô cao bằng nhau** (nhịp 75,5) nên tên đi xuống đều và vùng thả luôn là cả ô; hàng queue rộng bằng hàng avatar–tag.
- **Vừa khít ở mọi cỡ:** chip luôn một dòng (tiêu đề cắt bằng "…", đầy đủ trong `title` và tooltip `+N`); chip hiện tối đa 1 logo công cụ và chỉ hiện tối đa **2 chip** trước chip `+N` (`maxChips`, gốc là 3) vì hàng chỉ rộng 220; vì chip không xuống dòng nên mọi hàng agent, kể cả khi đầy tải, vẫn ≤ 75,5 và không bao giờ tràn. Vùng chạm lớn hơn trên cảm ứng bằng pseudo-element, không đổi chiều cao (bản đầu tăng chiều cao công tắc/chip nên card tràn 15px trên điện thoại).
- Hint "Drag a task onto an agent" vẫn hiện (gốc ẩn ở container ≤ 560px, nhưng ở 380px nó còn đủ chỗ và là chỉ dẫn duy nhất cho người dùng cảm ứng). Số phím tắt 1–4 chỉ hiện khi điều hướng bằng bàn phím (`:focus-visible`), không hiện sau khi bấm Auto bằng chuột/chạm.
- Đồng hồ demo cố định 09:00 (`ProjectDelegateBoard.tsx`) để HTML server, mọi thiết bị và test cho cùng giờ. Component dùng đồng hồ thật khi không truyền `now`.
- Thêm so với gốc: phím `0` trả task về Unassigned; thông báo `aria-live`; focus theo task sau khi giao; FLIP trượt từ vị trí thả; dark mode qua `.dark`/`[data-theme=dark]`; `prefers-reduced-motion`; tooltip `+N` mở được bằng chạm.

## File

| File | Việc |
| --- | --- |
| `src/components/sites/affectui-delegate-board/delegate-model.ts` | Luật thuần: busy time, assign, auto-routing, tổng, nhãn giờ. Test: `delegate-model.test.mjs` (6 test). |
| `DelegateBoard.tsx`, `delegate-board.css` | Component (pointer drag, bàn phím, Auto, tooltip, FLIP) và CSS. API: `agents` (có `logo`), `tasks` (có `tools`), `onAssign`, `mode/defaultMode/onModeChange`, `suggestion`, `formatCost`, `now`, `title`, `agentLabel`, `agentsLabel`, `maxChips`. Không có `onAssign` thì board tự di chuyển task. |
| `brand-icons.generated.ts` | **Sinh tự động**, không sửa tay: chạy `node scripts/forensics/affectui-delegate-board-icons.mjs`. |
| `ProjectDelegateBoard.tsx` | Dữ liệu và nhãn của khung Project Management. |
| `guide-navigation/navigation-model.ts`, `GuideNavigation.tsx`, `guide-navigation.css` | Hàng 04 thành `live: "delegate-board"` (thay khung xám); khung live không phải link, bấm hàng (hoặc chạm lần hai) vẫn mở Mapping. |

Task và chip là `button` nên vuốt chuyển nhóm của Guide me bỏ qua cử chỉ bắt đầu ở đó; vuốt ở vùng khác của khung vẫn đổi nhóm.

## QA

`node scripts/qa/delegate-board.mjs [base-url]` — 56 kiểm tra: logo (avatar, logo công cụ theo thứ tự, logo trên chip, gradient Gemini duy nhất, dark mode), **6 kích thước** (320×640, 390×844, 844×390, 768×1024, 1440×900, 1920×1080 × 4 kiểm tra: tỉ lệ/không tràn, căn trục, không cắt chữ + logo nằm trong ô + thẻ cao bằng nhau, đầy tải sau Auto vẫn vừa), ngưỡng kéo 4px, ghost + xem trước, thả/trả về Unassigned, thả ngoài board và Esc khi đang kéo, `+N` + tooltip có logo, bàn phím, Auto, **kéo cảm ứng thật** (CDP touch), chạm `+N`, vùng chạm lớn mà bố cục không đổi, vuốt ngoài board vẫn đổi nhóm, không lỗi console. Ảnh/kết quả: `qa/`. WebKit iPhone 13 qua IP LAN: hydrate, logo, không tràn (`qa/frame-webkit-iphone.png`); kéo cảm ứng chỉ kiểm bằng Chromium (Playwright không phát touch drag cho WebKit).
Unit: `node --experimental-strip-types --test src/components/sites/affectui-delegate-board/delegate-model.test.mjs`.

## Giới hạn

- Chưa thử trên iPhone thật; chưa so từng pixel với preview gốc (khác độ rộng thiết kế và nội dung nên so pixel không có nghĩa). Đã so bằng mắt thứ tự logo, kiểu ô avatar, chip và thẻ xem trước với ảnh người dùng gửi và `source-wide-preview.png`.
- Khi hàng đợi đầy (ví dụ sau Auto) hai chip chia 220px nên tiêu đề bị cắt ("Review ro…"); đây là đánh đổi để không tràn khung 380×401.
- Agent không có queue có khoảng trắng dưới tên vì các ô cao bằng nhau (chủ ý để nhịp đều).
- Không có backend: giao việc chỉ đổi state trong trình duyệt (và `onAssign` nếu truyền vào).
