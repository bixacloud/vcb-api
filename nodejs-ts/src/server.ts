/**
 * VietCombank DigiBank API – TypeScript Express Server
 *
 * Endpoints (query param ?type=):
 *   1  → Login
 *   2  → Submit OTP  (?otp=...)
 *   3  → Lấy lịch sử giao dịch (tự re-login nếu hết phiên)
 *   4  → Danh sách tài khoản
 *   5  → Chi tiết tài khoản
 *   6  → Danh sách ngân hàng
 *   7  → Danh sách DD Account
 *   8  → Tạo QR code chuyển khoản (VietQR)
 *   9  → Lấy URL ảnh QR từ VietQR.io
 *   10 → Tạo mã chuyển khoản + QR (admin đặt prefix, hệ thống random)
 *   11 → Check giao dịch theo mã chuyển khoản
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import { VietCombank } from './VietCombank';
import { VietQRGenerator, BANK_BINS } from './VietQR';
import { TransferCode } from './TransferCode';

const app  = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// ── CORS ──────────────────────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ── CẤU HÌNH TÀI KHOẢN ──────────────────────────────────────────────
const TK  = process.env.VCB_USERNAME || '';
const MK  = process.env.VCB_PASSWORD || '';
const STK = process.env.VCB_ACCOUNT  || '';

// ── Singleton VCB instance ───────────────────────────────────────────
let vcb: VietCombank | null = null;
function getVcb(): VietCombank {
    if (!vcb) {
        vcb = new VietCombank(TK, MK, STK);
    }
    return vcb;
}

// ── Helpers ──────────────────────────────────────────────────────────
function todayStr(): string {
    const now  = new Date();
    const dd   = String(now.getDate()).padStart(2, '0');
    const mm   = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

// ── API ROUTES ───────────────────────────────────────────────────────
app.get('/', async (req: Request, res: Response): Promise<any> => {
    const type = Math.abs(parseInt(req.query.type as string, 10) || 0);
    const bank = getVcb();

    try {
        // ── type=1 : Login ────────────────────────────────────────────
        if (type === 1) {
            const result = await bank.doLogin(TK, MK);
            return res.json(result);
        }

        // ── type=2 : Nhập OTP ─────────────────────────────────────────
        if (type === 2) {
            const otp = ((req.query.otp as string) || '').replace(/[^0-9]/g, '');
            const result = await bank.submitOtpLogin(otp);
            return res.json(result);
        }

        // ── type=3 : Lịch sử giao dịch (tự động login) ──────────────
        if (type === 3) {
            const fromDate = (req.query.date as string) || todayStr();

            // Tự động đăng nhập trước khi check giao dịch
            await bank.doLogin(TK, MK);

            let result = await bank.getHistories(fromDate, STK, 0);
            let jsonStr = JSON.stringify(result);

            // Nếu vẫn lỗi phiên → thử login lại tối đa 2 lần
            const reloginPhrases = [
                'đang được truy cập trên thiết bị',
                'đăng nhập đã hết hiệu lực',
            ];
            let retries = 0;
            while (retries < 2 && reloginPhrases.some(p => jsonStr.includes(p))) {
                await bank.doLogin(TK, MK);
                result  = await bank.getHistories(fromDate, STK, 0);
                jsonStr = JSON.stringify(result);
                retries++;
            }

            // Chuẩn hóa key names cho đồng nhất
            jsonStr = jsonStr
                .replace(/Amount/g,      'amount')
                .replace(/Reference/g,   'transactionID')
                .replace(/Description/g, 'escription');

            return res.type('json').send(jsonStr);
        }

        // ── type=4 : Danh sách tài khoản ─────────────────────────────
        if (type === 4) {
            const result = await bank.getListAccount();
            return res.json(result);
        }

        // ── type=5 : Chi tiết tài khoản ──────────────────────────────
        if (type === 5) {
            const result = await bank.getAccountDetail();
            return res.json(result);
        }

        // ── type=6 : Danh sách ngân hàng ─────────────────────────────
        if (type === 6) {
            const result = await bank.getBanks();
            return res.json(result);
        }

        // ── type=7 : DD Account ──────────────────────────────────────
        if (type === 7) {
            const result = await bank.getListDDAccount();
            return res.json(result);
        }

        // ── type=8 : Tạo VietQR (trả base64 PNG) ─────────────────────
        if (type === 8) {
            const bankBin       = (req.query.bank as string) || 'VCB';
            const accountNumber = (req.query.account as string) || STK;
            const accountName   = (req.query.name as string) || '';
            const amount        = parseInt(req.query.amount as string, 10) || 0;
            const description   = (req.query.desc as string) || '';
            const format        = (req.query.format as string) || 'dataurl'; // dataurl | png | svg

            const opts = { bankBin, accountNumber, accountName, amount, description };

            if (format === 'svg') {
                const svg = await VietQRGenerator.toSVG(opts);
                return res.type('image/svg+xml').send(svg);
            }
            if (format === 'png') {
                const buf = await VietQRGenerator.toBuffer(opts);
                return res.type('image/png').send(buf);
            }
            // default: dataurl (base64 JSON)
            const dataUrl = await VietQRGenerator.toDataURL(opts);
            return res.json({
                success: true,
                qr: dataUrl,
                emv: VietQRGenerator.buildEMVString(opts),
            });
        }

        // ── type=9 : VietQR URL (ảnh đẹp có logo từ vietqr.io) ───────
        if (type === 9) {
            const bankBin       = (req.query.bank as string) || 'VCB';
            const accountNumber = (req.query.account as string) || STK;
            const accountName   = (req.query.name as string) || '';
            const amount        = parseInt(req.query.amount as string, 10) || 0;
            const description   = (req.query.desc as string) || '';
            const template      = (req.query.template as string) as any || 'compact2';

            const url = VietQRGenerator.getVietQRUrl({
                bankBin, accountNumber, accountName, amount, description, template,
            });
            return res.json({ success: true, url });
        }

        // ── type=10 : Tạo mã chuyển khoản + QR ────────────────────
        // Admin đặt prefix (2+ ký tự), hệ thống random phần còn lại
        // Ví dụ: prefix="AB" → mã "ABX7K29" → QR có nội dung "ABX7K29"
        if (type === 10) {
            const prefix       = (req.query.prefix as string) || 'TX';
            const randomLength = parseInt(req.query.len as string, 10) || 5;
            const bankBin      = (req.query.bank as string) || 'VCB';
            const accountNumber = (req.query.account as string) || STK;
            const accountName  = (req.query.name as string) || '';
            const amount       = parseInt(req.query.amount as string, 10) || 0;
            const format       = (req.query.format as string) || 'dataurl';

            // Tạo mã
            const generated = TransferCode.generate({ prefix, randomLength });

            // Tạo QR với nội dung là mã vừa tạo
            const qrOpts = {
                bankBin, accountNumber, accountName, amount,
                description: generated.code,
            };

            let qrData: any = null;
            if (format === 'png') {
                const buf = await VietQRGenerator.toBuffer(qrOpts);
                // Trả JSON với QR là base64 thay vì raw image để kèm thêm info
                qrData = 'data:image/png;base64,' + buf.toString('base64');
            } else if (format === 'svg') {
                qrData = await VietQRGenerator.toSVG(qrOpts);
            } else {
                qrData = await VietQRGenerator.toDataURL(qrOpts);
            }

            return res.json({
                success: true,
                code:    generated.code,
                prefix:  generated.prefix,
                random:  generated.random,
                createdAt: generated.createdAt,
                qr:      qrData,
                emv:     VietQRGenerator.buildEMVString(qrOpts),
                vietqrUrl: VietQRGenerator.getVietQRUrl(qrOpts),
                pending: TransferCode.pendingCount,
            });
        }

        // ── type=11 : Check giao dịch theo mã chuyển khoản ────────────
        // Tự động login → lấy LSGD → tìm mã trong Description
        if (type === 11) {
            const code     = (req.query.code as string) || '';
            const prefix   = (req.query.prefix as string) || '';
            const fromDate = (req.query.date as string) || todayStr();
            const confirm  = (req.query.confirm as string) === '1'; // tự động confirm nếu tìm thấy

            if (!code && !prefix) {
                return res.json({
                    success: false,
                    message: 'Cần truyền ?code=ABX7K29 hoặc ?prefix=AB',
                    pendingCodes: TransferCode.getPendingCodes(),
                });
            }

            // Login + lấy LSGD
            await bank.doLogin(TK, MK);
            const result = await bank.getHistories(fromDate, STK, 0);

            // Parse transactions
            let transactions: any[] = [];
            if (result && typeof result === 'object') {
                // Tìm mảng transactions trong response
                const r = result as any;
                transactions = r.transactions || r.TransactionHistoryList || r.data || [];
                if (!Array.isArray(transactions) && r.result) {
                    transactions = r.result.transactions || r.result.TransactionHistoryList || [];
                }
            }

            // Tìm mã trong giao dịch
            const matches = TransferCode.findInTransactions(
                transactions,
                code ? { code } : { prefix },
            );

            // Tự động confirm nếu yêu cầu
            if (confirm && matches.length > 0) {
                for (const m of matches) {
                    TransferCode.confirmCode(m.code);
                }
            }

            return res.json({
                success: matches.length > 0,
                found:   matches.length,
                matches,
                pendingCodes: TransferCode.getPendingCodes(),
            });
        }

        return res.json({ success: false, message: 'Invalid type. Use type=1..11' });
    } catch (err: any) {
        console.error('[Server Error]', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// ── START SERVER ──────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`[VCB API] Server running on http://localhost:${PORT}`);
    console.log(`  Login:       GET /?type=1`);
    console.log(`  OTP:         GET /?type=2&otp=123456`);
    console.log(`  Histories:   GET /?type=3`);
    console.log(`  Histories:   GET /?type=3&date=21/02/2026`);
    console.log(`  Accounts:    GET /?type=4`);
    console.log(`  Acc Detail:  GET /?type=5`);
    console.log(`  Banks:       GET /?type=6`);
    console.log(`  DD Accounts: GET /?type=7`);
    console.log(`  VietQR gen:  GET /?type=8&bank=VCB&account=0123456789&amount=100000&desc=thanhtoan`);
    console.log(`  VietQR URL:  GET /?type=9&bank=VCB&account=0123456789&amount=100000&desc=thanhtoan`);
    console.log(`  Gen code+QR: GET /?type=10&prefix=AB&amount=100000&bank=VCB&account=0123456789`);
    console.log(`  Check code:  GET /?type=11&code=ABX7K29  or  /?type=11&prefix=AB`);
});

export default app;
