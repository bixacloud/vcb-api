const crypto = require('crypto');
const axios = require('axios');
const forge = require('node-forge');
const fs = require('fs');
const path = require('path');
const CaptchaSolver = require('./CaptchaSolver');

class VietCombank {
    constructor(username, password, accountNumber) {
        // ── Keys ──────────────────────────────────────────────────────
        this.defaultPublicKey =
            '-----BEGIN PUBLIC KEY-----\n' +
            'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAikqQrIzZJkUvHisjfu5ZCN+TLy//43CIc5hJE709TIK3HbcC9vuc2+PPEtI6peSUGqOnFoYOwl3i8rRdSaK17G2RZN01MIqRIJ/6ac9H4L11dtfQtR7KHqF7KD0fj6vU4kb5+0cwR3RumBvDeMlBOaYEpKwuEY9EGqy9bcb5EhNGbxxNfbUaogutVwG5C1eKYItzaYd6tao3gq7swNH7p6UdltrCpxSwFEvc7douE2sKrPDp807ZG2dFslKxxmR4WHDHWfH0OpzrB5KKWQNyzXxTBXelqrWZECLRypNq7P+1CyfgTSdQ35fdO7M1MniSBT1V33LdhXo73/9qD5e5VQIDAQAB\n' +
            '-----END PUBLIC KEY-----';

        this.clientPublicKey =
            'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCg+aN5HEhfrHXCI/pLcv2Mg01gNzuAlqNhL8ojO8KwzrnEIEuqmrobjMFFPkrMXUnmY5cWsm0jxaflAtoqTf9dy1+LL5ddqNOvaPsNhSEMmIUsrppvh1ZbUZGGW6OUNeXBEDXhEF8tAjl3KuBiQFLEECUmCDiusnFoZ2w/1iOZJwIDAQAB';

        this.clientPrivateKey =
            '-----BEGIN RSA PRIVATE KEY-----\r\n' +
            'MIICXQIBAAKBgQCg+aN5HEhfrHXCI/pLcv2Mg01gNzuAlqNhL8ojO8KwzrnEIEuq\r\n' +
            'mrobjMFFPkrMXUnmY5cWsm0jxaflAtoqTf9dy1+LL5ddqNOvaPsNhSEMmIUsrppv\r\n' +
            'h1ZbUZGGW6OUNeXBEDXhEF8tAjl3KuBiQFLEECUmCDiusnFoZ2w/1iOZJwIDAQAB\r\n' +
            'AoGAEGDV7SCfjHxzjskyUjLk8UL6wGteNnsdLGo8WtFdwbeG1xmiGT2c6eisUWtB\r\n' +
            'GQH03ugLG1gUGqulpXtgzyUYcj0spHPiUiPDAPY24DleR7lGZHMfsnu20dyu6Llp\r\n' +
            'Xup07OZdlqDGUm9u2uC0/I8RET0XWCbtOSr4VgdHFpMN+MECQQDbN5JOAIr+px7w\r\n' +
            'uhBqOnWJbnL+VZjcq39XQ6zJQK01MWkbz0f9IKfMepMiYrldaOwYwVxoeb67uz/4\r\n' +
            'fau4aCR5AkEAu/xLydU/dyUqTKV7owVDEtjFTTYIwLs7DmRe247207b6nJ3/kZhj\r\n' +
            'gsm0mNnoAFYZJoNgCONUY/7CBHcvI4wCnwJBAIADmLViTcjd0QykqzdNghvKWu65\r\n' +
            'D7Y1k/xiscEour0oaIfr6M8hxbt8DPX0jujEf7MJH6yHA+HfPEEhKila74kCQE/9\r\n' +
            'oIZG3pWlU+V/eSe6QntPkE01k+3m/c82+II2yGL4dpWUSb67eISbreRovOb/u/3+\r\n' +
            'YywFB9DxA8AAsydOGYMCQQDYDDLAlytyG7EefQtDPRlGbFOOJrNRyQG+2KMEl/ti\r\n' +
            'Yr4ZPChxNrik1CFLxfkesoReXN8kU/8918D0GLNeVt/C\r\n' +
            '-----END RSA PRIVATE KEY-----\r\n';

        // ── API URLs ──────────────────────────────────────────────────
        this.urls = {
            getCaptcha:         'https://digiapp.vietcombank.com.vn/utility-service/v1/captcha/',
            login:              'https://digiapp.vietcombank.com.vn/authen-service/v1/login',
            authenService:      'https://digiapp.vietcombank.com.vn/authen-service/v1/api-',
            getHistories:       'https://digiapp.vietcombank.com.vn/bank-service/v1/transaction-history',
            transferOut:        'https://digiapp.vietcombank.com.vn/napas-service/v1/init-fast-transfer-via-accountno',
            genOtpOut:          'https://digiapp.vietcombank.com.vn/napas-service/v1/transfer-gen-otp',
            genOtpIn:           'https://digiapp.vietcombank.com.vn/transfer-service/v1/transfer-gen-otp',
            confirmTransferOut: 'https://digiapp.vietcombank.com.vn/napas-service/v1/transfer-confirm-otp',
            confirmTransferIn:  'https://digiapp.vietcombank.com.vn/transfer-service/v1/transfer-confirm-otp',
            transferIn:         'https://digiapp.vietcombank.com.vn/transfer-service/v1/init-internal-transfer',
            getBanks:           'https://digiapp.vietcombank.com.vn/utility-service/v1/get-banks',
            getAccountDetail:   'https://digiapp.vietcombank.com.vn/bank-service/v1/get-account-detail',
            getListAccount:     'https://digiapp.vietcombank.com.vn/bank-service/v1/get-list-account-via-cif',
            getListDDAccount:   'https://digiapp.vietcombank.com.vn/bank-service/v1/get-list-ddaccount',
        };

        // ── Device info ───────────────────────────────────────────────
        this.lang    = 'vi';
        this.timeout = 60000; // ms
        this.DT      = 'Windows';
        this.OV      = '10';
        this.PM      = 'Chrome 111.0.0.0';
        this.checkAcctPkg = '1';
        this.proxy   = '';

        // ── Account state ─────────────────────────────────────────────
        this.username       = username;
        this.password       = password;
        this.accountNumber  = accountNumber;
        this.sessionId      = '';
        this.mobileId       = '';
        this.clientId       = '';
        this.cif            = '';
        this.res            = '';
        this.browserToken   = '';
        this.browserId      = '';
        this.E              = '';
        this.tranId         = '';
        this.captchaToken   = '';
        this.captchaValue   = '';

        // ── Captcha Solver (Tesseract OCR local) ─────────────────────
        this.captchaSolver = new CaptchaSolver();

        // ── Data persistence ──────────────────────────────────────────
        const dataDir = path.join(__dirname, 'data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        this.file = path.join(dataDir, `${username}.json`);

        if (!fs.existsSync(this.file)) {
            this.clientId = '';
            this.browserId = crypto.createHash('md5').update(this.username).digest('hex');
            this.saveData();
        } else {
            this.parseData();
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  DATA PERSISTENCE
    // ═══════════════════════════════════════════════════════════════════
    saveData() {
        const data = {
            username:       this.username,
            password:       this.password,
            account_number: this.accountNumber,
            sessionId:      this.sessionId,
            mobileId:       this.mobileId,
            clientId:       this.clientId,
            cif:            this.cif,
            E:              this.E,
            res:            this.res,
            tranId:         this.tranId,
            browserToken:   this.browserToken,
            browserId:      this.browserId,
        };
        fs.writeFileSync(this.file, JSON.stringify(data, null, 2));
    }

    parseData() {
        const raw  = fs.readFileSync(this.file, 'utf-8');
        const data = JSON.parse(raw);
        this.username       = data.username       || '';
        // password giữ nguyên từ constructor
        this.accountNumber  = data.account_number || '';
        this.sessionId      = data.sessionId      || '';
        this.mobileId       = data.mobileId       || '';
        this.clientId       = data.clientId       || '';
        this.cif            = data.cif            || '';
        this.res            = data.res            || '';
        this.tranId         = data.tranId         || '';
        this.browserToken   = data.browserToken   || '';
        this.browserId      = data.browserId      || '';
        this.E              = data.E              || '';
    }

    // ═══════════════════════════════════════════════════════════════════
    //  HELPERS
    // ═══════════════════════════════════════════════════════════════════

    /** Tạo random string (giống Str::random của Laravel) */
    static randomString(len) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        const bytes = crypto.randomBytes(len);
        for (let i = 0; i < len; i++) {
            result += chars[bytes[i] % chars.length];
        }
        return result;
    }

    /** Tạo E – UUID‑like string */
    getE() {
        const hex = crypto.createHash('md5')
            .update(crypto.randomBytes(16).toString('hex') + Date.now().toString())
            .digest('hex');
        // format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
        return [
            hex.slice(0, 8),
            hex.slice(8, 12),
            hex.slice(12, 16),
            hex.slice(16, 20),
            hex.slice(20, 32),
        ].join('-').toUpperCase();
    }

    /** Headers gửi kèm mỗi request */
    getHeaders() {
        const key  = this.username + '6q93-@u9';
        const xlim = crypto.createHash('sha256').update(key).digest('hex');

        return {
            'Accept':             'application/json',
            'Accept-Encoding':    'gzip, deflate, br',
            'Accept-Language':    'vi',
            'Connection':         'keep-alive',
            'Content-Type':       'application/json',
            'Host':               'digiapp.vietcombank.com.vn',
            'Origin':             'https://vcbdigibank.vietcombank.com.vn',
            'Referer':            'https://vcbdigibank.vietcombank.com.vn/',
            'sec-ch-ua-mobile':   '?0',
            'Sec-Fetch-Dest':     'empty',
            'Sec-Fetch-Mode':     'cors',
            'Sec-Fetch-Site':     'same-site',
            'User-Agent':         'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36',
            'X-Channel':          'Web',
            'X-Lim-ID':           xlim,
        };
    }

    // ═══════════════════════════════════════════════════════════════════
    //  ENCRYPTION / DECRYPTION  (RSA-OAEP + AES-256-CTR)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Mã hóa data trước khi gửi lên server.
     *  - Tạo random AES key (32 bytes) + IV (16 bytes)
     *  - Encrypt JSON bằng AES-256-CTR
     *  - Encrypt AES key bằng RSA (server public key, PKCS1 OAEP / SHA-1)
     *  - Trả về { d: base64(iv + ciphertext), k: base64(rsaEncrypted(base64(key))) }
     */
    encryptData(obj) {
        obj.clientPubKey = this.clientPublicKey;

        const key = VietCombank.randomString(32);
        const iv  = VietCombank.randomString(16);

        // AES-256-CTR encrypt
        const cipher     = crypto.createCipheriv('aes-256-ctr', Buffer.from(key, 'utf-8'), Buffer.from(iv, 'utf-8'));
        const plaintext  = JSON.stringify(obj);
        const encrypted  = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()]);
        const body       = Buffer.concat([Buffer.from(iv, 'utf-8'), encrypted]).toString('base64');

        // RSA encrypt key
        const publicKey   = forge.pki.publicKeyFromPem(this.defaultPublicKey);
        const keyB64      = Buffer.from(key).toString('base64');
        const encKey      = publicKey.encrypt(keyB64, 'RSA-OAEP', {
            md: forge.md.sha1.create(),
            mgf1: { md: forge.md.sha1.create() },
        });
        const header = Buffer.from(encKey, 'binary').toString('base64');

        return { d: body, k: header };
    }

    /**
     * Giải mã response từ server.
     *  - Decrypt AES key bằng RSA (client private key)
     *  - Decrypt body bằng AES-256-CTR
     */
    decryptData(cipher) {
        const headerBuf  = Buffer.from(cipher.k, 'base64');
        const bodyBuf    = Buffer.from(cipher.d, 'base64');

        // RSA decrypt -> base64-encoded AES key
        const privateKey = forge.pki.privateKeyFromPem(this.clientPrivateKey);
        const decKeyB64  = privateKey.decrypt(headerBuf.toString('binary'), 'RSA-OAEP', {
            md: forge.md.sha1.create(),
            mgf1: { md: forge.md.sha1.create() },
        });

        const aesKey     = Buffer.from(decKeyB64, 'base64');
        const iv         = bodyBuf.slice(0, 16);
        const cipherText = bodyBuf.slice(16);

        const decipher   = crypto.createDecipheriv('aes-256-ctr', aesKey, iv);
        const decrypted  = Buffer.concat([decipher.update(cipherText), decipher.final()]);
        return JSON.parse(decrypted.toString('utf-8'));
    }

    // ═══════════════════════════════════════════════════════════════════
    //  HTTP – curlPost equivalent
    // ═══════════════════════════════════════════════════════════════════
    async curlPost(url, data) {
        try {
            const encrypted = this.encryptData(data);
            const config = {
                method: 'POST',
                url,
                headers: this.getHeaders(),
                data: encrypted,
                timeout: this.timeout,
                validateStatus: () => true, // giống http_errors => false
            };
            if (this.proxy) config.proxy = this.proxy;

            const res = await axios(config);
            return this.decryptData(res.data);
        } catch (err) {
            console.error('[curlPost error]', err.message);
            return false;
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  CAPTCHA
    // ═══════════════════════════════════════════════════════════════════
    async getCaptcha() {
        this.captchaToken = VietCombank.randomString(30);
        const url = this.urls.getCaptcha + this.captchaToken;
        const res = await axios.get(url, {
            timeout: this.timeout,
            responseType: 'arraybuffer',
            headers: {
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36',
            },
        });
        return Buffer.from(res.data).toString('base64');
    }

    /** Giải captcha bằng Tesseract OCR local */
    async solveCaptchaLocal(imageBase64) {
        return this.captchaSolver.solve(imageBase64);
    }

    /** Fallback: Gọi API giải captcha bên thứ 3 (nếu cần) */
    async solveCaptchaRemote(imageBase64) {
        try {
            const res = await axios.post('http://103.153.64.187:8888/api/captcha/vcb', {
                base64: imageBase64,
            }, { timeout: 30000 });
            return res.data; // { status, captcha }
        } catch (err) {
            return { status: 'fail', captcha: '', error: err.message };
        }
    }

    /**
     * Giải captcha — ưu tiên OCR local, nếu fail thì thử lại (tối đa 3 lần).
     * VCB captcha thường 5-6 ký tự → validate length.
     */
    async solveCaptcha() {
        const maxRetries = 3;
        for (let i = 0; i < maxRetries; i++) {
            const imageBase64 = await this.getCaptcha();
            const result = await this.solveCaptchaLocal(imageBase64);
            if (result && result.status === 'success' && result.captcha) {
                this.captchaValue = result.captcha;
                console.log(`[Captcha] Solved (attempt ${i + 1}): ${result.captcha}`);
                return { status: true, key: this.captchaToken, captcha: result.captcha };
            }
            console.log(`[Captcha] Attempt ${i + 1} failed, retrying...`);
        }
        return { status: false, msg: 'Captcha OCR failed after retries' };
    }

    // ═══════════════════════════════════════════════════════════════════
    //  AUTH FLOW
    // ═══════════════════════════════════════════════════════════════════

    async checkBrowser(type = 1) {
        const param = {
            DT: this.DT, OV: this.OV, PM: this.PM,
            E: this.getE(),
            browserId: this.browserId,
            lang: this.lang,
            mid: 3008,
            cif: '', clientId: '', mobileId: '', sessionId: '',
            browserToken: this.browserToken,
            user: this.username,
        };
        const result = await this.curlPost(this.urls.authenService + '3008', param);
        if (result && result.transaction && result.transaction.tranId) {
            return this.chooseOtpType(result.transaction.tranId, type);
        }
        return { success: false, message: 'checkBrowser failed', param, data: result || '' };
    }

    async chooseOtpType(tranID, type = 1) {
        const param = {
            DT: this.DT, OV: this.OV, PM: this.PM,
            E: this.getE(),
            browserId: this.browserId,
            lang: this.lang,
            mid: 3010,
            cif: '', clientId: '', mobileId: '', sessionId: '',
            browserToken: this.browserToken,
            tranId: tranID,
            type, // 1 = SMS, 5 = Smart OTP
            user: this.username,
        };
        const result = await this.curlPost(this.urls.authenService + '3010', param);
        if (result && result.code == 0) {
            this.tranId = tranID;
            this.saveData();
            return {
                success: true,
                message: 'ok',
                result: {
                    browserToken: this.browserToken,
                    tranId: result.tranId || '',
                    challenge: result.challenge || '',
                },
                param,
                data: result || '',
            };
        }
        return { success: false, message: 'chooseOtpType failed', param, data: result || '' };
    }

    async submitOtpLogin(otp) {
        const param = {
            DT: this.DT, OV: this.OV, PM: this.PM,
            E: this.getE(),
            browserId: this.browserId,
            lang: this.lang,
            mid: 3011,
            cif: '', clientId: '', mobileId: '', sessionId: '',
            browserToken: this.browserToken,
            tranId: this.tranId,
            otp,
            user: this.username,
        };
        const result = await this.curlPost(this.urls.authenService + '3011', param);
        if (result && result.code == 0) {
            this.sessionId = result.sessionId;
            this.mobileId  = result.userInfo.mobileId;
            this.clientId  = result.userInfo.clientId;
            this.cif       = result.userInfo.cif;
            this.res       = result;
            this.saveData();

            const sv = await this.saveBrowser();
            if (sv && sv.code == 0) {
                return {
                    success: true,
                    message: 'success',
                    d: sv,
                    session: { sessionId: this.sessionId, mobileId: this.mobileId, clientId: this.clientId, cif: this.cif },
                    data: result,
                };
            }
            return { success: false, message: sv ? sv.des : 'saveBrowser failed', param, data: sv || '' };
        }
        return { success: false, message: result ? result.des : 'submitOtpLogin failed', param, data: result || '' };
    }

    async saveBrowser() {
        const param = {
            DT: this.DT, OV: this.OV, PM: this.PM,
            E: '',
            browserId: this.browserId,
            browserName: 'Chrome 111.0.0.0',
            lang: this.lang,
            mid: 3009,
            cif: this.cif,
            clientId: this.clientId,
            mobileId: this.mobileId,
            sessionId: this.sessionId,
            user: this.username,
        };
        return this.curlPost(this.urls.authenService + '3009', param);
    }

    async doLogin(username, password) {
        const captcha = await this.solveCaptcha();
        if (!captcha.status) return captcha;

        const param = {
            DT: this.DT, OV: this.OV, PM: this.PM,
            E: this.getE(),
            browserId: crypto.createHash('md5').update(this.username).digest('hex'),
            captchaToken: this.captchaToken,
            captchaValue: this.captchaValue,
            checkAcctPkg: this.checkAcctPkg,
            lang: this.lang,
            mid: 6,
            password: password || this.password,
            user: username || this.username,
        };
        const result = await this.curlPost(this.urls.login, param);

        if (result && result.code == 0) {
            this.sessionId = result.sessionId;
            this.mobileId  = result.userInfo.mobileId;
            this.clientId  = result.userInfo.clientId;
            this.cif       = result.userInfo.cif;
            this.saveData();
            return {
                success: true,
                message: 'success',
                session: { sessionId: this.sessionId, mobileId: this.mobileId, clientId: this.clientId, cif: this.cif },
                data: result,
            };
        }
        if (result && result.code == 20231 && result.mid == 6) {
            this.browserToken = result.browserToken;
            return this.checkBrowser(1); // 5 = smart otp
        }
        return { success: false, message: result ? result.des : 'Login failed', param, data: result || '' };
    }

    // ═══════════════════════════════════════════════════════════════════
    //  ACCOUNT & TRANSACTIONS
    // ═══════════════════════════════════════════════════════════════════

    async getListAccount() {
        const param = {
            DT: this.DT, OV: this.OV, PM: this.PM,
            browserId: this.browserId,
            E: this.getE(),
            mid: 8,
            cif: this.cif,
            user: this.username,
            mobileId: this.mobileId,
            clientId: this.clientId,
            sessionId: this.sessionId,
        };
        return this.curlPost(this.urls.getListAccount, param);
    }

    async getListDDAccount() {
        const param = {
            DT: this.DT, OV: this.OV, PM: this.PM,
            browserId: this.browserId,
            E: this.getE(),
            mid: 35,
            cif: this.cif,
            serviceCode: '0551',
            user: this.username,
            mobileId: this.mobileId,
            clientId: this.clientId,
            sessionId: this.sessionId,
        };
        return this.curlPost(this.urls.getListDDAccount, param);
    }

    async getAccountDetail() {
        const param = {
            DT: this.DT, OV: this.OV, PM: this.PM,
            E: this.getE(),
            browserId: this.browserId,
            accountNo: this.accountNumber,
            accountType: 'D',
            mid: 13,
            cif: this.cif,
            user: this.username,
            mobileId: this.mobileId,
            clientId: this.clientId,
            sessionId: this.sessionId,
        };
        return this.curlPost(this.urls.getAccountDetail, param);
    }

    async getHistories(toDate, accountNumber = '', page = 0) {
        const param = {
            DT: this.DT, OV: this.OV, PM: this.PM,
            E: this.getE(),
            browserId: this.browserId,
            accountNo: accountNumber || this.accountNumber,
            accountType: 'D',
            fromDate: toDate,
            toDate: toDate,
            lang: this.lang,
            pageIndex: page,
            lengthInPage: 20,
            stmtDate: '',
            stmtType: '',
            mid: 14,
            cif: this.cif,
            user: this.username,
            mobileId: this.mobileId,
            clientId: this.clientId,
            sessionId: this.sessionId,
        };
        return this.curlPost(this.urls.getHistories, param);
    }

    async getBanks() {
        const param = {
            DT: this.DT, OV: this.OV, PM: this.PM,
            E: this.getE(),
            browserId: this.browserId,
            lang: this.lang,
            fastTransfer: '1',
            mid: 23,
            cif: this.cif,
            user: this.username,
            mobileId: this.mobileId,
            clientId: this.clientId,
            sessionId: this.sessionId,
        };
        return this.curlPost(this.urls.getBanks, param);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  TRANSFER
    // ═══════════════════════════════════════════════════════════════════

    async genOtpTransfer(tranId, type = 'OUT', otpType = 5) {
        const param = {
            DT: this.DT, OV: this.OV, PM: this.PM,
            E: otpType === 1 ? this.getE() : '',
            lang: this.lang,
            tranId,
            type: otpType, // 1 = SMS, 5 = Smart OTP
            browserId: this.browserId,
            mid: 17,
            cif: this.cif,
            user: this.username,
            mobileId: this.mobileId,
            clientId: this.clientId,
            sessionId: this.sessionId,
        };

        // Nếu OTP SMS → cần captcha
        if (otpType === 1) {
            const captcha = await this.solveCaptcha();
            if (!captcha.status) return captcha;
            param.captchaToken = this.captchaToken;
            param.captchaValue = this.captchaValue;
        }

        const url = type === 'IN' ? this.urls.genOtpIn : this.urls.genOtpOut;
        return this.curlPost(url, param);
    }

    async confirmTransfer(tranId, challenge, otp, type = 'OUT', otpType = 5) {
        const param = {
            DT: this.DT, OV: this.OV, PM: this.PM,
            E: this.getE(),
            lang: this.lang,
            tranId,
            otp,
            challenge,
            mid: 18,
            cif: this.cif,
            user: this.username,
            browserId: this.browserId,
            mobileId: this.mobileId,
            clientId: this.clientId,
            sessionId: this.sessionId,
        };

        const url = type === 'IN' ? this.urls.confirmTransferIn : this.urls.confirmTransferOut;
        return this.curlPost(url, param);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  SET DATA (manual session injection)
    // ═══════════════════════════════════════════════════════════════════
    setData(sessionId, mobileId, clientId, cif) {
        this.sessionId = sessionId;
        this.mobileId  = mobileId;
        this.clientId  = clientId;
        this.cif       = cif;
        return this;
    }
}

module.exports = VietCombank;
