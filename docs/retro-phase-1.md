# Đánh giá — Phase 1

## Yêu cầu

- Đảo 3D, người chơi, camera, đom đóm, đèn lồng, Bóng Mực, Tỏa Sáng, HUD, thắng/thua/chơi lại: đã triển khai.
- Test Contract v1.0: đã triển khai.
- Chạy xác định theo seed/scenario/input: đã kiểm tra bằng hai lượt chạy giống nhau tại `docs/proof/determinism-a.jsonl` và `docs/proof/determinism-b.jsonl`.
- Unit test và scenario headless: đã triển khai.

## Harness

Các lớp bảo vệ hữu ích gồm `AGENTS.md`, test Vitest, module engine thuần và CLI JSONL. Quy tắc cốt lõi: renderer không sửa trạng thái gameplay.

## Việc còn lại

- Ghi lại kết quả build từ bản clone sạch và lượt chạy trình duyệt thực tế.
