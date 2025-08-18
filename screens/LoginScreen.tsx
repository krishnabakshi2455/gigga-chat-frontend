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

// Complete the auth session for web browser
WebBrowser.maybeCompleteAuthSession();

const LoginScreen = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigation = useNavigation<any>();

    // Force HTTPS redirect URI for Google OAuth
    const redirectUri = __DEV__
        ? AuthSession.makeRedirectUri({
            // @ts-ignore
            useProxy: true
        })
        : AuthSession.makeRedirectUri({ scheme: "giggachat" });

    // console.log("🔍 DEBUG: Redirect URI:", redirectUri);
    // console.log("🔍 DEBUG: Is Development:", __DEV__);

    // Alternative: Create manual HTTPS URI if proxy doesn't work
    const httpsRedirectUri = "https://auth.expo.io/@krishnabakshi/gigga-chat";
    const finalRedirectUri = redirectUri.includes('giggachat://') ? httpsRedirectUri : redirectUri;

    console.log("🔍 DEBUG: Final Redirect URI being used in login:", finalRedirectUri);



    useEffect(() => {
        const checkLoginStatus = async () => {
            try {
                const token = await AsyncStorage.getItem("authToken");
                if (token) {
                    navigation.replace("Home");
                }
            } catch (error) {
                console.log("Error checking login status:", error);
            }
        };
        checkLoginStatus();
    }, []);

    // Google Auth setup with proper configuration
    const [request, response, promptAsync] = Google.useAuthRequest({
        androidClientId: config.Android_Client_ID,
        // iosClientId: config.IOS_Client_ID, // Add iOS client ID if you have one
        webClientId: config.Web_Client_ID,
        redirectUri: finalRedirectUri, // Use the final URI
        scopes: ['profile', 'email'],
        responseType: AuthSession.ResponseType.Code,
    });

    const handleLogin = () => {
        const user = {
            email: email,
            password: password,
        };

        axios
            .post(`${config.BACKEND_URL}/login`, user)
            .then((response) => {
                const token = response.data.token;
                AsyncStorage.setItem("authToken", token);
                navigation.replace("Home");
            })
            .catch((error) => {
                Alert.alert("Login Error", "Invalid email or password");
                console.log("Login Error", error);
            });
    };

    useEffect(() => {
        if (response?.type === "success") {
            const { authentication } = response;
            if (authentication?.accessToken) {
                fetchGoogleUserInfo(authentication.accessToken);
            }
        } else if (response?.type === "error") {
            console.log("Google Auth Error:", response.error);
            Alert.alert("Authentication Error", "Google Sign-In failed");
        }
    }, [response]);

    const fetchGoogleUserInfo = async (token: string) => {
        try {
            const res = await fetch("https://www.googleapis.com/userinfo/v2/me", {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            const user = await res.json();

            // Send Google user to backend for registration/login
            const backendRes = await axios.post(`${config.BACKEND_URL}/googleauth`, {
                name: user.name,
                email: user.email,
                image: user.picture,
            });

            // Store the JWT token and user data
            if (backendRes.data.token) {
                await AsyncStorage.setItem('authToken', backendRes.data.token);
                await AsyncStorage.setItem('userData', JSON.stringify(backendRes.data.user));
                navigation.replace("Home");
            } else {
                throw new Error("No token received from backend");
            }

            console.log("Backend Google login response:", backendRes.data);

        } catch (error) {
            console.log("Google Sign-In error:", error);
            Alert.alert("Error", "Google Sign-In failed. Please try again.");
        }
    };

    return (
        <View className="flex-1 bg-black p-10 items-center">
            <KeyboardAvoidingView>
                <View className="mt-24 justify-center items-center flex">
                    <Text className="text-lg font-semibold text-white">
                        Sign In
                    </Text>
                    <Text className="text-lg font-semibold mt-4 text-white">
                        Sign In to Your Account
                    </Text>
                </View>

                <View className="mt-12">
                    <View>
                        <Text className="text-lg font-semibold text-white">
                            Email
                        </Text>
                        <TextInput
                            value={email}
                            onChangeText={(text) => setEmail(text)}
                            className="text-lg text-white border-b-2 my-3 w-72 border-gray-400"
                            placeholderTextColor="grey"
                            placeholder="Enter Your Email"
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    <View className="mt-3">
                        <Text className="text-lg font-semibold text-white">
                            Password
                        </Text>
                        <TextInput
                            value={password}
                            onChangeText={(text) => setPassword(text)}
                            secureTextEntry={true}
                            className="text-lg text-white border-b-2 my-3 w-72 border-gray-400"
                            placeholderTextColor="grey"
                            placeholder="Password"
                        />
                    </View>

                    <View className="w-full py-4 flex items-center justify-center">
                        <Text className="text-white text-xl">OR</Text>
                    </View>

                    {/* Google Sign-In Button */}
                    <Pressable
                        onPress={() => {
                            if (request) {
                                promptAsync();
                            } else {
                                Alert.alert("Error", "Google Sign-In is not ready yet");
                            }
                        }}
                        disabled={!request}
                        className={`w-60 mx-auto p-4 rounded-md ${!request ? 'bg-gray-400' : 'bg-white'}`}
                    >
                        <Text className="text-base font-bold flex items-center gap-5 justify-center">
                            <Image
                                source={require("../assets/google-svg.svg")}
                                style={{ width: 30, height: 30 }}
                            />
                            Sign Up/In with Google
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={handleLogin}
                        className="w-52 bg-blue-600 mt-7 mx-auto p-4 rounded-md"
                    >
                        <Text className="text-white text-base font-bold text-center">
                            Login
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={() => navigation.navigate("Register")}
                        className="mt-4"
                    >
                        <Text className="text-center text-gray-600 text-base">
                            Don't have an account?{" "}
                            <Text className="text-blue-600">Sign Up</Text>
                        </Text>
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

export default LoginScreen;