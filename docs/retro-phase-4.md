# Tổng kết — Phase 4 (Ticket-04: Phát hành v1.0.0)

## Tổng kết bốn phase

| Phase | Đánh giá | Vấn đề chính & Cách xử lý |
|---|---|---|
| 1 | Đạt — engine thuần, headless contract v1.0, renderer Three.js, tag `phase-1` | Đã tách hoàn toàn logic khỏi renderer để chạy tất định |
| 2 | Đạt theo đặc tả tự giả định — 3 đêm, lướt/nhảy, Gió Lạc, Bùa Gió, gió Đêm 3, tag `phase-2` | Phát hiện và sửa lỗi thiếu đom đóm khởi đầu Đêm 2/3 và lỗi `dashTimer` (12s → 0,2s); tọa độ chốt tại `docs/ticket-02-self-authored.md` |
| 3 | Đạt — dầu đèn, thắng bình minh, thắp lại/châm dầu, sức chứa, tạm dừng, tag `phase-3` | Ghi rõ ADR (`docs/adr-phase3-lantern-fuel.md`) và thay test `all_lit` cũ kèm lý do |
| 4 | Đạt — benchmark WebGL 1280×720, soak 10 đêm, bảng xếp hạng, hỗ trợ tiếp cận, harness skill/hook/CI, video demo, tag `phase-4` & Release `v1.0.0` | Đã lưu đầy đủ ảnh chụp, JSON tải từ trình duyệt, số đo thật và video `.mp4` |

## Điều hiệu quả khi làm với AI

1. **`AGENTS.md` + Skill/Hook là harness then chốt:** Giữ gameplay thuần trong `src/game-engine.js`, kèm `npm run verify`, `.agents/skills/verify-game/SKILL.md` và `.githooks/pre-commit` ngăn tuyệt đối việc kết thúc khi test đỏ.
2. **Kiểm toán mã nguồn độc lập trước phát hành:** Lượt rà soát cuối phát hiện 3 lỗi logic thật (`dashTimer` lệch 60×, thiếu đom đóm đầu Đêm 2/3, và khối test `describe` bị lồng sai) dù bộ test cũ đang xanh.
3. **Kiểm thử headless + Playwright tự động:** `npm run verify`, `scripts/verify-ui-proof.mjs`, `npm run bench` và `npm run demo:record` tạo bằng chứng thật, tái lập được, không sửa tay.
4. **Chia nhỏ thay đổi:** Chỉnh từng phần file giúp tránh lỗi cú pháp và tiết kiệm token.

## Điều chưa hiệu quả & Bài học

1. **Vòng chờ bận trong benchmark engine ban đầu:** Đã thay bằng `setTimeout` bất đồng bộ và xây dựng runner benchmark WebGL Three.js thật ở 1280×720 (`src/render-bench-cli.js`).
2. **Soak dùng RSS gây hiểu nhầm:** V8 giữ lại vùng nhớ đã reserve nên RSS tăng dù state đã giải phóng. Đã chuyển sang đo `heap_used_after_gc` với `--expose-gc` và ghi rõ chỉ số.
3. **Để tag các phase sau đến cuối:** Trong thực tế nên gắn tag ngay khi kết thúc mỗi phase để lịch sử git phản ánh sát mốc giờ.

## Lỗi AI và cách phát hiện

1. **Lỗi `parseArgs` không hỗ trợ cờ boolean (`--bench`):** Phát hiện khi chạy CLI; sửa vòng lặp nhận diện tham số kế tiếp bắt đầu bằng `--`.
2. **`BigInt(1000/60)` ném lỗi runtime:** `node --check` không bắt được; sửa thành `1_000_000_000n / 60n`.
3. **Lỗi `dashTimer` kéo dài 12 giây thay vì 0,2 giây:** AI gán `0.2 * 60 = 12` nhưng trừ `1/60` mỗi tick. Phát hiện khi kiểm toán mã nguồn; sửa sang đếm theo tick nguyên (`12` trừ `1`) và thêm unit test kiểm tra 12 tick.
4. **Đêm 2 & Đêm 3 khởi đầu 0 đom đóm:** AI kiểm tra `i < config.moteCount` trong khi Đêm 2/3 dùng `motesPerIsland`/`motesPerLevel`. Phát hiện khi kiểm toán; sửa fallback và thêm unit test.
5. **Khối `describe("leaderboard names")` bị lồng trong `it()`:** Phát hiện khi đối chiếu danh sách test Vitest; tách ra top-level và mở rộng lên 49 test Vitest.

## Harness hữu ích nhất

1. **`AGENTS.md`:** Luật bất biến giữ gameplay thuần trong `src/game-engine.js`.
2. **`scripts/verify-all.mjs` (`npm run verify`):** Một lệnh chạy toàn bộ kiểm tra cú pháp, 49 test Vitest, Vite build, tính tất định, 9 scenario Phase 2–3, mã thoát 2 với scenario lỗi, và soak test 10 đêm.
3. **`.agents/skills/verify-game/SKILL.md` & `.githooks/pre-commit`:** Quy định khi nào phải chạy cổng kiểm chứng và tự động chặn commit khi test đỏ.
4. **`.github/workflows/ci.yml`:** Chạy `npm run verify` tự động trên mỗi push/PR.

## Ước tính token/chi phí AI

- Phase 1: ~12.000 token tương đương ngữ cảnh.
- Phase 2: ~45.000–65.000 token tương đương ngữ cảnh.
- Phase 3: ~35.000–50.000 token tương đương ngữ cảnh.
- Phase 4 + kiểm toán cuối: ~240.000–340.000 token đầu vào, ~60.000–90.000 token đầu ra.
- *(Ghi chú trung thực: đây là ước tính thô dựa trên ngữ cảnh, không phải telemetry tính phí của nhà cung cấp.)*
- **Cách tiết kiệm token:** chỉ đọc file/đoạn cần thiết; chạy `node --check` trước `npm test`; gom kiểm chứng vào `npm run verify`; tạo diff nhỏ có mục tiêu.

## Nếu làm lại

1. Gắn tag `phase-1`…`phase-4` ngay tại thời điểm kết thúc mỗi phase.
2. Viết unit test bao phủ mọi thông số trong `game.contract.json` (kể cả thời lượng dash và số đom đóm khởi đầu của từng đêm) ngay từ Phase 2.
3. Tạo sẵn `npm run verify` và pre-commit hook từ Phase 1 để phát hiện hồi quy tức thì.
