# Nhật ký thay đổi — Phase 3 (có thay đổi không tương thích)

- `contract_version`: 1.1 → 1.2.
- Thời lượng đêm: 300/330/360 giây → 240/270/300 giây.
- Thay điều kiện thắng: không còn yêu cầu “thắp hết đèn”; thắng lúc bình minh nếu số đèn sáng ≥ `ceil(0.6 × tổng số đèn)`. Lý do `dawn_survived`; bỏ thắng sớm `all_lit`.
- Thêm lý do thua `dawn` nếu lúc bình minh không đủ đèn; hết Ngọn Lửa (`no_flames`) thì thua ngay.
- Đèn có `fuel` tối đa 100, `ever_lit`, `relit_count`; đèn sáng hao dầu 1,0/giây và có thể cạn (`lantern_out`).
- Phí thắp lại: 5 đom đóm nếu đèn từng sáng; nếu chưa thì 10.
- Tương tác châm dầu phát sự kiện `refuel`.
- Bóng Mực có trạng thái `drain` và `target_lantern_id`.
- Vùng an toàn không còn hiệu lực khi dầu dưới 30.
- Thay cách tính điểm: +5 mỗi đom đóm nạp, +100 lần đầu thắp đèn, +40 thắp lại, +5/+15 khi làm choáng, thưởng lúc bình minh; bỏ thưởng thời gian.
- Sức chứa tăng theo `10 + 2 × successful_lights`, tối đa 20. Snapshot người chơi có thêm `capacity`.
- Snapshot đèn có thêm `fuel`, `ever_lit`, `relit_count`; trạng thái Bóng Mực có thể là `drain`.
- Scenario đèn có thêm `lit`, `fuel`, `ever_lit`, `relit_count`; người chơi có `successful_lights`; Bóng Mực có `target_lantern_id`.
- Thêm sự kiện `refuel`, `lantern_out`, `fuel_drain`; `lantern_lit` có thêm `relight`.

## Ghi chú kiểm chứng

- Đã triển khai và kiểm thử hồi quy: ngưỡng dầu, thắng lúc bình minh, ưu tiên `no_flames`, Tỏa Sáng tiêu hao đom đóm, thời gian tạm dừng, số lượng/vùng rơi đom đóm khi bị đánh.
- Chưa xác minh/hoàn tất theo ticket gốc: lịch/lực gió xác định, lịch sinh/bản đồ đầy đủ, giao diện hỗ trợ tiếp cận/chế độ mù màu và benchmark render 3D đầy đủ.
- Luật thắng `all_lit` và điểm Phase 2 đã bị Phase 3 thay thế; đó không còn là hành vi hiện tại.
