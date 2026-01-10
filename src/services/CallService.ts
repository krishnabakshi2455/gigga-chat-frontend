import { CallData } from "../lib/types/types";
import { socketService } from "./socketServices";
import { webRTCService } from "./webrtcService";

class CallService {
    private activeCall: CallData | null = null;
    private callListeners: Map<string, Function[]> = new Map();
    private webRTCInitialized = false;
    private isWebRTCStarting = false;
    private currentUserId: string | null = null; // Track current user

    setCurrentUserId(userId: string) {
        this.currentUserId = userId;
    }

    async initiateCall(
        recipientId: string,
        callType: 'video' | 'audio',
        callerId: string,
        callerName: string,
        callerImage?: string
    ): Promise<string | null> {
        try {
            if (this.activeCall) {
                console.warn('⚠️ Already in an active call');
                return null;
            }

            console.log('📞 Initiating call...');

            // Use socket service to initiate call
            const callId = await socketService.initiateCall(
                recipientId,
                callType,
                callerId,
                callerName,
                callerImage
            );

            if (!callId) {
                throw new Error('Failed to initiate call via socket');
            }

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

            console.log('✅ Call initiated with ID:', callId);
            this.emit('call:initiating', this.activeCall);

            // Reset WebRTC flags for new call
            this.webRTCInitialized = false;
            this.isWebRTCStarting = false;

            return callId;

        } catch (error) {
            console.error('❌ Error initiating call:', error);
            this.emit('call:error', error);
            this.clearActiveCall();
            return null;
        }
    }

    async acceptCall(callId: string, callerId: string): Promise<boolean> {
        try {
            if (!this.activeCall) {
                console.error('❌ No active call to accept');
                return false;
            }

            console.log('✅ Accepting call:', callId);

            const socketSuccess = await socketService.acceptCall(callId, callerId);

            if (!socketSuccess) {
                throw new Error('Failed to send call acceptance via socket');
            }

            this.emit('call:accepted', this.activeCall);

            // Reset WebRTC flags for accepted call
            this.webRTCInitialized = false;
            this.isWebRTCStarting = false;

            return true;

        } catch (error) {
            console.error('❌ Error accepting call:', error);
            this.emit('call:error', error);
            return false;
        }
    }

    rejectCall(callId: string, callerId: string, reason?: string): boolean {
        try {
            socketService.rejectCall(callId, callerId, reason)
                .then(success => {
                    if (success) {
                        this.emit('call:rejected', { callId, reason });
                        this.clearActiveCall();
                    }
                })
                .catch(error => {
                    console.error('❌ Error rejecting call:', error);
                    this.emit('call:error', error);
                });

            return true;

        } catch (error) {
            console.error('❌ Error rejecting call:', error);
            this.emit('call:error', error);
            return false;
        }
    }

    async endCall(): Promise<boolean> {
        try {
            if (!this.activeCall) {
                console.warn('⚠️ No active call to end');
                return false;
            }

            const callData = this.activeCall;

            // Determine the other participant based on current user
            let otherParticipantId: string;

            if (this.currentUserId === callData.callerId) {
                // We are the caller, so other participant is recipient
                otherParticipantId = callData.recipientId;
            } else {
                // We are the recipient, so other participant is caller
                otherParticipantId = callData.callerId;
            }

            console.log('📴 Ending call:', callData.callId);
            console.log('📴 Current user:', this.currentUserId);
            console.log('📴 Other participant:', otherParticipantId);

            // End WebRTC connection first
            await webRTCService.endCall();
            this.webRTCInitialized = false;
            this.isWebRTCStarting = false;

            // Notify backend with the OTHER participant's ID
            const socketSuccess = await socketService.endCall(
                callData.callId,
                otherParticipantId
            );

            if (!socketSuccess) {
                console.warn('⚠️ Failed to send end call via socket');
            }

            this.emit('call:ended', callData);
            this.clearActiveCall();
            return true;

        } catch (error) {
            console.error('❌ Error ending call:', error);
            this.emit('call:error', error);
            return false;
        }
    }

    async startWebRTC(): Promise<void> {
        // Prevent multiple WebRTC initializations
        if (this.isWebRTCStarting || this.webRTCInitialized) {
            console.warn('⚠️ WebRTC already starting or initialized, skipping');
            return;
        }

        if (!this.activeCall) {
            console.error('❌ Cannot start WebRTC: No active call');
            throw new Error('No active call');
        }

        this.isWebRTCStarting = true;

        try {
            console.log('🎥 Starting WebRTC for call:', this.activeCall.callId);
            console.log('🎥 Call type:', this.activeCall.callType);
            console.log('🎥 Is caller:', this.activeCall.callerId === this.activeCall.recipientId);

            // Initialize WebRTC
            const isCaller = this.activeCall.callerId !== this.activeCall.recipientId;
            const localStream = await webRTCService.initializeCall(isCaller, this.activeCall.callType);

            if (!localStream) {
                throw new Error('Failed to initialize media');
            }

            this.webRTCInitialized = true;
            this.setupWebRTCListeners();

            // Only create offer if we're the caller
            if (isCaller) {
                console.log('📤 Caller: Creating offer...');
                const offer = await webRTCService.createOffer();

                if (offer && this.activeCall) {
                    const success = await socketService.sendWebRTCOffer(
                        this.activeCall.callId,
                        this.activeCall.recipientId,
                        offer
                    );

                    if (!success) {
                        console.error('❌ Failed to send WebRTC offer');
                    }
                }
            } else {
                console.log('📥 Receiver: Waiting for offer...');
            }

        } catch (error) {
            console.error('❌ Error starting WebRTC:', error);
            this.webRTCInitialized = false;
            this.emit('call:error', error);
        } finally {
            this.isWebRTCStarting = false;
        }
    }

    async handleIncomingOffer(offer: any): Promise<void> {
        if (!this.activeCall) {
            console.error('❌ Cannot handle offer: No active call');
            throw new Error('No active call');
        }

        if (!this.webRTCInitialized) {
            console.error('❌ WebRTC not initialized yet, waiting...');
            // Wait a bit and retry
            await new Promise(resolve => setTimeout(resolve, 500));

            if (!this.webRTCInitialized) {
                console.error('❌ WebRTC still not initialized after wait');
                throw new Error('WebRTC not initialized');
            }
        }

        try {
            console.log('📥 Handling incoming offer for call:', this.activeCall.callId);

            await webRTCService.handleOffer(offer);

            console.log('📤 Creating answer...');
            const answer = await webRTCService.createAnswer();

            if (answer && this.activeCall) {
                const success = await socketService.sendWebRTCAnswer(
                    this.activeCall.callId,
                    this.activeCall.callerId,
                    answer
                );

                if (!success) {
                    console.error('❌ Failed to send WebRTC answer');
                }
            }
        } catch (error) {
            console.error('❌ Error handling offer:', error);
            this.emit('call:error', error);
        }
    }

    async handleIncomingAnswer(answer: any): Promise<void> {
        if (!this.webRTCInitialized) {
            console.error('❌ Cannot handle answer: WebRTC not initialized');
            return;
        }

        try {
            console.log('📥 Handling incoming answer for call:', this.activeCall?.callId);
            await webRTCService.handleAnswer(answer);
            this.emit('call:connected');
        } catch (error) {
            console.error('❌ Error handling answer:', error);
            this.emit('call:error', error);
        }
    }

    async handleIncomingICECandidate(candidate: any): Promise<void> {
        if (!this.webRTCInitialized) {
            console.warn('⚠️ Cannot handle ICE candidate: WebRTC not initialized yet');
            return;
        }

        try {
            await webRTCService.addIceCandidate(candidate);
        } catch (error) {
            console.error('❌ Error handling ICE candidate:', error);
        }
    }

    private setupWebRTCListeners(): void {
        // Remove old listeners first
        webRTCService.off('iceCandidate');
        webRTCService.off('remoteStream');
        webRTCService.off('callConnected');
        webRTCService.off('callDisconnected');
        webRTCService.off('error');

        // Add new listeners
        webRTCService.on('iceCandidate', (candidate: any) => {
            if (this.activeCall) {
                socketService.sendICECandidate(
                    this.activeCall.callId,
                    this.activeCall.recipientId,
                    candidate
                );
            }
        });

        webRTCService.on('remoteStream', (stream: any) => {
            this.emit('remoteStream', stream);
        });

        webRTCService.on('callConnected', () => {
            this.emit('call:connected');
        });

        webRTCService.on('callDisconnected', () => {
            this.emit('call:disconnected');
            this.endCall();
        });

        webRTCService.on('error', (error: any) => {
            this.emit('call:error', error);
        });
    }

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

    setActiveCall(callData: CallData | null): void {
        this.activeCall = callData;
        if (!callData) {
            this.webRTCInitialized = false;
            this.isWebRTCStarting = false;
        }
    }

    clearActiveCall(): void {
        this.activeCall = null;
        this.webRTCInitialized = false;
        this.isWebRTCStarting = false;
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