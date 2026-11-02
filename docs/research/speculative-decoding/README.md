# UIArc Speculative decoding (đọc từ preview công khai)

Nguồn: `https://uiarc.dev/components/speculative-decoding` (component **Pro**: chỉ preview công khai; không đọc mã nguồn khóa, không dùng API/registry/CLI của UIArc). Thu bằng `scripts/forensics/speculative-decoding-{inspect,measure}.mjs`, kết quả ở `source/`: DOM của thẻ (`initial.html`), tên lớp (`classes.json`), CSS khai báo (`declared-styles.css`), các khung của một lần chạy (`run-*.png`, `run-frames.json`), lớp của từ trong dòng Output (`tokens-after.json`), văn bản hiển thị (`visible.txt`).

## Đã dựng lại (độc lập)

`src/components/sites/collateral/excel-formation/gallery/SpeculativePanel.tsx` + `speculative.css`: thẻ có tiêu đề và dòng trạng thái đổi chữ, nút Play/Pause và Restart; hai làn **Draft** (chấm tím) và **Target** (chấm xanh) với cột chip nháp phía trên và ô kết quả phía dưới; thanh quét của Target; ô được nhận có dấu tick, ô bị loại có dấu X, ô bỏ qua mờ đi; dòng **Output** với từng từ gạch chân theo bên đã viết ra từ đó; tóm tắt khi xong; ba số liệu (nhanh hơn, tỷ lệ nháp được nhận, từ mỗi lượt); thanh trượt độ dài bản nháp; công tắc so sánh với việc không đoán trước.

## Khác biệt có chủ ý

- Nội dung không phải câu mẫu của UIArc mà là **từ lỗi thật** của ô đang xét; "draft" và "target" là hai mô hình thật (tần suất; tần suất + ngữ cảnh + dạng âm tiết) chứ không phải kịch bản (`engine/predict.ts`, `engine/speculative.ts`).
- **Thời gian là của riêng**: các khung ghi ở `source/run-frames.json` không cho khôi phục nhịp chính xác của preview, nên `engine/playback.ts` đặt nhịp riêng (draft 480 ms, verify 720 ms, resolve 640 ms; co lại khi nhiều lượt để cả lần phát ≤ ~6 s, `stageMs`).
- Có thêm danh sách các từ lỗi với ứng viên bấm chọn, cờ "Close call" và nút "Use this reading": mọi thay đổi vẫn do người dùng duyệt.

## Thông số mô hình (không phải của UIArc)

Số đo giữ-ra-ngoài trên tệp tham chiếu cục bộ nằm ở `docs/collateral/08-whole-file-viewer-and-guessing.md`; chúng là số của tệp đó, lạc quan hơn so với một tệp lạ, và đây là gợi ý chứ không phải đáp án chắc chắn.
