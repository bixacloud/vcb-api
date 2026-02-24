/**
 * Interfaces & Types cho toàn bộ project VCB API
 */
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
export interface EncryptedPayload {
    d: string;
    k: string;
}
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
export type TransferDirection = 'IN' | 'OUT';
export type OtpType = 1 | 5;
//# sourceMappingURL=types.d.ts.map