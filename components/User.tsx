import { Text, View, Pressable, Image } from "react-native";
import React, { useState, useEffect } from "react";
import { useAtom } from "jotai";
import config from "../config";
import { FriendRequest, UserProps } from "../lib/types";
import { userIdAtom } from "../lib/store/userId.store";
// Remove the friend_request_atom import and usage since we only want to show notifications for incoming requests

const User: React.FC<UserProps> = ({ item }) => {
    const [userId] = useAtom(userIdAtom);
    const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
    const [userFriends, setUserFriends] = useState<string[]>([]);

    const fetchFriendRequests = async () => {
        if (!userId) return;
        try {
            const response = await fetch(
                `${config.BACKEND_URL}/friend-requests/sent/${userId}`
            );
            const data = await response.json();
            if (response.ok) {
                setFriendRequests(data);
            } else {
                console.log("error in else", response.status);
            }
        } catch (error) {
            console.log("error in catch", error);
        }
    };

    useEffect(() => {
        fetchFriendRequests();
    }, [userId]);

    const fetchUserFriends = async () => {
        if (!userId) return;
        try {
            const response = await fetch(`${config.BACKEND_URL}/friends/${userId}`);
            const data = await response.json();
            if (response.ok) {
                setUserFriends(data[0].sentFriendRequests);
            } else {
                console.log("error retrieving user friends", response.status);
            }
        } catch (error) {
            console.log("Error message", error);
        }
    };

    useEffect(() => {
        fetchUserFriends();
    }, [userId]);

    const sendFriendRequest = async (currentUserId: string, selectedUserId: string) => {
        try {
            const response = await fetch(`${config.BACKEND_URL}/friend-request`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ currentUserId, selectedUserId }),
            });

            if (response.ok) {
                await fetchFriendRequests();
            }
        } catch (error) {
            console.log("error message", error);
        }
    };

    if (!userId) {
        return null;
    }

    return (
        <Pressable className="flex-row items-center my-2.5 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <View>
                <Image
                    className="w-12 h-12 rounded-full"
                    source={{ uri: item.image }}
                    style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                    }}
                    alt={item.name}
                />
            </View>

            <View className="ml-3 flex-1">
                <Text className="font-bold text-white">{item?.name}</Text>
                <Text className="mt-1 text-gray-400">{item?.email}</Text>
            </View>

            {userFriends.includes(item._id) ? (
                <Pressable className="bg-green-600 px-4 py-2.5 w-26 rounded-md border border-green-500">
                    <Text className="text-center text-white text-xs font-medium">Friends</Text>
                </Pressable>
            ) : friendRequests.some((friend) => friend._id === item._id) ? (
                <Pressable className="bg-gray-700 px-4 py-2.5 w-26 rounded-md border border-gray-600">
                    <Text className="text-center text-gray-300 text-xs">
                        Request Sent
                    </Text>
                </Pressable>
            ) : (
                <Pressable
                    onPress={() => sendFriendRequest(userId, item._id)}
                    className="bg-blue-600 px-4 py-2.5 w-26 rounded-md border border-blue-500"
                >
                    <Text className="text-center text-white text-xs font-medium">
                        Add Friend
                    </Text>
                </Pressable>
            )}
        </Pressable>
    );
};

export default User;