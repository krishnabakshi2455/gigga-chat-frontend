import { Text, View, FlatList, ActivityIndicator, ListRenderItem } from "react-native";
import React, { useEffect, useState } from "react";
import { useAtom } from 'jotai';
import axios, { AxiosResponse } from "axios";
import { userIdAtom } from "../src/lib/store/userId.store";
import { ApiResponse, FriendRequestItem } from "../src/lib/types/types";
import { BACKEND_URL } from "@env";
import FriendRequest from "../components/FriendRequest";

const FriendsScreen: React.FC = () => {
    const [userId] = useAtom(userIdAtom);
    const [friendRequests, setFriendRequests] = useState<FriendRequestItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (userId) {
            fetchFriendRequests();
        }
    }, [userId]);

    const fetchFriendRequests = async (): Promise<void> => {
        if (!userId) return;

        try {
            setLoading(true);
            setError(null);

            const response: AxiosResponse<ApiResponse[]> = await axios.get(
                `${BACKEND_URL}/friend-request/${userId}`
            );

            if (response.status === 200) {
                const friendRequestsData: FriendRequestItem[] = response.data.map((friendRequest) => ({
                    _id: friendRequest._id,
                    name: friendRequest.name,
                    email: friendRequest.email,
                    image: friendRequest.image,
                }));

                setFriendRequests(friendRequestsData);
            }
        } catch (err) {
            console.error("Error fetching friend requests:", err);
            setError("Failed to load friend requests");
        } finally {
            setLoading(false);
        }
    };

    const renderFriendRequest: ListRenderItem<FriendRequestItem> = ({ item }) => (
        <FriendRequest
            item={item}
            friendRequests={friendRequests}
            setFriendRequests={setFriendRequests}
        />
    );

    if (!userId) {
        return (
            <View className="flex-1 bg-black">

                <View className="flex-1 p-2.5 mx-3 justify-center items-center">
                    <Text className="text-white text-center">Please log in to view friend requests</Text>
                </View>
            </View>
        );
    }

    if (loading) {
        return (
            <View className="flex-1 bg-black">

                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#ffffff" />
                    <Text className="mt-2 text-white">Loading friend requests...</Text>
                </View>
            </View>
        );
    }

    if (error) {
        return (
            <View className="flex-1 bg-black">

                <View className="flex-1 p-2.5 mx-3 justify-center items-center">
                    <Text className="text-red-400 text-center">{error}</Text>
                </View>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-black">

            <View className="flex-1 p-2.5 mx-3">
                {friendRequests.length > 0 ? (
                    <>
                        <Text className="text-white text-lg font-bold mb-4 mt-4">Your Friend Requests!</Text>
                        <FlatList
                            data={friendRequests}
                            renderItem={renderFriendRequest}
                            keyExtractor={(item) => item._id}
                            showsVerticalScrollIndicator={false}
                        />
                    </>
                ) : (
                    <Text className="text-center text-base text-gray-400 mt-5">
                        No friend requests at the moment
                    </Text>
                )}
            </View>
        </View>
    );
};

export default FriendsScreen;