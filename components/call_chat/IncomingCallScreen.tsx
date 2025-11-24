import React, { useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Vibration,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CallData } from '../../src/lib/types/types';
import { callService } from '../../src/services/CallService';

interface IncomingCallScreenProps {
    visible: boolean;
    callData: CallData | null;
    onAccept: () => void;
    onReject: () => void;
}

export const IncomingCallScreen: React.FC<IncomingCallScreenProps> = ({
    visible,
    callData,
    onAccept,
    onReject,
}) => {
    useEffect(() => {
        if (visible) {
            // Vibrate when incoming call appears
            const pattern = [500, 500, 500, 500];
            Vibration.vibrate(pattern, true); // Repeat vibration

            return () => {
                Vibration.cancel();
            };
        }
    }, [visible]);

    const handleAccept = () => {
        Vibration.cancel();
        if (callData) {
            // Store the call data in call service
            callService.setActiveCall(callData);
        }
        onAccept();
    };

    const handleReject = () => {
        Vibration.cancel();
        if (callData) {
            callService.rejectCall(callData.callId, callData.callerId, 'User declined');
        }
        onReject();
    };

    if (!callData) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            statusBarTranslucent
        >
            <View className="flex-1 bg-black/95 justify-center items-center">
                <View className="items-center mb-12">
                    {/* Caller Avatar */}
                    <View className="w-32 h-32 bg-gray-700 rounded-full items-center justify-center mb-6 border-4 border-green-500">
                        {callData.callerImage ? (
                            <Text className="text-4xl">🖼️</Text>
                        ) : (
                            <Text className="text-4xl text-white">👤</Text>
                        )}
                    </View>

                    {/* Caller Name */}
                    <Text className="text-3xl font-bold text-white mb-2">
                        {callData.callerName}
                    </Text>

                    {/* Call Type */}
                    <Text className="text-xl text-gray-300 mb-1">
                        {callData.callType === 'video' ? '📹 Video Call' : '📞 Voice Call'}
                    </Text>

                    {/* Incoming Label */}
                    <View className="bg-green-500/20 px-4 py-2 rounded-full mt-2">
                        <Text className="text-green-400 font-semibold">
                            Incoming...
                        </Text>
                    </View>
                </View>

                {/* Call Actions */}
                <View className="flex-row justify-around w-full px-12 mt-8">
                    {/* Reject Button */}
                    <View className="items-center">
                        <TouchableOpacity
                            className="w-20 h-20 bg-red-500 rounded-full items-center justify-center shadow-lg"
                            onPress={handleReject}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name="call"
                                size={35}
                                color="white"
                                style={{ transform: [{ rotate: '135deg' }] }}
                            />
                        </TouchableOpacity>
                        <Text className="text-white mt-2 font-medium">Decline</Text>
                    </View>

                    {/* Accept Button */}
                    <View className="items-center">
                        <TouchableOpacity
                            className="w-20 h-20 bg-green-500 rounded-full items-center justify-center shadow-lg"
                            onPress={handleAccept}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="call" size={35} color="white" />
                        </TouchableOpacity>
                        <Text className="text-white mt-2 font-medium">Accept</Text>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default IncomingCallScreen;