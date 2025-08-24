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
import User from "../component/User";

const HomeScreen = () => {
  const navigation = useNavigation();
  const [userId, setUserId] = useAtom(userIdAtom);
  const [users, setUsers] = useState([]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "",
      headerLeft: () => (
        <Text className="font-bold text-base">Gigga Chat</Text>
      ),
      headerRight: () => (
        <View className="flex flex-row items-center gap-2">
          <Ionicons onPress={() => navigation.navigate("Chats")} name="chatbox-ellipses-outline" size={24} color="black" />
          <MaterialIcons
            onPress={() => navigation.navigate("Friends")}
            name="people-outline"
            size={24}
            color="black"
          />
        </View>
      ),
    });
  }, []);

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
    <View>
      <View className="p-3">
        {users.map((item, index) => (
          <User key={index} item={item} />
        ))}
      </View>
    </View>
  );
};

export default HomeScreen;