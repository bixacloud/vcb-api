/**
 * VietQR Generator – Tạo QR code chuyển khoản theo chuẩn VietQR / NAPAS
 *
 * Chuẩn: EMVCo QR Code (VietQR - NAPAS)
 * Spec:  https://vietqr.net
 *
 * QR Data format:
 *   Chuỗi EMV gồm các TLV (Tag-Length-Value):
 *   - 00: Payload Format Indicator ("01")
 *   - 01: Point of Initiation ("12" = dynamic)
 *   - 38: Merchant Account Info → chứa BIN ngân hàng + số TK
 *   - 52: Merchant Category Code ("0000")
 *   - 53: Transaction Currency ("704" = VND)
 *   - 54: Transaction Amount
 *   - 58: Country Code ("VN")
 *   - 62: Additional Data → chứa nội dung chuyển khoản
 *   - 63: CRC16 checksum
 */
export declare const BANK_BINS: Record<string, {
    bin: string;
    name: string;
}>;
export interface VietQROptions {
    /** BIN ngân hàng (6 số) hoặc mã viết tắt (VCB, TCB, MB...) */
    bankBin: string;
    /** Số tài khoản người nhận */
    accountNumber: string;
    /** Tên người nhận (không dấu, in hoa) — optional */
    accountName?: string;
    /** Số tiền (VND) — optional, nếu không truyền → user tự nhập */
    amount?: number;
    /** Nội dung chuyển khoản — optional */
    description?: string;
}
export declare class VietQRGenerator {
    /**
     * Tạo chuỗi EMV QR theo chuẩn VietQR
     */
    static buildEMVString(options: VietQROptions): string;
    /**
     * Tạo QR code dạng Data URL (base64 PNG)
     */
    static toDataURL(options: VietQROptions): Promise<string>;
    /**
     * Tạo QR code dạng Buffer (PNG)
     */
    static toBuffer(options: VietQROptions): Promise<Buffer>;
    /**
     * Tạo QR code dạng SVG string
     */
    static toSVG(options: VietQROptions): Promise<string>;
    /**
     * Dùng VietQR.net API (nhanh, đẹp, có logo ngân hàng)
     * Trả về URL ảnh — không cần generate local
     */
    static getVietQRUrl(options: VietQROptions & {
        template?: 'compact' | 'compact2' | 'qr_only' | 'print';
    }): string;
}
//# sourceMappingURL=VietQR.d.ts.map