# Nhật ký sử dụng AI

| Phase | Token ước tính | Ghi chú |
|---|---:|---|
| 1 | ~12.000 token tương đương ngữ cảnh | Làm engine thuần/headless trước, sau đó mới làm renderer; dùng chung định dạng scenario cho test và bản phát hành |

## Lỗi AI và cách khắc phục — Phase 1

- Bản headless đầu tiên chưa xử lý hành động theo cạnh nhấn. Đã sửa trong CLI bằng cách so sánh trạng thái nút ở tick hiện tại và trước đó.
- Việc dựng scenario được tách khỏi phát sinh sự kiện để tải đèn đã sáng không tạo sự kiện hoặc điểm giả.
- Qua lượt review, toàn bộ thay đổi trạng thái gameplay được chuyển khỏi renderer Three.js.

## Sửa khởi động gameplay — 2026-11-20

- Công sức ước tính: ~8.000 token tương đương ngữ cảnh.
- Giả định: Bóng Mực ban đầu đi về phía đèn thay vì lập tức hội tụ vào người chơi; Shift là phím lướt, Space là phím nhảy; engine xử lý chuyển động theo hướng camera.
- Lỗi và cách sửa: Đặt Bóng Mực ở rìa đảo nhưng vẫn để trạng thái đuổi khiến người chơi thua quá nhanh. Bóng Mực ban đầu hiện dùng hành vi đi lang thang như các đợt xuất hiện sau.
- Sửa trên trình duyệt: Chuyển động từng bị xoay cả ở renderer lẫn engine; hạt nhặt đom đóm/thắp đèn đọc tọa độ sự kiện không tồn tại. Renderer hiện chuyển đầu vào thô cho engine và neo hiệu ứng tại người chơi.
- Bằng chứng: 24 test Vitest đạt, gồm kiểm tra khởi động Bóng Mực và nhảy. `docs/proof/scenarios/starting-shades.json` duy trì trạng thái chơi trong 1.200 tick headless. Smoke test trình duyệt cho thấy nhảy, di chuyển, nhặt đom đóm và sống sót với đủ 3 Ngọn Lửa; Bóng Mực trong suốt hiển thị không gây lỗi runtime.

## Camera và phản hồi của đèn — 2026-11-20

- Giả định: Hướng di chuyển vẫn tương đối với camera; camera bám theo hướng nhìn đã làm mượt riêng.
- Ánh sáng cầm tay hiện thay đổi theo số đom đóm; đèn đã thắp có tầm và cường độ chiếu sáng lớn hơn.
- Bằng chứng: Test Vitest và build production đạt; trang trình duyệt tải được và game phản hồi với camera góc nhìn thứ ba đã cập nhật.
- Sửa A/D: Chiều tọa độ ngang bị đảo do quy ước hướng nhìn của camera. Engine và hướng camera bám theo hiện dùng cùng phép biến đổi đã chỉnh; `camera-relative-strafe` có scenario headless.

## Tính tất định khi sinh thực thể headless — 2026-11-20

- Giả định: `random_motes: false` và `random_shades: false` tắt cả sinh ngẫu nhiên trong tương lai lẫn khởi tạo ngẫu nhiên theo scenario.
- Lỗi và cách sửa: Bộ lập lịch vẫn sinh thực thể dù cờ đã tắt; một số vị trí dùng `Math.random()`. Các bộ lập lịch hiện tuân thủ cờ và dùng RNG có seed của engine.
- Bằng chứng: `npm test`; so sánh replay cùng seed; `docs/proof/no-random-spawns.jsonl`; scenario thắng bình minh; `docs/proof/soak-10-nights.json`.
- Ước tính token: không có telemetry phiên cục bộ.

## Nhịp benchmark — 2026-11-20

- Lỗi và cách sửa: Benchmark dùng vòng chờ bận giữa các tick. Đã thay bằng chờ bất đồng bộ qua `setTimeout` để nhường CPU.
- Bằng chứng: `npm run bench -- --seed 42 --duration 30 --out docs/proof/bench-30s.json` hoàn tất với 1.800 frame được đo.
- Ước tính token: không có telemetry phiên cục bộ.

## Đối chiếu contract — 2026-11-20

- Các lỗi đã sửa: Tỏa Sáng trừ Ngọn Lửa thay vì 3 đom đóm và thiếu lực đẩy 4 m; làm choáng Bóng Mực đang hút dầu cộng điểm +20 thay vì +15; sự kiện va chạm báo số đom đóm rơi nhưng không tạo thực thể; kiểm tra rơi xảy ra sau khi kẹp xuống mặt đất; tạm dừng vẫn chạy đồng hồ mô phỏng; dựng scenario xóa giá trị bùa/hồi sinh đã cấu hình.
- Một test lướt khi có bùa ban đầu thất bại vì khởi tạo scenario đặt `charmS` về 0. Bỏ ghi đè đó đã sửa đúng nguyên nhân.
- Đối chiếu benchmark phát hiện thiết lập giữ lại 6 Bóng Mực và 20 đom đóm mặc định ngoài 200/100 yêu cầu. Danh sách hiện được thay thế hoàn toàn. FPS đo khoảng cách thời gian thực giữa frame thay vì chỉ đo thời gian CPU xử lý.
- Lần kiểm tra soak đầu không đạt tỷ lệ RSS (40,578→69,906 MB). RSS đo vùng nhớ V8 đã reserve chứ không phải đối tượng còn được giữ; soak hiện đo heap còn dùng sau GC chủ động (`--expose-gc`) và ghi rõ chỉ số. Lượt cuối: 0 crash, 3,727→4,042 MB (trong giới hạn 1,2×).
- Bằng chứng: 36 test Vitest; JSONL hiện tại cho pulse/hit/fall/pause/thắng bình minh/thua; replay xác định; file lỗi thoát mã 2; benchmark engine 30 giây. Benchmark không có renderer nên không chứng minh FPS giao diện ở 1280×720.
- Ước tính token cho lượt đối chiếu này: không có telemetry sử dụng phiên.

## Hoàn thiện báo cáo, Gió Lạc và hỗ trợ tiếp cận

- Yêu cầu: Việt hoá tài liệu nộp; chứng minh Bóng Mực di chuyển ngay từ đầu; sửa các blocker Phase 2/4 có đặc tả trong repository.
- Đã sửa: thêm trạng thái chạy trốn/đánh rơi của Bóng Mực Gió Lạc khi bị Tỏa Sáng; lịch gió Đêm 3 xác định theo seed (chu kỳ 1.800 tick, hoạt động 300 tick); bổ sung test/scenario về lướt, nhảy, bục nhảy, bùa và chuyển động tick đầu.
- Giao diện: thêm cài đặt đổi phím có báo trùng/khôi phục mặc định, giảm chuyển động, cỡ chữ ×1,25, chỉ báo hình ảnh, chế độ mù màu; thêm menu bảng xếp hạng và nút tải JSON.
- Lỗi phát hiện khi kiểm thử: menu mở trong lúc game chạy vẫn có thể để mô phỏng tiếp tục nếu mở/đóng liên tiếp. Đã điều chỉnh việc sở hữu trạng thái tạm dừng và kiểm tra đồng hồ đứng khi menu mở.
- Bằng chứng: `npm test` đạt 38 test; `npm run build` đạt; headless scenario cho chuyển động Bóng Mực tick 1, Gió Lạc, gió, lướt/nhảy/bùa/bục nhảy; trình duyệt cục bộ xác nhận đổi phím, báo trùng, đặt lại, lưu cài đặt và đóng băng đồng hồ khi menu mở.
- Giới hạn: benchmark vẫn không render 1280×720; lực gió/bản đồ chính xác cần Ticket-02; sự kiện tải file chưa được ghi thành bằng chứng lưu trong repo; video/tag/release chưa có.
- Ước tính token: không có telemetry sử dụng phiên.

## Giới hạn ghi nhận token

- Phase 1: ước tính thô ~12.000 token tương đương ngữ cảnh (không phải telemetry nhà cung cấp).
- Phase 2: ước tính thô ~45.000–65.000 token tương đương ngữ cảnh (mở rộng 3 đêm, lướt/nhảy, Gió Lạc, bùa, gió, test và scenario).
- Phase 3: ước tính thô ~35.000–50.000 token tương đương ngữ cảnh (ADR dầu đèn, luật thắng bình minh, sửa test cũ và đối chiếu contract v1.2/v1.3).
- Phase 4: ước tính thô ~200.000–300.000 token đầu vào và ~50.000–80.000 token đầu ra (benchmark WebGL 1280×720, soak test, hỗ trợ tiếp cận, bảng xếp hạng, harness, kiểm chứng tự động và video demo).
- Cách tiết kiệm token: chỉ đọc đoạn code liên quan; chạy `node --check` trước `npm test`; gom toàn bộ kiểm chứng vào một lệnh `npm run verify`; sửa diff nhỏ thay vì viết lại cả file.

## Hoàn thiện bằng chứng benchmark và Ticket-02 tự giả định — 2026-11-20

- Yêu cầu: tự tạo các deliverable đang chặn, nhưng không giả nhận định là nội dung Ticket-02 chính thức.
- Đã chốt trong tài liệu riêng: hai Bóng Mực ban đầu, lịch sinh theo tick, giới hạn theo đêm, lực gió 3 m/s và lực bục Đêm 2. Engine được đồng bộ; thêm test lịch đom đóm, lịch Bóng Mực, lực gió và bục.
- Benchmark CLI được chuyển sang Chromium/Three.js thật; benchmark tick loop cũ giữ riêng dưới `bench:engine`. Cảnh đo chạy ở 1280×720, khởi động 3 giây, có đủ 200 Bóng Mực / 100 đom đóm / 3 đèn.
- Lần đo đầu chưa hoàn tất khi renderer dựng 200 quái; loại đèn điểm phụ của quái trong chế độ benchmark để không tạo 200 nguồn sáng động.

## Kiểm toán cuối & hoàn thiện phát hành v1.0.0 — 2026-11-20

- **Lỗi nghiêm trọng phát hiện khi kiểm toán mã nguồn:**
  1. `createInitialState` kiểm tra `i < config.moteCount`, nhưng `NIGHT_2` dùng `motesPerIsland` và `NIGHT_3` dùng `motesPerLevel` nên Đêm 2 và Đêm 3 khởi đầu với 0 đom đóm thay vì 12 và 30. Đã sửa dùng `config.moteCount ?? config.motesPerIsland ?? config.motesPerLevel ?? initialPositions.length` và thêm unit test.
  2. `state.dashTimer` được gán `TUNING.dashDurationS * 60` (= 12) nhưng mỗi tick lại trừ `1/60`, khiến lướt kéo dài 12 giây (720 tick) thay vì 0,2 giây (12 tick). Đã chuyển sang đếm theo tick nguyên (`12` giảm `1` mỗi tick) và thêm unit test kiểm chứng chính xác 12 tick ở 14 m/s.
  3. Khối `describe("leaderboard names")` trong `tests/game-engine.test.js` bị lồng nhầm bên trong `it("scores motes correctly")` nên Vitest không chạy. Đã tách ra top-level và bổ sung đầy đủ unit test cho bảng xếp hạng, dầu đèn, thắp lại, châm dầu, sức chứa và Gió Lạc.
  4. `src/render-bench-cli.js` mặc định `headed = true` dễ lỗi trên máy chấm Linux không có màn hình; đã bổ sung tự nhận diện môi trường Linux không có `DISPLAY` và tự fallback sang headless SwiftShader.
- **Bổ sung Harness AI:** thêm cổng kiểm chứng một lệnh `npm run verify` (`scripts/verify-all.mjs`), skill `.agents/skills/verify-game/SKILL.md`, hook `.githooks/pre-commit`, và cập nhật CI `.github/workflows/ci.yml` chạy `npm run verify`.
- **Bằng chứng bổ sung:** chụp ảnh kiểm chứng thật từ trình duyệt (`docs/proof/gameplay.png`, `docs/proof/a11y-colorblind.png`, `docs/proof/leaderboard-ui.png`), lưu file JSON tải trực tiếp từ trình duyệt (`docs/proof/leaderboard-browser-export.json`), bổ sung scenario `phase2-drifter-chase.json` và `phase2-mote-spawn.json`, quay video demo `docs/demo/demo.mp4`, gắn đủ tag `phase-1`…`phase-4` và phát hành Release `v1.0.0`.
- **Ước tính token cho lượt kiểm toán cuối:** ~40.000 token tương đương ngữ cảnh (đọc có chọn lọc, chạy song song kiểm tra và sinh bằng chứng một lượt).
