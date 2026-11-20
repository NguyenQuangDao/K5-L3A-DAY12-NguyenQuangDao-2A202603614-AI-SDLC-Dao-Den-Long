# Nhật ký thay đổi

## v1.0.0 (Phase 4 — dự kiến; chưa phát hành)

### Hiệu năng và độ ổn định
- **Chế độ benchmark:** `--bench` tạo cảnh engine chuẩn (200 Bóng Mực, 100 đom đóm, 3 đèn sáng). Đây là vòng lặp tick headless, chưa đo render ở 1280×720.
- **Kiểm thử soak:** `--soak` chạy nhiều state Đêm trong một tiến trình, kiểm tra crash và heap còn sống sau GC (`mem_end ≤ 1.2 × mem_start`).

### Bảng xếp hạng
- Top 10 lưu trong `localStorage`, xếp theo điểm giảm dần.
- Tên dài 3–12 ký tự `[A-Za-z0-9_]`.
- Mỗi mục gồm `name`, `score`, `nights_won`, `achieved_at` (ISO 8601), `seed`.
- Có màn hình riêng trong giao diện và tải JSON trực tiếp từ `localStorage`; lệnh export CLI nhận file JSON.

### Hỗ trợ tiếp cận
- Có đổi phím với báo trùng/khôi phục mặc định, chế độ mù màu, giảm chuyển động, cỡ chữ ×1,25 và chỉ báo trực quan. Cần kiểm chứng tương tác trình duyệt trước khi tuyên bố hoàn tất.

### Đóng gói
- README, CHANGELOG, CREDITS, LICENSE đầy đủ.
- Chưa có video demo, tag `phase-2`…`phase-4` hoặc GitHub Release `v1.0.0`.

## v0.3.0 (Phase 3)

### Cơ chế mới
- Bóng Mực Gió Lạc (D1, D2): trộm đom đóm, bỏ chạy sau khi bị Tỏa Sáng.
- Bùa Gió (C1, C2): tăng tốc lên 7,2 m/s, bỏ qua hồi chiêu lướt.
- Gió (Đêm 3): hướng ngẫu nhiên mỗi 30 giây, kéo dài 5 giây.
- Bục nhảy (Đêm 2): phóng người chơi sang đảo đối diện.

### Sự kiện mới
- `dash`, `charm_picked`, `drifter_steal`, `drifter_drop`, `night_start`, `paused`, `resumed`, `player_hit` (thêm `lost`)

### Điểm số mới
- Mốc tính điểm Phase 2: +10 mỗi đom đóm nạp, +100 mỗi đèn thắp, +5 mỗi Bóng Mực bị làm choáng, +2 × số giây còn lại, +50 × số Ngọn Lửa còn lại khi thắng. Phase 3 đã thay thế các giá trị này.

## v0.2.0 (Phase 2)

### Chuẩn hóa
- Contract v1.1, 60 ticks/second, đơn vị mét/giây
- Di chuyển: tốc độ 6,0 m/s, lướt 14,0 m/s (0,2 giây, hồi chiêu 1,5 giây).
- Nhảy: 7.0 m/s, trọng lực -20 m/s²
- Tỏa sáng: giá 3 đom đóm, bán kính 5.0m, cooldown 3s
- Đèn Lồng: giá 10 đom đóm

### Các đêm
- Đêm 1: đảo 40 m, 5 đèn, tối đa 6 Bóng Mực.
- Đêm 2: hai đảo 28 m và cầu nối, 6 đèn, tối đa 8 Bóng Mực, 2 Bóng Mực Gió Lạc.
- Đêm 3: đảo 45 m, 3 tầng, 7 đèn, tối đa 10 Bóng Mực, có gió.

## v0.1.0 (Phase 1)

- Nền tảng game: người chơi, Bóng Mực, đom đóm, đèn lồng.
- Chế độ headless xuất JSONL.
- Bộ test Vitest cơ bản (25 test).