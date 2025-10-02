import React, { useState } from "react";
import { View, Text, Image, Pressable, Modal, TouchableOpacity, Dimensions, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatTime } from "../../src/lib/utils/timeUtils";
import { playAudio } from "../../src/lib/utils/messageUtils";
import { ExtendedMessage } from "../../src/lib/types";

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
    const [imageModalVisible, setImageModalVisible] = useState(false);
    const { width, height } = Dimensions.get('window');

    const handleImagePress = () => {
        // If image is already selected for deletion, don't open modal
        if (!isSelected) {
            setImageModalVisible(true);
        }
    };

    const handleDeleteFromModal = () => {
        Alert.alert(
            "Delete Image",
            "Are you sure you want to delete this image?",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        setImageModalVisible(false);
                        // Trigger the selection for deletion (same as long press)
                        setTimeout(() => {
                            onLongPress();
                        }, 300);
                    }
                }
            ]
        );
    };

    return (
        <>
            <View className="w-full px-2 py-1">
                <Pressable
                    onLongPress={onLongPress}
                    onPress={() => {
                        // If already selected, toggle selection on press
                        if (isSelected) {
                            onLongPress();
                        }
                    }}
                    className={`
                        p-2.5 rounded-2xl max-w-[75%]
                        ${isOwnMessage ? 'self-end bg-blue-600' : 'self-start bg-gray-700'}
                        ${isSelected ? 'border-2 border-blue-400' : ''}
                    `}
                >
                    {item.messageType === "text" && (
                        <View>
                            <Text className="text-white text-base leading-5">
                                {item?.message}
                            </Text>
                            <Text className="text-right text-[9px] text-gray-300 mt-1">
                                {formatTime(item.timeStamp)}
                            </Text>
                        </View>
                    )}

                    {item.messageType === "image" && item.imageUrl && (
                        <Pressable
                            onPress={handleImagePress}
                            onLongPress={onLongPress}
                        >
                            <View>
                                <Image
                                    source={{ uri: item.imageUrl }}
                                    className="w-48 h-48 rounded-lg"
                                    resizeMode="cover"
                                />
                                <Text className="absolute right-2 bottom-2 text-white text-[9px] bg-black/60 px-1.5 py-0.5 rounded">
                                    {formatTime(item.timeStamp)}
                                </Text>
                            </View>
                        </Pressable>
                    )}

                    {item.messageType === "audio" && item.audioUrl && (
                        <View className="flex-row items-center min-w-[200px]">
                            <Pressable onPress={() => playAudio(item.audioUrl as string)}>
                                <Ionicons name="play-circle" size={32} color="white" />
                            </Pressable>
                            <View className="ml-2 bg-gray-800/50 h-8 rounded-full flex-1 justify-center px-3">
                                <Text className="text-white text-sm">Audio Message</Text>
                            </View>
                            <Text className="ml-2 text-[9px] text-gray-300">
                                {formatTime(item.timeStamp)}
                            </Text>
                        </View>
                    )}
                </Pressable>
            </View>

            {/* Full Screen Image Modal */}
            {item.messageType === "image" && item.imageUrl && (
                <Modal
                    visible={imageModalVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setImageModalVisible(false)}
                >
                    <View className="flex-1 bg-black">
                        {/* Header */}
                        <View className="absolute top-0 left-0 right-0 z-10 bg-black/80 pt-12 pb-4 px-4 flex-row items-center">
                            <TouchableOpacity
                                onPress={() => setImageModalVisible(false)}
                                className="mr-4"
                            >
                                <Ionicons name="arrow-back" size={28} color="white" />
                            </TouchableOpacity>
                            <View>
                                <Text className="text-white text-base">
                                    {formatTime(item.timeStamp)}
                                </Text>
                            </View>
                        </View>

                        {/* Full Image */}
                        <View className="flex-1 justify-center items-center">
                            <Image
                                source={{ uri: item.imageUrl }}
                                style={{ width: width, height: height }}
                                resizeMode="contain"
                            />
                        </View>

                        {/* Footer Actions */}
                        <View className="absolute bottom-0 left-0 right-0 z-10 bg-black/80 py-4 px-4 flex-row justify-around">
                            <TouchableOpacity className="items-center">
                                <Ionicons name="share-outline" size={24} color="white" />
                                <Text className="text-white text-xs mt-1">Share</Text>
                            </TouchableOpacity>
                            <TouchableOpacity className="items-center">
                                <Ionicons name="download-outline" size={24} color="white" />
                                <Text className="text-white text-xs mt-1">Save</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="items-center"
                                onPress={handleDeleteFromModal}
                            >
                                <Ionicons name="trash-outline" size={24} color="white" />
                                <Text className="text-white text-xs mt-1">Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            )}
        </>
    );
};

export default MessageBubble;