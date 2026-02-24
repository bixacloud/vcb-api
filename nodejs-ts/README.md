# VietCombank API – TypeScript

Check lịch sử giao dịch Vietcombank tự động. Tự đăng nhập khi hết phiên.  
Phù hợp làm chức năng **nạp tiền tự động** cho web, app.  
Kết quả trả về **JSON** chuẩn. Tích hợp sẵn **giải captcha tự động** (Tesseract OCR local).

**TypeScript** — có đầy đủ interfaces, types, strict mode.

---

## 📦 Cài đặt

```bash
cd nodejs-ts
npm install
```

## ⚙️ Cấu hình

Dùng **biến môi trường** (khuyến nghị):

```bash
export VCB_USERNAME=tên_đăng_nhập
export VCB_PASSWORD=mật_khẩu
export VCB_ACCOUNT=0123456789
```

Hoặc sửa trực tiếp trong `src/server.ts`:

```ts
const TK  = process.env.VCB_USERNAME || 'tên_đăng_nhập';
const MK  = process.env.VCB_PASSWORD || 'mật_khẩu';
const STK = process.env.VCB_ACCOUNT  || '0123456789';
```

## 🚀 Chạy

```bash
# Chạy dev (TypeScript trực tiếp, auto restart)
npm run dev
npm run dev:watch

# Build production
npm run build

# Chạy production (sau khi build)
npm start

# Hoặc chạy 1 dòng với biến môi trường:
VCB_USERNAME=xxx VCB_PASSWORD=yyy VCB_ACCOUNT=zzz npm start
```

Server mặc định: `http://localhost:3000`  
Đổi port: `PORT=8080 npm start`

---

## 📖 Hướng dẫn sử dụng

### Bước 1: Đăng nhập lần đầu (lấy OTP)

```
GET http://localhost:3000/?type=1
```

Hệ thống tự giải captcha bằng OCR → gửi login → VCB gửi OTP về điện thoại.

**Response:**
```json
{
  "success": true,
  "message": "ok",
  "result": {
    "browserToken": "xxx",
    "tranId": "xxx",
    "challenge": "xxx"
  }
}
```

### Bước 2: Nhập OTP

```
GET http://localhost:3000/?type=2&otp=123456
```

Thay `123456` bằng mã OTP thực.

**Response:**
```json
{
  "success": true,
  "message": "success",
  "session": {
    "sessionId": "xxx",
    "mobileId": "xxx",
    "clientId": "xxx",
    "cif": "xxx"
  }
}
```

### Bước 3: Check lịch sử giao dịch

```
GET http://localhost:3000/?type=3
```

> **Tự động đăng nhập** mỗi lần check → không bao giờ bị lỗi hết phiên.

Check theo ngày:
```
GET http://localhost:3000/?type=3&date=21/02/2026
```

**Response:**
```json
{
  "code": 0,
  "transactions": [
    {
      "amount": "500000",
      "transactionID": "FT26052XXXXX",
      "escription": "NGUYEN VAN A chuyen tien",
      "TransactionDate": "21/02/2026"
    }
  ]
}
```

---

## 🔌 API Endpoints

| Type | URL | Mô tả |
|------|-----|--------|
| 1 | `/?type=1` | Đăng nhập (lấy OTP lần đầu) |
| 2 | `/?type=2&otp=123456` | Nhập OTP xác thực |
| 3 | `/?type=3` | **Check lịch sử giao dịch** (tự động login) |
| 3 | `/?type=3&date=21/02/2026` | Check LSGD theo ngày |
| 4 | `/?type=4` | Danh sách tài khoản |
| 5 | `/?type=5` | Chi tiết tài khoản |
| 6 | `/?type=6` | Danh sách ngân hàng |
| 7 | `/?type=7` | Danh sách DD Account |
| 8 | `/?type=8&bank=VCB&account=STK&amount=100000&desc=noidung` | **Tạo QR chuyển khoản** (VietQR) |
| 9 | `/?type=9&bank=VCB&account=STK&amount=100000&desc=noidung` | Lấy URL ảnh QR từ VietQR.io |

---

## 📱 VietQR – Tạo QR code chuyển khoản

Tích hợp sẵn **VietQR** (chuẩn NAPAS/EMVCo) — user scan QR bằng app ngân hàng bất kỳ để chuyển khoản.

### type=8: Tạo QR code cục bộ

```
GET /?type=8&bank=VCB&account=0123456789&amount=100000&desc=NAP%2012345
```

**Query params:**

| Param | Bắt buộc | Mô tả |
|-------|----------|--------|
| `bank` | ✅ | BIN ngân hàng (6 số) hoặc mã tắt: VCB, TCB, MB, ACB, VPB, TPB, BIDV, VTB, AGR... |
| `account` | ✅ | Số tài khoản người nhận |
| `amount` | ❌ | Số tiền (VND). Bỏ trống → user tự nhập |
| `desc` | ❌ | Nội dung chuyển khoản |
| `name` | ❌ | Tên người nhận (không dấu, in hoa) |
| `format` | ❌ | `dataurl` (mặc định) \| `png` \| `svg` |

**Response (format=dataurl):**
```json
{
  "success": true,
  "qr": "data:image/png;base64,iVBORw0KGgo...",
  "emv": "00020101021238380010A000000727..."
}
```

**Response (format=png):** Trả trực tiếp ảnh PNG  
**Response (format=svg):** Trả trực tiếp SVG string

### type=9: Lấy URL ảnh QR từ VietQR.io

Dùng API của [vietqr.io](https://vietqr.io) — ảnh đẹp, có logo ngân hàng, không cần generate local.

```
GET /?type=9&bank=VCB&account=0123456789&amount=100000&desc=NAP%2012345
```

Thêm param `template`: `compact` | `compact2` (mặc định) | `qr_only` | `print`

**Response:**
```json
{
  "success": true,
  "url": "https://img.vietqr.io/image/970436-0123456789-compact2.png?amount=100000&addInfo=NAP%2012345&accountName="
}
```

### Sử dụng trực tiếp (không qua server)

```ts
import { VietQRGenerator, BANK_BINS } from './VietQR';

// Tạo QR code data URL
const qr = await VietQRGenerator.toDataURL({
    bankBin: 'VCB',
    accountNumber: '0123456789',
    amount: 100000,
    description: 'NAP 12345',
    accountName: 'NGUYEN VAN A',
});
// → "data:image/png;base64,..."

// Lấy URL từ VietQR.io (có logo ngân hàng)
const url = VietQRGenerator.getVietQRUrl({
    bankBin: 'VCB',
    accountNumber: '0123456789',
    amount: 100000,
    description: 'NAP 12345',
    template: 'compact2',
});
// → "https://img.vietqr.io/image/970436-0123456789-compact2.png?..."

// Lấy danh sách BIN ngân hàng
console.log(BANK_BINS.VCB);  // { bin: '970436', name: 'Vietcombank' }
console.log(BANK_BINS.TCB);  // { bin: '970407', name: 'Techcombank' }
```

### Danh sách ngân hàng hỗ trợ

| Mã | BIN | Tên |
|----|-----|-----|
| VCB | 970436 | Vietcombank |
| TCB | 970407 | Techcombank |
| MB | 970422 | MBBank |
| ACB | 970416 | ACB |
| VPB | 970432 | VPBank |
| TPB | 970423 | TPBank |
| STB | 970403 | Sacombank |
| BIDV | 970418 | BIDV |
| VTB | 970415 | Vietinbank |
| AGR | 970405 | Agribank |
| SHB | 970443 | SHB |
| MSB | 970426 | MSB |
| OCB | 970448 | OCB |
| HDBank | 970437 | HDBank |
| EIB | 970431 | Eximbank |
| LPB | 970449 | LienVietPostBank |

---

## 💡 Tích hợp nạp tiền tự động

### Flow hoạt động

```
User chuyển khoản "NAP 12345" → VCB
    ↓
Server gọi /?type=3 mỗi 15s
    ↓
Phát hiện GD mới → parse mã "NAP 12345"
    ↓
Cộng tiền cho user ID 12345
```

### Ví dụ: Service kiểm tra giao dịch (TypeScript)

```ts
import axios from 'axios';

interface Transaction {
    amount: string;
    transactionID: string;
    escription: string;
    TransactionDate: string;
}

interface VcbResponse {
    code: number;
    transactions?: Transaction[];
}

const VCB_API = 'http://localhost:3000';

async function checkNewDeposits(): Promise<void> {
    try {
        const { data } = await axios.get<VcbResponse>(`${VCB_API}/?type=3`);

        if (!data.transactions) return;

        for (const tx of data.transactions) {
            // Kiểm tra giao dịch chưa xử lý
            const exists = await db.findTransaction(tx.transactionID);
            if (exists) continue;

            // Parse mã nạp tiền từ nội dung chuyển khoản
            const match = tx.escription.match(/NAP\s*(\d+)/i);
            if (match) {
                const userId = match[1];
                const amount = parseInt(tx.amount, 10);

                await db.addBalance(userId, amount);
                await db.saveTransaction(tx.transactionID, userId, amount);

                console.log(`[Nạp tiền] User ${userId} +${amount.toLocaleString()}đ`);
            }
        }
    } catch (err) {
        console.error('[Check deposits error]', err);
    }
}

// Chạy mỗi 15 giây
setInterval(checkNewDeposits, 15_000);
```

### Ví dụ gọi từ PHP

```php
$response = file_get_contents('http://localhost:3000/?type=3');
$data = json_decode($response, true);

if (isset($data['transactions'])) {
    foreach ($data['transactions'] as $tx) {
        if (!isProcessed($tx['transactionID'])) {
            if (preg_match('/NAP\s*(\d+)/i', $tx['escription'], $match)) {
                $userId = $match[1];
                addBalance($userId, intval($tx['amount']));
                markProcessed($tx['transactionID']);
            }
        }
    }
}
```

### Ví dụ gọi từ Python

```python
import requests, re, time

def check_deposits():
    res = requests.get('http://localhost:3000/?type=3')
    data = res.json()
    
    for tx in data.get('transactions', []):
        if not is_processed(tx['transactionID']):
            match = re.search(r'NAP\s*(\d+)', tx['escription'], re.I)
            if match:
                user_id = match.group(1)
                add_balance(user_id, int(tx['amount']))
                mark_processed(tx['transactionID'])

# Chạy mỗi 15 giây
while True:
    check_deposits()
    time.sleep(15)
```

---

## 🏗️ Dùng VietCombank class trực tiếp (không qua HTTP)

```ts
import { VietCombank } from './src/VietCombank';

const vcb = new VietCombank('username', 'password', '0123456789');

// Login
const loginResult = await vcb.doLogin();

// Check lịch sử
const histories = await vcb.getHistories('21/02/2026');

// Danh sách tài khoản
const accounts = await vcb.getListAccount();

// Chi tiết tài khoản
const detail = await vcb.getAccountDetail();

// Danh sách ngân hàng
const banks = await vcb.getBanks();
```

---

## 📁 Cấu trúc files

```
nodejs-ts/
├── src/
│   ├── types.ts            # Interfaces & Types
│   ├── CaptchaSolver.ts    # Giải captcha OCR (Tesseract.js + Sharp)
│   ├── VietCombank.ts      # Class chính (login, LSGD, encrypt/decrypt)
│   ├── server.ts           # Express API server
│   └── index.ts            # Barrel export
├── dist/                   # Output sau khi build (npm run build)
├── data/                   # Session files (tự tạo)
├── tsconfig.json
└── package.json
```

## 📋 Interfaces chính

```ts
// Kết quả giải captcha
interface CaptchaSolveResult {
    status: 'success' | 'fail';
    captcha: string;
}

// Response từ VCB API
interface VcbApiResponse {
    code?: number;
    des?: string;
    sessionId?: string;
    userInfo?: { mobileId: string; clientId: string; cif: string };
    transactions?: any[];
    [key: string]: any;
}

// Kết quả API wrapper
interface ApiResult {
    success: boolean;
    message: string;
    session?: SessionInfo;
    data?: any;
}

// Loại chuyển khoản
type TransferDirection = 'IN' | 'OUT';
type OtpType = 1 | 5;  // 1 = SMS, 5 = Smart OTP
```

---

## ⚠️ Lưu ý

- **Lần đầu tiên** phải chạy `type=1` → `type=2` để xác thực OTP
- Sau đó chỉ cần gọi `type=3` — hệ thống **tự đăng nhập** mỗi lần check
- Captcha được giải **tự động** bằng OCR local, không cần server bên thứ 3
- Session lưu vào `data/{username}.json` để dùng lại
- Dùng `npm run build` để compile TypeScript → JavaScript (output trong `dist/`)

## 🔄 So sánh với PHP

| PHP | TypeScript |
|-----|------------|
| `finday.php?type=1` | `http://localhost:3000/?type=1` |
| `finday.php?type=2&otp=xxx` | `http://localhost:3000/?type=2&otp=xxx` |
| `finday.php?type=3` | `http://localhost:3000/?type=3` |
| Apache/Nginx + PHP | Node.js (Express) |
| GuzzleHttp | axios |
| phpseclib RSA | node-forge RSA |
| Server bên thứ 3 giải captcha | Tesseract.js OCR local (free) |
