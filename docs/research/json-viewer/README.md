# UIArc JSON viewer (đọc từ preview công khai)

Nguồn: `https://uiarc.dev/components/json-viewer` (component miễn phí; mình **không** đọc registry `r/json-viewer.json`, CLI hay mã nguồn: chỉ DOM đã render, CSS khai báo, hành vi đo được, và phần tài liệu công khai của trang). Bản dựng: `src/components/sites/json-viewer/` (`JsonViewer.tsx`, `json-model.ts`, `json-viewer.css`), thu bằng `scripts/forensics/uiarc-page-inspect.mjs`, `json-viewer-dom.mjs`, `json-viewer-states.mjs`, `json-viewer-timeline.mjs`; bằng chứng ở `source/` (`visible.txt` = tài liệu của trang, `declared-styles.css`, `dom-flat.json`, `states.txt`, `timeline-*.json`).

## Bảng đối chiếu từng mục của trang gốc

| Mục của trang gốc | Bản dựng | Cách biết |
| --- | --- | --- |
| Props: `data, rootName, defaultExpandDepth, expanded, defaultExpanded, onExpandedChange, searchable, query, defaultQuery, onQueryChange, pageSize, copyable, onCopy, onSelect, showPath, maxHeight, label, className, ref` | Đủ 19 prop với cùng tên, kiểu, mặc định (`rootName "root"`, depth 1, `pageSize 50`, `maxHeight 420`, `label "JSON"`) | Bảng API trong `visible.txt` |
| Thêm (không có ở gốc) | `source` (nguồn dữ liệu từ worker, cho tài liệu 27 MB không được parse trong trang) | Quyết định của mình |
| DOM: `div.root > .toolbar (label.search > svg + input[type=search] + .matches) + .divider + 2 nút`, `.tree[role=tree]`, `.pathBar`, `span[role=status]` | Giống từng phần tử, thuộc tính và thứ tự | `dom-flat.json`, `states.txt` |
| Hàng: `role=treeitem`, `tabindex` 0 chỉ ở hàng hiện tại, `aria-level/posinset/setsize/expanded/selected/label`, `data-kind`, `data-active`, `--level`, `height:30px`, `overflow` | Giống | `states.txt` |
| Nhãn hàng: `id: ord_8Kd2Q7`, `customer, object, 5 keys`, `Show 50 more, 130 hidden` | Giống từng ký tự | test `json-model.test.mjs` (11 test) |
| Preview hàng thu gọn: `{ id, name, email, … }`, `[…]`, khóa có dấu cách giữ nguyên (`campaign id`) | Giống | đo + test |
| Màu theo kiểu: string, number, boolean, null/other; dấu `"` quanh chuỗi | Giống (`data-type`) | `declared-styles.css` |
| Tìm kiếm: placeholder, `aria-label "Search JSON"`, `aria-controls`, đếm `1/N` aria-live, trước/sau (disabled khi 0), `<mark>` + `data-current`, mở nhánh chứa kết quả, trần 2000, `Enter`/`Shift+Enter`/`Escape`/`ArrowDown`/`/` | Giống | `states.txt` + tài liệu phím tắt |
| Phân trang: 50 con mỗi trang, hàng "Show N more / N hidden", sau tìm kiếm hiện đúng đến chỉ số khớp (132 + 1 hàng) | Giống | đo (set size 133) |
| Copy giá trị/đường dẫn: nút `data-state` idle/done/error, nhãn đổi, về idle sau 1,4 s, vùng `role=status`, `Cmd/Ctrl+C` (+Shift), bỏ qua khi đang bôi chọn | Giống | `timeline-copy-*.json` |
| Phím: ↑ ↓ → ← Home End Enter Space | Giống | tài liệu |
| Chuyển động: mở/đóng hàng bằng chiều cao spring **220/32**; highlight trượt spring **170/26**; cuộn cây spring **370/50**; mũi tên xoay theo token `--ease-spring` 580 ms (hàm `linear()` 37 điểm); opacity 160 ms; glyph copy scale 0,85→1 + opacity (160/100 ms); `Expand all` > 400 hàng tắt animation; reduced motion tức thì | Giống | `timeline-*.json`; spring fit rmse 1,5% (gốc), bản dựng đo trong trang 0,8% |
| Responsive: indent 16→12 px ≤ 420 px, khóa tối đa 40%, ẩn kiểu ở path bar | Giống | CSS khai báo |
| Hover: nút copy hiện khi hover + con trỏ chuẩn, hàng được chọn/focus luôn hiện | Giống | CSS khai báo |

## Suy ra (preview không cho quan sát)

Nhãn số ít `1 key` / `1 item`; đường dẫn của khóa không phải định danh dùng `["gift wrap"]`; văn bản copy của nhánh là JSON thụt lề (chuỗi: không có dấu `"`); nhãn nút khi copy thành công là `Copied` và vùng trạng thái `Value copied` / `Path copied` (nhánh lỗi `Copy failed` thì đã thấy); preview nhánh rỗng là `{}` / `[]`; chỉ số mảng không được tìm; mỗi hàng chỉ tính một kết quả; hiển thị `2000+` khi chạm trần; khối đếm kết quả vào bằng opacity + 4 px; hàng dừng cách mép dưới 36 px sau cú nhảy xuống (đo); `title` cho chuỗi > 40 ký tự (tài liệu nói có, dữ liệu mẫu không có chuỗi nào dài đến vậy).

## Không quan sát được / không chép

Tài liệu nhắc "scale và blur" khi đổi glyph copy; trong style tính toán chỉ thấy scale + opacity, nên mình **không** thêm blur. Clipboard trong headless Chrome luôn ra nhánh lỗi nên nhánh thành công chỉ được kiểm trong QA của mình (Playwright cấp quyền). Phần "Demo" bao quanh (dòng `GET /v1/orders`, ghi chú) không phải component nên không dựng.

## Khác biệt có chủ ý (nguồn từ worker)

Tìm kiếm chạy trong worker (debounce 140 ms) và với nguồn từ worker chỉ mở nhánh chứa kết quả **hiện tại** (gốc mở mọi kết quả trong bộ nhớ); `Expand all` mở dần mọi nhánh đang hiển thị đến 600 hàng; copy giá trị nhánh giới hạn 4 MB; trang con tải theo yêu cầu nên có thêm hàng "Loading" (không có ở gốc). Với `data` trong bộ nhớ mọi thứ chạy đồng bộ đúng như gốc.
