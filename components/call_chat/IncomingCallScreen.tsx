import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CallData } from '../../src/lib/types';

interface IncomingCallScreenProps {
    callData: CallData;
    onAccept: () => void;
    onReject: () => void;
}

export const IncomingCallScreen: React.FC<IncomingCallScreenProps> = ({
    callData,
    onAccept,
    onReject,
}) => {
    React.useEffect(() => {
        // Vibrate when incoming call appears
        const interval = setInterval(() => {
            Vibration.vibrate([500, 500, 500]);
        }, 1000);

        return () => {
            clearInterval(interval);
            Vibration.cancel();
        };
    }, []);

    return (
        <View className="absolute inset-0 bg-black/90 justify-center items-center z-50">
            <View className="items-center mb-12">
                <View className="w-32 h-32 bg-gray-700 rounded-full items-center justify-center mb-6">
                    <Text className="text-4xl text-white">📞</Text>
                </View>
                <Text className="text-3xl font-bold text-white mb-2">
                    {callData.callerName}
                </Text>
                <Text className="text-xl text-gray-300">
                    {callData.callType === 'video' ? 'Incoming Video Call' : 'Incoming Audio Call'}
                </Text>
            </View>

            <View className="flex-row justify-around w-full px-12">
                <TouchableOpacity
                    className="w-20 h-20 bg-red-500 rounded-full items-center justify-center"
                    onPress={onReject}
                >
                    <Ionicons name="call" size={35} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
                </TouchableOpacity>

                <TouchableOpacity
                    className="w-20 h-20 bg-green-500 rounded-full items-center justify-center"
                    onPress={onAccept}
                >
                    <Ionicons name="call" size={35} color="white" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default IncomingCallScreen;