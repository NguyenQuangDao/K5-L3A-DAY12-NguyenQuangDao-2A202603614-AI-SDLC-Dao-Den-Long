# Ticket-02 tự giả định — Bản đồ, lịch sinh và gió

> **Phạm vi và độ tin cậy:** Đây là đặc tả do nhóm tự lập vì không có Ticket-02 gốc trong repository. Các tọa độ sẵn có được giữ lại; những giá trị còn thiếu được chọn rõ ràng bên dưới. Tài liệu này không chứng minh đã khớp Ticket-02 chính thức.

## Tiêu chí nghiệm thu

1. Mỗi Đêm giữ nguyên tọa độ đèn, điểm xuất phát và địa hình đã khai báo trong `src/game-engine.js`.
2. Hai Bóng Mực xuất hiện ngay từ tick 0, ở trạng thái `wander`, và cả hai di chuyển trong tick đầu. Tổng số tối đa là 6 / 8 / 10; sinh thêm một con mỗi mốc lịch cho tới giới hạn.
3. Đom đóm xuất hiện theo đợt ở tick 240 và 480. Đêm 1 thêm 8 mỗi đợt; Đêm 2 thêm tối đa 8 trên mỗi đảo; Đêm 3 có sẵn 30 và không vượt giới hạn 30.
4. Bục Đêm 2 tại `[20, 0, 18]` và `[50, 0, -18]`; lực phóng lần lượt theo hướng `[-0.6, 0, -0.8]` và `[0.6, 0, 0.8]`, tốc độ ngang 24 m/s, vận tốc đứng 14 m/s.
5. Gió Đêm 3 bắt đầu tại tick 1800, hoạt động 300 tick, hướng lấy từ RNG có seed. Gió đẩy người chơi 3 m/s theo góc `dir_deg` (0° hướng +X, 90° hướng +Z).
6. Scenario khởi tạo trạng thái không phát sự kiện hoặc cộng điểm; replay cùng seed và input phải giống nhau.

## Bản đồ được chốt theo mã nguồn hiện tại

| Đêm | Đèn (x, y, z) | Điểm xuất phát | Bóng Mực ban đầu / tối đa | Đom đóm ban đầu |
|---|---|---|---|---|
| 1 | `[0,0,25]`, `[23.8,0,7.7]`, `[14.7,0,-20.2]`, `[-14.7,0,-20.2]`, `[-23.8,0,7.7]` | `[0,0,0]` | 2 / 6 | 20: 8 ở vòng bán kính 12 m, 12 ở vòng 33 m |
| 2 | `[0,0,20]`, `[17,0,-10]`, `[-17,0,-10]`, `[70,0,20]`, `[87,0,-10]`, `[53,0,-10]` | `[0,0,0]` | 2 / 8 | 12: 6 trên mỗi đảo, tâm `[0,0,0]` và `[70,0,0]` |
| 3 | `[0,6,6]`, `[18,3,10]`, `[-18,3,10]`, `[35,0,-10]`, `[-35,0,-10]`, `[20,0,-35]`, `[-20,0,-35]` | `[0,0,0]` | 2 / 10 | 30: 18 ở vòng r=34, 8 ở r=18/y=3, 4 ở r=5/y=6 |

## Lịch sinh

| Đêm | Bóng Mực | Đom đóm | Bóng Mực Gió Lạc |
|---|---|---|---|
| 1 | tick 300, sau đó mỗi 480 tick, tối đa 6 | tick 240 và 480, tối đa 30 | — |
| 2 | tick 300, sau đó mỗi 420 tick, tối đa 8 | tick 240 và 480, tối đa 30 | tick 1200, sau đó mỗi 1200 tick, tối đa 2 |
| 3 | tick 300, sau đó mỗi 360 tick, tối đa 10 | Có sẵn 30, không sinh thêm | tick 1200, sau đó mỗi 1200 tick, tối đa 2 |

## Dấu vết

- Test: `tests/game-engine.test.js` (di chuyển đầu game, lịch sinh đom đóm, lực gió và bục nhảy).
- Headless: `docs/proof/phase2-starting-shades.jsonl`, `docs/proof/phase2-mote-spawn.jsonl`, `docs/proof/phase2-wind-schedule.jsonl`, `docs/proof/phase2-jump-pad.jsonl`.
- Các kết quả này xác minh **đặc tả tự giả định**. Cần Ticket-02 gốc để tuyên bố đối chiếu chính thức.
