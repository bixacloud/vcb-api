/**
 * TransferCode – Tạo & kiểm tra mã nội dung chuyển khoản
 *
 * Flow:
 *   1. Admin đặt prefix (2 ký tự, ví dụ "AB")
 *   2. Hệ thống tự random phần còn lại → "ABC5511", "AB7KX3"...
 *   3. Gửi mã này vào QR code làm nội dung chuyển khoản
 *   4. Khi check LSGD, đối chiếu Description có chứa mã này → xác nhận nạp tiền
 */

const crypto = require('crypto');

const DEFAULT_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const DEFAULT_RANDOM_LENGTH = 5;

// In-memory store cho các mã đã tạo (pending)
// Production nên thay bằng Redis/DB
const pendingCodes = new Map();

class TransferCode {

    /**
     * Tạo mã chuyển khoản mới
     * @param {object} options
     * @param {string} options.prefix       Ký tự đầu do admin đặt (ví dụ "AB")
     * @param {number} [options.randomLength=5] Số ký tự random
     * @param {string} [options.charset]    Bộ ký tự random (mặc định A-Z0-9)
     * @returns {{ code: string, prefix: string, random: string, createdAt: string }}
     */
    static generate(options) {
        const prefix  = options.prefix.toUpperCase();
        const len     = options.randomLength ?? DEFAULT_RANDOM_LENGTH;
        const charset = options.charset ?? DEFAULT_CHARSET;

        let randomPart = '';
        const bytes = crypto.randomBytes(len);
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

        pendingCodes.set(code, generated);
        return generated;
    }

    /**
     * Tạo mã + kèm QR code info
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
     * @param {Array} transactions  Mảng giao dịch từ getHistories
     * @param {object} options
     * @param {string} [options.code]    Mã cụ thể cần tìm
     * @param {string} [options.prefix]  Tìm tất cả giao dịch bắt đầu bằng prefix
     * @returns {Array<{ code, amount, transactionID, description, raw }>}
     */
    static findInTransactions(transactions, options) {
        if (!Array.isArray(transactions)) return [];

        const matches = [];

        for (const tx of transactions) {
            const desc = (tx.Description || tx.escription || tx.description || '').toUpperCase();
            if (!desc) continue;

            if (options.code) {
                const searchCode = options.code.toUpperCase();
                if (desc.includes(searchCode)) {
                    matches.push({
                        code:          searchCode,
                        amount:        tx.Amount || tx.amount || '',
                        transactionID: tx.Reference || tx.transactionID || '',
                        description:   tx.Description || tx.escription || tx.description || '',
                        raw:           tx,
                    });
                }
                continue;
            }

            if (options.prefix) {
                const searchPrefix = options.prefix.toUpperCase();
                const regex = new RegExp(`(${escapeRegex(searchPrefix)}[A-Z0-9]{2,10})`, 'g');
                const found = desc.match(regex);
                if (found) {
                    for (const code of found) {
                        matches.push({
                            code,
                            amount:        tx.Amount || tx.amount || '',
                            transactionID: tx.Reference || tx.transactionID || '',
                            description:   tx.Description || tx.escription || tx.description || '',
                            raw:           tx,
                        });
                    }
                }
                continue;
            }

            // Tìm tất cả pending codes
            for (const [pendingCode] of pendingCodes) {
                if (desc.includes(pendingCode)) {
                    matches.push({
                        code:          pendingCode,
                        amount:        tx.Amount || tx.amount || '',
                        transactionID: tx.Reference || tx.transactionID || '',
                        description:   tx.Description || tx.escription || tx.description || '',
                        raw:           tx,
                    });
                }
            }
        }

        return matches;
    }

    /** Xác nhận mã đã thanh toán → xóa khỏi pending */
    static confirmCode(code) {
        return pendingCodes.delete(code.toUpperCase());
    }

    /** Lấy danh sách pending codes */
    static getPendingCodes() {
        return Array.from(pendingCodes.values());
    }

    /** Kiểm tra mã có pending không */
    static isPending(code) {
        return pendingCodes.has(code.toUpperCase());
    }

    /** Xóa tất cả pending */
    static clearAll() {
        pendingCodes.clear();
    }

    /** Số lượng pending */
    static get pendingCount() {
        return pendingCodes.size;
    }
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { TransferCode };
