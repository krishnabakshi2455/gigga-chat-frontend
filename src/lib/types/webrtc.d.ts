// d = "declaration" - it's a TypeScript file that contains ONLY type definitions, no actual code

declare module 'react-native-webrtc' {
    export interface MediaStreamTrack {
        enabled: boolean;
        id: string;
        kind: string;
        label: string;
        muted: boolean;
        readonly readyState: 'live' | 'ended';
        stop(): void;
        _switchCamera?(): void;
    }

    export interface MediaStream {
        id: string;
        active: boolean;
        addTrack(track: MediaStreamTrack): void;
        removeTrack(track: MediaStreamTrack): void;
        getTracks(): MediaStreamTrack[];
        getAudioTracks(): MediaStreamTrack[];
        getVideoTracks(): MediaStreamTrack[];
        getTrackById(trackId: string): MediaStreamTrack | null;
        toURL(): string;
        release(): void;
    }

    export interface RTCIceCandidate {
        candidate: string;
        sdpMLineIndex: number | null;
        sdpMid: string | null;
        toJSON(): any;
    }

    export interface RTCSessionDescription {
        type: 'offer' | 'answer' | 'pranswer' | 'rollback';
        sdp: string;
        toJSON(): any;
    }

    export interface RTCIceServer {
        urls: string | string[];
        username?: string;
        credential?: string;
    }

    export interface RTCConfiguration {
        iceServers: RTCIceServer[];
        iceTransportPolicy?: 'all' | 'relay';
        bundlePolicy?: 'balanced' | 'max-compat' | 'max-bundle';
        rtcpMuxPolicy?: 'negotiate' | 'require';
        iceCandidatePoolSize?: number;
    }

    export interface RTCOfferOptions {
        offerToReceiveAudio?: boolean;
        offerToReceiveVideo?: boolean;
        voiceActivityDetection?: boolean;
        iceRestart?: boolean;
    }

    export interface RTCAnswerOptions {
        offerToReceiveAudio?: boolean;
        offerToReceiveVideo?: boolean;
        voiceActivityDetection?: boolean;
    }

    export class RTCPeerConnection {
        constructor(configuration?: RTCConfiguration);

        localDescription: RTCSessionDescription | null;
        remoteDescription: RTCSessionDescription | null;
        signalingState: 'stable' | 'have-local-offer' | 'have-remote-offer' | 'have-local-pranswer' | 'have-remote-pranswer' | 'closed';
        iceConnectionState: 'new' | 'checking' | 'connected' | 'completed' | 'failed' | 'disconnected' | 'closed';
        iceGatheringState: 'new' | 'gathering' | 'complete';
        connectionState: 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed';

        createOffer(options?: RTCOfferOptions): Promise<RTCSessionDescription>;
        createAnswer(options?: RTCAnswerOptions): Promise<RTCSessionDescription>;
        setLocalDescription(description: RTCSessionDescription): Promise<void>;
        setRemoteDescription(description: RTCSessionDescription): Promise<void>;
        addIceCandidate(candidate: RTCIceCandidate): Promise<void>;

        addStream(stream: MediaStream): void;
        removeStream(stream: MediaStream): void;
        getLocalStreams(): MediaStream[];
        getRemoteStreams(): MediaStream[];

        close(): void;

        // Event handlers
        onicecandidate: ((event: { candidate: RTCIceCandidate | null }) => void) | null;
        onaddstream: ((event: { stream: MediaStream }) => void) | null;
        onremovestream: ((event: { stream: MediaStream }) => void) | null;
        oniceconnectionstatechange: (() => void) | null;
        onsignalingstatechange: (() => void) | null;
        onicegatheringstatechange: (() => void) | null;
        onconnectionstatechange: (() => void) | null;
    }

    export interface MediaDeviceInfo {
        deviceId: string;
        groupId: string;
        kind: 'audioinput' | 'audiooutput' | 'videoinput';
        label: string;
    }

    export interface MediaTrackConstraints {
        deviceId?: string | { exact: string } | { ideal: string };
        groupId?: string | { exact: string } | { ideal: string };
        aspectRatio?: number | { min?: number; max?: number; ideal?: number; exact?: number };
        facingMode?: 'user' | 'environment' | 'left' | 'right' | { exact: string } | { ideal: string };
        frameRate?: number | { min?: number; max?: number; ideal?: number; exact?: number };
        height?: number | { min?: number; max?: number; ideal?: number; exact?: number };
        width?: number | { min?: number; max?: number; ideal?: number; exact?: number };
    }

    export interface MediaStreamConstraints {
        audio?: boolean | MediaTrackConstraints;
        video?: boolean | MediaTrackConstraints;
    }

    export const mediaDevices: {
        enumerateDevices(): Promise<MediaDeviceInfo[]>;
        getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream>;
        getSupportedConstraints(): any;
    };

    export class RTCView extends React.Component<{
        streamURL: string;
        style?: any;
        objectFit?: 'contain' | 'cover';
        mirror?: boolean;
        zOrder?: number;
    }> { }
}

declare module 'react-native-incall-manager' {
    export default class InCallManager {
        static start(options?: { media?: 'audio' | 'video'; auto?: boolean; ringback?: string }): void;
        static stop(options?: { busytone?: string }): void;
        static setKeepScreenOn(enable: boolean): void;
        static setSpeakerphoneOn(enable: boolean): void;
        static setForceSpeakerphoneOn(enable: boolean): void;
        static setMicrophoneMute(mute: boolean): void;
        static turnScreenOff(): void;
        static turnScreenOn(): void;
        static startRingtone(ringtone: string, vibrate?: boolean, ios_category?: string, seconds?: number): void;
        static stopRingtone(): void;
        static stopRingback(): void;
        static getIsWiredHeadsetPluggedIn(): Promise<boolean>;
    }
}