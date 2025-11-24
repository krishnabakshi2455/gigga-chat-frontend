import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Alert,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { CallData } from '../../src/lib/types/types';

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
    const intervalRef = useRef<NodeJS.Timeout>(null);

    useEffect(() => {
        initializeCall();
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    const initializeCall = async () => {
        if (isIncoming) {
            setCallStatus('connecting');
        } else {
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

    const toggleMute = () => {
        setIsMuted(!isMuted);
        // Implement actual mute logic here
    };

    const toggleSpeaker = () => {
        setIsSpeakerOn(!isSpeakerOn);
        // Implement actual speaker toggle logic here
    };

    const toggleVideo = () => {
        setIsVideoOn(!isVideoOn);
        // Implement actual video toggle logic here
    };

    return (
        <SafeAreaView className="flex-1 bg-black">
            <StatusBar backgroundColor="#000" barStyle="light-content" />

            {/* Main Content */}
            <View className="flex-1 justify-center items-center">
                {/* User Info */}
                <View className="items-center mb-8">
                    <View className="w-24 h-24 bg-gray-700 rounded-full items-center justify-center mb-4">
                        <Text className="text-3xl text-white">👤</Text>
                    </View>
                    <Text className="text-2xl font-bold text-white mb-2">
                        {callData.callerName}
                    </Text>
                    <Text className="text-lg text-gray-300">
                        {callStatus === 'connecting'
                            ? 'Connecting...'
                            : callStatus === 'active'
                                ? formatDuration(callDuration)
                                : 'Call ended'}
                    </Text>
                    <Text className="text-md text-gray-400 mt-1">
                        {callData.callType === 'video' ? 'Video Call' : 'Audio Call'}
                    </Text>
                </View>

                {/* Call Controls */}
                <View className="w-full px-8">
                    {isIncoming && callStatus === 'connecting' ? (
                        // Incoming call controls
                        <View className="flex-row justify-around items-center">
                            <TouchableOpacity
                                className="w-16 h-16 bg-red-500 rounded-full items-center justify-center"
                                onPress={handleRejectCall}
                            >
                                <Ionicons name="call" size={30} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="w-16 h-16 bg-green-500 rounded-full items-center justify-center"
                                onPress={handleAcceptCall}
                            >
                                <Ionicons name="call" size={30} color="white" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        // Active call controls
                        <View className="flex-row justify-around items-center">
                            <TouchableOpacity
                                className={`w-12 h-12 rounded-full items-center justify-center ${isMuted ? 'bg-red-500' : 'bg-gray-600'}`}
                                onPress={toggleMute}
                            >
                                <Ionicons
                                    name={isMuted ? "mic-off" : "mic"}
                                    size={24}
                                    color="white"
                                />
                            </TouchableOpacity>

                            {callData.callType === 'video' && (
                                <TouchableOpacity
                                    className={`w-12 h-12 rounded-full items-center justify-center ${!isVideoOn ? 'bg-red-500' : 'bg-gray-600'}`}
                                    onPress={toggleVideo}
                                >
                                    <Ionicons
                                        name={isVideoOn ? "videocam" : "videocam-off"}
                                        size={24}
                                        color="white"
                                    />
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                className={`w-12 h-12 rounded-full items-center justify-center ${isSpeakerOn ? 'bg-blue-500' : 'bg-gray-600'}`}
                                onPress={toggleSpeaker}
                            >
                                <Ionicons
                                    name="volume-high"
                                    size={24}
                                    color="white"
                                />
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="w-16 h-16 bg-red-500 rounded-full items-center justify-center"
                                onPress={handleEndCall}
                            >
                                <Ionicons name="call" size={30} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
};

export default CallScreen;