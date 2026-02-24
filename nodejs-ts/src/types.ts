/**
 * Interfaces & Types cho toàn bộ project VCB API
 */

// ── Captcha ───────────────────────────────────────────────────────────
export interface CaptchaSolveResult {
    status: 'success' | 'fail';
    captcha: string;
    raw?: string;
    error?: string;
}

export interface CaptchaResult {
    status: boolean;
    key?: string;
    captcha?: string;
    msg?: string;
}

// ── Encrypted payload ─────────────────────────────────────────────────
export interface EncryptedPayload {
    d: string;  // base64(iv + AES ciphertext)
    k: string;  // base64(RSA encrypted AES key)
}

// ── VCB API URLs ──────────────────────────────────────────────────────
export interface VcbUrls {
    getCaptcha: string;
    login: string;
    authenService: string;
    getHistories: string;
    transferOut: string;
    genOtpOut: string;
    genOtpIn: string;
    confirmTransferOut: string;
    confirmTransferIn: string;
    transferIn: string;
    getBanks: string;
    getAccountDetail: string;
    getListAccount: string;
    getListDDAccount: string;
}

// ── Persisted data ────────────────────────────────────────────────────
export interface VcbSessionData {
    username: string;
    password: string;
    account_number: string;
    sessionId: string;
    mobileId: string;
    clientId: string;
    cif: string;
    E: string;
    res: any;
    tranId: string;
    browserToken: string;
    browserId: string;
}

// ── API param (base fields) ──────────────────────────────────────────
export interface BaseParam {
    DT: string;
    OV: string;
    PM: string;
    E: string;
    browserId: string;
    lang: string;
    mid: number;
    cif: string;
    user: string;
    mobileId: string;
    clientId: string;
    sessionId: string;
    [key: string]: any;
}

// ── VCB API response (generic) ───────────────────────────────────────
export interface VcbApiResponse {
    code?: number;
    mid?: number;
    des?: string;
    sessionId?: string;
    browserToken?: string;
    tranId?: string;
    challenge?: string;
    userInfo?: {
        mobileId: string;
        clientId: string;
        cif: string;
    };
    transaction?: {
        tranId: string;
    };
    [key: string]: any;
}

// ── API result wrappers ──────────────────────────────────────────────
export interface ApiResult {
    success: boolean;
    message: string;
    session?: SessionInfo;
    param?: Record<string, any>;
    data?: any;
    result?: {
        browserToken: string;
        tranId: string;
        challenge: string;
    };
    d?: any;
}

export interface SessionInfo {
    sessionId: string;
    mobileId: string;
    clientId: string;
    cif: string;
}

// ── Transfer types ───────────────────────────────────────────────────
export type TransferDirection = 'IN' | 'OUT';
export type OtpType = 1 | 5;  // 1 = SMS, 5 = Smart OTP
