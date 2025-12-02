import React from 'react';
import { View, TextInput, Text, Pressable, ActivityIndicator } from 'react-native';
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
                // CHANGED: Removed marginBottom to fix keyboard covering issue
                paddingBottom: keyboardHeight > 0 ? keyboardHeight : 0,
            }}
        >
            <TextInput
                value={message}
                onChangeText={onTextChange}
                className="flex-1 h-12 border border-gray-600 bg-gray-800 rounded-full px-4 text-white"
                placeholder="Type Your message..."
                placeholderTextColor="#9ca3af"
                multiline
                // CHANGED: Removed editable restriction, always allow typing
                editable={connectionStatus === 'connected'}
            />

            <View className="flex-row items-center gap-2 mx-2">
                {/* CHANGED: Show loader instead of disabling when uploading */}
                {uploadingMedia ? (
                    <ActivityIndicator size="small" color="#2563eb" />
                ) : (
                    <>
                        <Entypo
                            onPress={onShowImagePicker}
                            name="camera"
                            size={24}
                            color={connectionStatus === 'connected' ? "#2563eb" : "#6b7280"}
                        />
                        <Pressable
                            onPressIn={onStartRecording}
                            onPressOut={onStopRecording}
                            disabled={connectionStatus !== 'connected'}
                        >
                            <Feather
                                name="mic"
                                size={24}
                                color={isRecording ? "red" : connectionStatus === 'connected' ? "#2563eb" : "#6b7280"}
                            />
                        </Pressable>
                    </>
                )}
            </View>

            <Pressable
                onPress={onSend}
                // CHANGED: Only disable if message is empty or not connected, allow sending while uploading
                disabled={message.trim() === "" || connectionStatus !== 'connected'}
                className={`py-2 px-3 rounded-full ${message.trim() === "" || connectionStatus !== 'connected'
                    ? "bg-gray-700"
                    : "bg-blue-600"
                    }`}
            >
                {/* CHANGED: Show loader in button when uploading */}
                {uploadingMedia ? (
                    <ActivityIndicator size="small" color="white" />
                ) : (
                    <Text className="text-white font-bold">Send</Text>
                )}
            </Pressable>
        </View>
    );
};