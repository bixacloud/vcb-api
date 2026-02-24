"use strict";
/**
 * TransferCode – Tạo & kiểm tra mã nội dung chuyển khoản
 *
 * Flow:
 *   1. Admin đặt prefix (2 ký tự, ví dụ "AB")
 *   2. Hệ thống tự random phần còn lại → "ABC5511", "AB7KX3"...
 *   3. Gửi mã này vào QR code làm nội dung chuyển khoản
 *   4. Khi check LSGD, đối chiếu Description có chứa mã này → xác nhận nạp tiền
 *
 * Cấu hình:
 *   - prefix:       2+ ký tự đầu (admin đặt)
 *   - randomLength: số ký tự random phía sau (mặc định 5)
 *   - charset:      bộ ký tự random (mặc định chữ IN HOA + số)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransferCode = void 0;
const crypto_1 = __importDefault(require("crypto"));
// ── Default config ──────────────────────────────────────────────────
const DEFAULT_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const DEFAULT_RANDOM_LENGTH = 5;
// ── In-memory store cho các mã đã tạo (pending) ────────────────────
// Production nên thay bằng Redis/DB
const pendingCodes = new Map();
// ── TransferCode class ──────────────────────────────────────────────
class TransferCode {
    /**
     * Tạo mã chuyển khoản mới
     *
     * @param options.prefix      Ký tự đầu do admin đặt (ví dụ "AB")
     * @param options.randomLength Số ký tự random (mặc định 5)
     * @param options.charset     Bộ ký tự random (mặc định A-Z0-9)
     * @returns GeneratedCode
     *
     * @example
     *   TransferCode.generate({ prefix: 'AB' })
     *   // → { code: 'ABX7K29', prefix: 'AB', random: 'X7K29', createdAt: '...' }
     *
     *   TransferCode.generate({ prefix: 'NAP', randomLength: 4 })
     *   // → { code: 'NAP8B2F', prefix: 'NAP', random: '8B2F', createdAt: '...' }
     */
    static generate(options) {
        const prefix = options.prefix.toUpperCase();
        const len = options.randomLength ?? DEFAULT_RANDOM_LENGTH;
        const charset = options.charset ?? DEFAULT_CHARSET;
        let randomPart = '';
        // Dùng crypto.randomBytes cho secure random
        const bytes = crypto_1.default.randomBytes(len);
        for (let i = 0; i < len; i++) {
            randomPart += charset[bytes[i] % charset.length];
        }
        const code = prefix + randomPart;
        const generated = {
            code,
            prefix,
            random: randomPart,
            createdAt: new Date().toISOString(),
        };
        // Lưu vào pending store
        pendingCodes.set(code, generated);
        return generated;
    }
    /**
     * Tạo mã + kèm QR code luôn (combo)
     * Trả về mã + VietQR options sẵn sàng dùng
     */
    static generateWithQR(codeOptions, qrOptions) {
        const generated = this.generate(codeOptions);
        return {
            ...generated,
            qrDescription: generated.code,
        };
    }
    /**
     * Kiểm tra danh sách giao dịch, tìm giao dịch có nội dung chứa mã
     *
     * @param transactions  Mảng giao dịch từ getHistories (sau khi parse JSON)
     * @param code          Mã cần tìm (ví dụ "ABC5511"). Nếu không truyền → tìm tất cả pending codes
     * @param prefix        Nếu truyền prefix thay vì code cụ thể → tìm tất cả giao dịch bắt đầu bằng prefix
     * @returns Mảng các giao dịch khớp
     */
    static findInTransactions(transactions, options) {
        if (!Array.isArray(transactions))
            return [];
        const matches = [];
        for (const tx of transactions) {
            // Nội dung chuyển khoản (key có thể là Description hoặc escription)
            const desc = (tx.Description || tx.escription || tx.description || '').toUpperCase();
            if (!desc)
                continue;
            // Tìm theo code cụ thể
            if (options.code) {
                const searchCode = options.code.toUpperCase();
                if (desc.includes(searchCode)) {
                    matches.push({
                        code: searchCode,
                        amount: tx.Amount || tx.amount || '',
                        transactionID: tx.Reference || tx.transactionID || '',
                        description: tx.Description || tx.escription || tx.description || '',
                        raw: tx,
                    });
                }
                continue;
            }
            // Tìm theo prefix
            if (options.prefix) {
                const searchPrefix = options.prefix.toUpperCase();
                // Tìm pattern: prefix + ký tự alphanumeric
                const regex = new RegExp(`(${escapeRegex(searchPrefix)}[A-Z0-9]{2,10})`, 'g');
                const found = desc.match(regex);
                if (found) {
                    for (const code of found) {
                        matches.push({
                            code,
                            amount: tx.Amount || tx.amount || '',
                            transactionID: tx.Reference || tx.transactionID || '',
                            description: tx.Description || tx.escription || tx.description || '',
                            raw: tx,
                        });
                    }
                }
                continue;
            }
            // Không truyền code lẫn prefix → tìm tất cả pending codes
            for (const [pendingCode] of pendingCodes) {
                if (desc.includes(pendingCode)) {
                    matches.push({
                        code: pendingCode,
                        amount: tx.Amount || tx.amount || '',
                        transactionID: tx.Reference || tx.transactionID || '',
                        description: tx.Description || tx.escription || tx.description || '',
                        raw: tx,
                    });
                }
            }
        }
        return matches;
    }
    /**
     * Xác nhận mã đã được thanh toán → xóa khỏi pending
     */
    static confirmCode(code) {
        return pendingCodes.delete(code.toUpperCase());
    }
    /**
     * Lấy danh sách tất cả pending codes
     */
    static getPendingCodes() {
        return Array.from(pendingCodes.values());
    }
    /**
     * Kiểm tra mã có trong pending không
     */
    static isPending(code) {
        return pendingCodes.has(code.toUpperCase());
    }
    /**
     * Xóa tất cả pending codes
     */
    static clearAll() {
        pendingCodes.clear();
    }
    /**
     * Lấy số lượng pending codes
     */
    static get pendingCount() {
        return pendingCodes.size;
    }
}
exports.TransferCode = TransferCode;
// ── Helpers ──────────────────────────────────────────────────────────
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
//# sourceMappingURL=TransferCode.js.map