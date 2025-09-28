import React from 'react';
import { View, TextInput, Text, Pressable } from 'react-native';
import { Entypo, Feather } from '@expo/vector-icons';

interface MessageInputProps {
    message: string;
    keyboardHeight: number;
    connectionStatus: 'connecting' | 'connected' | 'disconnected';
    uploadingMedia: boolean;
    isRecording: boolean;
    onTextChange: (text: string) => void;
    onSend: () => void;
    onShowImagePicker: () => void;
    onStartRecording: () => void;
    onStopRecording: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
    message,
    keyboardHeight,
    connectionStatus,
    uploadingMedia,
    isRecording,
    onTextChange,
    onSend,
    onShowImagePicker,
    onStartRecording,
    onStopRecording,
}) => {
    return (
        <View
            className="flex-row items-center px-2.5 py-2.5 border-t border-gray-700 bg-black"
            style={{
                marginBottom: keyboardHeight,
            }}
        >
            <TextInput
                value={message}
                onChangeText={onTextChange}
                className="flex-1 h-10 border border-gray-600 bg-gray-800 rounded-full px-4 text-white"
                placeholder="Type Your message..."
                placeholderTextColor="#9ca3af"
                multiline
                editable={connectionStatus === 'connected' && !uploadingMedia}
            />

            <View className="flex-row items-center gap-2 mx-2">
                <Entypo
                    onPress={onShowImagePicker}
                    name="camera"
                    size={24}
                    color={connectionStatus === 'connected' && !uploadingMedia ? "#2563eb" : "#6b7280"}
                    disabled={uploadingMedia}
                />
                <Pressable
                    onPressIn={onStartRecording}
                    onPressOut={onStopRecording}
                    disabled={connectionStatus !== 'connected' || uploadingMedia}
                >
                    <Feather
                        name="mic"
                        size={24}
                        color={isRecording ? "red" : connectionStatus === 'connected' && !uploadingMedia ? "#2563eb" : "#6b7280"}
                    />
                </Pressable>
            </View>

            <Pressable
                onPress={onSend}
                disabled={message.trim() === "" || connectionStatus !== 'connected' || uploadingMedia}
                className={`py-2 px-3 rounded-full ${message.trim() === "" || connectionStatus !== 'connected' || uploadingMedia
                    ? "bg-gray-700"
                    : "bg-blue-600"
                    }`}
            >
                <Text className="text-white font-bold">Send</Text>
            </Pressable>
        </View>
    );
};