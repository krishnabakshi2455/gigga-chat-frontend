import {
    Alert,
    KeyboardAvoidingView,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
    ActivityIndicator,
} from "react-native";
import React, { useState, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import config from "../config";

// Configure Google Sign-In 
GoogleSignin.configure({
    webClientId: config.Web_Client_ID,
    offlineAccess: true,
});

const LoginScreen = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [googleLoading, setGoogleLoading] = useState(false);
    const [errors, setErrors] = useState({
        email: "",
        password: "",
    });
    const navigation = useNavigation<any>();

    useEffect(() => {
        const checkLoginStatus = async () => {
            try {
                const token = await AsyncStorage.getItem("authToken");
                if (token) {
                    navigation.replace("Home");
                }
            } catch (error) {
                // console.log("error", error);
            }
        };
        checkLoginStatus();
    }, []);

    // Email validation function
    const isValidEmail = (email:string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    // Form validation function
    const validateForm = () => {
        let tempErrors = {
            email: "",
            password: "",
        };
        let isValid = true;

        // Email validation
        if (!email.trim()) {
            tempErrors.email = "Email is required";
            isValid = false;
        } else if (!isValidEmail(email)) {
            tempErrors.email = "Please enter a valid email address";
            isValid = false;
        }

        // Password validation
        if (!password.trim()) {
            tempErrors.password = "Password is required";
            isValid = false;
        } else if (password.length < 6) {
            tempErrors.password = "Password must be at least 6 characters";
            isValid = false;
        }

        setErrors(tempErrors);
        return isValid;
    };

    // Clear error when user starts typing
    const handleEmailChange = (text:string) => {
        setEmail(text);
        if (errors.email) {
            setErrors(prev => ({ ...prev, email: "" }));
        }
    };

    const handlePasswordChange = (text:string) => {
        setPassword(text);
        if (errors.password) {
            setErrors(prev => ({ ...prev, password: "" }));
        }
    };

    const handleLogin = () => {
        if (!validateForm()) {
            return;
        }

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
            });
    };

    const handleGoogleSignIn = async () => {
        try {
            setGoogleLoading(true);

            // Check if Google Play Services are available
            await GoogleSignin.hasPlayServices();

            // Sign in with Google
            const userInfo = await GoogleSignin.signIn();

            // Log the structure to debug (remove this after testing)
            // console.log('Google userInfo structure:', JSON.stringify(userInfo, null, 2));

            // Send to your existing backend - matches your /googleauth endpoint
            const googleUser = {
                name: userInfo.data?.user?.name,
                email: userInfo.data?.user?.email,
                image: userInfo.data?.user?.photo || "",
            };

            // Call your existing backend endpoint
            const response = await axios.post(`${config.BACKEND_URL}/googleauth`, googleUser);

            const token = response.data.token;
            await AsyncStorage.setItem("authToken", token);

            navigation.replace("Home");

        } catch (error: any) {
            setGoogleLoading(false);

            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                console.log('Google Sign-In cancelled');
            } else if (error.code === statusCodes.IN_PROGRESS) {
                console.log('Google Sign-In in progress');
            } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                Alert.alert('Error', 'Google Play Services not available');
            } else {
                console.error('Google Sign-In error:', error);
                Alert.alert('Google Sign-In Error', 'Failed to sign in with Google');
            }
        } finally {
            setGoogleLoading(false);
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
                    <View className="w-96 px-4">
                        <Text className="text-lg font-semibold text-white">
                            Email
                        </Text>
                        <TextInput
                            value={email}
                            onChangeText={handleEmailChange}
                            className={`${errors.email
                                    ? "text-lg text-white border-b-2 mb-1 border-red-500"
                                    : "text-lg text-white border-b-2 mb-3 border-gray-400"
                                }`}
                            placeholderTextColor={"grey"}
                            placeholder="Enter Your Email"
                        />
                        {errors.email ? (
                            <Text className="text-red-500 text-sm mb-3">
                                {errors.email}
                            </Text>
                        ) : null}
                    </View>

                    <View className="mt-3 w-96 px-4">
                        <Text className="text-lg font-semibold text-white">
                            Password
                        </Text>
                        <TextInput
                            value={password}
                            onChangeText={handlePasswordChange}
                            secureTextEntry={true}
                            className={`${errors.password
                                    ? "text-lg text-white border-b-2 mb-1 border-red-500"
                                    : "text-lg text-white border-b-2 mb-3 border-gray-400"
                                }`}
                            placeholderTextColor={"grey"}
                            placeholder="Password"
                        />
                        {errors.password ? (
                            <Text className="text-red-500 text-sm mb-3">
                                {errors.password}
                            </Text>
                        ) : null}
                    </View>

                    <Pressable
                        onPress={handleLogin}
                        className="w-52 bg-blue-600 mt-12 mx-auto p-4 rounded-md"
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
                            Don't have an account? <Text className="text-blue-600">Sign Up</Text>
                        </Text>
                    </Pressable>

                    <View className="w-full py-4 flex justify-center items-center">
                        <Text className="text-white text-lg">Or</Text>
                    </View>

                    {/* Simple Google Sign-In Button - Just like the article */}
                    <Pressable
                        onPress={handleGoogleSignIn}
                        disabled={googleLoading}
                        className="w-52 bg-white mt-4 mx-auto p-4 rounded-md flex-row justify-center items-center"
                    >
                        {googleLoading ? (
                            <ActivityIndicator size="small" color="#000" />
                        ) : (
                            <Text className="text-black text-base font-bold text-center">
                                Continue with Google
                            </Text>
                        )}
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

export default LoginScreen;