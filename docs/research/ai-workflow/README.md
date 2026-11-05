# UIArc AI workflow (đọc từ preview mở)

Nguồn: `https://uiarc.dev/components/ai-workflow`. Đây là component **Pro**: trang nói rõ "The preview is open to everyone", còn source và lệnh cài bị khóa, nên mình chỉ đọc DOM đã render, CSS khai báo, tài liệu công khai và các bản ghi hành vi (`scripts/forensics/ai-workflow-timeline.mjs`, `source/timeline-run.json`, `dom-initial.html`, `declared-styles.css`, `visible.txt`). Không đọc registry hay mã khóa.

## Đã dựng lại (thành phần chung `src/components/sites/json-pipeline/Workflow.tsx` + `workflow.css`)

Thẻ có header (tên, mô tả, nút Run), canvas với các bước trên một đường kẻ 1 px (`--wf-rail 15.5px`), dấu chấm 5 px trượt xuống connector trong 240 ms trong khi đường kẻ phía sau được tô (scaleY), hàng 32 px (mark 16 | tiêu đề + chi tiết | ô trạng thái 72 px), chi tiết chuyển sang dòng "activity" đang shimmer khi chạy, ô trạng thái crossfade (spinner "Running" → check + thời lượng / X "Failed"), output mở theo chiều cao spring tới hạn (`visualDuration .22, bounce 0`), nhánh với tab nhỏ (highlight trượt cùng spring, danh sách crossfade 100/160 ms), lý do lỗi hiện từng cụm 5 từ mỗi 34 ms, chân thẻ crossfade tóm tắt, vùng `aria-live`, `aria-busy` khi chạy, container query 480 px (hàng 44 px). Nhịp một lượt chạy đo trên preview: bước đầu chạy ngay, mỗi bước sau có dấu chấm 240 ms, bước "Running" đúng bằng thời lượng mẫu của nó, mở output rồi ~116 ms sau chấm sang bước kế.

## Áp vào JSON formation (không phải bản sao 1:1)

`collateral/json-formation/steps/JsonPipeline.tsx` đặt ở đầu bước **Export**: 7 bước (Workbook opened → Map columns → Review issues → Report details → Group rows → Validate the JSON → Ready to export?, nhánh Ready/Blocked) = 9 cổng kiểm tra **thật** của xuất JSON. Thẻ luôn hiện kết quả hiện tại; **Run checks** hỏi lại worker rồi phát lại từng bước. Thời gian trên mỗi bước là thời gian worker thật sự mất (mở tệp, dựng báo cáo, kiểm chứng + phát lại); bước không đo thì ghi "Done", **không bịa số**. Lỗi nói rõ lý do và dẫn tới chỗ sửa (Open review, Fill in).

Khác gốc, có chủ ý: các biểu tượng là của mình (lucide), không phải logo ứng dụng; không dựng menu "Add step", nút xoá bước, trạng thái loading/empty, autoplay (tài liệu khuyên tắt trong sản phẩm thật); mỗi bước tối thiểu hiện "Running" 220 ms để nhìn thấy (nhịp của mình, số hiển thị vẫn là số thật); shimmer của dòng activity là ước lượng (gốc đo bằng JS, không đo được đường cong).
