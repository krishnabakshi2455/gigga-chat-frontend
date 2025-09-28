import React from "react";
import { View, Text, Image, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatTime } from "../utils/timeUtils";
import { playAudio } from "../utils/messageUtils";
import { ExtendedMessage } from "../types";

interface MessageBubbleProps {
    item: ExtendedMessage;
    userId: string;
    isSelected: boolean;
    onLongPress: () => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
    item,
    userId,
    isSelected,
    onLongPress,
}) => {
    const isOwnMessage = item?.senderId?._id === userId;

    return (
        <Pressable
            onLongPress={onLongPress}
            className={`
        p-2 m-2.5 rounded-lg max-w-[80%]
        ${isOwnMessage ? 'self-end bg-blue-600' : 'self-start bg-gray-700'}
        ${isSelected ? 'border-2 border-blue-400' : ''}
      `}
        >
            {item.messageType === "text" && (
                <>
                    <Text className={`text-white text-base ${isSelected ? 'text-right' : 'text-left'}`}>
                        {item?.message}
                    </Text>
                    <Text className="text-right text-[10px] text-gray-300 mt-1">
                        {formatTime(item.timeStamp)}
                    </Text>
                </>
            )}

            {item.messageType === "image" && item.imageUrl && (
                <View className="relative">
                    <Image
                        source={{ uri: item.imageUrl }}
                        className="w-60 h-60 rounded-lg"
                        resizeMode="cover"
                    />
                    <Text className="absolute right-2 bottom-2 text-white text-[10px] bg-black bg-opacity-50 px-1 rounded">
                        {formatTime(item.timeStamp)}
                    </Text>
                </View>
            )}

            {item.messageType === "audio" && item.audioUrl && (
                <View className="flex-row items-center">
                    <Ionicons
                        name="play-circle"
                        size={32}
                        color="white"
                        onPress={() => playAudio(item.audioUrl as string)}
                    />
                    <View className="ml-2 bg-gray-800 h-8 rounded-full w-40 justify-center">
                        <Text className="text-white text-center">Audio Message</Text>
                    </View>
                    <Text className="ml-2 text-[10px] text-gray-300">
                        {formatTime(item.timeStamp)}
                    </Text>
                </View>
            )}
        </Pressable>
    );
};

export default MessageBubble;