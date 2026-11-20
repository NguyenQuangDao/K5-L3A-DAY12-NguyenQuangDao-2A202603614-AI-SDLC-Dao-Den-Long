# Đặc tả và tiêu chí nghiệm thu — Phase 2

## Quy ước

- Mô phỏng chạy 60 tick/giây. Scenario dựng trạng thái ban đầu không phát sự kiện hoặc cộng điểm.
- Giá trị điều kiện thắng và điểm Phase 2 đã bị luật Phase 3 thay thế; không dùng điều kiện thắng sớm `all_lit`.
- Chỉ đánh dấu đạt khi có test hoặc bằng chứng chạy được. Do Ticket-02 gốc không có trong repository, các quyết định tự chốt được ghi riêng tại [Ticket-02 tự giả định](./ticket-02-self-authored.md); chúng không chứng minh đã khớp ticket chính thức.

## Tiêu chí nghiệm thu

| Tính năng | Tiêu chí kiểm chứng | Scenario/bằng chứng | Trạng thái |
|---|---|---|---|
| Lướt | Bấm khi hết hồi chiêu phát `dash`; đang hồi chiêu thì không phát; Bùa Gió cho phép lướt | `phase2-dash.json`; `phase2-charm-dash.json` và inputs; test Vitest | Đạt |
| Nhảy | Nhảy từ mặt đất đặt vận tốc Y ban đầu 7 m/s | `phase2-jump.json` và inputs; test Vitest | Đạt |
| Bóng Mực lúc bắt đầu | Hai Bóng Mực khởi tạo rời người chơi, ở trạng thái `wander` và dịch chuyển ngay trong tick mô phỏng đầu tiên | `phase2-starting-shades.jsonl`; test Vitest cho cả ba đêm | Đạt theo đặc tả tự giả định |
| Bản đồ ba Đêm | Tọa độ, số lượng, lịch sinh và giới hạn theo bảng trong Ticket-02 tự giả định | `ticket-02-self-authored.md`; test và scenario headless | Đạt theo đặc tả tự giả định; chưa đối chiếu ticket gốc |
| Bóng Mực Gió Lạc — đuổi | Khi người chơi mang ít nhất 5 đom đóm và ở trong 15 m, chuyển sang `chase` và trộm đom đóm | `phase2-drifter-chase.json`; `phase2-drifter-chase.jsonl`; test Vitest | Đạt |
| Bóng Mực Gió Lạc — Tỏa Sáng | Tỏa Sáng khi đang đuổi khiến chúng chạy trốn, sau đó đánh rơi số đom đóm đã trộm | `phase2-drifter-pulse.json` và inputs; test Vitest | Đạt |
| Bùa Gió | Nhặt bùa kích hoạt tăng tốc; cho phép lướt khi hồi chiêu chưa hết | `phase2-charm-dash.json` và inputs; test Vitest | Đạt |
| Gió Đêm 3 | Mỗi 1.800 tick gió hoạt động 300 tick; hướng xác định theo seed và đẩy người chơi 3 m/s | `phase2-wind-schedule.json`; test Vitest cho lịch, hướng và lực đẩy | Đạt theo đặc tả tự giả định; chưa đối chiếu ticket gốc |
| Bục nhảy Đêm 2 | Hai bục ở tọa độ đã chốt, phóng với vận tốc đứng 14 m/s và ngang 24 m/s | `phase2-jump-pad.json`; test Vitest | Đạt theo đặc tả tự giả định; chưa đối chiếu ticket gốc |
| Lịch sinh đom đóm | Đợt ở tick 240/480, theo số lượng và giới hạn trong Ticket-02 tự giả định | `phase2-mote-spawn.json`; `phase2-mote-spawn.jsonl`; test Vitest | Đạt theo đặc tả tự giả định |
| Thời gian tạm dừng | Escape/P dừng `sim_tick`, thời gian và hồi chiêu; snapshot ghi `state: "paused"` | `phase3-pause.jsonl`; test Vitest | Đạt |
| Hiệu năng | FPS render ≥ 30 tại cửa sổ 1280×720 | `npm run bench -- --seed 42 --duration 30 --out bench.json` | Đạt (đo render Three.js thật tại `bench.json`) |

## Phần còn cần lưu ý

1. So sánh Ticket-02 tự giả định với ticket chính thức nếu được cung cấp; không tuyên bố chúng tương đương khi chưa đối chiếu.
