/**
 * CaptchaSolver – Giải captcha VCB bằng Tesseract.js (OCR local)
 *
 * Captcha VCB thường là 5-6 ký tự (chữ + số), nền nhiễu.
 * Pipeline: base64 → sharp preprocess → tesseract OCR → clean result
 */

const Tesseract = require('tesseract.js');
const sharp     = require('sharp');

class CaptchaSolver {
    constructor() {
        this.worker = null;
    }

    /** Khởi tạo Tesseract worker (chỉ làm 1 lần, reuse) */
    async getWorker() {
        if (!this.worker) {
            this.worker = await Tesseract.createWorker('eng', 1, {
                // logger: m => console.log('[Tesseract]', m.status, Math.round((m.progress || 0) * 100) + '%'),
            });
            await this.worker.setParameters({
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
                tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE,
            });
        }
        return this.worker;
    }

    /**
     * Tiền xử lý ảnh captcha để tăng độ chính xác OCR:
     *  1. Chuyển grayscale
     *  2. Resize lớn hơn (2x) cho rõ ký tự
     *  3. Tăng contrast (normalize)
     *  4. Threshold → binary (đen trắng)
     *  5. Sharpen nhẹ
     */
    async preprocessImage(base64Image) {
        const inputBuf = Buffer.from(base64Image, 'base64');

        const processed = await sharp(inputBuf)
            .grayscale()
            .resize({ width: 400, kernel: 'lanczos3' })  // phóng to
            .normalize()                                   // auto contrast
            .threshold(140)                                // binary
            .sharpen()
            .png()
            .toBuffer();

        return processed;
    }

    /**
     * Làm sạch text OCR:
     *  - Bỏ khoảng trắng, ký tự đặc biệt
     *  - Chỉ giữ alphanumeric
     */
    cleanText(text) {
        return text.replace(/[^A-Za-z0-9]/g, '').trim();
    }

    /**
     * Giải captcha từ ảnh base64
     * @param {string} base64Image - ảnh captcha dạng base64
     * @returns {Promise<{status: string, captcha: string}>}
     */
    async solve(base64Image) {
        try {
            const processedBuf = await this.preprocessImage(base64Image);
            const worker = await this.getWorker();
            const { data } = await worker.recognize(processedBuf);
            const captcha = this.cleanText(data.text);

            if (captcha.length >= 4 && captcha.length <= 8) {
                return { status: 'success', captcha };
            }

            // Nếu kết quả không hợp lệ (quá ngắn/dài), thử lại với threshold khác
            const retryBuf = await sharp(Buffer.from(base64Image, 'base64'))
                .grayscale()
                .resize({ width: 500, kernel: 'lanczos3' })
                .normalize()
                .threshold(160)
                .negate()  // đảo màu
                .sharpen()
                .png()
                .toBuffer();

            const { data: retryData } = await worker.recognize(retryBuf);
            const retryCaptcha = this.cleanText(retryData.text);

            if (retryCaptcha.length >= 4 && retryCaptcha.length <= 8) {
                return { status: 'success', captcha: retryCaptcha };
            }

            return { status: 'fail', captcha: captcha || retryCaptcha, raw: data.text };
        } catch (err) {
            console.error('[CaptchaSolver Error]', err.message);
            return { status: 'fail', captcha: '', error: err.message };
        }
    }

    /** Dọn dẹp worker khi không cần nữa */
    async terminate() {
        if (this.worker) {
            await this.worker.terminate();
            this.worker = null;
        }
    }
}

module.exports = CaptchaSolver;
