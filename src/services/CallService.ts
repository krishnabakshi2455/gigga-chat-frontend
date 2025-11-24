import { CallData } from "../lib/types/types";
import { socketService } from "./socketServices";
import { webRTCService } from "./webrtcService";

class CallService {
    private activeCall: CallData | null = null;
    private callListeners: Map<string, Function[]> = new Map();

    async initiateCall(
        recipientId: string,
        callType: 'video' | 'audio',
        callerId: string,
        callerName: string,
        callerImage?: string
    ): Promise<string | null> {
        try {
            // Check if there's already an active call
            if (this.activeCall) {
                console.warn('Already in an active call');
                return null;
            }

            // Generate call ID
            const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Store call data
            this.activeCall = {
                callId,
                callType,
                callerId,
                callerName,
                callerImage,
                recipientId,
                timestamp: new Date().toISOString()
            };

            // Initialize WebRTC (get local media stream)
            const localStream = await webRTCService.initializeCall(true, callType);

            if (!localStream) {
                throw new Error('Failed to initialize media');
            }

            // Notify backend about the call
            socketService.initiateCall(
                recipientId,
                callType,
                callerId,
                callerName,
                callerImage
            );

            // Setup WebRTC event listeners
            this.setupWebRTCListeners();

            // Create and send offer
            const offer = await webRTCService.createOffer();
            if (offer) {
                socketService.sendWebRTCOffer(callId, recipientId, offer);
            }

            this.emit('call:initiated', this.activeCall);
            return callId;

        } catch (error) {
            console.error('Error initiating call:', error);
            this.emit('call:error', error);
            this.clearActiveCall();
            return null;
        }
    }

    async acceptCall(callId: string, callerId: string): Promise<boolean> {
        try {
            if (!this.activeCall) {
                console.error('No active call to accept');
                return false;
            }

            // Initialize WebRTC for incoming call
            const localStream = await webRTCService.initializeCall(false, this.activeCall.callType);

            if (!localStream) {
                throw new Error('Failed to initialize media');
            }

            // Setup WebRTC event listeners
            this.setupWebRTCListeners();

            // Notify backend
            socketService.acceptCall(callId, callerId);

            // Note: Answer will be created when we receive the offer via socket event
            this.emit('call:accepted', this.activeCall);
            return true;

        } catch (error) {
            console.error('Error accepting call:', error);
            this.emit('call:error', error);
            return false;
        }
    }

    rejectCall(callId: string, callerId: string, reason?: string): void {
        try {
            socketService.rejectCall(callId, callerId, reason);
            this.emit('call:rejected', { callId, reason });
            this.clearActiveCall();
        } catch (error) {
            console.error('Error rejecting call:', error);
            this.emit('call:error', error);
        }
    }

    async endCall(): Promise<void> {
        try {
            if (!this.activeCall) {
                console.warn('No active call to end');
                return;
            }

            const callData = this.activeCall;

            // End WebRTC connection
            await webRTCService.endCall();

            // Notify backend
            socketService.endCall(
                callData.callId,
                callData.recipientId
            );

            this.emit('call:ended', callData);
            this.clearActiveCall();
        } catch (error) {
            console.error('Error ending call:', error);
            this.emit('call:error', error);
        }
    }

    private setupWebRTCListeners(): void {
        // Handle ICE candidates from WebRTC
        webRTCService.on('iceCandidate', (candidate: any) => {
            if (this.activeCall) {
                socketService.sendICECandidate(
                    this.activeCall.callId,
                    this.activeCall.recipientId,
                    candidate
                );
            }
        });

        // Handle remote stream
        webRTCService.on('remoteStream', (stream: any) => {
            this.emit('remoteStream', stream);
        });

        // Handle connection state changes
        webRTCService.on('callConnected', () => {
            this.emit('call:connected');
        });

        webRTCService.on('callDisconnected', () => {
            this.emit('call:disconnected');
            this.endCall();
        });

        // Handle errors
        webRTCService.on('error', (error: any) => {
            this.emit('call:error', error);
        });
    }

    // Method to handle incoming WebRTC offer (called by socket listener)
    async handleIncomingOffer(offer: any): Promise<void> {
        try {
            await webRTCService.handleOffer(offer);

            // Create and send answer
            const answer = await webRTCService.createAnswer();
            if (answer && this.activeCall) {
                socketService.sendWebRTCAnswer(
                    this.activeCall.callId,
                    this.activeCall.recipientId,
                    answer
                );
            }
        } catch (error) {
            console.error('Error handling offer:', error);
            this.emit('call:error', error);
        }
    }

    // Method to handle incoming WebRTC answer (called by socket listener)
    async handleIncomingAnswer(answer: any): Promise<void> {
        try {
            await webRTCService.handleAnswer(answer);
        } catch (error) {
            console.error('Error handling answer:', error);
            this.emit('call:error', error);
        }
    }

    // Method to handle incoming ICE candidate (called by socket listener)
    async handleIncomingICECandidate(candidate: any): Promise<void> {
        try {
            await webRTCService.addIceCandidate(candidate);
        } catch (error) {
            console.error('Error handling ICE candidate:', error);
            this.emit('call:error', error);
        }
    }

    // Media control methods (delegate to WebRTC service)
    toggleMute(): boolean {
        return webRTCService.toggleMute();
    }

    toggleVideo(): boolean {
        return webRTCService.toggleVideo();
    }

    toggleSpeaker(enable: boolean): void {
        webRTCService.toggleSpeaker(enable);
    }

    switchCamera(): void {
        webRTCService.switchCamera();
    }

    getLocalStream(): any {
        return webRTCService.getLocalStream();
    }

    getRemoteStream(): any {
        return webRTCService.getRemoteStream();
    }

    getActiveCall(): CallData | null {
        return this.activeCall;
    }

    setActiveCall(callData: CallData): void {
        this.activeCall = callData;
    }

    clearActiveCall(): void {
        this.activeCall = null;
        webRTCService.cleanup();
    }

    on(event: string, callback: Function): void {
        if (!this.callListeners.has(event)) {
            this.callListeners.set(event, []);
        }
        this.callListeners.get(event)?.push(callback);
    }

    off(event: string, callback: Function): void {
        const listeners = this.callListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    private emit(event: string, data?: any): void {
        const listeners = this.callListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => callback(data));
        }
    }
}

export const callService = new CallService();