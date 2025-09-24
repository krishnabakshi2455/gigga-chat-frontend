import {
    Alert,
    KeyboardAvoidingView,
    Pressable,
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
import { useAtom } from "jotai";
import { userTokenAtom } from "../src/lib/store/userId.store";
import { BACKEND_URL, GOOGLE_Web_Client_ID } from "@env";

// Configure Google Sign-In 
GoogleSignin.configure({
    // webClientId: config.Web_Client_ID,
    webClientId: GOOGLE_Web_Client_ID,
    offlineAccess: true,
});


const LoginScreen = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [googleLoading, setGoogleLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [usertokenatom, setusertokenatom] = useAtom(userTokenAtom);
    const [errors, setErrors] = useState({
        email: "",
        password: "",
    });
    const navigation = useNavigation<any>();

    // Function to check if token is expired
    const isTokenExpired = (token: string): boolean => {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return true;

            const payload = JSON.parse(atob(parts[1]));

            if (!payload.exp) return true;

            const currentTime = Math.floor(Date.now() / 1000);
            return payload.exp < currentTime;

        } catch (error) {
            console.log("Error checking token expiration:", error);
            return true;
        }
    };

    useEffect(() => {
        const checkLoginStatus = async () => {
            try {
                setInitialLoading(true);
                const token = await AsyncStorage.getItem("authToken");

                console.log('🔐 Token found:', !!token);

                if (token) {
                    // Debug token info
                    try {
                        const parts = token.split('.');
                        if (parts.length === 3) {
                            const payload = JSON.parse(atob(parts[1]));
                            const currentTime = Math.floor(Date.now() / 1000);

                            console.log('⏰ Token expires:', new Date(payload.exp * 1000));
                            console.log('⏰ Current time:', new Date(currentTime * 1000));
                            console.log('📅 Expired?', payload.exp < currentTime);

                            if (payload.exp < currentTime) {
                                console.log('🗑️ Removing expired token');
                                await AsyncStorage.removeItem("authToken");
                                setusertokenatom("");
                            } else {
                                console.log('✅ Token valid, navigating to Home');
                                setusertokenatom(token);
                                navigation.replace("Home");
                                return;
                            }
                        }
                    } catch (error) {
                        console.log('❌ Invalid token format, removing');
                        await AsyncStorage.removeItem("authToken");
                    }
                }

                setusertokenatom("");

            } catch (error) {
                console.log("Error checking login status:", error);
                await AsyncStorage.removeItem("authToken");
                setusertokenatom("");
            } finally {
                setInitialLoading(false);
            }
        };

        checkLoginStatus();
    }, []);

    // Email validation function
    const isValidEmail = (email: string) => {
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
    const handleEmailChange = (text: string) => {
        setEmail(text);
        if (errors.email) {
            setErrors(prev => ({ ...prev, email: "" }));
        }
    };

    const handlePasswordChange = (text: string) => {
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
            .post(`${BACKEND_URL}/login`, user)
            .then(async (response) => {
                const token = response.data.token;
                await AsyncStorage.setItem("authToken", token);
                setusertokenatom(token);
                navigation.replace("Home");
            })
            .catch((error) => {
                console.log("Login error:", error);
                Alert.alert("Login Error", "Invalid email or password");
            });
    };

    const handleGoogleSignIn = async () => {
        try {
            setGoogleLoading(true);

            // Sign out first to clear any cached credentials
            try {
                await GoogleSignin.signOut();
            } catch (signOutError) {
                console.log('Google sign out error:', signOutError);
            }

            // Check if Google Play Services are available
            await GoogleSignin.hasPlayServices();

            // Sign in with Google
            const userInfo = await GoogleSignin.signIn();

            // console.log('Google user info received:', {
            //     hasName: !!userInfo.data?.user?.name,
            //     hasEmail: !!userInfo.data?.user?.email,
            //     hasPhoto: !!userInfo.data?.user?.photo
            // });

            const googleUser = {
                name: userInfo.data?.user?.name || "",
                email: userInfo.data?.user?.email || "",
                image: userInfo.data?.user?.photo || "",
            };

            // console.log('Sending to backend:', googleUser);

            const response = await axios.post(`${BACKEND_URL}/googleauth`, googleUser);
            const token = response.data.token;

            await AsyncStorage.setItem("authToken", token);
            setusertokenatom(token);
            navigation.replace("Home");

        } catch (error: any) {
            setGoogleLoading(false);
            console.error('Google Sign-In error details:', error);

            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                Alert.alert('Cancelled', 'Google Sign-In was cancelled');
            } else if (error.code === statusCodes.IN_PROGRESS) {
                console.log('Google Sign-In in progress');
            } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                Alert.alert('Error', 'Google Play Services not available');
            } else {
                Alert.alert('Google Sign-In Error', 'Failed to sign in with Google. Please try again.');
            }
        } finally {
            setGoogleLoading(false);
        }
    };

    // Show loading screen while checking token
    if (initialLoading) {
        return (
            <View className="flex-1 bg-black justify-center items-center">
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text className="text-white mt-4 text-lg">Checking authentication...</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-black p-10 items-center">
            <KeyboardAvoidingView>
                <View className="mt-24 justify-center items-center flex">
                    <Text className="text-lg font-semibold mt-4 text-white">
                        Sign In to Your Account
                    </Text>
                </View>

                <View className="mt-20">
                    <View className="flex flex-col gap-5">
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
                        <Text className="text-gray-600 text-lg">Or</Text>
                    </View>

                    <Pressable
                        onPress={handleGoogleSignIn}
                        disabled={googleLoading}
                        className="w-52 bg-white mx-auto p-4 rounded-md flex-row justify-center items-center"
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