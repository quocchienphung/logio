# UIArc Product gallery (đọc từ preview công khai)

Nguồn: `https://uiarc.dev/components/product-gallery` (component **Pro**: chỉ preview và tài liệu công khai, không đọc mã nguồn khóa). Đo bằng `scripts/forensics/product-gallery-{inspect,measure}.mjs`; số liệu thô trong `source/`.

| Đo được | Giá trị | Nơi áp dụng |
| --- | --- | --- |
| Kính lúp | 176 px, zoom 2,4, đặt giữa con trỏ, spring tới hạn ≈ stiffness 1800 / damping 85 (17% sau 16 ms, 72% sau 60 ms, 98,5% sau 140 ms) | `excel-formation/gallery/gallery-model.ts` (test đối chiếu số đo) |
| Stage | bo 22 px (18 px ≤520 px), tỷ lệ cố định, rail dọc 64 px (ngang ≤520 px), vòng chọn trượt | `IssueGallery.tsx`, `gallery.css` |
| Viewer | lớn dần từ chính hình chữ nhật của stage (tỷ lệ 0,785 → 1) với bo góc bù tỷ lệ, padding 48/12 px, Escape thu nhỏ rồi đóng, trap Tab, khóa cuộn | `Viewer` |
| Bàn phím | ←/→ đổi mục, Enter mở, Escape | tài liệu công khai của component |

Khác biệt có chủ ý: "ảnh" là **mặt file bảng tính** quanh ô lỗi (`SheetFace.tsx`), không phải ảnh sản phẩm; biến thể màu/cỡ được thay bằng Gốc / Gợi ý / Giá trị mới. Kính lúp được dựng ở kích thước phóng (không dùng `transform: scale`) để chữ sắc nét; viewer đọc biến màu từ phần tử gốc vì nằm ngoài workspace (`<body>`).

## Cập nhật 2026-11-02

Bản này đã được thay một phần: "ảnh" của stage nay là **toàn bộ tệp** (`gallery/SheetViewer.tsx`, thay cho `SheetFace.tsx` đã xóa), kính lúp vẽ vài ô thật thay vì phóng một bản sao DOM (không còn vỡ pixel), Escape đóng viewer ngay, và viewer có hai chế độ Whole file / Readable. Thông số kính lúp 176 px và spring giữ nguyên. Xem `docs/collateral/08-whole-file-viewer-and-guessing.md`.
