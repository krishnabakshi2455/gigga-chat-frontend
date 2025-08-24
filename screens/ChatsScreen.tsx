import { Text, View, ScrollView, Pressable } from "react-native";
import React, { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { userIdAtom } from "../lib/global.store";
import { useNavigation } from "@react-navigation/native";
import config from "../config";
import UserChat from "../component/UserChat";

interface AcceptedFriend {
    _id: string;
    name: string;
    email: string;
    image: string;
    // Add other properties as needed
}

const ChatsScreen: React.FC = () => {
    const [acceptedFriends, setAcceptedFriends] = useState<AcceptedFriend[]>([]);
    const [userId] = useAtom(userIdAtom);
    const navigation = useNavigation();

    useEffect(() => {
        const acceptedFriendsList = async () => {
            if (!userId) return;

            try {
                const response = await fetch(
                    `${config.BACKEND_URL}/accepted-friends/${userId}`
                );
                const data = await response.json();

                if (response.ok) {
                    setAcceptedFriends(data);
                } else {
                    console.log("error fetching accepted friends", response.status);
                }
            } catch (error) {
                console.log("error showing the accepted friends", error);
            }
        };

        acceptedFriendsList();
    }, [userId]);

    console.log("friends", acceptedFriends);

    if (!userId) {
        return (
            <View className="flex-1 justify-center items-center">
                <Text className="text-gray-500">Loading...</Text>
            </View>
        );
    }

    return (
        <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
        >
            <View className="p-0">
                {acceptedFriends.length > 0 ? (
                    acceptedFriends.map((item, index) => (
                        <UserChat key={item._id || index} item={item} />
                    ))
                ) : (
                    <View className="flex-1 justify-center items-center py-20">
                        <Text className="text-gray-500 text-center">
                            No chats yet{'\n'}Start a conversation with your friends!
                        </Text>
                    </View>
                )}
            </View>
        </ScrollView>
    );
};

export default ChatsScreen;