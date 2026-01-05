import { Alert } from "react-native";
import { socketService } from "../services/socketServices";
import { BackendMessageData, ExtendedMessage } from "../lib/types/types";
import { BACKEND_URL } from "@env";

export class MessageService {
    private typingTimeoutRef: NodeJS.Timeout | null = null;
    private debouncedTypingHandler: NodeJS.Timeout | null = null;
    private baseURL = `${BACKEND_URL}`;

    // Helper method to make API calls
    private async makeApiCall(endpoint: string, options: RequestInit = {}) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
                ...options,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }

    // NEW: Fetch messages between two users
    async fetchMessages(
        userId: string,
        recipientId: string,
        limit: number = 50,
        skip: number = 0
    ): Promise<ExtendedMessage[]> {
        try {
            // console.log('📥 Fetching messages between:', userId, 'and', recipientId);

            const response = await this.makeApiCall(
                `/api/messages/${userId}/${recipientId}?limit=${limit}&skip=${skip}`,
                { method: 'GET' }
            );
            

            if (response.success && response.data) {
                console.log('✅ Fetched', response.data.length, 'messages from backend');
                return response.data;
            }

            return [];
        } catch (error) {
            console.error('❌ Failed to fetch messages:', error);
            return [];
        }
    }

    // NEW: Fetch all conversations for a user
    async fetchConversations(userId: string): Promise<any[]> {
        try {
            console.log('📥 Fetching conversations for user:', userId);

            const response = await this.makeApiCall(
                `/api/conversations/${userId}`,
                { method: 'GET' }
            );

            if (response.success && response.data) {
                console.log('✅ Fetched', response.data.length, 'conversations');
                return response.data;
            }

            return [];
        } catch (error) {
            console.error('❌ Failed to fetch conversations:', error);
            return [];
        }
    }

    // Save message to backend
    private async saveMessageToBackend(messageData: BackendMessageData): Promise<any> {
        try {
            const response = await this.makeApiCall('/api/messages', {
                method: 'POST',
                body: JSON.stringify(messageData),
            });

            console.log('✅ Message saved to backend:', response);
            return response;
        } catch (error) {
            console.error('❌ Failed to save message to backend:', error);
            return null;
        }
    }

    handleReceiveMessage = (
        data: any,
        _id: string,
        currentUserId: string,
        setMessages: React.Dispatch<React.SetStateAction<ExtendedMessage[]>>,
        scrollToBottom: () => void
    ) => {
        // Only process messages for the current conversation
        if (data.senderId !== _id && data.recipientId !== _id) return;

        const newMessage: ExtendedMessage = {
            _id: data.messageId || `server-${Date.now()}`, // Use server-provided ID if available
            messageType: data.messageType || "text",
            senderId: { _id: data.senderId },
            timeStamp: data.timestamp || new Date().toISOString(),
            message: data.message,
            imageUrl: data.messageType === "image" ? data.message : undefined,
            audioUrl: data.messageType === "audio" ? data.message : undefined,
            conversation_id: this.generateConversationId(data.senderId, data.recipientId),
        };

        // Remove any optimistic message with temp ID and add the real message
        setMessages((prev) => {
            // Check if this message already exists (by content and sender)
            const messageExists = prev.some(msg =>
                (msg._id && msg._id === data.messageId) || // Check by server ID
                (msg.message === data.message &&
                    msg.senderId._id === data.senderId &&
                    msg.messageType === data.messageType)
            );

            if (messageExists) {
                return prev; // Don't add duplicate
            }

            // Filter out temporary messages that might be duplicates
            const filtered = prev.filter(msg =>
                !msg._id.startsWith('temp-') ||
                msg.senderId._id !== data.senderId ||
                msg.message !== data.message
            );

            return [...filtered, newMessage];
        });

        scrollToBottom();
    };

    handleUserTyping = (
        data: any,
        _id: string,
        setIsTyping: React.Dispatch<React.SetStateAction<boolean>>
    ) => {
        if (data.userId === _id) {
            setIsTyping(data.isTyping);

            if (data.isTyping && this.typingTimeoutRef) {
                clearTimeout(this.typingTimeoutRef);
            }

            if (data.isTyping) {
                this.typingTimeoutRef = setTimeout(() => {
                    setIsTyping(false);
                }, 2000);
            }
        }
    };

    handleConversationJoined = (
        data: any,
        setIsOtherUserOnline: React.Dispatch<React.SetStateAction<boolean>>,
        setConnectionStatus: React.Dispatch<
            React.SetStateAction<"connecting" | "connected" | "disconnected">
        >
    ) => {
        setIsOtherUserOnline(data.isOtherUserOnline);
        setConnectionStatus("connected");
    };

    handleUserJoinedConversation = (
        data: any,
        _id: string,
        setIsOtherUserOnline: React.Dispatch<React.SetStateAction<boolean>>
    ) => {
        if (data.connectedUsers.includes(_id)) {
            setIsOtherUserOnline(true);
        }
    };

    handleUserLeftConversation = (
        data: any,
        _id: string,
        setIsOtherUserOnline: React.Dispatch<React.SetStateAction<boolean>>
    ) => {
        if (data.userId === _id) {
            setIsOtherUserOnline(false);
        }
    };

    handleMessageSent = (data: any) => {
        console.log("📤 Message sent confirmation:", data);
        if (data.isReceiverOnline) {
            console.log("✅ Message delivered - receiver is online");
        } else {
            console.log("📱 Message sent - receiver is offline");
        }
    };

    // Updated message sending with backend persistence
    async sendMessage(
        messageType: "text" | "image" | "audio",
        content: string | undefined,
        _id: string,
        userId: string,
        message: string,
        setMessages: React.Dispatch<React.SetStateAction<ExtendedMessage[]>>,
        setMessage: React.Dispatch<React.SetStateAction<string>>,
        scrollToBottom: () => void,
        connectionStatus: "connecting" | "connected" | "disconnected"
    ) {
        try {
            if (!_id || connectionStatus !== "connected") {
                Alert.alert("Error", "Not connected to chat server");
                return false;
            }

            // Determine the actual content based on message type
            let actualContent = "";
            if (messageType === "text") {
                if (!message.trim()) return false;
                actualContent = message;
            } else if ((messageType === "image" || messageType === "audio") && content) {
                actualContent = content;
            }

            // Generate a temporary ID for optimistic UI update
            const tempId = `temp-${Date.now()}`;

            // Create a new message object for optimistic UI update
            const tempMessage: ExtendedMessage = {
                _id: tempId,
                messageType,
                senderId: { _id: userId },
                timeStamp: new Date().toISOString(),
                conversation_id: this.generateConversationId(userId, _id),
            };

            // Set appropriate properties based on message type
            if (messageType === "text") {
                tempMessage.message = actualContent;
            } else if (messageType === "image") {
                tempMessage.imageUrl = actualContent;
            } else if (messageType === "audio") {
                tempMessage.audioUrl = actualContent;
            }

            // Add to local state for optimistic UI update
            setMessages((prev) => [...prev, tempMessage]);
            setMessage("");
            scrollToBottom();

            let sent = false;

            // Send via socket
            if (messageType === "text") {
                sent = await socketService.sendMessage(_id, actualContent, "text");
            } else if (messageType === "image" && content) {
                sent = await socketService.sendImageMessage(_id, actualContent);
            } else if (messageType === "audio" && content) {
                sent = await socketService.sendAudioMessage(_id, actualContent);
            }

            if (!sent) {
                // If sending fails, remove the optimistic message
                setMessages((prev) => prev.filter(msg => msg._id !== tempId));
                Alert.alert("Error", "Could not send message. Please check your connection.");
                return false;
            }

            // Save to backend (fire and forget - don't block UI)
            this.saveMessageToBackend({
                senderId: userId,
                receiverId: _id,
                messageType,
                content: actualContent,
                conversationId: this.generateConversationId(userId, _id),
                timeStamp: new Date().toISOString(),
            });

            return true;
        } catch (error) {
            console.log("error in sending the message", error);
            Alert.alert("Error", "Failed to send message");
            return false;
        }
    }

    // Helper method to generate consistent conversation ID
    private generateConversationId(userId1: string, userId2: string): string {
        const sortedIds = [userId1, userId2].sort();
        return `conv_${sortedIds[0]}_${sortedIds[1]}`;
    }

    // Typing handlers
    handleTextChange(
        text: string,
        setMessage: React.Dispatch<React.SetStateAction<string>>,
        _id: string,
        connectionStatus: "connecting" | "connected" | "disconnected"
    ) {
        setMessage(text);

        // Notify typing with debounce
        if (text.length > 0 && _id && connectionStatus === "connected") {
            if (this.debouncedTypingHandler) {
                clearTimeout(this.debouncedTypingHandler);
            }

            socketService.startTyping(_id);

            this.debouncedTypingHandler = setTimeout(() => {
                socketService.stopTyping(_id);
            }, 1000);
        } else if (_id && connectionStatus === "connected") {
            socketService.stopTyping(_id);
        }
    }

    // Cleanup
    cleanup() {
        if (this.typingTimeoutRef) {
            clearTimeout(this.typingTimeoutRef);
        }
        if (this.debouncedTypingHandler) {
            clearTimeout(this.debouncedTypingHandler);
        }
    }
}

export const messageService = new MessageService();