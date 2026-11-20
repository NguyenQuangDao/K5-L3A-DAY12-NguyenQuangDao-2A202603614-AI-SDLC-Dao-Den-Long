# ADR — Phase 3: Mô hình dầu đèn

## Trạng thái

Đã chấp thuận (Phase 3, contract v1.2).

## Bối cảnh

Thử nghiệm cho thấy người chơi giỏi có thể thắp hết đèn trong khoảng 2 phút rồi kết thúc game. Mục tiêu được đổi từ “thắp hết đèn” thành “giữ đảo sáng tới bình minh”. Đèn đã thắp vẫn có thể tắt khi cạn dầu.

## Quyết định

### Mô hình trạng thái đèn

Mỗi đèn có thêm:

- `fuel` (0–100; hiện được cập nhật theo bước 1/60 mỗi tick).
- `everLit` (đã từng được thắp hay chưa).
- `relitCount` (số lần thắp lại).

Trạng thái logic:

- `lit === false`: đèn tắt, `fuel = 0`; `deposited` có thể lớn hơn 0 trong lúc nạp.
- `lit === true`: đèn sáng, hao dầu 1,0/giây. Khi `fuel <= 0`, đèn tắt, `deposited = 0`, `everLit = true` và phát sự kiện `lantern_out`.

Thắp đèn:

- Đèn chưa từng sáng cần 10 đom đóm.
- Đèn đã từng sáng cần 5 đom đóm.
- Khi thắp thành công: `fuel = 100`, `everLit = true`.

Châm dầu (tương tác với đèn đang sáng nhưng chưa đầy): `used = min(bag, ceil((100-fuel)/10))`; tăng `fuel` thêm `10*used` và trừ `used` đom đóm. Phát sự kiện `refuel`.

### Luật thắng

Không còn thắng sớm. Thắng khi hết giờ, người chơi còn sống và số đèn sáng đạt ít nhất `ceil(0.6 × tổng số đèn)`. Thua ngay khi hết Ngọn Lửa; nếu hết giờ dưới ngưỡng thì thua với lý do `dawn`.

### Bóng Mực hút dầu

Bóng Mực có trạng thái `drain`. Khi lang thang, chúng ưu tiên đèn sáng yếu nhất (dầu < 30); nếu không có thì hướng tới đèn tắt gần nhất. Khi cách đèn yếu không quá 2 m, chuyển sang `drain`, đứng yên và hút 5 đơn vị dầu/giây. Nhiều Bóng Mực có thể hút cùng đèn. Việc chuyển trạng thái tuân theo điều kiện của ticket.

### Sức chứa

`capacity = min(20, 10 + 2 × successfulLights)`. `successfulLights` tăng mỗi lần thắp thành công, kể cả thắp lại, và đặt lại mỗi đêm. Đèn đã được dựng sẵn trong scenario không được tính.

## Hệ quả

- Thay đổi không tương thích: contract v1.2; bỏ `all_lit`; thêm `dawn_survived`; thay cách tính điểm/thời lượng đêm; snapshot bổ sung dầu, `ever_lit`, `relit_count`, sức chứa và trạng thái hút dầu.
- Test “thắng khi thắp hết đèn” được đổi thành “thắng lúc bình minh nếu đủ đèn sáng”.
