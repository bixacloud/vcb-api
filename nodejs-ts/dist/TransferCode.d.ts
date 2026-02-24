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
export interface TransferCodeOptions {
    /** Prefix do admin đặt (≥1 ký tự). Ví dụ: "AB", "NAP", "DH" */
    prefix: string;
    /** Số ký tự random phía sau prefix (mặc định: 5) */
    randomLength?: number;
    /** Bộ ký tự dùng để random (mặc định: A-Z0-9) */
    charset?: string;
}
export interface GeneratedCode {
    /** Mã đầy đủ, ví dụ "ABC5511" */
    code: string;
    /** Prefix phần admin đặt */
    prefix: string;
    /** Phần random */
    random: string;
    /** Thời gian tạo (ISO string) */
    createdAt: string;
}
export interface TransactionMatch {
    /** Mã tìm thấy */
    code: string;
    /** Số tiền giao dịch */
    amount: string;
    /** Mã giao dịch ngân hàng */
    transactionID: string;
    /** Nội dung chuyển khoản gốc */
    description: string;
    /** Giao dịch gốc đầy đủ */
    raw: any;
}
export declare class TransferCode {
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
    static generate(options: TransferCodeOptions): GeneratedCode;
    /**
     * Tạo mã + kèm QR code luôn (combo)
     * Trả về mã + VietQR options sẵn sàng dùng
     */
    static generateWithQR(codeOptions: TransferCodeOptions, qrOptions: {
        bankBin: string;
        accountNumber: string;
        accountName?: string;
        amount?: number;
    }): GeneratedCode & {
        qrDescription: string;
    };
    /**
     * Kiểm tra danh sách giao dịch, tìm giao dịch có nội dung chứa mã
     *
     * @param transactions  Mảng giao dịch từ getHistories (sau khi parse JSON)
     * @param code          Mã cần tìm (ví dụ "ABC5511"). Nếu không truyền → tìm tất cả pending codes
     * @param prefix        Nếu truyền prefix thay vì code cụ thể → tìm tất cả giao dịch bắt đầu bằng prefix
     * @returns Mảng các giao dịch khớp
     */
    static findInTransactions(transactions: any[], options: {
        code?: string;
        prefix?: string;
    }): TransactionMatch[];
    /**
     * Xác nhận mã đã được thanh toán → xóa khỏi pending
     */
    static confirmCode(code: string): boolean;
    /**
     * Lấy danh sách tất cả pending codes
     */
    static getPendingCodes(): GeneratedCode[];
    /**
     * Kiểm tra mã có trong pending không
     */
    static isPending(code: string): boolean;
    /**
     * Xóa tất cả pending codes
     */
    static clearAll(): void;
    /**
     * Lấy số lượng pending codes
     */
    static get pendingCount(): number;
}
//# sourceMappingURL=TransferCode.d.ts.map