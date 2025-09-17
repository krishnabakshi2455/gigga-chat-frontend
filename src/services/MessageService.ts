import { Alert } from "react-native";
import { socketService } from "../services/socketServices";
import { ExtendedMessage } from "../lib/types";
// import { v4 as uuidv4 } from 'uuid';

export class MessageService {
    private typingTimeoutRef: NodeJS.Timeout | null = null;
    private debouncedTypingHandler: NodeJS.Timeout | null = null;

    // Socket event handlers
    handleReceiveMessage = (
        data: any,
        _id: string,
        currentUserId:string,
        setMessages: React.Dispatch<React.SetStateAction<ExtendedMessage[]>>,
        scrollToBottom: () => void
    ) => {
        // if (data.senderId !== _id) return;
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
        // console.log("✅ Conversation joined:", data);
        setIsOtherUserOnline(data.isOtherUserOnline);
        setConnectionStatus("connected");
    };

    handleUserJoinedConversation = (
        data: any,
        _id: string,
        setIsOtherUserOnline: React.Dispatch<React.SetStateAction<boolean>>
    ) => {
        // console.log("👥 User joined conversation:", data);
        if (data.connectedUsers.includes(_id)) {
            setIsOtherUserOnline(true);
        }
    };

    handleUserLeftConversation = (
        data: any,
        _id: string,
        setIsOtherUserOnline: React.Dispatch<React.SetStateAction<boolean>>
    ) => {
        // console.log("👋 User left conversation:", data);
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

    // Message sending
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

            // Create a new message object for immediate UI update
            const newMessage: ExtendedMessage = {
                _id: `temp-${Date.now()}`,
                messageType,
                senderId: { _id: userId },
                timeStamp: new Date().toISOString(),
            };

            let sent = false;

            if (messageType === "text") {
                if (!message.trim()) return false;
                newMessage.message = message;
                sent = socketService.sendMessage(_id, message, "text");
            } else if (messageType === "image" && content) {
                newMessage.imageUrl = content;
                sent = socketService.sendImageMessage(_id, content);
            } else if (messageType === "audio" && content) {
                newMessage.audioUrl = content;
                sent = socketService.sendAudioMessage(_id, content);
            }

            if (!sent) {
                Alert.alert("Error", "Could not send message. Please check your connection.");
                return false;
            }

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