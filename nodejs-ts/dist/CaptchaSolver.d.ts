/**
 * CaptchaSolver – Giải captcha VCB bằng Tesseract.js (OCR local)
 *
 * Pipeline: base64 → sharp preprocess → tesseract OCR → clean result
 */
import { Worker } from 'tesseract.js';
import { CaptchaSolveResult } from './types';
export declare class CaptchaSolver {
    private worker;
    /** Khởi tạo Tesseract worker (chỉ làm 1 lần, reuse) */
    getWorker(): Promise<Worker>;
    /**
     * Tiền xử lý ảnh captcha:
     *  1. Grayscale → 2. Resize 2x → 3. Normalize → 4. Threshold → 5. Sharpen
     */
    preprocessImage(base64Image: string): Promise<Buffer>;
    /** Làm sạch text OCR — chỉ giữ alphanumeric */
    cleanText(text: string): string;
    /** Giải captcha từ ảnh base64 */
    solve(base64Image: string): Promise<CaptchaSolveResult>;
    /** Dọn dẹp worker */
    terminate(): Promise<void>;
}
//# sourceMappingURL=CaptchaSolver.d.ts.map