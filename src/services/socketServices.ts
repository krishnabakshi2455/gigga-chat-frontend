import { BACKEND_URL } from '@env';
import { io, Socket } from 'socket.io-client';

class SocketService {
    private static instance: SocketService;
    private socket: Socket | null = null;
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
            console.log('👤 User Present:', userId ? true : false);
            console.log('🔑 Token:', token ? 'Present' : 'Missing');

            // Disconnect if already connected
            if (this.socket) {
                console.log('🔌 Disconnecting existing socket...');
                this.disconnect();
            }

            // Validate BACKEND_URL
            if (!BACKEND_URL) {
                console.error('❌ BACKEND_URL is not defined!');
                resolve(false);
                return;
            }

            // Connect to server with improved configuration
            this.socket = io(BACKEND_URL, {
                auth: {
                    token: token,
                    userId: userId
                },
                transports: ['websocket', 'polling'],
                forceNew: true,
                timeout: 20000, // Increased timeout to 20 seconds
                reconnection: true,
                reconnectionAttempts: this.maxReconnectAttempts,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                autoConnect: true,
            });

            // Connection events
            this.socket.on('connect', () => {
                console.log('✅ Socket connected successfully!');
                // console.log('🆔 Socket ID:', this.socket?.id);
                this.isConnected = true;
                this.reconnectAttempts = 0;
                resolve(true);
            });

            this.socket.on('disconnect', (reason) => {
                console.log('❌ Disconnected from server. Reason:', reason);
                this.isConnected = false;

                if (reason === 'io server disconnect') {
                    // Server disconnected the socket, manually reconnect
                    console.log('🔄 Server disconnected, attempting to reconnect...');
                    this.socket?.connect();
                }
            });

            this.socket.on('connect_error', (error) => {
                console.error('❌ Connection error:', error.message);
                console.error('Error details:', error);
                this.isConnected = false;
                this.reconnectAttempts++;

                if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                    console.error('❌ Max reconnection attempts reached');
                    resolve(false);
                }
            });

            this.socket.on('connect_timeout', () => {
                console.error('⏱️ Connection timeout');
                this.isConnected = false;
            });

            this.socket.on('error', (error) => {
                console.error('❌ Socket error:', error);
            });

            this.socket.on('reconnect', (attemptNumber) => {
                console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
                this.isConnected = true;
            });

            this.socket.on('reconnect_attempt', (attemptNumber) => {
                console.log(`🔄 Reconnection attempt ${attemptNumber}/${this.maxReconnectAttempts}`);
            });

            this.socket.on('reconnect_error', (error) => {
                console.error('❌ Reconnection error:', error.message);
            });

            this.socket.on('reconnect_failed', () => {
                console.error('❌ Reconnection failed after all attempts');
                resolve(false);
            });

            // Set timeout for initial connection
            setTimeout(() => {
                if (!this.isConnected) {
                    console.error('❌ Initial connection timeout after 20 seconds');
                    resolve(false);
                }
            }, 20000);
        });
    }

    disconnect() {
        if (this.socket) {
            console.log('🔌 Disconnecting socket...');
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
            this.reconnectAttempts = 0;
        }
        this.eventListeners.clear();
    }

    // Send message
    sendMessage(receiverId: string, message: string, messageType: string = 'text'): boolean {
        if (!this.socket || !this.isConnected) {
            console.warn('⚠️ Socket not connected, message not sent');
            return false;
        }

        try {
            // console.log('📤 Sending message to:', receiverId);
            this.socket.emit('send_message', {
                receiverId,
                message,
                messageType
            });
            return true;
        } catch (error) {
            console.error('❌ Error sending message:', error);
            return false;
        }
    }

    // Send image message
    sendImageMessage(receiverId: string, imageUrl: string): boolean {
        console.log('📤 Sending image message to:', receiverId);
        return this.sendMessage(receiverId, imageUrl, 'image');
    }

    // Send audio message
    sendAudioMessage(receiverId: string, audioUrl: string): boolean {
        console.log('📤 Sending audio message to:', receiverId);
        return this.sendMessage(receiverId, audioUrl, 'audio');
    }

    // Typing indicators
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

    // Listen for events
    on(event: string, callback: (...args: any[]) => void) {
        if (this.socket) {
            this.socket.on(event, callback);

            // Store reference for cleanup
            if (!this.eventListeners.has(event)) {
                this.eventListeners.set(event, []);
            }
            this.eventListeners.get(event)?.push(callback);
        }
    }

    // Join a conversation when user opens a chat
    joinConversation(otherUserId: string) {
        if (this.socket && this.isConnected) {
            // console.log('👥 Joining conversation with:', otherUserId);
            this.socket.emit('join_conversation', { otherUserId });
        } else {
            console.warn('⚠️ Cannot join conversation - socket not connected');
        }
    }

    // Leave conversation when user closes chat
    leaveConversation(otherUserId: string) {
        if (this.socket && this.isConnected) {
            // console.log('👋 Leaving conversation with:', otherUserId);
            this.socket.emit('leave_conversation', { otherUserId });
        }
    }

    // Check if other user is online in conversation
    checkConversationStatus(otherUserId: string) {
        if (this.socket && this.isConnected) {
            this.socket.emit('get_conversation_status', { otherUserId });
        }
    }

    // Remove specific listener
    off(event: string, callback?: Function) {
        if (this.socket) {
            if (callback) {
                this.socket.off(event, callback as any);

                // Remove from stored listeners
                const listeners = this.eventListeners.get(event);
                if (listeners) {
                    const index = listeners.indexOf(callback);
                    if (index > -1) {
                        listeners.splice(index, 1);
                    }
                }
            } else {
                this.socket.off(event);
                this.eventListeners.delete(event);
            }
        }
    }

    // Remove all listeners
    removeAllListeners(): void {
        try {
            if (this.socket) {
                this.socket.removeAllListeners();
            }
            this.eventListeners.clear();
            console.log('🧹 All socket listeners removed');
        } catch (error) {
            console.warn('⚠️ Error removing socket listeners:', error);
        }
    }

    // Get connection status
    getConnectionStatus(): boolean {
        return this.isConnected;
    }

    // Get socket instance (for debugging)
    getSocket(): Socket | null {
        return this.socket;
    }
}

// Create a singleton instance
export const socketService = SocketService.getInstance();