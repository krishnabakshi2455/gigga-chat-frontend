import { BACKEND_URL } from '@env';
import { io, Socket } from 'socket.io-client';

class SocketService {
    private static instance: SocketService;
    socket: Socket | null = null;
    private isConnected = false;
    private eventListeners: Map<string, Function[]> = new Map();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private connectionPromise: Promise<boolean> | null = null;

    private constructor() { }

    static getInstance(): SocketService {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }

    connect(token: string, userId: string): Promise<boolean> {
        if (this.connectionPromise) {
            return this.connectionPromise;
        }

        this.connectionPromise = new Promise((resolve) => {
            console.log('🔄 Attempting to connect to:', BACKEND_URL);
            console.log('🔑 User ID:', userId);

            if (this.socket?.connected) {
                console.log('✅ Socket already connected');
                resolve(true);
                return;
            }

            if (!BACKEND_URL) {
                console.error('❌ BACKEND_URL is not defined!');
                resolve(false);
                return;
            }

            if (!token) {
                console.error('❌ No authentication token provided!');
                resolve(false);
                return;
            }

            if (this.socket) {
                this.socket.removeAllListeners();
                this.socket.disconnect();
                this.socket = null;
            }

            try {
                this.socket = io(BACKEND_URL, {
                    auth: {
                        token: token,
                        userId: userId
                    },
                    transports: ['websocket', 'polling'],
                    timeout: 30000,
                    reconnection: true,
                    reconnectionAttempts: this.maxReconnectAttempts,
                    reconnectionDelay: 1000,
                    reconnectionDelayMax: 5000,
                    forceNew: false,
                });

                this.socket.on('connect', () => {
                    console.log('✅ Socket connected successfully! ID:', this.socket?.id);
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    resolve(true);
                });

                this.socket.on('connected', (data) => {
                    console.log('✅ Server connection confirmed:', data);
                });

                this.socket.on('test_event', (data) => {
                    console.log('✅ Test event received:', data);
                });

                this.socket.on('disconnect', (reason) => {
                    console.log('❌ Disconnected from server. Reason:', reason);
                    this.isConnected = false;

                    if (reason === 'io server disconnect') {
                        console.log('🔄 Server initiated disconnect - will reconnect');
                        setTimeout(() => {
                            this.socket?.connect();
                        }, 1000);
                    }
                });

                this.socket.on('connect_error', (error) => {
                    console.error('❌ Connection error:', error.message);
                    this.isConnected = false;
                    this.reconnectAttempts++;

                    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                        console.error('❌ Max reconnection attempts reached');
                        resolve(false);
                        this.connectionPromise = null;
                    }
                });

                this.socket.on('reconnect_attempt', (attempt) => {
                    console.log(`🔄 Reconnection attempt ${attempt}`);
                });

                this.socket.on('reconnect_failed', () => {
                    console.error('❌ All reconnection attempts failed');
                    this.connectionPromise = null;
                });

                setTimeout(() => {
                    if (!this.isConnected) {
                        console.error('❌ Connection timeout after 30 seconds');
                        resolve(false);
                        this.connectionPromise = null;
                    }
                }, 30000);

            } catch (error) {
                console.error('❌ Exception during socket connection:', error);
                resolve(false);
                this.connectionPromise = null;
            }
        });

        return this.connectionPromise;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
            this.reconnectAttempts = 0;
            this.connectionPromise = null;
        }
        this.eventListeners.clear();
    }

    async waitForConnection(): Promise<boolean> {
        if (this.getConnectionStatus()) {
            return true;
        }

        return new Promise((resolve) => {
            const checkConnection = () => {
                if (this.getConnectionStatus()) {
                    resolve(true);
                } else {
                    setTimeout(checkConnection, 100);
                }
            };
            checkConnection();
        });
    }

    // ============================================
    // TEXT MESSAGING METHODS
    // ============================================

    async sendMessage(receiverId: string, message: string, messageType: string = 'text'): Promise<boolean> {
        await this.waitForConnection();

        if (!this.socket || !this.isConnected) {
            console.warn('⚠️ Socket not connected');
            return false;
        }
        try {
            this.socket.emit('send_message', { receiverId, message, messageType });
            console.log('📤 Message sent via socket');
            return true;
        } catch (error) {
            console.error('❌ Error sending message:', error);
            return false;
        }
    }

    async sendImageMessage(receiverId: string, imageUrl: string): Promise<boolean> {
        return this.sendMessage(receiverId, imageUrl, 'image');
    }

    async sendAudioMessage(receiverId: string, audioUrl: string): Promise<boolean> {
        return this.sendMessage(receiverId, audioUrl, 'audio');
    }

    async startTyping(receiverId: string) {
        await this.waitForConnection();
        if (this.socket && this.isConnected) {
            this.socket.emit('typing_start', { receiverId });
        }
    }

    async stopTyping(receiverId: string) {
        await this.waitForConnection();
        if (this.socket && this.isConnected) {
            this.socket.emit('typing_stop', { receiverId });
        }
    }

    // ============================================
    // CONVERSATION MANAGEMENT
    // ============================================

    async joinConversation(otherUserId: string) {
        await this.waitForConnection();
        if (this.socket && this.isConnected) {
            this.socket.emit('join_conversation', { otherUserId });
        }
    }

    async leaveConversation(otherUserId: string) {
        await this.waitForConnection();
        if (this.socket && this.isConnected) {
            this.socket.emit('leave_conversation', { otherUserId });
        }
    }

    async checkConversationStatus(otherUserId: string) {
        await this.waitForConnection();
        if (this.socket && this.isConnected) {
            this.socket.emit('get_conversation_status', { otherUserId });
        }
    }

    // ============================================
    // ENHANCED WEBRTC CALL SIGNALING
    // ============================================

    async initiateCall(
        recipientId: string,
        callType: 'video' | 'audio',
        callerId: string,
        callerName: string,
        callerImage?: string
    ): Promise<string | null> {
        await this.waitForConnection();

        if (!this.socket || !this.isConnected) {
            console.warn('⚠️ Socket not connected');
            return null;
        }
        try {
            const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            this.socket.emit('call:initiate', {
                callId,
                recipientId,
                callType,
                callerId,
                callerName,
                callerImage,
                timestamp: new Date().toISOString(),
            });
            console.log('📞 Call initiated:', callId, callType);
            return callId;
        } catch (error) {
            console.error('❌ Error initiating call:', error);
            return null;
        }
    }

    async acceptCall(callId: string, callerId: string): Promise<boolean> {
        await this.waitForConnection();
        if (!this.socket || !this.isConnected) return false;
        try {
            this.socket.emit('call:accept', { callId, callerId });
            console.log('✅ Call accepted:', callId);
            return true;
        } catch (error) {
            console.error('❌ Error accepting call:', error);
            return false;
        }
    }

    async rejectCall(callId: string, callerId: string, reason?: string): Promise<boolean> {
        await this.waitForConnection();
        if (!this.socket || !this.isConnected) return false;
        try {
            this.socket.emit('call:reject', {
                callId,
                callerId,
                reason: reason || 'Call rejected'
            });
            console.log('❌ Call rejected:', callId);
            return true;
        } catch (error) {
            console.error('❌ Error rejecting call:', error);
            return false;
        }
    }

    async endCall(callId: string, recipientId: string): Promise<boolean> {
        await this.waitForConnection();
        if (!this.socket || !this.isConnected) return false;
        try {
            this.socket.emit('call:end', { callId, recipientId });
            console.log('📴 Call ended:', callId);
            return true;
        } catch (error) {
            console.error('❌ Error ending call:', error);
            return false;
        }
    }

    async sendWebRTCOffer(callId: string, recipientId: string, offer: any): Promise<boolean> {
        await this.waitForConnection();
        if (!this.socket || !this.isConnected) return false;
        try {
            this.socket.emit('webrtc:offer', { callId, recipientId, offer });
            console.log('📤 Offer sent for call:', callId);
            return true;
        } catch (error) {
            console.error('❌ Error sending offer:', error);
            return false;
        }
    }

    async sendWebRTCAnswer(callId: string, recipientId: string, answer: any): Promise<boolean> {
        await this.waitForConnection();
        if (!this.socket || !this.isConnected) return false;
        try {
            this.socket.emit('webrtc:answer', { callId, recipientId, answer });
            console.log('📤 Answer sent for call:', callId);
            return true;
        } catch (error) {
            console.error('❌ Error sending answer:', error);
            return false;
        }
    }

    async sendICECandidate(callId: string, recipientId: string, candidate: any): Promise<boolean> {
        await this.waitForConnection();
        if (!this.socket || !this.isConnected) return false;
        try {
            this.socket.emit('webrtc:ice-candidate', { callId, recipientId, candidate });
            console.log('🧊 ICE candidate sent for call:', callId);
            return true;
        } catch (error) {
            console.error('❌ Error sending ICE candidate:', error);
            return false;
        }
    }

    async callTimeout(callId: string, recipientId: string): Promise<boolean> {
        await this.waitForConnection();
        if (!this.socket || !this.isConnected) return false;
        try {
            this.socket.emit('call:timeout', { callId, recipientId });
            console.log('⏰ Call timeout:', callId);
            return true;
        } catch (error) {
            console.error('❌ Error sending call timeout:', error);
            return false;
        }
    }

    // ============================================
    // EVENT LISTENERS
    // ============================================

    on(event: string, callback: (...args: any[]) => void) {
        if (this.socket) {
            this.socket.on(event, callback);
            if (!this.eventListeners.has(event)) {
                this.eventListeners.set(event, []);
            }
            this.eventListeners.get(event)?.push(callback);
        }
    }

    off(event: string, callback?: Function) {
        if (this.socket) {
            if (callback) {
                this.socket.off(event, callback as any);
                const listeners = this.eventListeners.get(event);
                if (listeners) {
                    const index = listeners.indexOf(callback);
                    if (index > -1) listeners.splice(index, 1);
                }
            } else {
                this.socket.off(event);
                this.eventListeners.delete(event);
            }
        }
    }

    removeAllListeners(): void {
        try {
            if (this.socket) this.socket.removeAllListeners();
            this.eventListeners.clear();
            console.log('🧹 Listeners removed');
        } catch (error) {
            console.warn('⚠️ Error removing listeners:', error);
        }
    }

    getConnectionStatus(): boolean {
        return !!(this.socket?.connected && this.isConnected);
    }

    getSocket(): Socket | null {
        return this.socket;
    }
}

export const socketService = SocketService.getInstance();

// ============================================
// MESSAGE SERVICE
// ============================================

import { Alert } from "react-native";
import { BackendMessageData, ExtendedMessage } from "../lib/types";

export class MessageService {
    private typingTimeoutRef: NodeJS.Timeout | null = null;
    private debouncedTypingHandler: NodeJS.Timeout | null = null;
    private baseURL = `${BACKEND_URL}`;

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

            let actualContent = "";
            if (messageType === "text") {
                if (!message.trim()) return false;
                actualContent = message;
            } else if ((messageType === "image" || messageType === "audio") && content) {
                actualContent = content;
            }

            const newMessage: ExtendedMessage = {
                _id: `temp-${Date.now()}`,
                messageType,
                senderId: { _id: userId },
                timeStamp: new Date().toISOString(),
                conversation_id: this.generateConversationId(userId, _id),
            };

            if (messageType === "text") {
                newMessage.message = actualContent;
            } else if (messageType === "image") {
                newMessage.imageUrl = actualContent;
            } else if (messageType === "audio") {
                newMessage.audioUrl = actualContent;
            }

            let sent = false;

            if (messageType === "text") {
                sent = await socketService.sendMessage(_id, actualContent, "text");
            } else if (messageType === "image" && content) {
                sent = await socketService.sendImageMessage(_id, actualContent);
            } else if (messageType === "audio" && content) {
                sent = await socketService.sendAudioMessage(_id, actualContent);
            }

            if (!sent) {
                Alert.alert("Error", "Could not send message. Please check your connection.");
                return false;
            }

            this.saveMessageToBackend({
                senderId: userId,
                receiverId: _id,
                messageType,
                content: actualContent,
                conversationId: this.generateConversationId(userId, _id),
                timeStamp: new Date().toISOString(),
            });

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

    private generateConversationId(userId1: string, userId2: string): string {
        const sortedIds = [userId1, userId2].sort();
        return `conv_${sortedIds[0]}_${sortedIds[1]}`;
    }

    handleTextChange(
        text: string,
        setMessage: React.Dispatch<React.SetStateAction<string>>,
        _id: string,
        connectionStatus: "connecting" | "connected" | "disconnected"
    ) {
        setMessage(text);

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