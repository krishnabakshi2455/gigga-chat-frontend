import { Text, View, Pressable, Image } from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAtom } from "jotai";
import { BACKEND_URL } from "@env";
import { userIdAtom } from "../src/lib/store/userId.store";

interface Message {
    _id: string;
    messageType: "text" | "image" | "audio";
    message?: string;
    imageUrl?: string;
    audioUrl?: string;
    timeStamp: string;
}

interface UserChatItem {
    _id: string;
    name: string;
    image: string;
}

interface UserChatProps {
    item: UserChatItem;
}

const UserChat: React.FC<UserChatProps> = ({ item }) => {
    const [userId] = useAtom(userIdAtom);
    const [messages, setMessages] = useState<Message[]>([]);
    const [imageError, setImageError] = useState(false);
    const navigation = useNavigation<any>();

    const fetchMessages = async () => {
        if (!userId) return;

        try {
            const response = await fetch(
                `${BACKEND_URL}/messages/${userId}/${item._id}`
            );
            const data = await response.json();

            if (response.ok) {
                setMessages(data);
            } else {
                console.log("error showing messages", response.status);
            }
        } catch (error) {
            console.log("error fetching messages", error);
        }
    };

    useEffect(() => {
        fetchMessages();
    }, [userId]);

    const getLastMessage = (): Message | undefined => {
        const userMessages = messages.filter(
            (message) => message.messageType === "text" || message.messageType === "image" || message.messageType === "audio"
        );

        const n = userMessages.length;
        return userMessages[n - 1];
    };

    const getLastMessagePreview = (message: Message): string => {
        switch (message.messageType) {
            case 'text':
                return message.message || 'Message';
            case 'image':
                return '📷 Photo';
            case 'audio':
                return '🎤 Audio';
            default:
                return 'Message';
        }
    };

    const lastMessage = getLastMessage();

    const formatTime = (time: string): string => {
        const messageTime = new Date(time);
        const now = new Date();
        const diffInHours = (now.getTime() - messageTime.getTime()) / (1000 * 60 * 60);

        if (diffInHours < 24) {
            return messageTime.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit'
            });
        } else {
            return messageTime.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: '2-digit'
            });
        }
    };

    if (!userId) {
        return null;
    }

    return (
        <Pressable
            onPress={() =>
                navigation.navigate("Messages", {
                    _id: item._id,
                    name: item.name,
                    image: item.image
                })
            }
            className="flex-row items-center py-4 px-5 border-b border-gray-800 active:bg-gray-900"
            style={{
                backgroundColor: '#0a0a0a',
            }}
            android_ripple={{ color: '#1f2937' }}
        >
            {/* Avatar with online indicator */}
            <View className="relative mr-4">
                {item.image && !imageError ? (
                    <Image
                        className="w-14 h-14 rounded-full border-2 border-gray-700"
                        source={{ uri: item.image }}
                        onError={() => setImageError(true)}
                        resizeMode="cover"
                    />
                ) : (
                    <View className="w-14 h-14 rounded-full border-2 border-gray-700 bg-gray-600 items-center justify-center">
                        <Text className="text-white text-lg font-bold">
                            {item?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </Text>
                    </View>
                )}
            </View>

            {/* Message content */}
            <View className="flex-1 mr-3">
                <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-base font-semibold text-white" numberOfLines={1}>
                        {item?.name}
                    </Text>
                </View>

                {lastMessage ? (
                    <Text className="text-sm text-gray-400 leading-5" numberOfLines={2}>
                        {getLastMessagePreview(lastMessage)}
                    </Text>
                ) : (
                    <Text className="text-sm text-gray-500 italic">
                        No messages yet
                    </Text>
                )}
            </View>

            {/* Time and notification */}
            <View className="items-end justify-between" style={{ minHeight: 56 }}>
                <Text className="text-xs text-gray-500 mb-2">
                    {lastMessage && formatTime(lastMessage?.timeStamp)}
                </Text>

                {/* Unread message count badge */}
                {messages.length > 0 && (
                    <View className="bg-blue-600 rounded-full min-w-5 h-5 items-center justify-center px-1.5">
                        <Text className="text-white text-xs font-bold">
                            {messages.length > 99 ? '99+' : messages.length}
                        </Text>
                    </View>
                )}
            </View>
        </Pressable>
    );
};

export default UserChat;