import { Alert } from 'react-native';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET, CLOUDINARY_UPLOAD_URL } from "@env";

export interface CloudinaryUploadOptions {
    onUploadStart?: () => void;
    onUploadEnd?: () => void;
    onUploadProgress?: (progress: number) => void;
}

export class CloudinaryService {
    private static instance: CloudinaryService;

    private constructor() { }

    public static getInstance(): CloudinaryService {
        if (!CloudinaryService.instance) {
            CloudinaryService.instance = new CloudinaryService();
        }
        return CloudinaryService.instance;
    }

    /**
     * Upload a file to Cloudinary
     * @param fileUri - The local file URI
     * @param fileType - The type of file ('image' | 'audio')
     * @param options - Optional callbacks for upload lifecycle
     * @returns Promise<string | null> - The secure URL of the uploaded file or null if failed
     */
    public async uploadFile(
        fileUri: string,
        fileType: 'image' | 'audio',
        options?: CloudinaryUploadOptions
    ): Promise<string | null> {
        try {
            // Validate environment variables
            if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET || !CLOUDINARY_UPLOAD_URL) {
                throw new Error('Cloudinary configuration is missing');
            }

            // Call onUploadStart callback if provided
            options?.onUploadStart?.();

            const formData = new FormData();
            const fileName = fileUri.split('/').pop() || 'file';
            const mimeType = this.getMimeType(fileType);

            formData.append('file', {
                uri: fileUri,
                type: mimeType,
                name: fileName,
            } as any);

            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            formData.append('cloud_name', CLOUDINARY_CLOUD_NAME);

            const response = await fetch(CLOUDINARY_UPLOAD_URL, {
                method: 'POST',
                body: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // Validate response
            if (!data.secure_url) {
                throw new Error('Invalid response from Cloudinary');
            }

            console.log(`✅ Successfully uploaded ${fileType} to Cloudinary:`, data.secure_url);
            return data.secure_url;

        } catch (error) {
            console.error('❌ Cloudinary upload error:', error);
            Alert.alert(
                'Upload Failed',
                `Failed to upload ${fileType}. Please try again.`,
                [{ text: 'OK' }]
            );
            return null;
        } finally {
            // Call onUploadEnd callback if provided
            options?.onUploadEnd?.();
        }
    }

    /**
     * Upload an image to Cloudinary
     * @param imageUri - The local image URI
     * @param options - Optional callbacks for upload lifecycle
     * @returns Promise<string | null>
     */
    public async uploadImage(imageUri: string, options?: CloudinaryUploadOptions): Promise<string | null> {
        return this.uploadFile(imageUri, 'image', options);
    }

    /**
     * Upload an audio file to Cloudinary
     * @param audioUri - The local audio URI
     * @param options - Optional callbacks for upload lifecycle
     * @returns Promise<string | null>
     */
    public async uploadAudio(audioUri: string, options?: CloudinaryUploadOptions): Promise<string | null> {
        return this.uploadFile(audioUri, 'audio', options);
    }

    /**
     * Get MIME type based on file type
     * @param fileType - The type of file
     * @returns string - The corresponding MIME type
     */
    private getMimeType(fileType: 'image' | 'audio'): string {
        switch (fileType) {
            case 'image':
                return 'image/jpeg';
            case 'audio':
                return 'audio/mpeg';
            default:
                return 'application/octet-stream';
        }
    }

    /**
     * Check if Cloudinary is properly configured
     * @returns boolean - True if all required environment variables are set
     */
    public isConfigured(): boolean {
        return !!(CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET && CLOUDINARY_UPLOAD_URL);
    }

    /**
     * Get Cloudinary configuration status
     * @returns object - Configuration status details
     */
    public getConfigurationStatus() {
        return {
            isConfigured: this.isConfigured(),
            cloudName: !!CLOUDINARY_CLOUD_NAME,
            uploadPreset: !!CLOUDINARY_UPLOAD_PRESET,
            uploadUrl: !!CLOUDINARY_UPLOAD_URL,
        };
    }
}

// Export singleton instance for convenience
export const cloudinaryService = CloudinaryService.getInstance();