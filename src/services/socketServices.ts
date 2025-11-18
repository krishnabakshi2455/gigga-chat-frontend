import { BACKEND_URL } from '@env';
import { io, Socket } from 'socket.io-client';

class SocketService {
    private static instance: SocketService;
    socket: Socket | null = null;
    private isConnected = false;
    private eventListeners: Map<string, Function[]> = new Map();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;

    private constructor() { }

    static getInstance(): SocketService {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }

    connect(token: string, userId: string): Promise<boolean> {
        return new Promise((resolve) => {
            console.log('🔄 Attempting to connect to:', BACKEND_URL);

            if (this.socket) {
                console.log('🔌 Disconnecting existing socket...');
                this.disconnect();
            }

            if (!BACKEND_URL) {
                console.error('❌ BACKEND_URL is not defined!');
                resolve(false);
                return;
            }

            this.socket = io(BACKEND_URL, {
                auth: { token, userId },
                transports: ['websocket', 'polling'],
                forceNew: true,
                timeout: 20000,
                reconnection: true,
                reconnectionAttempts: this.maxReconnectAttempts,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                autoConnect: true,
            });

            this.socket.on('connect', () => {
                console.log('✅ Socket connected successfully!');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                resolve(true);
            });

            this.socket.on('disconnect', (reason) => {
                console.log('❌ Disconnected from server. Reason:', reason);
                this.isConnected = false;
                if (reason === 'io server disconnect') {
                    this.socket?.connect();
                }
            });

            this.socket.on('connect_error', (error) => {
                console.error('❌ Connection error:', error.message);
                this.isConnected = false;
                this.reconnectAttempts++;
                if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                    resolve(false);
                }
            });

            setTimeout(() => {
                if (!this.isConnected) {
                    console.error('❌ Initial connection timeout');
                    resolve(false);
                }
            }, 20000);
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
            this.reconnectAttempts = 0;
        }
        this.eventListeners.clear();
    }

    // ============================================
    // TEXT MESSAGING METHODS
    // ============================================

    sendMessage(receiverId: string, message: string, messageType: string = 'text'): boolean {
        if (!this.socket || !this.isConnected) {
            console.warn('⚠️ Socket not connected');
            return false;
        }
        try {
            this.socket.emit('send_message', { receiverId, message, messageType });
            return true;
        } catch (error) {
            console.error('❌ Error sending message:', error);
            return false;
        }
    }

    sendImageMessage(receiverId: string, imageUrl: string): boolean {
        return this.sendMessage(receiverId, imageUrl, 'image');
    }

    sendAudioMessage(receiverId: string, audioUrl: string): boolean {
        return this.sendMessage(receiverId, audioUrl, 'audio');
    }

    startTyping(receiverId: string) {
        if (this.socket && this.isConnected) {
            this.socket.emit('typing_start', { receiverId });
        }
    }

    stopTyping(receiverId: string) {
        if (this.socket && this.isConnected) {
            this.socket.emit('typing_stop', { receiverId });
        }
    }

    // ============================================
    // CONVERSATION MANAGEMENT
    // ============================================

    joinConversation(otherUserId: string) {
        if (this.socket && this.isConnected) {
            this.socket.emit('join_conversation', { otherUserId });
        }
    }

    leaveConversation(otherUserId: string) {
        if (this.socket && this.isConnected) {
            this.socket.emit('leave_conversation', { otherUserId });
        }
    }

    checkConversationStatus(otherUserId: string) {
        if (this.socket && this.isConnected) {
            this.socket.emit('get_conversation_status', { otherUserId });
        }
    }

    // ============================================
    // ENHANCED WEBRTC CALL SIGNALING
    // ============================================

    initiateCall(
        recipientId: string,
        callType: 'video' | 'audio',
        callerId: string,
        callerName: string,
        callerImage?: string
    ): string | null {
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

    acceptCall(callId: string, callerId: string): boolean {
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

    rejectCall(callId: string, callerId: string, reason?: string): boolean {
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

    endCall(callId: string, recipientId: string): boolean {
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

    sendWebRTCOffer(callId: string, recipientId: string, offer: any): boolean {
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

    sendWebRTCAnswer(callId: string, recipientId: string, answer: any): boolean {
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

    sendICECandidate(callId: string, recipientId: string, candidate: any): boolean {
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

    callTimeout(callId: string, recipientId: string): boolean {
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
        return this.isConnected;
    }

    getSocket(): Socket | null {
        return this.socket;
    }
}

export const socketService = SocketService.getInstance();