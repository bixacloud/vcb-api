import { CaptchaSolver } from './CaptchaSolver';
import { VcbApiResponse, CaptchaResult, CaptchaSolveResult, ApiResult, TransferDirection, OtpType } from './types';
export declare class VietCombank {
    private readonly defaultPublicKey;
    private readonly clientPublicKey;
    private readonly clientPrivateKey;
    private readonly urls;
    private readonly lang;
    private readonly _timeout;
    private readonly DT;
    private readonly OV;
    private readonly PM;
    private readonly checkAcctPkg;
    private proxy;
    private username;
    private password;
    private accountNumber;
    private sessionId;
    private mobileId;
    private clientId;
    private cif;
    private res;
    private browserToken;
    private browserId;
    private E;
    private tranId;
    private captchaToken;
    private captchaValue;
    readonly captchaSolver: CaptchaSolver;
    private readonly file;
    constructor(username: string, password: string, accountNumber: string);
    private saveData;
    private parseData;
    /** Tạo random string */
    static randomString(len: number): string;
    /** Tạo E – UUID-like string */
    private getE;
    /** Headers gửi kèm mỗi request */
    private getHeaders;
    private encryptData;
    private decryptData;
    private curlPost;
    getCaptcha(): Promise<string>;
    /** Giải captcha bằng Tesseract OCR local */
    solveCaptchaLocal(imageBase64: string): Promise<CaptchaSolveResult>;
    /** Fallback: Gọi API giải captcha bên thứ 3 */
    solveCaptchaRemote(imageBase64: string): Promise<CaptchaSolveResult>;
    /** Giải captcha — ưu tiên OCR local, retry tối đa 3 lần */
    solveCaptcha(): Promise<CaptchaResult>;
    checkBrowser(type?: number): Promise<ApiResult>;
    chooseOtpType(tranID: string, type?: number): Promise<ApiResult>;
    submitOtpLogin(otp: string): Promise<ApiResult>;
    saveBrowser(): Promise<VcbApiResponse | false>;
    doLogin(username?: string, password?: string): Promise<ApiResult | CaptchaResult>;
    getListAccount(): Promise<VcbApiResponse | false>;
    getListDDAccount(): Promise<VcbApiResponse | false>;
    getAccountDetail(): Promise<VcbApiResponse | false>;
    getHistories(toDate: string, accountNumber?: string, page?: number): Promise<VcbApiResponse | false>;
    getBanks(): Promise<VcbApiResponse | false>;
    genOtpTransfer(tranId: string, type?: TransferDirection, otpType?: OtpType): Promise<VcbApiResponse | CaptchaResult | false>;
    confirmTransfer(tranId: string, challenge: string, otp: string, type?: TransferDirection, otpType?: OtpType): Promise<VcbApiResponse | false>;
    setData(sessionId: string, mobileId: string, clientId: string, cif: string): this;
}
//# sourceMappingURL=VietCombank.d.ts.map