import { Alert } from 'react-native';
import { ExtendedMessage } from '../lib/types';

class MessageDeletionService {
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
     * Check if message is a temporary/unsent message
     * Temporary messages typically have IDs that start with 'temp_' or similar patterns
     */
    private isTemporaryMessage(messageId: string): boolean {
        // Common patterns for temporary message IDs
        return (
            messageId.startsWith('temp_') ||
            messageId.startsWith('local_') ||
            messageId.startsWith('pending_')
        );
    }

    /**
     * Delete message from MongoDB AND Cloudinary (backend handles both in one request)
     * Returns an object with success status and whether the message was found
     */
    private async deleteMessage(message: ExtendedMessage): Promise<{
        success: boolean;
        found: boolean;
    }> {
        try {
            // Check if this is a temporary message that was never saved
            if (this.isTemporaryMessage(message._id)) {
                console.log('📝 Temporary message detected, skipping backend deletion:', message._id);
                return { success: true, found: false };
            }

            const url = `${this.baseUrl}/api/delete/messages/${message._id}`;

            // console.log('🗄️ Deleting message (MongoDB + Cloudinary):', {
            //     messageId: message._id,
            //     messageType: message.messageType,
            //     hasMedia: this.hasMedia(message),
            //     conversationId: message.conversation_id
            // });

            const response = await fetch(url, {
                method: 'DELETE',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    messageType: message.messageType,
                    mediaUrl: this.getMediaUrl(message),
                    conversation_id: message.conversation_id
                })
            });

            console.log('📥 Backend deletion response:', response.status, response.statusText);

            const contentType = response.headers.get('content-type');

            if (!contentType || !contentType.includes('application/json')) {
                const textResponse = await response.text();
                console.error('❌ Non-JSON response from backend:', textResponse.substring(0, 200));
                return { success: false, found: false };
            }

            const data = await response.json();

            if (!response.ok) {
                console.error('❌ Backend deletion error:', data.message);
                return { success: false, found: true };
            }

            // console.log('✅ Message deleted successfully:', {
            //     deletedFromDB: data.deletedFromDB,
            //     deletedFromCloudinary: data.deletedFromCloudinary
            // });

            return { success: true, found: true };

        } catch (error: any) {
            console.error('❌ Error deleting message:', error.message);
            return { success: false, found: false };
        }
    }

    /**
     * Delete a single message (text, image, audio, or video)
     * Backend handles both MongoDB deletion and Cloudinary deletion in one request
     * Works with temporary/unsent messages
     */
    async deleteSingleMessage(message: ExtendedMessage): Promise<boolean> {
        try {
            // console.log('🗑️ Starting deletion process for message:', {
            //     id: message._id,
            //     type: message.messageType,
            //     hasMedia: this.hasMedia(message),
            //     isTemporary: this.isTemporaryMessage(message._id)
            // });

            const isTemporary = this.isTemporaryMessage(message._id);

            // Single DELETE request - backend handles both MongoDB and Cloudinary
            const result = await this.deleteMessage(message);

            if (!result.success && result.found) {
                // Message exists in backend but failed to delete
                Alert.alert('Error', 'Failed to delete message from server');
                return false;
            }

            // Provide feedback for temporary messages
            if (isTemporary || !result.found) {
                console.log('✅ Temporary/unsent message removed from local view');
            } else {
                console.log('✅ Message deletion completed successfully');
            }

            return true;

        } catch (error: any) {
            console.error('❌ Unexpected error during deletion:', error);
            Alert.alert(
                'Network Error',
                `Could not connect to server: ${error.message}`
            );
            return false;
        }
    }

    /**
     * Delete multiple messages in a batch operation
     * Handles both saved and temporary/unsent messages
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

            console.log(`🗑️ Batch deleting ${messages.length} message(s)`);

            // Filter messages by type
            const textMessages = messages.filter(m => m.messageType === 'text');
            const mediaMessages = messages.filter(m => this.hasMedia(m));
            const temporaryMessages = messages.filter(m => this.isTemporaryMessage(m._id));

            console.log('📊 Message breakdown:', {
                total: messages.length,
                text: textMessages.length,
                media: mediaMessages.length,
                temporary: temporaryMessages.length
            });

            let totalDeleted = 0;
            let totalFailed = 0;

            // Process each message individually
            // This ensures proper sequential deletion from both MongoDB and Cloudinary
            for (const message of messages) {
                const success = await this.deleteSingleMessage(message);
                if (success) {
                    totalDeleted++;
                } else {
                    totalFailed++;
                }
            }

            console.log('✅ Batch delete result:', {
                deleted: totalDeleted,
                failed: totalFailed
            });

            // Show result to user
            if (totalDeleted > 0) {
                const message = totalFailed > 0
                    ? `Deleted ${totalDeleted} message(s). ${totalFailed} failed.`
                    : `Successfully deleted ${totalDeleted} message(s)`;

                Alert.alert('Success', message);
            } else if (totalFailed > 0) {
                Alert.alert('Error', 'Failed to delete messages');
            }

            return {
                success: totalDeleted > 0,
                deletedCount: totalDeleted,
                failedCount: totalFailed,
            };

        } catch (error: any) {
            console.error('❌ Network error during batch deletion:', error);
            Alert.alert(
                'Network Error',
                `Could not connect to server: ${error.message}`
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
        const textCount = messageCount - mediaCount;

        let confirmMessage = `Are you sure you want to delete ${messageCount} message(s)?`;

        if (textCount > 0 && mediaCount > 0) {
            confirmMessage += `\n\n${textCount} text message(s) and ${mediaCount} media message(s).`;
        } else if (mediaCount > 0) {
            confirmMessage += `\n\nThis includes ${mediaCount} media file(s).`;
        }

        if (mediaCount > 0) {
            confirmMessage += '\n\nMedia files will be deleted from cloud storage.';
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
export const messageDeletionService = new MessageDeletionService(
    process.env.BACKEND_URL || 'http://localhost:8000'
);

export default MessageDeletionService;