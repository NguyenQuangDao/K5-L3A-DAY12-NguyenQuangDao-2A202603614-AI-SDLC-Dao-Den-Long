---
name: verify-game
description: Run the complete Đảo Đèn Lồng verification gate before claiming any gameplay, contract, or UI task is complete.
---

# Verify Game Skill

## Khi nào sử dụng
- Trước khi kết thúc bất kỳ thay đổi nào liên quan đến `src/game-engine.js`, `src/headless-cli.js`, `src/main.js`, `game.contract.json`, hoặc `docs/proof/`.
- Trước khi tạo commit, gắn tag `phase-N`, hoặc phát hành Release `v1.0.0`.

## Quy trình bắt buộc (không được bỏ qua bước nào)
1. Chạy cổng kiểm chứng một lệnh:
   ```bash
   npm run verify
   ```
   Lệnh này kiểm tra cú pháp (`node --check`), toàn bộ Vitest (`npm test`), bản build Vite (`npm run build`), tính tất định theo từng byte, các scenario Phase 2–3, mã thoát 2 với scenario lỗi, và soak test 10 đêm.
2. Nếu thay đổi liên quan đến đồ họa/hiệu năng, chạy thêm benchmark render 1280×720 thật:
   ```bash
   npm run bench -- --seed 42 --duration 30 --out bench.json
   ```
3. Nếu thay đổi liên quan đến giao diện (HUD, Hỗ trợ tiếp cận, Bảng xếp hạng), chạy smoke test trình duyệt và cập nhật ảnh/bằng chứng thật trong `docs/proof/`:
   ```bash
   node scripts/verify-ui-proof.mjs
   ```
4. **Cấm kết thúc khi test đỏ:** Nếu bất kỳ bước nào trả về mã thoát khác 0, phải sửa lỗi tận gốc và chạy lại từ bước 1. Tuyệt đối không sửa tay file `.jsonl`/`.json` đầu ra để làm test đạt.

