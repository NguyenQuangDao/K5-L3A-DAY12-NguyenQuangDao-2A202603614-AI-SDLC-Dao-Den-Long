# Tổng kết — Phase 3

## Đánh giá

- Đã triển khai và kiểm tra lại: đêm dài 240/270/300 giây; chỉ thắng khi đạt ngưỡng đèn sáng lúc bình minh; ưu tiên thua khi hết Ngọn Lửa; hao dầu/châm dầu/thắp lại; vùng an toàn mất khi dầu thấp; điểm theo đom đóm; tăng sức chứa; chi phí/lực đẩy Tỏa Sáng; số lượng/vùng rơi đom đóm khi bị đánh; thời gian mô phỏng dừng khi tạm dừng.
- Bằng chứng: test tập trung tại `tests/game-engine.test.js`; `docs/proof/phase3-dawn-win.jsonl`, `phase3-pulse.jsonl`, `phase3-hit-drop.jsonl`, `phase3-pause.jsonl`; kiểm tra mã thoát khi scenario/input sai.
- Chưa chứng minh hoàn tất: bản đồ/lịch sinh chính xác theo ticket, đầy đủ hành vi gió, mọi chuyển trạng thái của Bóng Mực, lưu dầu hoàn toàn bằng số nguyên và scenario phủ hết mọi tính năng Phase 2–3.

## Thay đổi phá vỡ tương thích và hồi quy

`docs/adr-phase3-lantern-fuel.md` ghi quyết định về dầu và luật thắng. `docs/changelog-phase3.md` liệt kê hành vi thắng sớm/tính điểm cũ đã bị thay thế. Điều kiện thắng `all_lit` cũ được thay bằng sống sót tới bình minh; không có test nào bị bỏ qua âm thầm.

## Nếu thực hiện lại

Giữ bảng tuning của contract và engine có thể đối chiếu tự động; chạy lại toàn bộ scenario cũ sau mỗi lần đổi thứ tự mô phỏng. Phase này không ghi nhận token/chi phí.
