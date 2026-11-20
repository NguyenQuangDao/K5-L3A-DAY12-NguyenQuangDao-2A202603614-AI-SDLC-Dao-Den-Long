# Quy tắc harness

- Giữ luật gameplay thuần trong `src/game-engine.js`; renderer và CLI không được tự đổi luật.
- Mỗi thay đổi gameplay cần Vitest tập trung và ít nhất một scenario headless.
- Trước khi kết thúc, chạy `npm test` và ít nhất một lượt headless thắng/thua/tính tất định.
- Scenario hoặc inputs sai phải thoát mã 2 và ghi lỗi ra stderr; runtime thành công thoát mã 0.
- Giữ tên trường JSONL và sự kiện khớp `game.contract.json`.
- Bóng Mực khởi đầu phải dịch chuyển ở tick mô phỏng đầu tiên; kiểm thử chuyển động mà không đổi vị trí sinh hay tốc độ đã đặc tả.
- Gió Đêm 3 có tính tất định: mỗi 1.800 tick mô phỏng chọn hướng ngẫu nhiên theo seed và hoạt động 300 tick. Không tự đặt lực gió khi chưa có ticket gốc.
- Bóng Mực Gió Lạc đang đuổi khi bị Tỏa Sáng phải chuyển sang `flee` và đánh rơi số đom đóm đã trộm sau thời gian chạy trốn đã cấu hình.
- Giữ hành vi giao diện hỗ trợ tiếp cận trong `src/main.js`; luật mô phỏng vẫn thuộc `src/game-engine.js`.
- Ghi giả định, lỗi AI, ước tính token và bằng chứng trong `docs/`.
- Không chỉnh sửa đầu ra sinh tự động chỉ để làm test đạt.

## Thành phần Harness & Khi nào dùng

- `npm run verify` ([scripts/verify-all.mjs](scripts/verify-all.mjs)): cổng kiểm chứng một lệnh (kiểm tra cú pháp, Vitest, Vite build, tính tất định, các scenario Phase 2–3, mã thoát 2 với scenario lỗi, và soak test 10 đêm). Chạy trước mọi commit/tag/hoàn tất tác vụ.
- `.agents/skills/verify-game/SKILL.md`: skill hướng dẫn agent quy trình kiểm chứng bắt buộc, ngăn kết thúc khi test đỏ. Kích hoạt mỗi khi sửa `src/`, `game.contract.json` hoặc `docs/proof/`.
- `.githooks/pre-commit`: hook git chặn commit nếu `node --check` hoặc `npm test` thất bại (kích hoạt bằng `git config core.hooksPath .githooks`).
- `.github/workflows/ci.yml`: CI tự động chạy `npm run verify` trên mọi push/PR.

## Contract hiện hành (Phase 3 thay thế các luật xung đột của Phase 2)

- Phiên bản contract hiện tại là v1.3. Thời lượng đêm là 240/270/300 giây.
- Tỏa Sáng tốn 3 đom đóm đang mang (không trừ Ngọn Lửa), bán kính 5 m, hồi chiêu 3 giây.
- Thắng lúc bình minh nếu số đèn sáng đạt `ceil(0.6 * lantern_count)`; không thắng sớm và không thưởng thời gian.
- Đèn sáng hao dầu 1/s; Bóng Mực hút dầu 5/s; dầu dưới 30 làm mất vùng an toàn.
- Mỗi tick mất tối đa một Ngọn Lửa khi bị đánh; làm rơi `floor(carried / 2)` đom đóm trong vành 1,5–2,5 m quanh người chơi.
- Snapshot tạm dừng phải ghi `state: "paused"`; `sim_tick`, thời gian và hồi chiêu phải đứng yên.
- Giữ test hồi quy Phase 2 trừ khi yêu cầu sau thay thế rõ ràng.

## Mốc Phase 2 lịch sử (đã bị thay thế khi xung đột với Phase 3)

### Yêu cầu

- **Phiên bản contract:** v1.1.
- **Đêm hỗ trợ:** 1, 2, 3 (mốc Phase 2: 300/330/360 giây).
- **Tần số mô phỏng:** 60 tick/giây.
- **Đơn vị:** mét, giây, trục Y hướng lên.

### Thông số chuẩn

| Nhóm | Thông số | Giá trị |
|---|---|---:|
| Di chuyển | Tốc độ người chơi | 6,0 m/s |
| Di chuyển | Tốc độ lướt | 14,0 m/s |
| Di chuyển | Thời lượng lướt | 0,2 giây |
| Di chuyển | Hồi chiêu lướt | 1,5 giây |
| Nhảy | Vận tốc đầu | 7,0 m/s |
| Nhảy | Trọng lực | -20 m/s² |
| Tỏa Sáng | Chi phí | 3 đom đóm |
| Tỏa Sáng | Bán kính | 5,0 m |
| Tỏa Sáng | Hồi chiêu | 3 giây |
| Đèn | Chi phí thắp lần đầu | 10 đom đóm |
| Nhặt | Bán kính | 1,0 m |
| Tương tác | Bán kính | 2,0 m |
| Vùng an toàn | Bán kính | 6,0 m |
| Bóng Mực | Tốc độ | 4,0 m/s (Đêm 3: 4,5 m/s) |
| Bóng Mực | Bán kính va chạm | 1,0 m |
| Gió Lạc | Tốc độ | 7,0 m/s |
| Bùa Gió | Thời lượng | 600 tick (10 giây) |
| Bùa Gió | Hồi chiêu | 2.700 tick (45 giây) |

### Tính năng mới (Phase 2)

#### Cơ chế

- Lướt (Shift): 14 m/s trong 0,2 giây; hồi chiêu 1,5 giây.
- Nhảy: 7,0 m/s hướng lên; trọng lực -20 m/s².
- Bóng Mực Gió Lạc (D1, D2): trộm đom đóm, chạy trốn sau khi bị Tỏa Sáng.
- Bùa Gió (C1, C2): tăng tốc lên 7,2 m/s, bỏ qua hồi chiêu lướt.
- Gió (Đêm 3): hướng ngẫu nhiên mỗi 30 giây, kéo dài 5 giây. Lực gió cần Ticket-02 để xác minh.
- Bục nhảy (Đêm 2): phóng sang đảo đối diện.

#### Các đêm

- **Đêm 1 — Đảo Bến:** đảo 40 m, 5 đèn, tối đa 6 Bóng Mực.
- **Đêm 2 — Đảo Cau:** hai đảo 28 m và cầu nối, 6 đèn, tối đa 8 Bóng Mực, tối đa 2 Gió Lạc.
- **Đêm 3 — Đảo Chuông:** đảo 45 m có 3 tầng, 7 đèn, tối đa 10 Bóng Mực và có gió.

#### Sự kiện

- `dash {}`: kích hoạt lướt.
- `charm_picked {charm_id, charm_ticks}`: nhặt bùa.
- `drifter_steal {drifter_id, amount, carried}`: Gió Lạc trộm đom đóm.
- `drifter_drop {drifter_id, amount}`: Gió Lạc đánh rơi đom đóm.
- `night_start {night}`: bắt đầu đêm mới.
- `paused {}`: tạm dừng.
- `resumed {}`: tiếp tục.
- `player_hit {by, flames, dropped, lost}`: người chơi bị đánh (bổ sung trường `lost`).

### Điểm số Phase 2 (đã bị Phase 3 thay thế)

- +10 mỗi đom đóm nạp.
- +100 mỗi đèn thắp.
- +5 mỗi Bóng Mực bị làm choáng.
- Thưởng thắng cũ: +2 × số giây còn lại và +50 × số Ngọn Lửa còn lại.

### Test Contract lịch sử Phase 2

Lệnh headless: `npm run headless -- --seed <n> --night <1-3> --ticks <tối đa 21600> --out <output.jsonl>`.

| Tính năng | Scenario | Kết quả kỳ vọng |
|---|---|---|
| Lướt | Bấm khi không hồi chiêu | Phát sự kiện `dash` |
| Lướt | Bấm khi đang hồi chiêu | Không phát sự kiện `dash` |
| Đêm 1 | Cả 5 đèn được thắp | Luật cũ: thắng, lý do `all_lit` (đã bị Phase 3 thay thế) |
| Đêm 2 | 6 đèn được thắp | Luật cũ: thắng, lý do `all_lit` (đã bị Phase 3 thay thế) |
| Đêm 3 | 7 đèn được thắp | Luật cũ: thắng, lý do `all_lit` (đã bị Phase 3 thay thế) |
| Gió Lạc | Mang ít nhất 5 đom đóm, cách không quá 15 m | Chuyển sang `chase` |
| Gió Lạc | Tỏa Sáng khi đang đuổi | Chạy trốn rồi đánh rơi đom đóm |
| Bùa Gió | Nhặt bùa | Tốc độ tăng |
| Gió | Đêm 3, trong đợt gió | Phát cảnh báo gió |
| Tạm dừng | Nhấn Escape/P | Tạm dừng, bộ đếm thời gian đứng yên |

## Cấu trúc tệp

```text
src/
├── game-engine.js      # Luật gameplay thuần
├── main.js             # Renderer 3D và giao diện
└── headless-cli.js     # Công cụ kiểm thử headless
```

## Bảng màu

| Thành phần | Mã màu |
|---|---|
| Bầu trời đêm | `#0E1430` |
| Cỏ/cát | `#2F5D50` / `#C9B48A` |
| Gỗ | `#6B4A2F` |
| Áo Mây | `#E8E2D0` |
| Đèn sáng | `#FFB347` |
| Đèn tắt | `#5B5F6E` |
| Lõi đom đóm | `#FFF6C2` |
| Quầng đom đóm | `#FFE58A` |
| Thân Bóng Mực | `#120A1A` |
| Viền Bóng Mực | `#7A3CFF` |
| Bóng Mực bị choáng | `#3A3450` |
| Khăn Mây | `#C8102E` |
| Viền Bùa Gió | `#F2C14E` |
| Gió Lạc | `#8FA3B8` |
| Cảnh báo giao diện | `#FF5A5F` |
| Chữ giao diện | `#F5F1E6` |

## Cấu hình riêng theo đêm

- **Đêm 1:** `NIGHT_1`, một đảo, đom đóm ở bán kính 12 m và 33 m.
- **Đêm 2:** `NIGHT_2`, hai đảo và cầu nối; bục nhảy tại `(20,0,18)` và `(50,0,-18)`.
- **Đêm 3:** `NIGHT_3`, ba tầng và tháp chuông ở giữa; các vị trí cụ thể cần đối chiếu Ticket-02.
