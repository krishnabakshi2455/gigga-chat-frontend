import { Alert } from 'react-native';
import {
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_UPLOAD_PRESET,
    BACKEND_API_URL
} from "@env";

export interface CloudinaryUploadOptions {
    onUploadStart?: () => void;
    onUploadEnd?: () => void;
    onUploadProgress?: (progress: number) => void;
}

export interface DeleteMediaRequest {
    publicId: string;
    resourceType: 'image' | 'video';
}

export interface DeleteMediaResponse {
    success: boolean;
    message: string;
    result?: any;
}

export class CloudinaryService {
    private static instance: CloudinaryService;

    private constructor() {
        console.log('🔧 Cloudinary Configuration Status:', {
            cloudName: CLOUDINARY_CLOUD_NAME ? `✅ ${CLOUDINARY_CLOUD_NAME}` : '❌ Missing',
            uploadPreset: CLOUDINARY_UPLOAD_PRESET ? '✅ Set' : '❌ Missing',
            backendUrl: BACKEND_API_URL ? `✅ ${BACKEND_API_URL}` : '❌ Missing'
        });
    }

    public static getInstance(): CloudinaryService {
        if (!CloudinaryService.instance) {
            CloudinaryService.instance = new CloudinaryService();
        }
        return CloudinaryService.instance;
    }

    private getUploadUrl(resourceType: 'image' | 'video' | 'raw' | 'auto'): string {
        return `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;
    }

    private getMimeType(fileUri: string): string {
        const extension = fileUri.split('.').pop()?.toLowerCase() || '';

        const mimeTypes: { [key: string]: string } = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'bmp': 'image/bmp',
            'heic': 'image/heic',
            'heif': 'image/heif',
            'm4a': 'audio/mp4',
            'mp3': 'audio/mpeg',
            'wav': 'audio/wav',
            'aac': 'audio/aac',
            'ogg': 'audio/ogg',
            'webm': 'audio/webm',
            'mp4': 'video/mp4',
            'mov': 'video/quicktime',
            'avi': 'video/x-msvideo',
        };

        return mimeTypes[extension] || 'application/octet-stream';
    }

    private getResourceType(fileType: 'image' | 'audio'): 'image' | 'video' {
        return fileType === 'audio' ? 'video' : 'image';
    }

    public async uploadFile(
        fileUri: string,
        fileType: 'image' | 'audio',
        options?: CloudinaryUploadOptions
    ): Promise<string | null> {
        try {
            if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
                throw new Error('Cloudinary configuration is missing. Please check CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET in your .env file');
            }

            options?.onUploadStart?.();

            const fileName = fileUri.split('/').pop() || `file_${Date.now()}`;
            const mimeType = this.getMimeType(fileUri);
            const resourceType = this.getResourceType(fileType);
            const uploadUrl = this.getUploadUrl(resourceType);

            console.log('📤 Preparing upload to Cloudinary:', {
                fileName,
                fileUri,
                mimeType,
                fileType,
                resourceType,
                uploadUrl,
                cloudName: CLOUDINARY_CLOUD_NAME,
                uploadPreset: CLOUDINARY_UPLOAD_PRESET,
            });

            const formData = new FormData();

            formData.append('file', {
                uri: fileUri,
                type: mimeType,
                name: fileName,
            } as any);

            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            formData.append('cloud_name', CLOUDINARY_CLOUD_NAME);
            formData.append('timestamp', Date.now().toString());

            console.log('🚀 Sending upload request...');

            const response = await fetch(uploadUrl, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json',
                },
            });

            const responseText = await response.text();

            console.log('📥 Cloudinary response:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                headers: Object.fromEntries(response.headers.entries()),
                bodyPreview: responseText.substring(0, 500),
            });

            if (!response.ok) {
                let errorMessage = `Upload failed with status ${response.status}`;

                try {
                    const errorData = JSON.parse(responseText);
                    errorMessage = errorData.error?.message || errorMessage;
                    console.error('❌ Cloudinary error details:', errorData);
                } catch (e) {
                    console.error('❌ Raw error response:', responseText);
                }

                throw new Error(errorMessage);
            }

            const data = JSON.parse(responseText);

            if (!data.secure_url) {
                console.error('❌ Invalid Cloudinary response:', data);
                throw new Error('Invalid response from Cloudinary - no secure_url provided');
            }

            console.log(`✅ Successfully uploaded ${fileType} to Cloudinary:`, {
                url: data.secure_url,
                publicId: data.public_id,
                format: data.format,
                resourceType: data.resource_type,
                size: data.bytes,
            });

            return data.secure_url;

        } catch (error: any) {
            console.error('❌ Cloudinary upload error:', {
                message: error.message,
                stack: error.stack,
                fileUri,
                fileType,
            });

            Alert.alert(
                'Upload Failed',
                `Failed to upload ${fileType}.\n\n${error.message}\n\nPlease check:\n• Internet connection\n• Cloudinary configuration\n• File permissions`,
                [{ text: 'OK' }]
            );

            return null;
        } finally {
            options?.onUploadEnd?.();
        }
    }

    public async uploadImage(imageUri: string, options?: CloudinaryUploadOptions): Promise<string | null> {
        console.log('📸 Starting image upload...');
        return this.uploadFile(imageUri, 'image', options);
    }

    public async uploadAudio(audioUri: string, options?: CloudinaryUploadOptions): Promise<string | null> {
        console.log('🎤 Starting audio upload...');
        return this.uploadFile(audioUri, 'audio', options);
    }

    // DELETE METHODS
    public async deleteMedia(
        mediaUrl: string,
        resourceType: 'image' | 'video' = 'image',
        userToken: string
    ): Promise<boolean> {
        try {
            const publicId = this.extractPublicId(mediaUrl);

            if (!publicId) {
                console.warn('❌ Could not extract public_id from URL:', mediaUrl);
                return false;
            }

            if (!userToken) {
                throw new Error('User token is required for media deletion');
            }

            if (!BACKEND_API_URL) {
                throw new Error('BACKEND_API_URL is not configured');
            }

            const deleteRequest: DeleteMediaRequest = {
                publicId,
                resourceType
            };

            console.log('🗑️ Sending deletion request to backend:', deleteRequest);

            const response = await fetch(`${BACKEND_API_URL}/api/cloudinary/delete-media`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userToken}`,
                },
                body: JSON.stringify(deleteRequest),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Backend deletion failed: ${response.status} - ${errorText}`);
            }

            const result: DeleteMediaResponse = await response.json();

            if (!result.success) {
                throw new Error(result.message);
            }

            console.log('✅ Successfully deleted media from Cloudinary:', publicId);
            return true;

        } catch (error: any) {
            console.error('❌ Delete media error:', error);

            Alert.alert(
                'Deletion Failed',
                `Could not delete media from server: ${error.message}`,
                [{ text: 'OK' }]
            );

            return false;
        }
    }

    public async deleteMultipleMedia(
        mediaUrls: string[],
        userToken: string
    ): Promise<number> {
        let deletedCount = 0;

        for (const url of mediaUrls) {
            const resourceType = this.getResourceTypeFromUrl(url);
            const success = await this.deleteMedia(url, resourceType, userToken);
            if (success) deletedCount++;
        }

        console.log(`🗑️ Deleted ${deletedCount}/${mediaUrls.length} files from Cloudinary`);
        return deletedCount;
    }

    private getResourceTypeFromUrl(url: string): 'image' | 'video' {
        const audioExtensions = ['.m4a', '.mp3', '.wav', '.aac', '.ogg', '.webm'];
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.heic', '.heif'];

        const extension = url.toLowerCase().split('.').pop() || '';

        if (audioExtensions.includes(`.${extension}`)) {
            return 'video';
        }

        return 'image';
    }

    private extractPublicId(url: string): string | null {
        try {
            const cloudinaryRegex = /res\.cloudinary\.com\/[^/]+\/(image|video)\/upload\/(?:v\d+\/)?(.+?)\.\w+$/;
            const match = url.match(cloudinaryRegex);
            return match ? match[2] : null;
        } catch (error) {
            console.error('Error extracting public_id:', error);
            return null;
        }
    }

    public isConfigured(): boolean {
        const configured = !!(CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET && BACKEND_API_URL);

        if (!configured) {
            console.warn('⚠️ Cloudinary/Backend is not properly configured!');
        }

        return configured;
    }

    public getConfigurationStatus() {
        return {
            isConfigured: this.isConfigured(),
            cloudName: !!CLOUDINARY_CLOUD_NAME,
            uploadPreset: !!CLOUDINARY_UPLOAD_PRESET,
            backendUrl: !!BACKEND_API_URL,
            details: {
                cloudName: CLOUDINARY_CLOUD_NAME || 'NOT SET',
                uploadPreset: CLOUDINARY_UPLOAD_PRESET ? 'SET' : 'NOT SET',
                backendUrl: BACKEND_API_URL || 'NOT SET',
            }
        };
    }

    public async testConfiguration(): Promise<boolean> {
        try {
            console.log('🧪 Testing Cloudinary configuration...');

            if (!this.isConfigured()) {
                console.error('❌ Configuration test failed: Missing credentials');
                return false;
            }

            const testUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/list`;
            const response = await fetch(testUrl);

            console.log('✅ Cloudinary endpoint is accessible:', response.status);
            return response.status === 200 || response.status === 401;

        } catch (error) {
            console.error('❌ Configuration test failed:', error);
            return false;
        }
    }
}

export const cloudinaryService = CloudinaryService.getInstance();