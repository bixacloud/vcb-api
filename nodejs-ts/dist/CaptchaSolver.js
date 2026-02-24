"use strict";
/**
 * CaptchaSolver – Giải captcha VCB bằng Tesseract.js (OCR local)
 *
 * Pipeline: base64 → sharp preprocess → tesseract OCR → clean result
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CaptchaSolver = void 0;
const tesseract_js_1 = __importDefault(require("tesseract.js"));
const sharp_1 = __importDefault(require("sharp"));
class CaptchaSolver {
    constructor() {
        this.worker = null;
    }
    /** Khởi tạo Tesseract worker (chỉ làm 1 lần, reuse) */
    async getWorker() {
        if (!this.worker) {
            this.worker = await tesseract_js_1.default.createWorker('eng', 1, {
            // logger: (m) => console.log('[Tesseract]', m.status, Math.round((m.progress || 0) * 100) + '%'),
            });
            await this.worker.setParameters({
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
                tessedit_pageseg_mode: tesseract_js_1.default.PSM.SINGLE_LINE,
            });
        }
        return this.worker;
    }
    /**
     * Tiền xử lý ảnh captcha:
     *  1. Grayscale → 2. Resize 2x → 3. Normalize → 4. Threshold → 5. Sharpen
     */
    async preprocessImage(base64Image) {
        const inputBuf = Buffer.from(base64Image, 'base64');
        return (0, sharp_1.default)(inputBuf)
            .grayscale()
            .resize({ width: 400, kernel: 'lanczos3' })
            .normalize()
            .threshold(140)
            .sharpen()
            .png()
            .toBuffer();
    }
    /** Làm sạch text OCR — chỉ giữ alphanumeric */
    cleanText(text) {
        return text.replace(/[^A-Za-z0-9]/g, '').trim();
    }
    /** Giải captcha từ ảnh base64 */
    async solve(base64Image) {
        try {
            const processedBuf = await this.preprocessImage(base64Image);
            const worker = await this.getWorker();
            const { data } = await worker.recognize(processedBuf);
            const captcha = this.cleanText(data.text);
            if (captcha.length >= 4 && captcha.length <= 8) {
                return { status: 'success', captcha };
            }
            // Retry với threshold + negate khác
            const retryBuf = await (0, sharp_1.default)(Buffer.from(base64Image, 'base64'))
                .grayscale()
                .resize({ width: 500, kernel: 'lanczos3' })
                .normalize()
                .threshold(160)
                .negate()
                .sharpen()
                .png()
                .toBuffer();
            const { data: retryData } = await worker.recognize(retryBuf);
            const retryCaptcha = this.cleanText(retryData.text);
            if (retryCaptcha.length >= 4 && retryCaptcha.length <= 8) {
                return { status: 'success', captcha: retryCaptcha };
            }
            return { status: 'fail', captcha: captcha || retryCaptcha, raw: data.text };
        }
        catch (err) {
            console.error('[CaptchaSolver Error]', err.message);
            return { status: 'fail', captcha: '', error: err.message };
        }
    }
    /** Dọn dẹp worker */
    async terminate() {
        if (this.worker) {
            await this.worker.terminate();
            this.worker = null;
        }
    }
}
exports.CaptchaSolver = CaptchaSolver;
//# sourceMappingURL=CaptchaSolver.js.map