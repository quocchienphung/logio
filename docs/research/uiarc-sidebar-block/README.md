# UIArc Sidebar block (đọc từ preview công khai)

Nguồn: `https://uiarc.dev/components/blocks/sidebar` (4 biến thể: App rail, Workspace, Inbox, Docs). Chỉ đọc DOM, CSS khai báo, hình học và ảnh chụp của trang đã render (`scripts/forensics/sidebar-block-{inspect,measure}.mjs`); không dùng API, registry, tab Code hay mã Pro. Ảnh chụp trong `source/` là bằng chứng, **không** dùng làm giao diện; giao diện là component dựng lại.

## Đo được và đã áp dụng

- Hàng mục 32 px, mục lồng 30 px lùi 28 px, đường nối dọc 1 px, số đếm `tabular-nums`, chấm báo 6 px, trạng thái `lit`.
- Danh sách con mở/đóng bằng chiều cao theo spring tới hạn (≈550 ms, mờ dần trễ ~70 ms): `affectui-crm/SidebarFolder.tsx` (dùng cho **Collateral** và **Techniques**).
- Topbar 52 px, breadcrumbs 13 px phân cách `/`, mục cuối đổi chữ bằng trượt dọc: `collateral/shell.tsx` (`Breadcrumbs`).
- Chip tệp + nút đóng ở topbar; thanh tab bước với pill trượt.

## Chưa làm

Rail thu gọn thành icon, sheet trên điện thoại, switcher không gian làm việc, biến thể Inbox/Docs.
