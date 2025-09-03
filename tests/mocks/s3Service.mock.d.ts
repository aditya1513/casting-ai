export interface S3MockOptions {
    shouldFail?: boolean;
    delay?: number;
    maxFileSize?: number;
    allowedMimeTypes?: string[];
}
export declare class S3ServiceMock {
    private static uploadedFiles;
    private static options;
    static setup(options?: S3MockOptions): void;
    static uploadFile(file: any, folder?: string): Promise<{
        Location: string;
        Key: string;
        Bucket: string;
        ETag: string;
        ServerSideEncryption: string;
    }>;
    static uploadProfilePicture(userId: string, file: any): Promise<{
        url: string;
        key: string;
    }>;
    static uploadDocument(userId: string, file: any, documentType: string): Promise<{
        url: string;
        key: string;
        documentType: string;
    }>;
    static uploadVideo(projectId: string, file: any, videoType: 'audition' | 'showreel'): Promise<{
        url: string;
        key: string;
        videoType: "audition" | "showreel";
        duration: number;
    }>;
    static deleteFile(key: string): Promise<{
        DeleteMarker: boolean;
        VersionId: string;
    }>;
    static getSignedUrl(key: string, expiresIn?: number): Promise<string>;
    static getUploadPresignedUrl(key: string, contentType: string, expiresIn?: number): Promise<{
        url: string;
        fields: {
            'Content-Type': string;
            key: string;
            bucket: string;
            'X-Amz-Algorithm': string;
            'X-Amz-Credential': string;
            'X-Amz-Date': string;
            Policy: string;
            'X-Amz-Signature': string;
        };
    }>;
    static copyFile(sourceKey: string, destinationKey: string): Promise<{
        CopyObjectResult: {
            ETag: string;
            LastModified: Date;
        };
    }>;
    static getUploadedFiles(): any[];
    static getFile(key: string): any;
    static getFileCount(): number;
    static hasFile(key: string): boolean;
    static getTotalSize(): any;
    static clearUploadedFiles(): void;
    static reset(): void;
}
export declare const createS3ServiceMock: () => {
    uploadFile: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
    uploadProfilePicture: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
    uploadDocument: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
    uploadVideo: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
    deleteFile: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
    getSignedUrl: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
    getUploadPresignedUrl: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
    copyFile: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
};
//# sourceMappingURL=s3Service.mock.d.ts.map