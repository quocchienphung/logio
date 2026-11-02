# UIArc Speculative decoding (đọc từ preview công khai)

Nguồn: `https://uiarc.dev/components/speculative-decoding` (component **Pro**: chỉ preview công khai; không đọc mã nguồn khóa, không dùng API/registry/CLI của UIArc). Thu bằng `scripts/forensics/speculative-decoding-{inspect,measure}.mjs`, kết quả ở `source/`: DOM của thẻ (`initial.html`), tên lớp (`classes.json`), CSS khai báo (`declared-styles.css`), các khung của một lần chạy (`run-*.png`, `run-frames.json`), lớp của từ trong dòng Output (`tokens-after.json`), văn bản hiển thị (`visible.txt`).

## Đã dựng lại (độc lập)

`src/components/sites/collateral/excel-formation/gallery/SpeculativePanel.tsx` + `speculative.css`: thẻ có tiêu đề và dòng trạng thái đổi chữ, nút Play/Pause và Restart; hai làn **Draft** (chấm tím) và **Target** (chấm xanh) với cột chip nháp phía trên và ô kết quả phía dưới; thanh quét của Target; ô được nhận có dấu tick, ô bị loại có dấu X, ô bỏ qua mờ đi; dòng **Output** với từng từ gạch chân theo bên đã viết ra từ đó; tóm tắt khi xong; ba số liệu (nhanh hơn, tỷ lệ nháp được nhận, từ mỗi lượt); thanh trượt độ dài bản nháp; công tắc so sánh với việc không đoán trước.

## Khác biệt có chủ ý

- Nội dung không phải câu mẫu của UIArc mà là **từ lỗi thật** của ô đang xét; "draft" và "target" là hai mô hình thật (tần suất; tần suất + ngữ cảnh + dạng âm tiết) chứ không phải kịch bản (`engine/predict.ts`, `engine/speculative.ts`).
- Có thêm danh sách các từ lỗi với ứng viên bấm chọn, cờ "Close call" và nút "Use this reading": mọi thay đổi vẫn do người dùng duyệt.

## Thông số mô hình (không phải của UIArc)

Số đo giữ-ra-ngoài trên tệp tham chiếu cục bộ nằm ở `docs/collateral/08-whole-file-viewer-and-guessing.md`; chúng là số của tệp đó, lạc quan hơn so với một tệp lạ, và đây là gợi ý chứ không phải đáp án chắc chắn.

## Nhịp đã đo (2026-11-02, bản ghi thay cho bản ghi hỏng trước đó)

Bản ghi cũ (`run-frames.json`) bấm Restart khi lượt chạy đã xong nên kết luận "không khôi phục được nhịp" là **sai**. Bản ghi mới (`scripts/forensics/speculative-decoding-timeline.mjs`, `source/timeline-*.json`, `controls.json`, `text-shimmer-styles.css`) ghi mọi thay đổi DOM (MutationObserver) và mọi animation (Web Animations API) có mốc thời gian, cho cả độ dài nháp min/max, công tắc so sánh và Pause/Play. Chỉ đọc trang đã render, không đọc bundle.

| Đo được trên preview | Giá trị | Cài đặt ở |
| --- | --- | --- |
| Cột hiện ra | cách nhau 66,7 ms (4 khung 60 Hz), không phụ thuộc độ dài nháp | `engine/run-timeline.ts` `TIMING.step` |
| Phase draft | `(số cột - 1) * 66,7 + 50` ms (2 cột 117, 4 cột 250, 8 cột 500 đến 517) | `draftMs` |
| Thanh quét (verify) | luôn 266,7 ms từ cột đầu đến cuối, rồi giữ 200 ms: verify 466,7 ms | `TIMING.sweep/hold` |
| Kết luận của một cột | khi thanh quét đi qua giữa cột đó: `(j + 0,5) / số cột * 266,7` ms | `verdictAt` |
| Settle | 183 ms; từ đúng bay vào Output cách nhau 20 ms | `TIMING.settle/fly` |
| Spring của từ bay | stiffness 300, damping 36 (khớp vị trí đo: sai số 0,03 đến 0,3 px); khoảng bay y = -110 px từ chip, -70 px từ ô Target | `FLIGHT_SPRING`, `fly()` |
| Shimmer của chip | trễ 130 ms, đi 0,11% mỗi ms, khi có kết luận hoàn tất nhanh (tau ~55 ms) | `shimmerAt` |
| Pause | đóng băng toàn bộ đồng hồ (kể cả `--sweep`); Play chạy tiếp phần còn lại | `SpeculativeRun.tsx` |
| Dòng so sánh | mở bằng spring chiều cao 0 → auto (~700 ms), opacity 160 ms trễ 150 ms; ghi một từ mỗi ~640 ms, từ đầu ở ~620 ms | `BASE_FIRST/BASE_STEP` |
| Thanh trượt | 2 đến 8, mặc định 4; kéo là chạy lại | `MIN_DRAFT/MAX_DRAFT` |
| Odometer | mỗi chữ số một bánh xe, dải 10 chữ số dịch `translateY`, 460 ms; khe chữ số mở/đóng 320 ms | `RollingNumber.tsx` |
| Easing / thời lượng | enter `cubic-bezier(.16,1,.3,1)`, standard `cubic-bezier(.22,1,.36,1)`, fast 160 ms, `sd-in` 140 ms, fade 240 ms trễ 120 ms | `speculative-run.css` |

Đối chiếu bản dựng với số đo (`scripts/qa/collateral-speculative-run.mjs`, đo trong chính trang, production): chu kỳ một lượt 901 ms (gốc 900), draft 250 ms (250), verify 470 ms (467), settle 181 ms (183), cột hiện 0 / 68 / 134 / 201 ms (0 / 67 / 133 / 200), kết luận 33 / 99 / 166 / 233 ms (33 / 99 / 166 / 233).

**Khác trang gốc (có chủ ý, để không nói sai):** nhãn là Draft / Target chứ không phải "model"; ba con số là *Checks made*, *Drafts accepted*, *Words per check* (bỏ "Faster ×" vì trùng *Words per check*), kèm một dòng giải thích rằng chúng mô tả lần phát lại, không phải độ đúng của từ; từ không chắc không được tick xanh mà có dấu hỏi hổ phách; dòng Output chỉ hiện phần đã được quyết định.

**Chưa đo / chưa chép:** tooltip của hai nút icon, nhịp chính xác của phần giảm chuyển động của gốc (đã dùng khai báo CSS), và đường cong hoàn tất của shimmer chỉ được fit (không đo từng khung ở mọi trạng thái).
