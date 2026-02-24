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

import QRCode from 'qrcode';

// ── BIN code (NAPAS) cho các ngân hàng phổ biến ──────────────────────
export const BANK_BINS: Record<string, { bin: string; name: string }> = {
    VCB:       { bin: '970436', name: 'Vietcombank' },
    TCB:       { bin: '970407', name: 'Techcombank' },
    MB:        { bin: '970422', name: 'MBBank' },
    ACB:       { bin: '970416', name: 'ACB' },
    VPB:       { bin: '970432', name: 'VPBank' },
    TPB:       { bin: '970423', name: 'TPBank' },
    STB:       { bin: '970403', name: 'Sacombank' },
    BIDV:      { bin: '970418', name: 'BIDV' },
    VTB:       { bin: '970415', name: 'Vietinbank' },
    AGR:       { bin: '970405', name: 'Agribank' },
    SHB:       { bin: '970443', name: 'SHB' },
    MSB:       { bin: '970426', name: 'MSB' },
    OCB:       { bin: '970448', name: 'OCB' },
    HDBank:    { bin: '970437', name: 'HDBank' },
    EIB:       { bin: '970431', name: 'Eximbank' },
    LPB:       { bin: '970449', name: 'LienVietPostBank' },
    CAKE:      { bin: '546034', name: 'CAKE by VPBank' },
    Ubank:     { bin: '546035', name: 'Ubank by VPBank' },
    TIMO:      { bin: '963388', name: 'Timo' },
};

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

export class VietQRGenerator {
    /**
     * Tạo chuỗi EMV QR theo chuẩn VietQR
     */
    static buildEMVString(options: VietQROptions): string {
        // Resolve bank BIN
        let bin = options.bankBin;
        if (BANK_BINS[bin.toUpperCase()]) {
            bin = BANK_BINS[bin.toUpperCase()].bin;
        }

        const parts: string[] = [];

        // 00 - Payload Format Indicator
        parts.push(tlv('00', '01'));

        // 01 - Point of Initiation Method (12 = dynamic QR)
        parts.push(tlv('01', '12'));

        // 38 - Merchant Account Information (VietQR)
        const guid = '0010A000000727';  // NAPAS application ID
        const bankInfo = tlv('01', bin + '0208QRIBFTTA'); // BIN + service code
        const accountInfo = tlv('01', bin) +
                            tlv('02', options.accountNumber);
        // VietQR format: guid + 01(bankBin) + 02(accountNo)
        const merchantAcct = 
            tlv('00', 'A000000727') +  // NAPAS GUID
            tlv('01', bin) +
            tlv('02', options.accountNumber);
        parts.push(tlv('38', merchantAcct));

        // 52 - Merchant Category Code
        parts.push(tlv('52', '0000'));

        // 53 - Transaction Currency (704 = VND)
        parts.push(tlv('53', '704'));

        // 54 - Transaction Amount (optional)
        if (options.amount && options.amount > 0) {
            parts.push(tlv('54', options.amount.toString()));
        }

        // 58 - Country Code
        parts.push(tlv('58', 'VN'));

        // 59 - Merchant Name (optional)
        if (options.accountName) {
            parts.push(tlv('59', options.accountName.slice(0, 25)));
        }

        // 60 - Merchant City
        parts.push(tlv('60', 'HANOI'));

        // 62 - Additional Data
        if (options.description) {
            const addData = tlv('08', options.description.slice(0, 50));
            parts.push(tlv('62', addData));
        }

        // Build without CRC
        const payload = parts.join('') + '6304';

        // 63 - CRC16-CCITT
        const crc = crc16CCITT(payload);
        return payload + crc;
    }

    /**
     * Tạo QR code dạng Data URL (base64 PNG)
     */
    static async toDataURL(options: VietQROptions): Promise<string> {
        const emv = this.buildEMVString(options);
        return QRCode.toDataURL(emv, { width: 300, margin: 2 });
    }

    /**
     * Tạo QR code dạng Buffer (PNG)
     */
    static async toBuffer(options: VietQROptions): Promise<Buffer> {
        const emv = this.buildEMVString(options);
        return QRCode.toBuffer(emv, { width: 300, margin: 2 });
    }

    /**
     * Tạo QR code dạng SVG string
     */
    static async toSVG(options: VietQROptions): Promise<string> {
        const emv = this.buildEMVString(options);
        return QRCode.toString(emv, { type: 'svg', width: 300, margin: 2 });
    }

    /**
     * Dùng VietQR.net API (nhanh, đẹp, có logo ngân hàng)
     * Trả về URL ảnh — không cần generate local
     */
    static getVietQRUrl(options: VietQROptions & { template?: 'compact' | 'compact2' | 'qr_only' | 'print' }): string {
        let bin = options.bankBin;
        if (BANK_BINS[bin.toUpperCase()]) {
            bin = BANK_BINS[bin.toUpperCase()].bin;
        }
        const template = options.template || 'compact2';
        const amount = options.amount || 0;
        const desc = encodeURIComponent(options.description || '');
        const name = encodeURIComponent(options.accountName || '');

        return `https://img.vietqr.io/image/${bin}-${options.accountNumber}-${template}.png?amount=${amount}&addInfo=${desc}&accountName=${name}`;
    }
}

// ── Helpers ──────────────────────────────────────────────────────────

/** Tạo TLV (Tag-Length-Value) theo EMVCo */
function tlv(tag: string, value: string): string {
    const len = value.length.toString().padStart(2, '0');
    return tag + len + value;
}

/** CRC16-CCITT (polynomial 0x1021) */
function crc16CCITT(str: string): string {
    let crc = 0xFFFF;
    for (let i = 0; i < str.length; i++) {
        crc ^= str.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            if (crc & 0x8000) {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc <<= 1;
            }
            crc &= 0xFFFF;
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
}
