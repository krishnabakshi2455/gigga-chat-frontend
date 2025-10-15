import { Alert } from "react-native";
import { socketService } from "../services/socketServices";
import { BackendMessageData, ExtendedMessage } from "../lib/types";
import { BACKEND_URL } from "@env";

// Define the message structure for backend API


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

    // Save message to backend - FIXED ENDPOINT
    private async saveMessageToBackend(messageData: BackendMessageData): Promise<any> {
        try {
            // Now this calls: BACKEND_URL/api/messages
            const response = await this.makeApiCall('/api/messages', { // Add /api here
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

    // Socket event handlers
    handleReceiveMessage = (
        data: any,
        _id: string,
        currentUserId: string,
        setMessages: React.Dispatch<React.SetStateAction<ExtendedMessage[]>>,
        scrollToBottom: () => void
    ) => {
        if (data.recipientId !== currentUserId && data.senderId === currentUserId) return;

        const newMessage: ExtendedMessage = {
            _id: Date.now().toString(),
            messageType: data.messageType || "text",
            senderId: { _id: data.senderId },
            timeStamp: data.timestamp || new Date().toISOString(),
            message: data.message,
            imageUrl: data.messageType === "image" ? data.message : undefined,
            audioUrl: data.messageType === "audio" ? data.message : undefined,
        };

        setMessages((prev) => [...prev, newMessage]);
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

            // Create a new message object for immediate UI update
            const newMessage: ExtendedMessage = {
                _id: `temp-${Date.now()}`,
                messageType,
                senderId: { _id: userId },
                timeStamp: new Date().toISOString(),
            };

            // Set appropriate properties based on message type
            if (messageType === "text") {
                newMessage.message = actualContent;
            } else if (messageType === "image") {
                newMessage.imageUrl = actualContent;
            } else if (messageType === "audio") {
                newMessage.audioUrl = actualContent;
            }

            let sent = false;

            // Send via socket first
            if (messageType === "text") {
                sent = socketService.sendMessage(_id, actualContent, "text");
            } else if (messageType === "image" && content) {
                sent = socketService.sendImageMessage(_id, actualContent);
            } else if (messageType === "audio" && content) {
                sent = socketService.sendAudioMessage(_id, actualContent);
            }

            if (!sent) {
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

            // Add to local state for immediate UI update
            setMessages((prev) => [...prev, newMessage]);
            setMessage("");
            scrollToBottom();
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