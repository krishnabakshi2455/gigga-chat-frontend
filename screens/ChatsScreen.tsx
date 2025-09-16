import { Text, View, ScrollView, Pressable } from "react-native";
import React, { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { userIdAtom } from "../src/lib/store/userId.store";
import { useNavigation } from "@react-navigation/native";
import { AcceptedFriend } from "../src/lib/types";
import UserChat from "../components/UserChat";
import { BACKEND_URL } from "@env";


const ChatsScreen: React.FC = () => {
    const [acceptedFriends, setAcceptedFriends] = useState<AcceptedFriend[]>([]);
    const [userId] = useAtom(userIdAtom);
    const navigation = useNavigation<any>();

    useEffect(() => {
        const acceptedFriendsList = async () => {
            if (!userId) return;

            try {
                const response = await fetch(
                    `${BACKEND_URL}/accepted-friends/${userId}`
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

    // console.log("friends", acceptedFriends);

    if (!userId) {
        return (
            <View className="flex-1 justify-center items-center">
                <Text className="text-white">Loading...</Text>
            </View>
        );
    }

    return (
        <ScrollView
            className="flex-1 bg-black "
            showsVerticalScrollIndicator={false}
        >
            <View className="p-0">
                {acceptedFriends.length > 0 ? (
                    acceptedFriends.map((item, index) => (
                        <UserChat key={item._id || index} item={item} />
                    ))
                ) : (
                    <View className="flex-1 justify-center items-center py-20 ">
                            <Text className="text-white text-center border-b border-gray-800">
                            No chats yet{'\n'}Start a conversation with your friends!
                        </Text>
                    </View>
                )}
            </View>
        </ScrollView>
    );
};

export default ChatsScreen;