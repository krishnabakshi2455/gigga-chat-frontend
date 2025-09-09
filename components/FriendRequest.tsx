import { Text, View, Pressable, Image, Alert } from "react-native";
import React, { useState } from "react";
import { useAtom } from 'jotai';
import { useNavigation } from "@react-navigation/native";
import { FriendRequestProps } from "../src/lib/types";
import { userIdAtom } from "../src/lib/store/userId.store";
import config from "../config";

const FriendRequest: React.FC<FriendRequestProps> = ({ item, friendRequests, setFriendRequests }) => {
    const [userId] = useAtom(userIdAtom);
    const [acceptLoading, setAcceptLoading] = useState(false);
    const [rejectLoading, setRejectLoading] = useState(false);
    const navigation = useNavigation<any>();

    const acceptRequest = async (friendRequestId: string): Promise<void> => {
        if (acceptLoading) return;

        try {
            setAcceptLoading(true);

            const response = await fetch(`${config.BACKEND_URL}/friend-request/accept`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    senderId: friendRequestId,
                    recepientId: userId,
                }),
            });

            if (response.ok) {
                setFriendRequests(
                    friendRequests.filter((request) => request._id !== friendRequestId)
                );
                navigation.navigate("Chats");
            } else {
                throw new Error("Failed to accept friend request");
            }
        } catch (err) {
            console.error("Error accepting the friend request:", err);
            Alert.alert("Error", "Failed to accept friend request. Please try again.", [{ text: "OK" }]);
        } finally {
            setAcceptLoading(false);
        }
    };

    const rejectRequest = async (friendRequestId: string): Promise<void> => {
        if (rejectLoading) return;

        try {
            setRejectLoading(true);

            const response = await fetch(`${config.BACKEND_URL}/friend-request/reject`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ senderId: friendRequestId, recepientId: userId }),
            });

            if (response.ok) {
                setFriendRequests(
                    friendRequests.filter((request) => request._id !== friendRequestId)
                );
                navigation.navigate("Chats");
            } else {
                throw new Error("Failed to reject friend request");
            }
        } catch (err) {
            console.error("Error rejecting the friend request:", err);
            Alert.alert("Error", "Failed to reject friend request. Please try again.", [{ text: "OK" }]);
        } finally {
            setRejectLoading(false);
        }
    };

    return (
        <View className="flex-row items-center justify-between my-2.5 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <View className="flex-row items-center flex-1">
                <Image
                    className="w-12 h-12 rounded-full"
                    source={{
                        uri: item.image || "https://via.placeholder.com/50x50?text=User",
                    }}
                />
                <Text className="text-sm font-medium ml-3 flex-1 text-white">
                    {item.name} sent you a friend request!
                </Text>
            </View>

            <View className="flex-row gap-3 ml-3">
                <Pressable
                    onPress={() => rejectRequest(item._id)}
                    disabled={rejectLoading}
                    className={`px-3 py-2 rounded-md border border-gray-600 bg-gray-700 ${rejectLoading ? "opacity-50" : ""
                        }`}
                >
                    <Text className="text-center text-gray-300 text-xs">
                        {rejectLoading ? "Declining..." : "Decline"}
                    </Text>
                </Pressable>

                <Pressable
                    onPress={() => acceptRequest(item._id)}
                    disabled={acceptLoading}
                    className={`bg-blue-600 px-3 py-2 rounded-md ${acceptLoading ? "opacity-50" : ""
                        }`}
                >
                    <Text className="text-center text-white text-xs font-medium">
                        {acceptLoading ? "Accepting..." : "Accept"}
                    </Text>
                </Pressable>
            </View>
        </View>
    );
};

export default FriendRequest;
