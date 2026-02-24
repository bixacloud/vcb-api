/**
 * VietCombank DigiBank API – TypeScript Express Server
 *
 * Endpoints (query param ?type=):
 *   1  → Login
 *   2  → Submit OTP  (?otp=...)
 *   3  → Lấy lịch sử giao dịch (tự re-login nếu hết phiên)
 *   4  → Danh sách tài khoản
 *   5  → Chi tiết tài khoản
 *   6  → Danh sách ngân hàng
 *   7  → Danh sách DD Account
 *   8  → Tạo QR code chuyển khoản (VietQR)
 *   9  → Lấy URL ảnh QR từ VietQR.io
 *   10 → Tạo mã chuyển khoản + QR (admin đặt prefix, hệ thống random)
 *   11 → Check giao dịch theo mã chuyển khoản
 */
declare const app: import("express-serve-static-core").Express;
export default app;
//# sourceMappingURL=server.d.ts.map