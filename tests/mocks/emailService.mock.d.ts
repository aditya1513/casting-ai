export interface EmailMockOptions {
    shouldFail?: boolean;
    delay?: number;
    trackCalls?: boolean;
}
export declare class EmailServiceMock {
    private static sentEmails;
    private static options;
    static setup(options?: EmailMockOptions): void;
    static sendEmail(to: string, subject: string, html: string, text?: string): Promise<{
        messageId: string;
        accepted: string[];
        rejected: never[];
        pending: never[];
    }>;
    static sendVerificationEmail(to: string, token: string): Promise<{
        messageId: string;
        accepted: string[];
        rejected: never[];
        pending: never[];
    }>;
    static sendPasswordResetEmail(to: string, token: string): Promise<{
        messageId: string;
        accepted: string[];
        rejected: never[];
        pending: never[];
    }>;
    static sendAuditionNotification(to: string, auditionDetails: any): Promise<{
        messageId: string;
        accepted: string[];
        rejected: never[];
        pending: never[];
    }>;
    static sendWelcomeEmail(to: string, userName: string): Promise<{
        messageId: string;
        accepted: string[];
        rejected: never[];
        pending: never[];
    }>;
    static sendRoleMatchNotification(to: string, matches: any[]): Promise<{
        messageId: string;
        accepted: string[];
        rejected: never[];
        pending: never[];
    }>;
    static getSentEmails(): any[];
    static getLastEmail(): any;
    static findEmail(predicate: (email: any) => boolean): any;
    static clearSentEmails(): void;
    static getEmailCount(): number;
    static hasEmailBeenSent(to: string, subject?: string): boolean;
    static extractTokenFromEmail(email: any, tokenPattern?: RegExp): string | null;
    static reset(): void;
}
export declare const createEmailServiceMock: () => {
    sendEmail: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
    sendVerificationEmail: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
    sendPasswordResetEmail: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
    sendAuditionNotification: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
    sendWelcomeEmail: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
    sendRoleMatchNotification: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
};
//# sourceMappingURL=emailService.mock.d.ts.map