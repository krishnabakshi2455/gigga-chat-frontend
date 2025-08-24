import { Text, View, Pressable, Image } from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAtom } from "jotai";
import { userIdAtom } from "../lib/global.store";
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
        return new Date(time).toLocaleString("en-US", options);
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
            className="flex-row items-center gap-2.5 border-b border-gray-300 p-2.5"
        >
            <Image
                className="w-12 h-12 rounded-full"
                source={{ uri: item?.image }}
                style={{
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                }}
            />

            <View className="flex-1">
                <Text className="text-sm font-medium">{item?.name}</Text>
                {lastMessage && (
                    <Text className="mt-1 text-gray-500 font-medium text-xs">
                        {lastMessage?.message}
                    </Text>
                )}
            </View>

            <View>
                <Text className="text-[11px] font-normal text-gray-600">
                    {lastMessage && formatTime(lastMessage?.timeStamp)}
                </Text>
            </View>
        </Pressable>
    );
};

export default UserChat;