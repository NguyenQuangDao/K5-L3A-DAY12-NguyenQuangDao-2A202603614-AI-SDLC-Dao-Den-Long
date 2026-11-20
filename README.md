# Day 12 — AI SDLC: Đảo Đèn Lồng

> **Video demo (< 5 phút, xem công khai):** [docs/demo/demo.mp4](./docs/demo/demo.mp4) · **Bản phát hành (Release v1.0.0):** [GitHub Release v1.0.0](https://github.com/NguyenQuangDao/K5-L3A-DAY12-NguyenQuangDao-2A202603614-AI-SDLC-Dao-Den-Long/releases/tag/v1.0.0)

## Sản phẩm

Game 3D góc nhìn thứ ba, xây bằng Three.js và JavaScript. Người chơi điều khiển Mây, nhặt đom đóm, nạp đèn, né Bóng Mực và sống sót tới bình minh với đủ số đèn sáng (3/5, 4/6, 5/7).

### Chạy trong tối đa 3 lệnh

```bash
npm install
npm run dev
```

Kiểm tra toàn bộ bằng một lệnh (cú pháp, 49 unit test, build, tính tất định, các scenario Phase 2–3, mã thoát 2 với scenario lỗi, soak test 10 đêm):

```bash
npm run verify
```

Hoặc chạy riêng test và build:

```bash
npm test
npm run build
```

### Điều khiển

| Nút | Hành động |
|---|---|
| WASD | Di chuyển (có thể đổi trong Hỗ trợ tiếp cận) |
| Chuột kéo | Quay camera |
| E | Nạp đom đóm vào đèn gần Mây |
| F | Tỏa sáng, làm choáng và đẩy Bóng Mực |
| Space | Nhảy |
| Shift | Lướt (dash) |
| Escape / P | Tạm dừng |
| Nút Hỗ trợ tiếp cận | Đổi phím, giảm chuyển động, cỡ chữ, chỉ báo hình ảnh, chế độ mù màu |
| Nút Bảng xếp hạng | Xem top 10 và tải dữ liệu JSON |
| Nút Chơi lại | Tái bắt đầu sau thắng/thua |

### Chế độ headless

```bash
npm run headless -- --seed 123 --night 1 --ticks 3600 --out out.jsonl --snapshot-every 10
```

Hỗ trợ `--scenario <file.json>` và `--inputs <file.json>`. Contract đầy đủ tại `game.contract.json`.

### Benchmark render (Phase 4)

```bash
npx playwright install chromium
npm run bench -- --seed 42 --duration 30 --out bench.json
```

Mở Chromium headless ở 1280×720, dựng cảnh Three.js gồm 200 Bóng Mực, 100 đom đóm và 3 đèn sáng. Khởi động 3 giây, sau đó đo thời lượng yêu cầu và lưu FPS trung bình, 1% thấp, p95 frame, thời gian tải và cấu hình vào `bench.json`. Lệnh thoát mã khác 0 nếu thiếu cấu hình cảnh hoặc không đạt ngưỡng.

Benchmark engine cũ (không render) vẫn có thể chạy riêng bằng `npm run bench:engine -- --seed 42 --duration 30 --out docs/proof/bench-engine.json`; không dùng kết quả này để chứng minh FPS giao diện.

### Chế độ soak test (Phase 4)

```bash
npm run soak -- --seed 7 --nights 10 --out soak.json
```

Chạy 10 Đêm liên tiếp, kiểm tra crash và rò rỉ bộ nhớ.

### Bảng xếp hạng (Phase 4)

Sau khi thắng hoặc thua, nhập tên để lưu điểm. Bảng xếp hạng top 10 được lưu trên localStorage.
Có màn hình Bảng xếp hạng từ màn hình kết thúc.
Lệnh export JSON (đọc file JSON do người dùng cung cấp):

```bash
npm run headless -- --export-leaderboard --leaderboard leaderboard.json --out leaderboard-export.json
```

### Cách tính điểm

- 5 điểm cho mỗi đom đóm nạp; 100 điểm thắp lần đầu; 40 điểm thắp lại.
- Tỏa Sáng: 5 điểm mỗi Bóng Mực, hoặc 15 điểm nếu đang hút dầu.
- Thắng bình minh: mỗi đèn sáng +50 và phần dầu nguyên (floor); mỗi Ngọn Lửa còn lại +50. Không còn thưởng thời gian.

### Tình trạng Phase 4

- Bảng điểm top 10 lưu trong `localStorage`, có màn hình riêng và tải JSON thật từ trình duyệt: [leaderboard-ui.png](./docs/proof/leaderboard-ui.png) · [leaderboard-browser-export.json](./docs/proof/leaderboard-browser-export.json).
- Hỗ trợ tiếp cận có đổi phím với báo trùng/khôi phục mặc định, giảm chuyển động, cỡ chữ ×1,25, chỉ báo hình ảnh và chế độ mù màu: [a11y-colorblind.png](./docs/proof/a11y-colorblind.png).
- Bóng Mực khởi đầu đã dịch chuyển ngay từ tick gameplay đầu tiên; có test kiểm tra cả ba Đêm.
- Ticket-02 gốc không có trong repository. Các tọa độ/lịch sinh được chốt trong [Ticket-02 tự giả định](./docs/ticket-02-self-authored.md); lực gió 3 m/s và thông số bục cũng là giả định rõ ràng.
- Benchmark CLI dựng cảnh Three.js thật ở 1280×720 (200 Bóng Mực, 100 đom đóm, 3 đèn sáng); số đo thật ở [bench.json](./bench.json) và [docs/proof/bench-30s.json](./docs/proof/bench-30s.json).
- Harness AI gồm `AGENTS.md`, skill [verify-game](./.agents/skills/verify-game/SKILL.md), hook [.githooks/pre-commit](./.githooks/pre-commit), cổng kiểm chứng một lệnh `npm run verify` ([scripts/verify-all.mjs](./scripts/verify-all.mjs)) và CI [.github/workflows/ci.yml](./.github/workflows/ci.yml).
- Video demo dưới 5 phút lưu tại [docs/demo/demo.mp4](./docs/demo/demo.mp4) và đính kèm Release `v1.0.0`; đủ tag `phase-1`…`phase-4`.

### Sáng tạo của tôi

Đèn sáng lan ánh cam ấm và đảo phát sáng dần theo số đèn đã thắp ([gameplay.png](./docs/proof/gameplay.png)). Sáng tạo này chỉ là hiệu ứng renderer; bằng chứng replay headless cùng seed cho đầu ra giống hệt từng byte: [determinism-a.jsonl](./docs/proof/determinism-a.jsonl) và [determinism-b.jsonl](./docs/proof/determinism-b.jsonl).

### Kiểm chứng và báo cáo tổng kết

- [Traceability](./docs/proof/traceability.csv) ghi trạng thái đạt/chưa đạt thay vì đánh dấu giả.
- [Đặc tả và tiêu chí nghiệm thu Phase 2](./docs/spec-phase2.md) ghi rõ bằng chứng hiện có và các mục cần Ticket-02 để đối chiếu.
- [Phase 1 retro](./docs/retro-phase-1.md) · [Phase 2 retro](./docs/retro-phase-2.md) · [Phase 3 retro](./docs/retro-phase-3.md) · [Phase 4 retro](./docs/retro-phase-4.md)

> **Cá nhân** (1 người / 1 MSSV) · Áp dụng SDLC cùng AI để xây một **game 3D** qua **4 phase**, từ yêu cầu ban đầu tới bản phát hành.
> **Lab board + trợ giảng:** **[Đảo Đèn Lồng Lab](https://claude.ai/artifact/Q1RYyv1dxjUczzCbd2ZnoW)**

---

## Tài liệu của lab

| File | Nội dung |
|---|---|
| [GUIDE.md](GUIDE.md) | Hướng dẫn làm lab: vòng làm việc mỗi phase, harness, kiểm chứng, token |
| [CHECKPOINTS.md](CHECKPOINTS.md) | Các mốc tự kiểm tra từ chuẩn bị đến nộp bài |
| [SUBMISSION.md](SUBMISSION.md) | Đặt tên repo, hạn nộp, tag, Release, video, checklist |
| [RULES.md](RULES.md) | Quy định: AI, trung thực về bằng chứng, bản quyền, bảo mật |
| [RUBRIC.md](RUBRIC.md) | Thang điểm chi tiết |

## Lab board

Yêu cầu dự án được phát hành tại **[Đảo Đèn Lồng Lab](https://claude.ai/artifact/Q1RYyv1dxjUczzCbd2ZnoW)**. Mỗi phase là một tab (tab chưa phát hành bị khóa), mỗi tab có trợ giảng AI riêng chỉ trả lời trong phạm vi phase đó. Trợ giảng cần đăng nhập claude.ai và dùng lượt Claude của bạn.

## Dự án

**Đảo Đèn Lồng**: game 3D góc nhìn thứ ba. Mây, người giữ đèn nhỏ tuổi, gom đom đóm để thắp lại các Đèn Lồng Lớn và né Bóng Mực trong sương đen.

- Không ràng buộc công nghệ; chạy được trên macOS hoặc Linux.
- Tuân theo **Test Contract** (chế độ headless) để được chấm tự động và so sánh với nhau.

| Phase | Bạn nhận | Nộp |
|---|---|---|
| 1 | **PRD-0** (mô tả tổng quát) + Test Contract | tag `phase-1` |
| 2 | **Ticket-02**, phát hành khi Phase 1 kết thúc | tag `phase-2` |
| 3 | **Ticket-03**, phát hành khi Phase 2 kết thúc | tag `phase-3` |
| 4 | **Ticket-04**, phát hành khi Phase 3 kết thúc | tag `phase-4` + Release `v1.0.0` |

Yêu cầu sẽ được bổ sung và có thể thay đổi giữa các phase, giống dự án thật.

### Lịch 4 giờ

Bài lab kéo dài **4 giờ**. Phase 1 và 2 khoảng **1 giờ**, Phase 3 khoảng **30 phút**, Phase 4 khoảng **1 giờ 30 phút**. Mỗi phase phát hành đúng mốc giờ. Phase mới xuất hiện trên lab board khi tới mốc.

| Mốc | Sự kiện | Hạn tag |
|---|---|---|
| 0h | Phát hành **Phase 1** (PRD-0), gồm cả phần chuẩn bị | `phase-1` trước mốc 1h |
| 1h | Phát hành **Phase 2** | `phase-2` trước mốc 2h |
| 2h | Phát hành **Phase 3** | `phase-3` trước mốc 2h30 |
| 2h30 | Phát hành **Phase 4** | `phase-4`, Release `v1.0.0` và video trước mốc 4h |
| 4h | Hết giờ lab, chốt bài | |

Hết giờ mỗi phase thì tag và chuyển sang phase tiếp theo, dù phase chưa hoàn hảo. Chỗ chưa xong ghi trung thực trong bằng chứng.

---

## Gợi ý SDLC (cách làm là của bạn)

Mỗi phase là một vòng nhỏ. Công cụ, thứ tự, định dạng tài liệu đều tự do; đây chỉ là gợi ý:

1. **Requirements:** biến yêu cầu thành tiêu chí nghiệm thu kiểm chứng được. Chỗ mơ hồ thì tự giả định và ghi lại.
2. **Plan:** nghĩ cách kiểm chứng **trước** khi để agent viết code.
3. **Build:** để agent viết, bạn điều phối và review.
4. **Verify:** chạy thật, kiểm tra hành vi thật. *Không có bằng chứng thì chưa xong*: "agent bảo chạy rồi" không phải bằng chứng.
5. **Evaluate:** cái gì đạt, AI sai ở đâu, harness (AGENTS.md, skill, hook) cần chỉnh gì.
6. **Release:** gắn tag.

## Ba điều cần nhớ

> Bạn được **tự do sáng tạo thêm** quanh phần lõi (nhân vật, cơ chế nhỏ, câu chuyện, hiệu ứng, âm thanh…). Sáng tạo gọn và không phá yêu cầu được tính điểm trong hạng mục F của [RUBRIC](RUBRIC.md); ghi mục "Sáng tạo của tôi" trong README của bạn.

- **Game tốt là game đúng yêu cầu của khách hàng**, không phải game phức tạp hay đẹp nhất. Làm đúng và chứng minh được là đúng trước, trau chuốt sau.
- **Cân nhắc kỹ quota token của bạn.** Đốt nhiều token không làm bài tốt hơn. Ngữ cảnh gọn, kế hoạch rõ, kiểm chứng sớm thường vừa rẻ vừa đúng hơn chạy agent liên tục.
- **Kiểm chứng là phần quan trọng nhất.** Bằng chứng (test, output headless, ảnh, số đo) đáng giá hơn lời mô tả.

---

## Bàn giao cuối cùng

Một **repo GitHub cá nhân, public**, gồm:

1. **Toàn bộ mã nguồn** của game qua 4 phase, tag `phase-1` … `phase-4`, Release `v1.0.0`.
2. **Video demo `.mp4` dưới 5 phút** (đính kèm Release `v1.0.0` hoặc `docs/demo/demo.mp4`, link ở đầu README): chơi thử và cho thấy bằng chứng game chạy đúng.
3. **Bằng chứng kiểm chứng** của từng phase (định dạng tự chọn).
4. **Harness AI đã dùng** (AGENTS.md / CLAUDE.md, skills, hooks, plugins…), giữ nguyên trong repo và lịch sử git.
5. **Ghi chép ngắn:** spec/giả định mỗi phase, nhật ký dùng AI (gồm token/chi phí ước tính), retro.

Không commit API key, token hay `.env`. Gửi link repo theo hướng dẫn của Coach.

## Đánh giá (100 điểm)

| Hạng mục | Điểm |
|---|---|
| Test tự động ẩn (headless, gồm kiểm tra lại phase trước) | 30 |
| Kiểm chứng & bằng chứng của bạn | 20 |
| Quy trình SDLC & harness AI | 15 |
| Evaluation & retro (gồm cách bạn dùng token) | 10 |
| Hiệu năng & ổn định | 10 |
| Chất lượng sản phẩm (đúng yêu cầu, chơi được) | 10 |
| Video demo | 5 |

## Quy định

- Dùng AI thoải mái; không sao chép repo của người khác.
- Bằng chứng phải thật: test luôn đạt hay output sửa tay là vi phạm.
- Nhân vật, bối cảnh là bản gốc của lab; asset bên ngoài chỉ dùng loại CC0/CC-BY/MIT hoặc tự tạo, ghi nguồn trong `CREDITS.md`.
