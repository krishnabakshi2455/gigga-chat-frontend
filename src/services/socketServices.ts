import { BACKEND_URL } from '@env';
import { io, Socket } from 'socket.io-client';

class SocketService {
    private static instance: SocketService;
    private socket: Socket | null = null;
    private isConnected = false;
    private eventListeners: Map<string, Function[]> = new Map();

    private constructor() { }

    static getInstance(): SocketService {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }

    connect(token: string, userId: string): Promise<boolean> {
        return new Promise((resolve) => {
            // Disconnect if already connected
            if (this.socket) {
                this.disconnect();
            }

            // Connect to server
            this.socket = io(BACKEND_URL, {
                auth: {
                    token: token,    
                    userId: userId  
                },
                transports: ['websocket', 'polling'],
                forceNew: true,
                timeout: 10000,
                reconnectionAttempts: 3,
            });

            // Connection events
            this.socket.on('connect', () => {
                console.log('Connected to server');
                this.isConnected = true;
                resolve(true);
                console.log("✅ Socket connected successfully",this.socket?.id);
            });

            this.socket.on('disconnect', () => {
                console.log('Disconnected from server');
                this.isConnected = false;
            });

            this.socket.on('connect_error', (error) => {
                console.error('Connection error:', error);
                this.isConnected = false;
                resolve(false);
            });

            // Set timeout for connection
            setTimeout(() => {
                if (!this.isConnected) {
                    console.error('Connection timeout');
                    resolve(false);
                }
            }, 5000);
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
        }
        this.eventListeners.clear();
    }

    // Send message
    sendMessage(receiverId: string, message: string, messageType: string = 'text'): boolean {
        if (this.socket && this.isConnected) {
            this.socket.emit('send_message', {
                receiverId,
                message,
                messageType
            });
            return true;
        }
        console.warn('Socket not connected, message not sent');
        return false;
    }

    // Send image message
    sendImageMessage(receiverId: string, imageUrl: string): boolean {
        return this.sendMessage(receiverId, imageUrl, 'image');
    }

    // Send audio message
    sendAudioMessage(receiverId: string, audioUrl: string): boolean {
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
            this.socket.emit('join_conversation', { otherUserId });
        }
    }

    // Leave conversation when user closes chat
    leaveConversation(otherUserId: string) {
        if (this.socket && this.isConnected) {
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

    // Remove all listeners (safe to call even if socket doesn't exist)
    removeAllListeners(): void {
        try {
            if (this.socket) {
                this.socket.removeAllListeners();
            }
            this.eventListeners.clear();
            console.log('All socket listeners removed');
        } catch (error) {
            console.warn('Error removing socket listeners:', error);
        }
    }

    // Safe version that checks if method exists
    safeRemoveAllListeners(): void {
        if (this.socket && typeof this.socket.removeAllListeners === 'function') {
            this.socket.removeAllListeners();
        }
        this.eventListeners.clear();
    }

    // Get connection status
    getConnectionStatus(): boolean {
        return this.isConnected;
    }
}

// Create a singleton instance
export const socketService = SocketService.getInstance();