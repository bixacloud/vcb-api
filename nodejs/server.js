/**
 * VietCombank DigiBank API – Node.js Express Server
 * Chuyển đổi từ finday.php
 *
 * Endpoints (query param ?type=):
 *   1  → Login
 *   2  → Submit OTP  (?otp=...)
 *   3  → Lấy lịch sử giao dịch hôm nay (tự đăng nhập lại nếu hết phiên)
 *   4  → Danh sách tài khoản
 *   5  → Chi tiết tài khoản
 *   6  → Danh sách ngân hàng
 *   7  → Danh sách DD Account
 *   8  → Tạo QR code chuyển khoản (VietQR)
 *   9  → Lấy URL ảnh QR từ VietQR.io
 *   10 → Tạo mã chuyển khoản + QR (admin đặt prefix, hệ thống random)
 *   11 → Check giao dịch theo mã chuyển khoản
 */

const express = require('express');
const cors    = require('cors');
const VietCombank = require('./VietCombank');
const { VietQRGenerator, BANK_BINS } = require('./VietQR');
const { TransferCode } = require('./TransferCode');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── CORS ──────────────────────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ── CẤU HÌNH TÀI KHOẢN ──────────────────────────────────────────────
// Đặt thông tin tài khoản ở đây hoặc dùng biến môi trường
const TK  = process.env.VCB_USERNAME || '';   // tên đăng nhập
const MK  = process.env.VCB_PASSWORD || '';   // mật khẩu
const STK = process.env.VCB_ACCOUNT  || '';   // số tài khoản

// ── Khởi tạo instance ────────────────────────────────────────────────
let vcb = null;
function getApp() {
    if (!vcb) {
        vcb = new VietCombank(TK, MK, STK);
    }
    return vcb;
}

// ── HELPER: format ngày dd/MM/yyyy ──────────────────────────────────
function todayStr() {
    const now = new Date();
    const dd  = String(now.getDate()).padStart(2, '0');
    const mm  = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

// ── API ROUTE ─────────────────────────────────────────────────────────
app.get('/', async (req, res) => {
    const type = Math.abs(parseInt(req.query.type, 10) || 0);
    const app  = getApp();

    try {
        // ── type=1 : Login ────────────────────────────────────────────
        if (type === 1) {
            const result = await app.doLogin(TK, MK);
            return res.json(result);
        }

        // ── type=2 : Nhập OTP ─────────────────────────────────────────
        if (type === 2) {
            const otp = (req.query.otp || '').replace(/[^0-9]/g, '');
            const result = await app.submitOtpLogin(otp);
            return res.json(result);
        }

        // ── type=3 : Lấy lịch sử giao dịch (tự động login) ────────
        if (type === 3) {
            const fromDate = req.query.date || todayStr();

            // Tự động đăng nhập trước khi check giao dịch
            await app.doLogin(TK, MK);

            let result = await app.getHistories(fromDate, STK, 0);
            let jsonStr = JSON.stringify(result);

            // Nếu vẫn lỗi phiên → thử login lại tối đa 2 lần
            const reloginPhrases = [
                'đang được truy cập trên thiết bị',
                'đăng nhập đã hết hiệu lực',
            ];
            let retries = 0;
            while (retries < 2 && reloginPhrases.some(p => jsonStr.includes(p))) {
                await app.doLogin(TK, MK);
                result  = await app.getHistories(fromDate, STK, 0);
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

        // ── type=4 : Lấy danh sách tài khoản ─────────────────────────
        if (type === 4) {
            const result = await app.getListAccount();
            return res.json(result);
        }

        // ── type=5 : Chi tiết tài khoản ──────────────────────────────
        if (type === 5) {
            const result = await app.getAccountDetail();
            return res.json(result);
        }

        // ── type=6 : Danh sách ngân hàng ─────────────────────────────
        if (type === 6) {
            const result = await app.getBanks();
            return res.json(result);
        }

        // ── type=7 : Lấy danh sách DD account ────────────────────────
        if (type === 7) {
            const result = await app.getListDDAccount();
            return res.json(result);
        }

        // ── type=8 : Tạo VietQR (trả base64 PNG) ─────────────────────
        if (type === 8) {
            const bankBin       = req.query.bank    || 'VCB';
            const accountNumber = req.query.account || STK;
            const accountName   = req.query.name    || '';
            const amount        = parseInt(req.query.amount, 10) || 0;
            const description   = req.query.desc    || '';
            const format        = req.query.format  || 'dataurl'; // dataurl | png | svg

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
            const bankBin       = req.query.bank    || 'VCB';
            const accountNumber = req.query.account || STK;
            const accountName   = req.query.name    || '';
            const amount        = parseInt(req.query.amount, 10) || 0;
            const description   = req.query.desc    || '';
            const template      = req.query.template || 'compact2';

            const url = VietQRGenerator.getVietQRUrl({
                bankBin, accountNumber, accountName, amount, description, template,
            });
            return res.json({ success: true, url });
        }

        // ── type=10 : Tạo mã chuyển khoản + QR ────────────────────
        if (type === 10) {
            const prefix       = req.query.prefix || 'TX';
            const randomLength = parseInt(req.query.len, 10) || 5;
            const bankBin      = req.query.bank    || 'VCB';
            const accountNumber = req.query.account || STK;
            const accountName  = req.query.name    || '';
            const amount       = parseInt(req.query.amount, 10) || 0;
            const format       = req.query.format  || 'dataurl';

            const generated = TransferCode.generate({ prefix, randomLength });

            const qrOpts = {
                bankBin, accountNumber, accountName, amount,
                description: generated.code,
            };

            let qrData = null;
            if (format === 'png') {
                const buf = await VietQRGenerator.toBuffer(qrOpts);
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
        if (type === 11) {
            const code     = req.query.code   || '';
            const prefix   = req.query.prefix || '';
            const fromDate = req.query.date   || todayStr();
            const confirm  = req.query.confirm === '1';

            if (!code && !prefix) {
                return res.json({
                    success: false,
                    message: 'Cần truyền ?code=ABX7K29 hoặc ?prefix=AB',
                    pendingCodes: TransferCode.getPendingCodes(),
                });
            }

            await app.doLogin(TK, MK);
            const result = await app.getHistories(fromDate, STK, 0);

            let transactions = [];
            if (result && typeof result === 'object') {
                transactions = result.transactions || result.TransactionHistoryList || result.data || [];
                if (!Array.isArray(transactions) && result.result) {
                    transactions = result.result.transactions || result.result.TransactionHistoryList || [];
                }
            }

            const matches = TransferCode.findInTransactions(
                transactions,
                code ? { code } : { prefix },
            );

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
    } catch (err) {
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
