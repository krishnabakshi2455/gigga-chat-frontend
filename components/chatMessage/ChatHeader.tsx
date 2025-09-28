import React from 'react';
import { View, Text, Image } from 'react-native';
import { Ionicons, FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { RecipientData } from '../../src/lib/types';

interface ConnectionIndicatorProps {
    connectionStatus: 'connecting' | 'connected' | 'disconnected';
    isOtherUserOnline: boolean;
}

const ConnectionIndicator: React.FC<ConnectionIndicatorProps> = ({
    connectionStatus,
    isOtherUserOnline
}) => {
    if (connectionStatus === 'connecting') {
        return (
            <View className="flex-row items-center">
                <View className="w-2 h-2 bg-yellow-500 rounded-full mr-2" />
                <Text className="text-xs text-yellow-500">Connecting...</Text>
            </View>
        );
    }

    if (connectionStatus === 'disconnected') {
        return (
            <View className="flex-row items-center">
                <View className="w-2 h-2 bg-red-500 rounded-full mr-2" />
                <Text className="text-xs text-red-500">Disconnected</Text>
            </View>
        );
    }

    return (
        <View className="flex-row items-center">
            <View className={`w-2 h-2 rounded-full mr-2 ${isOtherUserOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
            <Text className={`text-xs ${isOtherUserOnline ? 'text-green-500' : 'text-gray-500'}`}>
                {isOtherUserOnline ? 'Online' : 'Offline'}
            </Text>
        </View>
    );
};

interface ChatHeaderLeftProps {
    selectedMessages: string[];
    recepientData?: RecipientData;
    connectionStatus: 'connecting' | 'connected' | 'disconnected';
    isOtherUserOnline: boolean;
    onBack: () => void;
}

export const ChatHeaderLeft: React.FC<ChatHeaderLeftProps> = ({
    selectedMessages,
    recepientData,
    connectionStatus,
    isOtherUserOnline,
    onBack,
}) => {
    return (
        <View className="flex-row items-center gap-2.5">
            <Ionicons
                onPress={onBack}
                name="arrow-back"
                size={24}
                color="#2563eb"
            />

            {selectedMessages.length > 0 ? (
                <View>
                    <Text className="text-base font-medium text-blue-600">
                        {selectedMessages.length}
                    </Text>
                </View>
            ) : (
                <View className="flex-row items-center">
                    {recepientData?.image && (
                        <Image
                            className="w-8 h-8 rounded-full"
                            source={{ uri: recepientData.image }}
                        />
                    )}

                    <View className="ml-1.5">
                        <Text className="text-sm font-bold text-white">
                            {recepientData?.name || 'Loading...'}
                        </Text>
                        <ConnectionIndicator
                            connectionStatus={connectionStatus}
                            isOtherUserOnline={isOtherUserOnline}
                        />
                    </View>
                </View>
            )}
        </View>
    );
};

interface ChatHeaderRightProps {
    selectedMessages: string[];
    onDeleteMessages: () => void;
    onVideoCall: () => void;
    onAudioCall: () => void;
}

export const ChatHeaderRight: React.FC<ChatHeaderRightProps> = ({
    selectedMessages,
    onDeleteMessages,
    onVideoCall,
    onAudioCall,
}) => {
    if (selectedMessages.length > 0) {
        return (
            <View className="flex-row items-center gap-2.5">
                <Ionicons name="arrow-redo-sharp" size={24} color="#2563eb" />
                <Ionicons name="arrow-undo-sharp" size={24} color="#2563eb" />
                <FontAwesome name="star" size={24} color="#2563eb" />
                <MaterialIcons
                    onPress={onDeleteMessages}
                    name="delete"
                    size={24}
                    color="#2563eb"
                />
            </View>
        );
    }

    return (
        <View className="flex-row items-center gap-4">
            <FontAwesome
                name="video-camera"
                size={20}
                color="#2563eb"
                onPress={onVideoCall}
            />
            <Ionicons
                name="call"
                size={20}
                color="#2563eb"
                onPress={onAudioCall}
            />
        </View>
    );
};