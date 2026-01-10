import {
    mediaDevices,
    RTCPeerConnection,
    RTCIceCandidate,
    RTCSessionDescription,
    MediaStream,
    MediaStreamTrack
} from 'react-native-webrtc';

// Type definitions for react-native-webrtc
type RNMediaStreamConstraints = {
    audio: boolean;
    video: boolean | {
        width?: number | { ideal?: number; min?: number; max?: number };
        height?: number | { ideal?: number; min?: number; max?: number };
        frameRate?: number | { ideal?: number; min?: number; max?: number };
        facingMode?: 'user' | 'environment' | 'left' | 'right';
    };
};

type RNRTCOfferOptions = {
    offerToReceiveAudio?: boolean;
    offerToReceiveVideo?: boolean;
};

class WebRTCService {
    private peerConnection: RTCPeerConnection | null = null;
    private localStream: MediaStream | null = null;
    private remoteStream: MediaStream | null = null;
    private eventListeners: Map<string, Function[]> = new Map();
    private isMuted = false;
    private isVideoEnabled = true;
    private isInitializing = false;
    private hasCreatedOffer = false;
    private hasCreatedAnswer = false;

    private configuration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
        ],
    };

    async initializeCall(isCaller: boolean, callType: 'video' | 'audio'): Promise<MediaStream | null> {
        // Prevent multiple initializations
        if (this.isInitializing || this.peerConnection) {
            console.warn('⚠️ WebRTC already initializing or initialized');
            return this.localStream;
        }

        this.isInitializing = true;
        console.log(`🎥 Initializing WebRTC - Caller: ${isCaller}, Type: ${callType}`);

        try {
            // Clean up any existing connection first
            await this.cleanup();

            // Get user media
            const constraints: RNMediaStreamConstraints = {
                audio: true,
                video: callType === 'video' ? {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 },
                    facingMode: 'user'
                } : false
            };

            console.log('📷 Requesting media with constraints:', constraints);
            this.localStream = await mediaDevices.getUserMedia(constraints as any);
            console.log('✅ Got local stream:', this.localStream?.id);

            // Create peer connection
            this.peerConnection = new RTCPeerConnection(this.configuration);
            console.log('✅ Peer connection created');

            // Add local stream tracks
            if (this.localStream) {
                const tracks = this.localStream.getTracks();
                tracks.forEach((track: MediaStreamTrack) => {
                    if (this.peerConnection && this.localStream) {
                        // @ts-ignore - addTrack exists in react-native-webrtc
                        this.peerConnection.addTrack(track, this.localStream);
                        console.log(`➕ Added ${track.kind} track to peer connection`);
                    }
                });
            }

            // Setup event handlers
            this.setupPeerConnectionHandlers();

            this.isInitializing = false;
            this.hasCreatedOffer = false;
            this.hasCreatedAnswer = false;

            return this.localStream;

        } catch (error) {
            console.error('❌ Error initializing WebRTC:', error);
            this.isInitializing = false;
            await this.cleanup();
            this.emit('error', error);
            return null;
        }
    }

    private setupPeerConnectionHandlers(): void {
        if (!this.peerConnection) return;

        // ICE candidate handler
        this.peerConnection.onicecandidate = (event: any) => {
            if (event.candidate) {
                console.log('🧊 New ICE candidate');
                this.emit('iceCandidate', event.candidate);
            }
        };

        // Track handler (remote stream)
        // @ts-ignore - ontrack exists in react-native-webrtc
        this.peerConnection.ontrack = (event: any) => {
            console.log('📥 Remote track received:', event.track?.kind);
            if (event.streams && event.streams[0]) {
                this.remoteStream = event.streams[0];
                this.emit('remoteStream', this.remoteStream);
            }
        };

        // Connection state handler
        this.peerConnection.onconnectionstatechange = () => {
            // @ts-ignore - connectionState exists in react-native-webrtc
            const state = this.peerConnection?.connectionState;
            console.log('🔗 Connection state:', state);

            if (state === 'connected') {
                this.emit('callConnected');
            } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
                this.emit('callDisconnected');
            }
        };

        // ICE connection state handler
        this.peerConnection.oniceconnectionstatechange = () => {
            const state = this.peerConnection?.iceConnectionState;
            console.log('🧊 ICE connection state:', state);
        };

        // Signaling state handler
        this.peerConnection.onsignalingstatechange = () => {
            const state = this.peerConnection?.signalingState;
            console.log('📡 Signaling state:', state);
        };
    }

    async createOffer(): Promise<any> {
        if (!this.peerConnection) {
            console.error('❌ Cannot create offer: peer connection not initialized');
            return null;
        }

        if (this.hasCreatedOffer) {
            console.warn('⚠️ Offer already created, skipping');
            return null;
        }

        try {
            console.log('📤 Creating offer...');
            const offerOptions: RNRTCOfferOptions = {
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
            };

            const offer = await this.peerConnection.createOffer(offerOptions as any);
            await this.peerConnection.setLocalDescription(offer);
            console.log('✅ Local description set (offer)');

            this.hasCreatedOffer = true;
            return offer;

        } catch (error) {
            console.error('❌ Error creating offer:', error);
            this.emit('error', error);
            return null;
        }
    }

    async handleOffer(offer: any): Promise<void> {
        if (!this.peerConnection) {
            throw new Error('Peer connection not initialized');
        }

        const currentState = this.peerConnection.signalingState;
        if (currentState !== 'stable') {
            console.warn('⚠️ Signaling state not stable, current:', currentState);
        }

        try {
            console.log('📥 Setting remote description (offer)...');
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            console.log('✅ Remote description set (offer)');

        } catch (error) {
            console.error('❌ Error handling offer:', error);
            throw error;
        }
    }

    async createAnswer(): Promise<any> {
        if (!this.peerConnection) {
            console.error('❌ Cannot create answer: peer connection not initialized');
            return null;
        }

        if (this.hasCreatedAnswer) {
            console.warn('⚠️ Answer already created, skipping');
            return null;
        }

        try {
            console.log('📤 Creating answer...');
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            console.log('✅ Local description set (answer)');

            this.hasCreatedAnswer = true;
            return answer;

        } catch (error) {
            console.error('❌ Error creating answer:', error);
            this.emit('error', error);
            return null;
        }
    }

    async handleAnswer(answer: any): Promise<void> {
        if (!this.peerConnection) {
            throw new Error('Peer connection not initialized');
        }

        const currentState = this.peerConnection.signalingState;
        if (currentState !== 'have-local-offer') {
            console.warn('⚠️ Not in correct state for answer. Current:', currentState);
            return;
        }

        try {
            console.log('📥 Setting remote description (answer)...');
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            console.log('✅ Remote description set (answer)');

        } catch (error) {
            console.error('❌ Error handling answer:', error);
            throw error;
        }
    }

    async addIceCandidate(candidate: any): Promise<void> {
        if (!this.peerConnection) {
            console.warn('⚠️ Cannot add ICE candidate: peer connection not initialized');
            return;
        }

        try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            console.log('✅ ICE candidate added');
        } catch (error) {
            console.error('❌ Error adding ICE candidate:', error);
        }
    }

    toggleMute(): boolean {
        if (!this.localStream) return false;

        const audioTracks = this.localStream.getAudioTracks();
        const audioTrack = audioTracks[0];

        if (audioTrack) {
            this.isMuted = !this.isMuted;
            // @ts-ignore - enabled exists on MediaStreamTrack
            audioTrack.enabled = !this.isMuted;
            console.log(`🔇 Audio ${this.isMuted ? 'muted' : 'unmuted'}`);
            return this.isMuted;
        }
        return false;
    }

    toggleVideo(): boolean {
        if (!this.localStream) return false;

        const videoTracks = this.localStream.getVideoTracks();
        const videoTrack = videoTracks[0];

        if (videoTrack) {
            this.isVideoEnabled = !this.isVideoEnabled;
            // @ts-ignore - enabled exists on MediaStreamTrack
            videoTrack.enabled = !this.isVideoEnabled;
            console.log(`📹 Video ${this.isVideoEnabled ? 'enabled' : 'disabled'}`);
            return this.isVideoEnabled;
        }
        return false;
    }

    toggleSpeaker(enable: boolean): void {
        // Platform-specific speaker toggle implementation
        console.log(`🔊 Speaker ${enable ? 'enabled' : 'disabled'}`);
    }

    async switchCamera(): Promise<void> {
        if (!this.localStream) return;

        const videoTracks = this.localStream.getVideoTracks();
        const videoTrack = videoTracks[0];

        if (videoTrack) {
            // @ts-ignore - _switchCamera is available in react-native-webrtc
            if (typeof videoTrack._switchCamera === 'function') {
                videoTrack._switchCamera();
                console.log('🔄 Camera switched');
            }
        }
    }

    getLocalStream(): MediaStream | null {
        return this.localStream;
    }

    getRemoteStream(): MediaStream | null {
        return this.remoteStream;
    }

    async endCall(): Promise<void> {
        console.log('📴 Ending call...');
        await this.cleanup();
    }

    async cleanup(): Promise<void> {
        console.log('🧹 Cleaning up WebRTC...');

        // Stop all tracks
        if (this.localStream) {
            const tracks = this.localStream.getTracks();
            tracks.forEach((track: MediaStreamTrack) => {
                track.stop();
                console.log(`⏹️ Stopped ${track.kind} track`);
            });
            this.localStream = null;
        }

        if (this.remoteStream) {
            const tracks = this.remoteStream.getTracks();
            tracks.forEach((track: MediaStreamTrack) => {
                track.stop();
            });
            this.remoteStream = null;
        }

        // Close peer connection
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
            console.log('🔌 Peer connection closed');
        }

        // Reset flags
        this.isInitializing = false;
        this.hasCreatedOffer = false;
        this.hasCreatedAnswer = false;
        this.isMuted = false;
        this.isVideoEnabled = true;
    }

    // Event system
    on(event: string, callback: Function): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event)?.push(callback);
    }

    off(event: string, callback?: Function): void {
        if (callback) {
            const listeners = this.eventListeners.get(event);
            if (listeners) {
                const index = listeners.indexOf(callback);
                if (index > -1) {
                    listeners.splice(index, 1);
                }
            }
        } else {
            this.eventListeners.delete(event);
        }
    }

    private emit(event: string, data?: any): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => callback(data));
        }
    }
}

export const webRTCService = new WebRTCService();