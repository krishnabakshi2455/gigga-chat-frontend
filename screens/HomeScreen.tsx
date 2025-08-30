import { Text, View, TouchableOpacity, FlatList, Image } from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { MaterialIcons } from "@expo/vector-icons";
import { useAtom } from "jotai";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import config from "../config";
import { userIdAtom } from "../lib/store/userId.store";

const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const [userId, setUserId] = useAtom(userIdAtom);
  const [users, setUsers] = useState([]);
  const [hasIncomingRequests, setHasIncomingRequests] = useState(false);

  // Function to get read friend request IDs from AsyncStorage
  const getReadFriendRequestIds = async (): Promise<string[]> => {
    try {
      const readIds = await AsyncStorage.getItem('readFriendRequestIds');
      return readIds ? JSON.parse(readIds) : [];
    } catch (error) {
      console.log("Error getting read friend request IDs:", error);
      return [];
    }
  };

  // Function to save read friend request IDs to AsyncStorage
  const saveReadFriendRequestIds = async (ids: string[]) => {
    try {
      await AsyncStorage.setItem('readFriendRequestIds', JSON.stringify(ids));
    } catch (error) {
      console.log("Error saving read friend request IDs:", error);
    }
  };

  // Function to check for incoming friend requests and compare with read IDs
  const checkForIncomingRequests = async (currentUserId: string) => {
    try {
      const response = await axios.get(`${config.BACKEND_URL}/friend-request/${currentUserId}`);

      if (response.status === 200 && response.data && response.data.length > 0) {
        // Get the IDs of current friend requests
        const currentRequestIds = response.data.map((request: any) => request.id || request._id);

        // Get previously read request IDs
        const readIds = await getReadFriendRequestIds();

        // Check if there are any NEW unread requests
        const hasUnreadRequests = currentRequestIds.some((id: string) => !readIds.includes(id));

        setHasIncomingRequests(hasUnreadRequests);
        return hasUnreadRequests;
      } else {
        setHasIncomingRequests(false);
        return false;
      }
    } catch (error) {
      console.log("Error checking friend requests:", error);
      setHasIncomingRequests(false);
      return false;
    }
  };

  useEffect(() => {
    const fetchUsersAndCheckRequests = async () => {
      const token = await AsyncStorage.getItem("authToken");

      if (!token) {
        console.log("No auth token found");
        return;
      }

      const decodedToken = jwtDecode(token) as any;
      const decodedUserId = decodedToken.userId;
      setUserId(decodedUserId);

      // Fetch users
      try {
        const response = await axios.get(`${config.BACKEND_URL}/users/${decodedUserId}`);
        setUsers(response.data);

        // Check for friend requests after getting users
        await checkForIncomingRequests(decodedUserId);
      } catch (error) {
        console.log("error retrieving users", error);
      }
    };

    fetchUsersAndCheckRequests();
  }, [setUserId]);

  const handleFriendsPress = async () => {
    // Mark all current friend requests as "read" when user clicks Friends
    try {
      const response = await axios.get(`${config.BACKEND_URL}/friend-request/${userId}`);

      if (response.status === 200 && response.data && response.data.length > 0) {
        const currentRequestIds = response.data.map((request: any) => request.id || request._id);

        // Get existing read IDs and add new ones
        const existingReadIds = await getReadFriendRequestIds();
        const updatedReadIds = [...new Set([...existingReadIds, ...currentRequestIds])]; // Remove duplicates

        // Save updated read IDs
        await saveReadFriendRequestIds(updatedReadIds);
      }
    } catch (error) {
      console.log("Error marking requests as read:", error);
    }

    setHasIncomingRequests(false);
    navigation.navigate("Friends");
  };

  // User item renderer for FlatList
  const renderUserItem = ({ item, index }: { item: any; index: number }) => (
    <TouchableOpacity
      key={index}
      className="flex-row items-center py-3 px-4 border-b border-gray-800"
      style={{ backgroundColor: '#111' }}
    >
      {/* User Avatar */}
      <View className="mr-4">
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            className="w-12 h-12 rounded-full"
            style={{ backgroundColor: '#333' }}
          />
        ) : (
          <View className="w-12 h-12 rounded-full bg-gray-600 items-center justify-center">
            <Text className="text-white text-lg font-bold">
              {item.name ? item.name.charAt(0).toUpperCase() : item.username?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
        )}
      </View>

      {/* User Info */}
      <View className="flex-1">
        <Text className="text-white text-base font-semibold">
          {item.name || item.username || 'Unknown User'}
        </Text>
        {item.email && (
          <Text className="text-gray-400 text-sm mt-1">
            {item.email}
          </Text>
        )}
        {item.status && (
          <View className="flex-row items-center mt-1">
            <View
              className="w-2 h-2 rounded-full mr-2"
              style={{
                backgroundColor: item.status === 'online' ? '#22c55e' : '#6b7280'
              }}
            />
            <Text className="text-gray-400 text-xs capitalize">
              {item.status || 'offline'}
            </Text>
          </View>
        )}
      </View>

      {/* Action Button */}
      <TouchableOpacity className="ml-4 bg-blue-600 px-4 py-2 rounded-full">
        <Text className="text-white text-sm font-medium">Add Friend</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View className="h-full" style={{ backgroundColor: "#000" }}>
      {/* Custom Header */}
      <View className="bg-black pt-12 pb-4 px-4 border-b border-gray-800">
        <View className="flex-row justify-between items-center">
          <Text className="font-bold text-base text-white">Gigga Chat</Text>
          <View className="flex-row items-center gap-2">
            <Ionicons
              onPress={() => navigation.navigate("Chats")}
              name="chatbox-ellipses-outline"
              size={24}
              color="white"
            />
            {/* Friends icon with notification badge */}
            <TouchableOpacity onPress={handleFriendsPress}>
              <View style={{ position: 'relative' }}>
                <MaterialIcons
                  name="people-outline"
                  size={24}
                  color="white"
                />
                {/* Red notification dot */}
                {hasIncomingRequests && (
                  <View
                    style={{
                      position: 'absolute',
                      top: -2,
                      right: -2,
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: '#ef4444', // red-500
                    }}
                  />
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Content - User List */}
      <View className="flex-1">
        {users.length > 0 ? (
          <FlatList
            data={users}
            renderItem={renderUserItem}
            keyExtractor={(item, index) => item.id?.toString() || item._id?.toString() || index.toString()}
            showsVerticalScrollIndicator={false}
            style={{ backgroundColor: '#000' }}
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="people-outline" size={48} color="#6b7280" />
            <Text className="text-gray-400 text-base mt-4">No users found</Text>
            <Text className="text-gray-500 text-sm mt-2">Check back later for new users</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default HomeScreen;