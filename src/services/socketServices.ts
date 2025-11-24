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
            console.log('🔄 Returning existing connection promise');
            return this.connectionPromise;
        }

        this.connectionPromise = new Promise((resolve) => {
            console.log('🔄 Starting new socket connection...');
            console.log('🔗 Backend URL:', BACKEND_URL ? 'Present' : 'Missing');
            console.log('🔑 Token present:', !!token);
            console.log('👤 User ID:', userId);

            // Validate critical parameters
            if (!BACKEND_URL) {
                console.error('❌ CRITICAL: BACKEND_URL is undefined!');
                resolve(false);
                this.connectionPromise = null;
                return;
            }

            if (!token) {
                console.error('❌ CRITICAL: No authentication token!');
                resolve(false);
                this.connectionPromise = null;
                return;
            }

            if (!userId) {
                console.error('❌ CRITICAL: No user ID!');
                resolve(false);
                this.connectionPromise = null;
                return;
            }

            // Clean up existing socket
            if (this.socket) {
                console.log('🧹 Cleaning up existing socket...');
                this.socket.removeAllListeners();
                this.socket.disconnect();
                this.socket = null;
            }

            try {
                console.log('🔌 Creating new socket instance...');
                this.socket = io(BACKEND_URL, {
                    auth: {
                        token: token,
                        userId: userId
                    },
                    transports: ['websocket', 'polling'],
                    timeout: 10000, // Reduced timeout for faster feedback
                    reconnection: true,
                    reconnectionAttempts: 3,
                    reconnectionDelay: 1000,
                    reconnectionDelayMax: 3000,
                    forceNew: true, // Force new connection
                });

                // Connection established
                this.socket.on('connect', () => {
                    // console.log('✅ Socket connected! ID:', this.socket?.id);
                    // console.log('🔗 Connected to:', BACKEND_URL);
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    resolve(true);
                    this.connectionPromise = null;
                });

                // Server confirmation
                // this.socket.on('connected', (data) => {
                //     console.log('✅ Server connection confirmed:', data);
                // });

                // Test event
                // this.socket.on('test_event', (data) => {
                //     console.log('✅ Test event received:', data);
                // });

                // Connection error
                this.socket.on('connect_error', (error) => {
                    console.error('❌ Connection failed:', error.message);
                    console.error('❌ Error details:', error);
                    this.isConnected = false;
                    this.reconnectAttempts++;

                    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                        console.error('❌ Max reconnection attempts reached');
                        resolve(false);
                        this.connectionPromise = null;
                    }
                });

                // Disconnection
                this.socket.on('disconnect', (reason) => {
                    console.log('🔌 Disconnected. Reason:', reason);
                    this.isConnected = false;

                    if (reason === 'io server disconnect') {
                        console.log('🔄 Server initiated disconnect');
                        setTimeout(() => {
                            this.socket?.connect();
                        }, 1000);
                    }
                });

                // Reconnection events
                this.socket.on('reconnect_attempt', (attempt) => {
                    console.log(`🔄 Reconnection attempt ${attempt}/${this.maxReconnectAttempts}`);
                });

                this.socket.on('reconnect_failed', () => {
                    console.error('❌ All reconnection attempts failed');
                    this.connectionPromise = null;
                });

                // Connection timeout
                setTimeout(() => {
                    if (!this.isConnected && this.connectionPromise) {
                        console.error('⏰ Connection timeout - server not responding');
                        resolve(false);
                        this.connectionPromise = null;
                    }
                }, 15000); // 15 second timeout

            } catch (error) {
                console.error('💥 Exception during socket creation:', error);
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

    // Add this new method for detailed connection status
    getDetailedConnectionStatus() {
        return {
            socketConnected: this.socket?.connected || false,
            isConnected: this.isConnected,
            socketId: this.socket?.id,
            backendUrl: BACKEND_URL
        };
    }
}

export const socketService = SocketService.getInstance();

