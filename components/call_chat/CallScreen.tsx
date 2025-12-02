import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CallData } from '../../src/lib/types/types';
// CHANGED: Added RTCView import for video rendering
import { RTCView } from 'react-native-webrtc';
import { callService } from '../../src/services/CallService';

interface CallScreenProps {
    callData: CallData;
    onCallEnd: () => void;
    isIncoming?: boolean;
}

export const CallScreen: React.FC<CallScreenProps> = ({
    callData,
    onCallEnd,
    isIncoming = false,
}) => {
    const [callStatus, setCallStatus] = useState<'connecting' | 'active' | 'ended'>('connecting');
    const [callDuration, setCallDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(false);
    const [isVideoOn, setIsVideoOn] = useState(true);

    // CHANGED: Added state for WebRTC streams
    const [localStream, setLocalStream] = useState<any>(null);
    const [remoteStream, setRemoteStream] = useState<any>(null);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        initializeCall();
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    // CHANGED: Added effect to monitor streams from CallService
    useEffect(() => {
        const streamCheckInterval = setInterval(() => {
            const local = callService.getLocalStream();
            const remote = callService.getRemoteStream();

            if (local) {
                setLocalStream(local);
            }

            if (remote) {
                setRemoteStream(remote);
                // CHANGED: Auto-set call to active when remote stream arrives
                if (callStatus === 'connecting') {
                    setCallStatus('active');
                    if (!intervalRef.current) {
                        startCallTimer();
                    }
                }
            }
        }, 500);

        return () => clearInterval(streamCheckInterval);
    }, [callStatus]);

    const initializeCall = async () => {
        if (isIncoming) {
            setCallStatus('connecting');
        } else {
            // CHANGED: Start timer immediately for outgoing calls
            startCallTimer();
            setCallStatus('active');
        }
    };

    const startCallTimer = () => {
        intervalRef.current = setInterval(() => {
            setCallDuration(prev => prev + 1);
        }, 1000);
    };

    const handleAcceptCall = () => {
        setCallStatus('active');
        startCallTimer();
    };

    const handleRejectCall = () => {
        onCallEnd();
    };

    const handleEndCall = () => {
        onCallEnd();
    };

    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // CHANGED: Updated toggle functions to use CallService methods
    const toggleMute = () => {
        setIsMuted(!isMuted);
        callService.toggleMute();
    };

    const toggleSpeaker = () => {
        setIsSpeakerOn(!isSpeakerOn);
        // Note: Speaker toggle would require additional audio routing logic
        // This is a UI-only toggle for now
    };

    const toggleVideo = () => {
        setIsVideoOn(!isVideoOn);
        callService.toggleVideo();
    };

    // CHANGED: Added camera switch function
    const switchCamera = () => {
        callService.switchCamera();
    };

    return (
        <SafeAreaView className="flex-1 bg-black">
            <StatusBar backgroundColor="#000" barStyle="light-content" />

            {/* CHANGED: Added video rendering for video calls */}
            {callData.callType === 'video' && (
                <View className="flex-1">
                    {/* Remote Video (Full Screen) */}
                    {remoteStream ? (
                        <RTCView
                            streamURL={remoteStream.toURL()}
                            style={{ width: '100%', height: '100%' }}
                            objectFit="cover"
                            zOrder={0}
                        />
                    ) : (
                        <View className="flex-1 bg-gray-900 justify-center items-center">
                            <View className="w-32 h-32 bg-gray-700 rounded-full items-center justify-center mb-4">
                                <Text className="text-5xl text-white">👤</Text>
                            </View>
                            <Text className="text-white text-lg">
                                {callStatus === 'connecting' ? 'Connecting...' : 'Waiting for video...'}
                            </Text>
                        </View>
                    )}

                    {/* Local Video (Picture-in-Picture) */}
                    {localStream && isVideoOn && (
                        <View className="absolute top-12 right-4 w-28 h-36 rounded-2xl overflow-hidden border-2 border-white shadow-lg">
                            <RTCView
                                streamURL={localStream.toURL()}
                                style={{ width: '100%', height: '100%' }}
                                objectFit="cover"
                                zOrder={1}
                                mirror={true}
                            />
                            {/* Camera Switch Button */}
                            <TouchableOpacity
                                className="absolute bottom-2 right-2 w-8 h-8 bg-gray-800/70 rounded-full items-center justify-center"
                                onPress={switchCamera}
                            >
                                <Ionicons name="camera-reverse" size={16} color="white" />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Video Off Overlay for Local Stream */}
                    {!isVideoOn && (
                        <View className="absolute top-12 right-4 w-28 h-36 rounded-2xl bg-gray-800 border-2 border-white items-center justify-center">
                            <Ionicons name="videocam-off" size={32} color="white" />
                        </View>
                    )}
                </View>
            )}

            {/* CHANGED: Audio call UI (only show when not video call) */}
            {callData.callType === 'audio' && (
                <View className="flex-1 justify-center items-center">
                    <View className="items-center mb-8">
                        <View className="w-32 h-32 bg-gray-700 rounded-full items-center justify-center mb-6 border-4 border-blue-500">
                            <Text className="text-5xl text-white">👤</Text>
                        </View>
                        <Text className="text-3xl font-bold text-white mb-2">
                            {callData.callerName}
                        </Text>
                        <Text className="text-xl text-gray-300">
                            {callStatus === 'connecting'
                                ? 'Connecting...'
                                : callStatus === 'active'
                                    ? formatDuration(callDuration)
                                    : 'Call ended'}
                        </Text>
                        <Text className="text-md text-gray-400 mt-1">Audio Call</Text>
                    </View>
                </View>
            )}

            {/* CHANGED: Overlay controls for video calls */}
            {callData.callType === 'video' && (
                <View className="absolute top-12 left-4 bg-black/50 px-4 py-2 rounded-full">
                    <Text className="text-white text-base font-semibold">
                        {callData.callerName}
                    </Text>
                    <Text className="text-gray-300 text-sm">
                        {callStatus === 'connecting'
                            ? 'Connecting...'
                            : formatDuration(callDuration)}
                    </Text>
                </View>
            )}

            {/* Call Controls */}
            <View className="absolute bottom-0 left-0 right-0 pb-8 px-8 bg-gradient-to-t from-black/90 to-transparent">
                {isIncoming && callStatus === 'connecting' ? (
                    // Incoming call controls
                    <View className="flex-row justify-around items-center">
                        <TouchableOpacity
                            className="w-16 h-16 bg-red-500 rounded-full items-center justify-center shadow-xl"
                            onPress={handleRejectCall}
                        >
                            <Ionicons name="call" size={30} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="w-16 h-16 bg-green-500 rounded-full items-center justify-center shadow-xl"
                            onPress={handleAcceptCall}
                        >
                            <Ionicons name="call" size={30} color="white" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    // Active call controls
                    <View className="flex-row justify-around items-center">
                        {/* Mute Button */}
                        <View className="items-center">
                            <TouchableOpacity
                                className={`w-14 h-14 rounded-full items-center justify-center ${isMuted ? 'bg-red-500' : 'bg-gray-700'
                                    }`}
                                onPress={toggleMute}
                            >
                                <Ionicons
                                    name={isMuted ? "mic-off" : "mic"}
                                    size={24}
                                    color="white"
                                />
                            </TouchableOpacity>
                            <Text className="text-white text-xs mt-1">
                                {isMuted ? 'Unmute' : 'Mute'}
                            </Text>
                        </View>

                        {/* Video Toggle (only for video calls) */}
                        {callData.callType === 'video' && (
                            <View className="items-center">
                                <TouchableOpacity
                                    className={`w-14 h-14 rounded-full items-center justify-center ${!isVideoOn ? 'bg-red-500' : 'bg-gray-700'
                                        }`}
                                    onPress={toggleVideo}
                                >
                                    <Ionicons
                                        name={isVideoOn ? "videocam" : "videocam-off"}
                                        size={24}
                                        color="white"
                                    />
                                </TouchableOpacity>
                                <Text className="text-white text-xs mt-1">
                                    {isVideoOn ? 'Stop Video' : 'Start Video'}
                                </Text>
                            </View>
                        )}

                        {/* Speaker Button */}
                        <View className="items-center">
                            <TouchableOpacity
                                className={`w-14 h-14 rounded-full items-center justify-center ${isSpeakerOn ? 'bg-blue-500' : 'bg-gray-700'
                                    }`}
                                onPress={toggleSpeaker}
                            >
                                <Ionicons
                                    name={isSpeakerOn ? "volume-high" : "volume-medium"}
                                    size={24}
                                    color="white"
                                />
                            </TouchableOpacity>
                            <Text className="text-white text-xs mt-1">Speaker</Text>
                        </View>

                        {/* End Call Button */}
                        <View className="items-center">
                            <TouchableOpacity
                                className="w-16 h-16 bg-red-500 rounded-full items-center justify-center shadow-xl"
                                onPress={handleEndCall}
                            >
                                <Ionicons name="call" size={30} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
                            </TouchableOpacity>
                            <Text className="text-white text-xs mt-1">End Call</Text>
                        </View>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
};

export default CallScreen;