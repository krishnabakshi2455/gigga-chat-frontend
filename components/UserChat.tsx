import { Text, View, Pressable, Image } from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAtom } from "jotai";
import { userIdAtom } from "../lib/store/userId.store";
import config from "../config";

interface Message {
    _id: string;
    messageType: "text" | "image";
    message?: string;
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
    const navigation = useNavigation<any>();

    const fetchMessages = async () => {
        if (!userId) return;

        try {
            const response = await fetch(
                `${config.BACKEND_URL}/messages/${userId}/${item._id}`
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
            (message) => message.messageType === "text"
        );

        const n = userMessages.length;
        return userMessages[n - 1];
    };

    const lastMessage = getLastMessage();

    const formatTime = (time: string): string => {
        const options: Intl.DateTimeFormatOptions = {
            hour: "numeric",
            minute: "numeric"
        };
        return new Date(time).toLocaleString("en-IN", options);
    };

    if (!userId) {
        return null;
    }

    return (
        <Pressable
            onPress={() =>
                navigation.navigate("Messages", {
                    recepientId: item._id,
                })
            }
            className="flex-row items-center py-4 px-5 border-b border-gray-800"
            style={{
                backgroundColor: '#0a0a0a',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 1,
            }}
        >
            {/* Avatar with online indicator */}
            <View className="relative mr-4">
                <Image
                    className="w-14 h-14 rounded-full border-2 border-gray-700"
                    source={{ uri: item?.image }}
                    style={{
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                    }}
                />
                {/* Online status indicator */}
                <View
                    className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2"
                    style={{ borderColor: '#0a0a0a' }}
                />
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
                        {lastMessage?.message}
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