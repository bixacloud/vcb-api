/**
 * CaptchaSolver – Giải captcha VCB bằng Tesseract.js (OCR local)
 *
 * Pipeline: base64 → sharp preprocess → tesseract OCR → clean result
 */

import Tesseract, { Worker } from 'tesseract.js';
import sharp from 'sharp';
import { CaptchaSolveResult } from './types';

export class CaptchaSolver {
    private worker: Worker | null = null;

    /** Khởi tạo Tesseract worker (chỉ làm 1 lần, reuse) */
    async getWorker(): Promise<Worker> {
        if (!this.worker) {
            this.worker = await Tesseract.createWorker('eng', 1, {
                // logger: (m) => console.log('[Tesseract]', m.status, Math.round((m.progress || 0) * 100) + '%'),
            });
            await this.worker.setParameters({
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
                tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE,
            });
        }
        return this.worker;
    }

    /**
     * Tiền xử lý ảnh captcha:
     *  1. Grayscale → 2. Resize 2x → 3. Normalize → 4. Threshold → 5. Sharpen
     */
    async preprocessImage(base64Image: string): Promise<Buffer> {
        const inputBuf = Buffer.from(base64Image, 'base64');

        return sharp(inputBuf)
            .grayscale()
            .resize({ width: 400, kernel: 'lanczos3' })
            .normalize()
            .threshold(140)
            .sharpen()
            .png()
            .toBuffer();
    }

    /** Làm sạch text OCR — chỉ giữ alphanumeric */
    cleanText(text: string): string {
        return text.replace(/[^A-Za-z0-9]/g, '').trim();
    }

    /** Giải captcha từ ảnh base64 */
    async solve(base64Image: string): Promise<CaptchaSolveResult> {
        try {
            const processedBuf = await this.preprocessImage(base64Image);
            const worker = await this.getWorker();
            const { data } = await worker.recognize(processedBuf);
            const captcha = this.cleanText(data.text);

            if (captcha.length >= 4 && captcha.length <= 8) {
                return { status: 'success', captcha };
            }

            // Retry với threshold + negate khác
            const retryBuf = await sharp(Buffer.from(base64Image, 'base64'))
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
        } catch (err: any) {
            console.error('[CaptchaSolver Error]', err.message);
            return { status: 'fail', captcha: '', error: err.message };
        }
    }

    /** Dọn dẹp worker */
    async terminate(): Promise<void> {
        if (this.worker) {
            await this.worker.terminate();
            this.worker = null;
        }
    }
}
