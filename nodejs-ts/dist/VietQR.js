"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VietQRGenerator = exports.BANK_BINS = void 0;
const qrcode_1 = __importDefault(require("qrcode"));
// ── BIN code (NAPAS) cho các ngân hàng phổ biến ──────────────────────
exports.BANK_BINS = {
    VCB: { bin: '970436', name: 'Vietcombank' },
    TCB: { bin: '970407', name: 'Techcombank' },
    MB: { bin: '970422', name: 'MBBank' },
    ACB: { bin: '970416', name: 'ACB' },
    VPB: { bin: '970432', name: 'VPBank' },
    TPB: { bin: '970423', name: 'TPBank' },
    STB: { bin: '970403', name: 'Sacombank' },
    BIDV: { bin: '970418', name: 'BIDV' },
    VTB: { bin: '970415', name: 'Vietinbank' },
    AGR: { bin: '970405', name: 'Agribank' },
    SHB: { bin: '970443', name: 'SHB' },
    MSB: { bin: '970426', name: 'MSB' },
    OCB: { bin: '970448', name: 'OCB' },
    HDBank: { bin: '970437', name: 'HDBank' },
    EIB: { bin: '970431', name: 'Eximbank' },
    LPB: { bin: '970449', name: 'LienVietPostBank' },
    CAKE: { bin: '546034', name: 'CAKE by VPBank' },
    Ubank: { bin: '546035', name: 'Ubank by VPBank' },
    TIMO: { bin: '963388', name: 'Timo' },
};
class VietQRGenerator {
    /**
     * Tạo chuỗi EMV QR theo chuẩn VietQR
     */
    static buildEMVString(options) {
        // Resolve bank BIN
        let bin = options.bankBin;
        if (exports.BANK_BINS[bin.toUpperCase()]) {
            bin = exports.BANK_BINS[bin.toUpperCase()].bin;
        }
        const parts = [];
        // 00 - Payload Format Indicator
        parts.push(tlv('00', '01'));
        // 01 - Point of Initiation Method (12 = dynamic QR)
        parts.push(tlv('01', '12'));
        // 38 - Merchant Account Information (VietQR)
        const guid = '0010A000000727'; // NAPAS application ID
        const bankInfo = tlv('01', bin + '0208QRIBFTTA'); // BIN + service code
        const accountInfo = tlv('01', bin) +
            tlv('02', options.accountNumber);
        // VietQR format: guid + 01(bankBin) + 02(accountNo)
        const merchantAcct = tlv('00', 'A000000727') + // NAPAS GUID
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
    static async toDataURL(options) {
        const emv = this.buildEMVString(options);
        return qrcode_1.default.toDataURL(emv, { width: 300, margin: 2 });
    }
    /**
     * Tạo QR code dạng Buffer (PNG)
     */
    static async toBuffer(options) {
        const emv = this.buildEMVString(options);
        return qrcode_1.default.toBuffer(emv, { width: 300, margin: 2 });
    }
    /**
     * Tạo QR code dạng SVG string
     */
    static async toSVG(options) {
        const emv = this.buildEMVString(options);
        return qrcode_1.default.toString(emv, { type: 'svg', width: 300, margin: 2 });
    }
    /**
     * Dùng VietQR.net API (nhanh, đẹp, có logo ngân hàng)
     * Trả về URL ảnh — không cần generate local
     */
    static getVietQRUrl(options) {
        let bin = options.bankBin;
        if (exports.BANK_BINS[bin.toUpperCase()]) {
            bin = exports.BANK_BINS[bin.toUpperCase()].bin;
        }
        const template = options.template || 'compact2';
        const amount = options.amount || 0;
        const desc = encodeURIComponent(options.description || '');
        const name = encodeURIComponent(options.accountName || '');
        return `https://img.vietqr.io/image/${bin}-${options.accountNumber}-${template}.png?amount=${amount}&addInfo=${desc}&accountName=${name}`;
    }
}
exports.VietQRGenerator = VietQRGenerator;
// ── Helpers ──────────────────────────────────────────────────────────
/** Tạo TLV (Tag-Length-Value) theo EMVCo */
function tlv(tag, value) {
    const len = value.length.toString().padStart(2, '0');
    return tag + len + value;
}
/** CRC16-CCITT (polynomial 0x1021) */
function crc16CCITT(str) {
    let crc = 0xFFFF;
    for (let i = 0; i < str.length; i++) {
        crc ^= str.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            if (crc & 0x8000) {
                crc = (crc << 1) ^ 0x1021;
            }
            else {
                crc <<= 1;
            }
            crc &= 0xFFFF;
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
}
//# sourceMappingURL=VietQR.js.map