import {
    mediaDevices,
    RTCPeerConnection,
    RTCIceCandidate,
    RTCSessionDescription,
    MediaStream,
    MediaStreamTrack
} from 'react-native-webrtc';
import InCallManager from 'react-native-incall-manager';

// STUN servers for ICE candidate gathering
const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
    ]
};

// Define React Native WebRTC specific types
interface ReactNativeRTCIceCandidate {
    candidate: string;
    sdpMLineIndex?: number;
    sdpMid?: string;
}

interface ReactNativeRTCSessionDescription {
    type: 'offer' | 'answer' | 'pranswer' | 'rollback';
    sdp: string;
}

class WebRTCService {
    private peerConnection: RTCPeerConnection | null = null;
    private localStream: MediaStream | null = null;
    private remoteStream: MediaStream | null = null;
    private eventListeners: Map<string, Function[]> = new Map();
    private isInitiator: boolean = false;
    private callType: 'video' | 'audio' = 'audio';

    async initializeCall(
        isInitiator: boolean,
        callType: 'video' | 'audio'
    ): Promise<MediaStream | null> {
        try {
            this.isInitiator = isInitiator;
            this.callType = callType;

            // Setup InCall Manager
            InCallManager.start({ media: callType });
            InCallManager.setKeepScreenOn(true);
            InCallManager.setForceSpeakerphoneOn(callType === 'video');

            // Get local media stream
            const constraints: any = {
                audio: true,
                video: callType === 'video' ? {
                    width: { min: 640, ideal: 1280, max: 1920 },
                    height: { min: 480, ideal: 720, max: 1080 },
                    frameRate: { min: 15, ideal: 30, max: 30 },
                    facingMode: 'user'
                } : false
            };

            this.localStream = await mediaDevices.getUserMedia(constraints);

            // Create peer connection
            this.peerConnection = new RTCPeerConnection(ICE_SERVERS);

            // Add local tracks to peer connection - React Native WebRTC way
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => {
                    if (this.peerConnection) {
                        // React Native WebRTC uses addStream or addTrack with different signature
                        // Try the React Native specific approach
                        (this.peerConnection as any).addTrack(track, this.localStream);
                    }
                });
            }

            // Setup peer connection event handlers
            this.setupPeerConnectionListeners();

            return this.localStream;
        } catch (error) {
            console.error('Error initializing call:', error);
            this.emit('error', error);
            return null;
        }
    }

    private setupPeerConnectionListeners(): void {
        if (!this.peerConnection) return;

        // Handle ICE candidates - React Native WebRTC specific event format
        (this.peerConnection as any).onicecandidate = (event: { candidate: ReactNativeRTCIceCandidate | null }) => {
            if (event.candidate) {
                this.emit('iceCandidate', event.candidate);
            }
        };

        // Handle remote stream - React Native WebRTC uses onaddstream
        (this.peerConnection as any).onaddstream = (event: { stream: MediaStream }) => {
            if (event.stream) {
                this.remoteStream = event.stream;
                this.emit('remoteStream', this.remoteStream);
            }
        };

        // Handle ICE connection state
        (this.peerConnection as any).oniceconnectionstatechange = () => {
            const state = this.peerConnection?.iceConnectionState;
            console.log('ICE connection state:', state);
            this.emit('iceConnectionStateChange', state);

            if (state === 'connected' || state === 'completed') {
                this.emit('callConnected');
            } else if (state === 'failed' || state === 'disconnected') {
                this.emit('callDisconnected');
            }
        };

        // Handle signaling state changes
        (this.peerConnection as any).onsignalingstatechange = () => {
            const state = this.peerConnection?.signalingState;
            console.log('Signaling state:', state);
            this.emit('signalingStateChange', state);
        };

        // Handle connection state changes
        (this.peerConnection as any).onconnectionstatechange = () => {
            const state = (this.peerConnection as any).connectionState;
            console.log('Connection state:', state);
            this.emit('connectionStateChange', state);
        };
    }

    async createOffer(): Promise<RTCSessionDescription | null> {
        try {
            if (!this.peerConnection) {
                throw new Error('Peer connection not initialized');
            }

            const offerOptions = {
                offerToReceiveAudio: true,
                offerToReceiveVideo: this.callType === 'video'
            };

            const offer = await this.peerConnection.createOffer(offerOptions);
            await this.peerConnection.setLocalDescription(offer);

            return offer;
        } catch (error) {
            console.error('Error creating offer:', error);
            this.emit('error', error);
            return null;
        }
    }

    async createAnswer(): Promise<RTCSessionDescription | null> {
        try {
            if (!this.peerConnection) {
                throw new Error('Peer connection not initialized');
            }

            const answerOptions = {
                offerToReceiveAudio: true,
                offerToReceiveVideo: this.callType === 'video'
            };

            const answer = await this.peerConnection.createAnswer(answerOptions);
            await this.peerConnection.setLocalDescription(answer);

            return answer;
        } catch (error) {
            console.error('Error creating answer:', error);
            this.emit('error', error);
            return null;
        }
    }

    async handleOffer(offer: any): Promise<void> {
        try {
            if (!this.peerConnection) {
                throw new Error('Peer connection not initialized');
            }

            const sessionDescription = new RTCSessionDescription(offer);
            await this.peerConnection.setRemoteDescription(sessionDescription);
        } catch (error) {
            console.error('Error handling offer:', error);
            this.emit('error', error);
        }
    }

    async handleAnswer(answer: any): Promise<void> {
        try {
            if (!this.peerConnection) {
                throw new Error('Peer connection not initialized');
            }

            const sessionDescription = new RTCSessionDescription(answer);
            await this.peerConnection.setRemoteDescription(sessionDescription);
        } catch (error) {
            console.error('Error handling answer:', error);
            this.emit('error', error);
        }
    }

    async addIceCandidate(candidate: any): Promise<void> {
        try {
            if (!this.peerConnection) {
                throw new Error('Peer connection not initialized');
            }

            const iceCandidate = new RTCIceCandidate(candidate);
            await this.peerConnection.addIceCandidate(iceCandidate);
        } catch (error) {
            console.error('Error adding ICE candidate:', error);
            console.warn('ICE candidate error (normal during connection):', error);
        }
    }

    toggleMute(): boolean {
        if (!this.localStream) return false;

        const audioTracks = this.localStream.getAudioTracks();
        if (audioTracks.length > 0) {
            const audioTrack = audioTracks[0];
            audioTrack.enabled = !audioTrack.enabled;
            return !audioTrack.enabled;
        }
        return false;
    }

    toggleVideo(): boolean {
        if (!this.localStream || this.callType !== 'video') return false;

        const videoTracks = this.localStream.getVideoTracks();
        if (videoTracks.length > 0) {
            const videoTrack = videoTracks[0];
            videoTrack.enabled = !videoTrack.enabled;
            return !videoTrack.enabled;
        }
        return false;
    }

    toggleSpeaker(enable: boolean): void {
        InCallManager.setForceSpeakerphoneOn(enable);
    }

    switchCamera(): void {
        if (this.localStream && this.callType === 'video') {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                // React Native WebRTC camera switch
                // @ts-ignore - _switchCamera is available in react-native-webrtc
                if (typeof videoTrack._switchCamera === 'function') {
                    // @ts-ignore
                    videoTrack._switchCamera();
                }
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
        try {
            // Stop all local tracks
            if (this.localStream) {
                this.localStream.getTracks().forEach((track: MediaStreamTrack) => {
                    track.stop();
                });
                this.localStream = null;
            }

            // Stop all remote tracks
            if (this.remoteStream) {
                this.remoteStream.getTracks().forEach((track: MediaStreamTrack) => {
                    track.stop();
                });
                this.remoteStream = null;
            }

            // Close peer connection
            if (this.peerConnection) {
                this.peerConnection.close();
                this.peerConnection = null;
            }

            // Stop InCall Manager
            InCallManager.stop();

            this.emit('callEnded');
        } catch (error) {
            console.error('Error ending call:', error);
            this.emit('error', error);
        }
    }

    on(event: string, callback: Function): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event)?.push(callback);
    }

    off(event: string, callback: Function): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    private emit(event: string, data?: any): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => callback(data));
        }
    }

    cleanup(): void {
        this.eventListeners.clear();
    }
}

export const webRTCService = new WebRTCService();