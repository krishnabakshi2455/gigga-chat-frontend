import React, { useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Vibration,
    Modal,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CallData } from '../../src/lib/types/types';

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
        if (visible && callData) {
            console.log('📞 IncomingCallScreen mounted for call:', callData.callId);

            // Vibrate when incoming call appears
            const pattern = [500, 500, 500, 500];
            Vibration.vibrate(pattern, true); // Repeat vibration

            return () => {
                console.log('🔕 IncomingCallScreen unmounting, stopping vibration');
                Vibration.cancel();
            };
        }
    }, [visible, callData]);

    const handleAccept = () => {
        console.log('✅ User accepting call:', callData?.callId);
        Vibration.cancel();
        onAccept();
    };

    const handleReject = () => {
        console.log('❌ User rejecting call:', callData?.callId);
        Vibration.cancel();
        onReject();
    };

    if (!callData) {
        console.log('⚠️ IncomingCallScreen: No call data');
        return null;
    }

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            statusBarTranslucent
            onRequestClose={handleReject}
        >
            <View className="flex-1 bg-black/95 justify-center items-center">
                <View className="items-center mb-12">
                    {/* Caller Avatar */}
                    <View className="w-32 h-32 bg-gray-700 rounded-full items-center justify-center mb-6 border-4 border-green-500">
                        {callData.callerImage ? (
                            <Image
                                source={{ uri: callData.callerImage }}
                                className="w-full h-full rounded-full"
                                resizeMode="cover"
                            />
                        ) : (
                            <Text className="text-5xl">👤</Text>
                        )}
                    </View>

                    {/* Caller Name */}
                    <Text className="text-3xl font-bold text-white mb-2">
                        {callData.callerName || 'Unknown Caller'}
                    </Text>

                    {/* Call Type */}
                    <Text className="text-xl text-gray-300 mb-1">
                        {callData.callType === 'video' ? '📹 Video Call' : '📞 Voice Call'}
                    </Text>

                    {/* Incoming Label with animation */}
                    <View className="bg-green-500/20 px-6 py-2 rounded-full mt-4">
                        <Text className="text-green-400 font-semibold text-lg">
                            Incoming Call...
                        </Text>
                    </View>
                </View>

                {/* Call Actions */}
                <View className="flex-row justify-around w-full px-12 mt-12">
                    {/* Reject Button */}
                    <View className="items-center">
                        <TouchableOpacity
                            className="w-20 h-20 bg-red-500 rounded-full items-center justify-center shadow-lg active:scale-95"
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
                        <Text className="text-white mt-3 font-medium text-base">Decline</Text>
                    </View>

                    {/* Accept Button */}
                    <View className="items-center">
                        <TouchableOpacity
                            className="w-20 h-20 bg-green-500 rounded-full items-center justify-center shadow-lg active:scale-95"
                            onPress={handleAccept}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="call" size={35} color="white" />
                        </TouchableOpacity>
                        <Text className="text-white mt-3 font-medium text-base">Accept</Text>
                    </View>
                </View>

                {/* Call Info */}
                <View className="absolute bottom-12 items-center">
                    <Text className="text-gray-400 text-sm">
                        Call ID: {callData.callId.slice(-8)}
                    </Text>
                </View>
            </View>
        </Modal>
    );
};

export default IncomingCallScreen;