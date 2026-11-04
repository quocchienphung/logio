import { useWorkspaceI18n } from "../../i18n/WorkspaceI18n";

const copy = {
  subtitle: ["Sample workbooks for this preview session only.", "Tệp Excel mẫu chỉ tồn tại trong phiên xem thử."],
  saved: ["Sample added to demo Queue.", "Đã thêm mẫu vào Queue mô phỏng."],
  retry: ["Retry", "Thử lại"], viewQueue: ["View Queue", "Xem Queue"],
  originals: ["Sample files", "Tệp mẫu"], uploaded: ["Saved", "Đã lưu"], ready: ["Scanned", "Đã quét"], failed: ["Could not scan", "Không quét được"],
  all: ["All files", "Tất cả tệp"], search: ["Search sample files", "Tìm tệp mẫu"],
  refresh: ["Refresh", "Làm mới"], import: ["Upload workbook", "Tải tệp Excel lên"],
  empty: ["The demo Queue is empty", "Queue mô phỏng đang trống"],
  emptyHint: ["Run Excel formation and add its sample to Queue.", "Mở tệp trong Excel formation. Tệp mẫu sẽ tự động được lưu ở đây."],
  noMatches: ["No files match these filters.", "Không có tệp khớp với bộ lọc."],
  loading: ["Loading saved uploads…", "Đang đọc lịch sử tải lên…"],
  openExcel: ["Open in Excel", "Mở trong Excel"], openJson: ["Open in JSON", "Mở trong JSON"],
  opening: ["Opening…", "Đang mở…"],
  delete: ["Delete original", "Xóa tệp gốc"], deletePrompt: ["Delete this original?", "Xóa tệp gốc này?"], deleteConfirm: ["Delete", "Xóa"],
  deleting: ["Deleting", "Đang xóa"], deleted: ["Deleted", "Đã xóa"], undo: ["Undo", "Hoàn tác"], restoring: ["Restoring", "Đang khôi phục"],
  consequence: ["Hides this sample. Undo is available for 8 seconds.", "Ẩn mẫu này. Có thể hoàn tác trong 8 giây."],
  removedNote: ["was deleted.", "đã được xóa."], restoreError: ["Could not restore. The 8 second undo window may be over.", "Chưa khôi phục được. Có thể đã hết 8 giây hoàn tác."],
  close: ["Original", "Tệp mẫu"], uploadedLabel: ["Uploaded", "Tải lên"], contentLabel: ["Contents", "Nội dung"], problemLabel: ["Problem", "Vấn đề"], fingerprintLabel: ["Sample ID", "Mã mẫu"], copyHash: ["Copy sample ID", "Sao chép mã mẫu"], copied: ["Copied", "Đã sao chép"], download: ["Download", "Tải xuống"],
  savedBytes: ["Sample size", "Dung lượng mẫu"], scannedFiles: ["Scanned files", "Tệp đã quét"],
  history: ["Sample history", "Lịch sử mẫu"], selected: ["Selected original", "Tệp mẫu đang chọn"],
  originalOnly: ["Sample data only. Refreshing the browser resets the demo. No files are saved.", "Chỉ có dữ liệu mẫu. Tải lại trình duyệt sẽ đặt lại mô phỏng. Không lưu tệp."],
  sheets: ["sheets", "trang tính"], rows: ["data rows", "dòng dữ liệu"], sheet: ["sheet", "trang tính"], row: ["data row", "dòng dữ liệu"],
  describeReady: ["Ready sample for the Excel and JSON previews.", "Mẫu sẵn sàng cho bản xem thử Excel và JSON."], describeSaved: ["Sample waiting state.", "Trạng thái chờ mô phỏng."], describeFailed: ["Sample failure state.", "Trạng thái lỗi mô phỏng."],
  removeError: ["Could not delete. The file is still in Queue.", "Chưa xóa được. Tệp vẫn còn trong Queue."],
} as const;

export function useQueueCopy() {
  const { locale } = useWorkspaceI18n();
  return (key: keyof typeof copy) => copy[key][locale === "vi" ? 1 : 0];
}
