import { Text, View, ScrollView, Pressable } from "react-native";
import React, { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { userIdAtom } from "../src/lib/store/userId.store";
import { useNavigation } from "@react-navigation/native";
import UserChat from "../components/UserChat";
import { userService } from "../src/services/userService";
import { UserItem } from "../src/lib/types/types";

const ChatsScreen: React.FC = () => {
    const [acceptedFriends, setAcceptedFriends] = useState<UserItem[]>([]);
    const [userId] = useAtom(userIdAtom);
    const navigation = useNavigation<any>();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const acceptedFriendsList = async () => {
            if (!userId) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const friends = await userService.fetchAcceptedFriends(userId);
                setAcceptedFriends(friends);
            } catch (error) {
                console.log("error showing the accepted friends", error);
            } finally {
                setLoading(false);
            }
        };

        acceptedFriendsList();
    }, [userId]);

    if (!userId || loading) {
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