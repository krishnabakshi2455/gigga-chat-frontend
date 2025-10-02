import { Alert } from 'react-native';
import { ExtendedMessage } from '../lib/types';

interface DeleteMessageRequest {
    messageType: string;
    mediaUrl?: string;
}

interface BatchDeleteRequest {
    messages: Array<{
        messageId: string;
        messageType: string;
        mediaUrl?: string;
    }>;
}

interface DeleteResponse {
    success: boolean;
    message: string;
    deletedMessageId?: string;
}

interface BatchDeleteResponse {
    success: boolean;
    deletedCount: number;
    failedCount: number;
    errors?: string[];
}

class MediaDeletionService {
    private baseUrl: string;
    private userToken: string | null = null;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    /**
     * Set the authentication token for API requests
     */
    setAuthToken(token: string) {
        this.userToken = token;
    }

    /**
     * Get headers for API requests
     */
    private getHeaders(): HeadersInit {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (this.userToken) {
            headers['Authorization'] = `Bearer ${this.userToken}`;
        }

        return headers;
    }

    /**
     * Check if a message has media that needs to be deleted from Cloudinary
     */
    private hasMedia(message: ExtendedMessage): boolean {
        const { messageType, imageUrl, audioUrl, videoUrl } = message;

        if (messageType === 'image' && imageUrl) return true;
        if (messageType === 'audio' && audioUrl) return true;
        if (messageType === 'video' && videoUrl) return true;

        return false;
    }

    /**
     * Get the media URL based on message type
     */
    private getMediaUrl(message: ExtendedMessage): string | undefined {
        switch (message.messageType) {
            case 'image':
                return message.imageUrl;
            case 'audio':
                return message.audioUrl;
            case 'video':
                return message.videoUrl;
            default:
                return undefined;
        }
    }

    /**
     * Delete a single message (text, image, audio, or video)
     * Works with both saved messages and temporary messages
     */
    async deleteSingleMessage(message: ExtendedMessage): Promise<boolean> {
        try {
            const url = `${this.baseUrl}/api/delete/messages/${message._id}`;

            console.log('🗑️ Attempting to delete message:', {
                id: message._id,
                type: message.messageType,
                hasMedia: this.hasMedia(message),
                url: url
            });

            const requestBody: DeleteMessageRequest = {
                messageType: message.messageType,
            };

            // Add media URL if the message has media
            if (this.hasMedia(message)) {
                requestBody.mediaUrl = this.getMediaUrl(message);
                console.log('📎 Media URL to delete:', requestBody.mediaUrl);
            }

            console.log('📤 Request details:', {
                url,
                method: 'DELETE',
                headers: this.getHeaders(),
                body: requestBody
            });

            const response = await fetch(url, {
                method: 'DELETE',
                headers: this.getHeaders(),
                body: JSON.stringify(requestBody),
            });

            console.log('📥 Response status:', response.status, response.statusText);

            // Check content type before parsing
            const contentType = response.headers.get('content-type');
            console.log('📄 Response content-type:', contentType);

            if (!contentType || !contentType.includes('application/json')) {
                const textResponse = await response.text();
                console.error('❌ Non-JSON response received:', textResponse.substring(0, 200));
                Alert.alert(
                    'Server Error',
                    'The server returned an invalid response. Please check if the API endpoint is correct.'
                );
                return false;
            }

            const data: DeleteResponse = await response.json();

            if (!response.ok) {
                console.error('❌ Server error:', data.message);
                Alert.alert('Error', data.message || 'Failed to delete message');
                return false;
            }

            if (data.success) {
                console.log('✅ Message deleted successfully:', message._id);
                return true;
            } else {
                console.error('❌ Deletion failed:', data.message);
                Alert.alert('Error', data.message || 'Failed to delete message');
                return false;
            }

        } catch (error: any) {
            console.error('❌ Network error during deletion:', error);
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            Alert.alert(
                'Network Error',
                `Could not connect to server: ${error.message}\n\nPlease check your API URL configuration.`
            );
            return false;
        }
    }

    /**
     * Delete multiple messages in a batch operation
     */
    async deleteBatchMessages(messages: ExtendedMessage[]): Promise<{
        success: boolean;
        deletedCount: number;
        failedCount: number;
    }> {
        try {
            if (!messages || messages.length === 0) {
                console.warn('⚠️ No messages to delete');
                return { success: false, deletedCount: 0, failedCount: 0 };
            }

            const url = `${this.baseUrl}/api/delete/messages/batch-delete`;
            console.log(`🗑️ Batch deleting ${messages.length} message(s)`);
            console.log('📤 Batch delete URL:', url);

            // Prepare batch request
            const batchRequest: BatchDeleteRequest = {
                messages: messages.map(msg => ({
                    messageId: msg._id,
                    messageType: msg.messageType,
                    mediaUrl: this.getMediaUrl(msg),
                }))
            };

            // Log media messages being deleted
            const mediaMessages = batchRequest.messages.filter(m => m.mediaUrl);
            if (mediaMessages.length > 0) {
                console.log(`📎 Deleting ${mediaMessages.length} media file(s) from Cloudinary`);
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(batchRequest),
            });

            console.log('📥 Batch response status:', response.status, response.statusText);

            // Check content type before parsing
            const contentType = response.headers.get('content-type');
            console.log('📄 Response content-type:', contentType);

            if (!contentType || !contentType.includes('application/json')) {
                const textResponse = await response.text();
                console.error('❌ Non-JSON response received:', textResponse.substring(0, 200));
                Alert.alert(
                    'Server Error',
                    'The server returned an invalid response. Please check if the API endpoint is correct.'
                );
                return { success: false, deletedCount: 0, failedCount: messages.length };
            }

            const data: BatchDeleteResponse = await response.json();

            if (!response.ok) {
                console.error('❌ Batch delete server error:', data);
                Alert.alert('Error', 'Failed to delete messages');
                return { success: false, deletedCount: 0, failedCount: messages.length };
            }

            console.log('✅ Batch delete result:', {
                deleted: data.deletedCount,
                failed: data.failedCount
            });

            // Show result to user
            if (data.deletedCount > 0) {
                const message = data.failedCount > 0
                    ? `Deleted ${data.deletedCount} message(s). ${data.failedCount} failed.`
                    : `Successfully deleted ${data.deletedCount} message(s)`;

                Alert.alert('Success', message);
            }

            if (data.errors && data.errors.length > 0) {
                console.error('⚠️ Deletion errors:', data.errors);
            }

            return {
                success: data.success,
                deletedCount: data.deletedCount,
                failedCount: data.failedCount,
            };

        } catch (error: any) {
            console.error('❌ Network error during batch deletion:', error);
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            Alert.alert(
                'Network Error',
                `Could not connect to server: ${error.message}\n\nPlease check your API URL configuration.`
            );
            return { success: false, deletedCount: 0, failedCount: messages.length };
        }
    }

    /**
     * Delete messages with confirmation dialog
     */
    async deleteMessagesWithConfirmation(
        messages: ExtendedMessage[],
        onSuccess: () => void
    ): Promise<void> {
        const messageCount = messages.length;
        const mediaCount = messages.filter(m => this.hasMedia(m)).length;

        let confirmMessage = `Are you sure you want to delete ${messageCount} message(s)?`;
        if (mediaCount > 0) {
            confirmMessage += `\n\nThis will also delete ${mediaCount} media file(s) from cloud storage.`;
        }

        Alert.alert(
            'Delete Messages',
            confirmMessage,
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        if (messageCount === 1) {
                            const success = await this.deleteSingleMessage(messages[0]);
                            if (success) {
                                onSuccess();
                            }
                        } else {
                            const result = await this.deleteBatchMessages(messages);
                            if (result.deletedCount > 0) {
                                onSuccess();
                            }
                        }
                    },
                },
            ]
        );
    }
}

// Export singleton instance
// IMPORTANT: The base URL should NOT include /api since routes will add it
// Example: 'http://localhost:8000' or 'http://192.168.1.x:8000'
export const mediaDeletionService = new MediaDeletionService(
    process.env.BACKEND_URL || 'http://localhost:8000'
);

export default MediaDeletionService;