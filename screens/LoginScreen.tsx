import {
    Image,
    Alert,
    KeyboardAvoidingView,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";
import React, { useState, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import config from "../config";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import * as AuthSession from "expo-auth-session";

const LoginScreen = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigation = useNavigation<any>();
    useEffect(() => {
        const checkLoginStatus = async () => {
            try {
                const token = await AsyncStorage.getItem("authToken");

                if (token) {
                    navigation.replace("Home");
                } else {
                    // token not found , show the login screen itself
                }
            } catch (error) {
                // console.log("error", error);
            }
        };

        checkLoginStatus();
    }, []);
    const handleLogin = () => {
        const user = {
            email: email,
            password: password,
        };

        axios
            .post("http://localhost:8000/login", user)
            .then((response) => {
                // console.log(response);
                const token = response.data.token;
                AsyncStorage.setItem("authToken", token);

                navigation.replace("Home");
            })
            .catch((error) => {
                Alert.alert("Login Error", "Invalid email or password");
                console.log("Login Error", error);
            });
    };

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
            //     "Google Sign-In Successful",
            //     "Welcome " + user.name,
            //     [
            //         {
            //             text: "OK",
            //             onPress: () => {
            //                 navigation.replace("Home"); 
            //             }
            //         }
            //     ]
            // );

            console.log("Backend Google login response:", backendRes.data);

        } catch (error) {
            console.log("Google Sign-In error:", error);
            Alert.alert("Error", "Google Sign-In failed");
        }
    };
    return (
        <View
            className="flex-1 bg-black p-10 items-center"
        >
            <KeyboardAvoidingView>
                <View
                    className="mt-24 justify-center items-center flex"
                >
                    <Text
                        className="text-lg font-semibold text-white"
                    >
                        Sign In
                    </Text>

                    <Text
                        className="text-lg font-semibold mt-4 text-white"
                    >
                        Sign In to Your Account
                    </Text>
                </View>

                <View
                    className="mt-12">
                    <View>
                        <Text
                            className="text-lg font-semibold text-white">
                            Email
                        </Text>

                        <TextInput
                            value={email}
                            onChangeText={(text) => setEmail(text)}
                            className={`${email ? "text-lg" : " text-lg"} text-white border-b-2 my-3 w-72 border-gray-400`}
                            placeholderTextColor={"grey"}
                            placeholder="Enter Your Email"
                        />
                    </View>

                    <View
                        className="mt-3">
                        <Text
                            className="text-lg font-semibold text-white"
                        >
                            Password
                        </Text>

                        <TextInput
                            value={password}
                            onChangeText={(text) => setPassword(text)}
                            secureTextEntry={true}
                            className={`${email ? "text-lg" : " text-lg"} text-white border-b-2 my-3 w-72 border-gray-400`}
                            placeholderTextColor={"grey"}
                            placeholder="Passowrd"
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
                            Sign Up/In with Google
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={handleLogin}
                        className="w-52 bg-blue-600 mt-7 mx-auto p-4 rounded-md"
                    >
                        <Text
                            className="text-white text-base font-bold text-center"
                        >
                            Login
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={() => navigation.navigate("Register")}
                        className="mt-4"
                    >
                        <Text className="text-center text-gray-600 text-base">
                            Dont't have an account? <Text className="text-blue-600">Sign Up</Text>
                        </Text>
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

export default LoginScreen;