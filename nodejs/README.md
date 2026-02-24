# VietCombank API – Node.js (JavaScript)

Check lịch sử giao dịch Vietcombank tự động. Tự đăng nhập khi hết phiên.  
Phù hợp làm chức năng **nạp tiền tự động** cho web, app.  
Kết quả trả về **JSON** chuẩn. Tích hợp sẵn **giải captcha tự động** (Tesseract OCR local).

---

## 📦 Cài đặt

```bash
cd nodejs
npm install
```

## ⚙️ Cấu hình

Mở file `server.js`, sửa thông tin tài khoản:

```js
const TK  = 'tên_đăng_nhập_vcb';   // username VCB Digibank
const MK  = 'mật_khẩu';             // password
const STK = '0123456789';            // số tài khoản
```

Hoặc dùng **biến môi trường** (khuyến nghị):

```bash
VCB_USERNAME=tên_đăng_nhập VCB_PASSWORD=mật_khẩu VCB_ACCOUNT=0123456789 npm start
```

## 🚀 Chạy

```bash
# Chạy server
npm start

# Chạy dev (auto restart khi sửa code)
npm run dev
```

Server mặc định chạy tại: `http://localhost:3000`

---

## 📖 Hướng dẫn sử dụng

### Bước 1: Đăng nhập lần đầu (lấy OTP)

```
GET http://localhost:3000/?type=1
```

Hệ thống sẽ tự giải captcha và gửi request login.  
Nếu tài khoản cần xác thực OTP → VCB sẽ gửi mã OTP về điện thoại.

**Response mẫu:**
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

Thay `123456` bằng mã OTP nhận được từ VCB.

**Response mẫu:**
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

### Bước 3: Check lịch sử giao dịch (dùng cho các lần sau)

```
GET http://localhost:3000/?type=3
```

**Tự động đăng nhập** trước khi check → không cần lo hết phiên.

Check theo ngày cụ thể:
```
GET http://localhost:3000/?type=3&date=21/02/2026
```

**Response mẫu:**
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

```js
const { VietQRGenerator, BANK_BINS } = require('./VietQR');

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

---

## 💡 Tích hợp nạp tiền tự động

### Cách hoạt động

1. Server của bạn gọi `/?type=3` định kỳ (mỗi 10-30 giây)
2. So sánh `transactionID` với database để tìm giao dịch mới
3. Parse nội dung chuyển khoản (`escription`) để lấy mã nạp tiền
4. Cộng tiền vào tài khoản user

### Ví dụ tích hợp (gọi từ backend khác)

**Node.js:**
```js
const axios = require('axios');

async function checkNewDeposits() {
    const res = await axios.get('http://localhost:3000/?type=3');
    const data = res.data;
    
    if (data.transactions) {
        for (const tx of data.transactions) {
            // Kiểm tra giao dịch mới
            const isNew = await db.checkTransactionNotExist(tx.transactionID);
            if (isNew && tx.amount > 0) {
                // Parse mã nạp tiền từ nội dung
                const match = tx.escription.match(/NAP(\d+)/);
                if (match) {
                    const userId = match[1];
                    await db.addBalance(userId, tx.amount);
                    await db.saveTransaction(tx.transactionID);
                }
            }
        }
    }
}

// Chạy mỗi 15 giây
setInterval(checkNewDeposits, 15000);
```

**PHP:**
```php
$response = file_get_contents('http://localhost:3000/?type=3');
$data = json_decode($response, true);

foreach ($data['transactions'] as $tx) {
    // Kiểm tra giao dịch chưa xử lý
    if (!isProcessed($tx['transactionID'])) {
        // Parse nội dung
        if (preg_match('/NAP(\d+)/', $tx['escription'], $match)) {
            $userId = $match[1];
            addBalance($userId, $tx['amount']);
            markProcessed($tx['transactionID']);
        }
    }
}
```

**Python:**
```python
import requests

res = requests.get('http://localhost:3000/?type=3')
data = res.json()

for tx in data.get('transactions', []):
    if not is_processed(tx['transactionID']):
        # Xử lý nạp tiền...
        pass
```

---

## 📁 Cấu trúc files

```
nodejs/
├── server.js           # Express API server
├── VietCombank.js      # Class chính (login, check LSGD, encrypt/decrypt...)
├── CaptchaSolver.js    # Giải captcha tự động (Tesseract OCR)
├── package.json
└── data/               # Lưu session đăng nhập (tự tạo)
    └── {username}.json
```

## ⚠️ Lưu ý

- **Lần đầu** phải chạy `type=1` → `type=2` để xác thực OTP
- Sau đó chỉ cần gọi `type=3` — hệ thống tự đăng nhập khi hết phiên
- Captcha được giải tự động bằng OCR, không cần server bên thứ 3
- Session được lưu vào file `data/` để dùng lại
