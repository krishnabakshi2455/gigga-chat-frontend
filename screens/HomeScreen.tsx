import { Text, View } from "react-native";
import React, { useLayoutEffect, useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { MaterialIcons } from "@expo/vector-icons";
import { useAtom } from "jotai";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { userIdAtom } from "../lib/global.store";
import config from "../config";
import User from "../components/User";
const HomeScreen = () => {
  const navigation = useNavigation();
  const [userId, setUserId] = useAtom(userIdAtom);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const token = await AsyncStorage.getItem("authToken");

      if (!token) {
        console.log("No auth token found");
        return;
      }

      const decodedToken = jwtDecode(token) as any;
      const decodedUserId = decodedToken.userId;
      setUserId(decodedUserId);

      axios
        .get(`${config.BACKEND_URL}/users/${decodedUserId}`)
        .then((response) => {
          setUsers(response.data);
        })
        .catch((error) => {
          console.log("error retrieving users", error);
        });
    };

    fetchUsers();
  }, [setUserId]);

  // console.log("users", users);
  return (
    <View className="h-full" style={{ backgroundColor: "#000" }}>
      {/* Custom Header */}
      <View className="bg-black pt-12 pb-4 px-4 border-b border-gray-600">
        <View className="flex-row justify-between items-center">
          <Text className="font-bold text-base text-white">Gigga Chat</Text>
          <View className="flex-row items-center gap-2">
            <Ionicons
              onPress={() => navigation.navigate("Chats")}
              name="chatbox-ellipses-outline"
              size={24}
              color="white"
            />
            <MaterialIcons
              onPress={() => navigation.navigate("Friends")}
              name="people-outline"
              size={24}
              color="white"
            />
          </View>
        </View>
      </View>

      {/* Content */}
      <View className="p-3 flex-1">
        {users.map((item, index) => (
          <User key={index} item={item} />
        ))}
      </View>
    </View>
  );
};

export default HomeScreen;