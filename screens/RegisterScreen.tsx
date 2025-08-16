import {
  Text,
  View,
  TextInput,
  KeyboardAvoidingView,
  Pressable,
  Alert,
  Image,
  Button
} from "react-native";
import React, { useState, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import config from "../config";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import * as AuthSession from "expo-auth-session";
import AsyncStorage from '@react-native-async-storage/async-storage'; // Add this import

WebBrowser.maybeCompleteAuthSession();



const RegisterScreen = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [image, setImage] = useState("");
  const navigation = useNavigation<any>();

  // Google Auth setup
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: config.Android_Client_ID,
    webClientId: config.Web_Client_ID,
    redirectUri: AuthSession.makeRedirectUri({
      // @ts-ignore
      useProxy: true,
    }),
  });

  useEffect(() => {
    if (response?.type === "success") {
      const { authentication } = response;
      fetchGoogleUserInfo(authentication?.accessToken);
    }
  }, [response]);

  const fetchGoogleUserInfo = async (token: string | undefined) => {
    try {
      const res = await fetch("https://www.googleapis.com/userinfo/v2/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const user = await res.json();

      // Send Google user to backend for registration/login
      const backendRes = await axios.post(`${config.BACKEND_URL}/googleauth`, {
        name: user.name,
        email: user.email,
        image: user.picture,
      });

      // Store the JWT token
      if (backendRes.data.token) {
        await AsyncStorage.setItem('authToken', backendRes.data.token);
        await AsyncStorage.setItem('userData', JSON.stringify(backendRes.data.user));
      }

      navigation.replace("Home"); 

      // Alert.alert(
      //   "Google Sign-In Successful",
      //   "Welcome " + user.name,
      //   [
      //     {
      //       text: "OK",
      //       onPress: () => {
      //         // Navigate to home/main screen after user clicks OK
      //         navigation.replace("Home"); 
      //       }
      //     }
      //   ]
      // );

      console.log("Backend Google login response:", backendRes.data);

    } catch (error) {
      console.log("Google Sign-In error:", error);
      Alert.alert("Error", "Google Sign-In failed");
    }
  };

  const handleRegister = async () => {
    const user = { name, email, password, image };

    try {
      const response = await axios.post(`${config.BACKEND_URL}/register`, user);

      // Store the JWT token if your backend returns one
      if (response.data.token) {
        await AsyncStorage.setItem('authToken', response.data.token);
        await AsyncStorage.setItem('userData', JSON.stringify(response.data.user));
      }

      Alert.alert(
        "Registration Successful",
        "You have been registered successfully",
        [
          {
            text: "OK",
            onPress: () => {
              // Clear form
              setName("");
              setEmail("");
              setPassword("");
              setImage("");

              // Navigate to login or home screen
              if (response.data.token) {
                navigation.replace("Home"); // If token provided, go to main screen
              } else {
                navigation.navigate("Login"); // If no token, go to login
              }
            }
          }
        ]
      );

      console.log("Registration response:", response.data);

    } catch (error) {
      Alert.alert("Registration Error", "An error occurred while registering");
      console.log("Registration failed:", error);
    }
  };

  return (
    <View className="bg-black flex-1 p-3 items-center">
      <KeyboardAvoidingView>
        <View className="mt-10 justify-center items-center">
          <Text className="text-white text-lg font-semibold">Sign Up</Text>
          <Text className="text-lg font-semibold mt-4 text-white">
            Sign Up To your Account
          </Text>
        </View>

        <View className="mt-5 w-full flex flex-col items-center justify-center ">
          <View className="mt-3">
            <Text className="text-lg font-semibold text-white">Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              className="text-lg border-b-gray-600 border-b my-3 w-72 text-white"
              placeholderTextColor={"gray"}
              placeholder="Enter your name"
            />
          </View>

          <View>
            <Text className="text-lg font-semibold text-white">Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              className="text-lg border-b-gray-600 border-b my-3 w-72 text-white"
              placeholderTextColor={"gray"}
              placeholder="Enter your Email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View className="mt-3">
            <Text className="text-lg font-semibold text-white">Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              className="text-lg border-b-gray-600 border-b my-3 w-72 text-white"
              placeholderTextColor={"gray"}
              placeholder="Password"
            />
          </View>

          <View className="mt-3">
            <Text className="text-lg font-semibold text-white">Image</Text>
            <TextInput
              value={image}
              onChangeText={setImage}
              className="text-lg border-b-gray-600 border-b my-3 w-72 text-white"
              placeholderTextColor={"gray"}
              placeholder="Image URL (Optional)"
            />
          </View>

          <View className="w-full py-4 flex items-center justify-center">
            <Text className="text-white text-xl">
              OR
            </Text>
          </View>

          {/* Google Sign-In Button */}
          <Pressable
            onPress={() => promptAsync()}
            disabled={!request}
            className="w-60 bg-white mx-auto p-4 rounded-md"
          >
            <Text className="text-base font-bold flex items-center gap-5 justify-center">
              <Image source={require("../assets/google-svg.svg")} style={{ width: 30, height: 30 }} />
              Sign Up with Google
            </Text>
          </Pressable>

          {/* Normal Register Button */}
          <Pressable
            onPress={handleRegister}
            className="w-60 bg-blue-700 mt-7 mx-auto p-4 rounded-md"
          >
            <Text className="text-white text-base font-bold text-center">
              Sign Up
            </Text>
          </Pressable>

        

          <Pressable onPress={() => navigation.goBack()} className="mt-4">
            <Text className="text-center text-gray-600 text-base">
              Already Have an account?{" "}
              <Text className="text-blue-700">Sign In</Text>
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default RegisterScreen;
