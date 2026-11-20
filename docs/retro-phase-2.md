# Tổng kết — Phase 2

## Đánh giá

- Đã triển khai trong engine: di chuyển theo tick cố định, lướt, nhảy, thiết lập thực thể theo đêm, bùa, phản ứng chạy trốn/đánh rơi của Bóng Mực Gió Lạc và lịch gió Đêm 3.
- Đã kiểm tra lại: kích hoạt/hồi chiêu lướt, nhảy, khởi tạo ba đêm, Bóng Mực dịch chuyển ngay ở tick đầu, bùa cho phép lướt khi hồi chiêu, Gió Lạc chạy trốn/đánh rơi sau Tỏa Sáng, lịch gió xác định theo seed và di chuyển theo camera.
- Bằng chứng: `tests/game-engine.test.js`; `docs/proof/scenarios/phase2-dash.json`, `phase2-jump.json`, `phase2-charm-dash.json`, `phase2-drifter-pulse.json`, `phase2-wind-schedule.json`, `phase2-jump-pad.json`, `phase2-starting-shades.json`; lượt chạy CI kiểm tra tính tất định.
- Chưa chứng minh hoàn tất: toàn bộ tọa độ/lịch sinh bản đồ, lực gió theo ticket, mọi thông số bục nhảy và FPS giao diện ở 1280×720.

## Xử lý thay đổi

Phase 3 thay thế thời lượng đêm, điều kiện thắng và cách tính điểm của Phase 2. Giá trị lịch sử vẫn nằm trong phần Phase 2 của `AGENTS.md` và `CHANGELOG.md`; chúng không còn là thông số hiện hành. Test cũ về thắng sớm khi `all_lit` được đổi thành kiểm tra sống sót tới bình minh theo luật mới.

## Nếu thực hiện lại

Viết một scenario headless cho mỗi thực thể/cơ chế trong lúc triển khai; ghi tọa độ bản đồ và tick sinh chính xác từ ticket trước khi sửa engine. Phase này không ghi nhận token/chi phí.
