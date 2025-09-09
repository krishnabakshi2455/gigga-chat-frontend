import { io, Socket } from 'socket.io-client';
import config from '../../config';

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
            this.socket = io(config.BACKEND_URL, {
                auth: {
                    token,
                    userId
                },
                transports: ['websocket', 'polling'],
                forceNew: true,
                timeout: 10000, // Increase timeout
                reconnectionAttempts: 3,
            });

            // Connection events
            this.socket.on('connect', () => {
                console.log('Connected to server');
                this.isConnected = true;
                resolve(true);
                console.log("✅ Socket connected successfully");
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
    }

    // Send message
    sendMessage(receiverId: string, message: string, messageType: string = 'text') {
        if (this.socket && this.isConnected) {
            this.socket.emit('send_message', {
                receiverId,
                message,
                messageType
            });
            return true;
        }
        return false;
    }

    // Send image message
    sendImageMessage(receiverId: string, imageUrl: string) {
        if (this.socket && this.isConnected) {
            this.socket.emit('send_message', {
                receiverId,
                message: imageUrl,
                messageType: 'image'
            });
            return true;
        }
        return false;
    }

    // Send audio message
    sendAudioMessage(receiverId: string, audioUrl: string) {
        if (this.socket && this.isConnected) {
            this.socket.emit('send_message', {
                receiverId,
                message: audioUrl,
                messageType: 'audio'
            });
            return true;
        }
        return false;
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
    on(event: string, callback: any) {
        if (this.socket) {
            this.socket.on(event, callback);

            // Store reference for cleanup
            if (!this.eventListeners.has(event)) {
                this.eventListeners.set(event, []);
            }
            this.eventListeners.get(event)?.push(callback);
        }
    }

    // Remove listeners
    off(event: string, callback?: Function) {
        if (this.socket) {
            if (callback) {
                this.socket.off(event, callback as any);
            } else {
                this.socket.off(event);
            }
        }
    }

    // Cleanup all listeners
    removeAllListeners() {
        if (this.socket) {
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