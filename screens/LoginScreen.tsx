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
import LoadingScreen from "../components/loader";

// Configure Google Sign-In with correct Web Client ID
GoogleSignin.configure({
    webClientId: GOOGLE_Web_Client_ID,
    offlineAccess: true,
});

const LoginScreen = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [googleLoading, setGoogleLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [backendConnected, setBackendConnected] = useState(false);
    const [usertokenatom, setusertokenatom] = useAtom(userTokenAtom);
    const [errors, setErrors] = useState({
        email: "",
        password: "",
    });
    const navigation = useNavigation<any>();

    // Function to check backend connectivity
    const checkBackendConnection = async (): Promise<boolean> => {
        try {
            console.log('🔌 Checking backend connection:', BACKEND_URL);
            const response = await axios.get(`${BACKEND_URL}/health`, {
                timeout: 5000,
            });
            console.log('✅ Backend connected:', response.status === 200);
            setBackendConnected(true);
            return true;
        } catch (error) {
            console.log('❌ Backend connection failed:', error);
            setBackendConnected(false);
            return false;
        }
    };

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
        const initialize = async () => {
            try {
                setInitialLoading(true);

                // Log environment variables for debugging
                console.log('🔧 Configuration:');
                // console.log('BACKEND_URL:', BACKEND_URL);
                // console.log('GOOGLE_Web_Client_ID:', GOOGLE_Web_Client_ID);

                // Check backend connectivity silently (don't show alert)
                await checkBackendConnection();

                const token = await AsyncStorage.getItem("authToken");
                console.log('🔐 Token found:', !!token);

                if (token) {
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
                console.log("Error during initialization:", error);
                await AsyncStorage.removeItem("authToken");
                setusertokenatom("");
            } finally {
                setInitialLoading(false);
            }
        };

        initialize();
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

        if (!email.trim()) {
            tempErrors.email = "Email is required";
            isValid = false;
        } else if (!isValidEmail(email)) {
            tempErrors.email = "Please enter a valid email address";
            isValid = false;
        }

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

    const handleLogin = async () => {
        if (!validateForm()) {
            return;
        }

        // Check backend connection before attempting login (only show alert on user action)
        if (!backendConnected) {
            const isConnected = await checkBackendConnection();
            if (!isConnected) {
                Alert.alert('Connection Error', 'Cannot connect to server. Please check your connection and try again.');
                return;
            }
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
            console.log('🚀 Starting Google Sign-In...');

            // Check backend connection (only show alert on user action)
            if (!backendConnected) {
                const isConnected = await checkBackendConnection();
                if (!isConnected) {
                    Alert.alert('Connection Error', 'Cannot connect to server. Please check your connection and try again.');
                    setGoogleLoading(false);
                    return;
                }
            }

            // Verify Google configuration
            // console.log('🔑 Google Web Client ID:', GOOGLE_Web_Client_ID);
            if (!GOOGLE_Web_Client_ID || GOOGLE_Web_Client_ID.includes('http')) {
                Alert.alert(
                    'Configuration Error',
                    'Google Sign-In is not properly configured. Please check your environment variables.'
                );
                setGoogleLoading(false);
                return;
            }

            // Sign out first to clear any cached credentials
            try {
                await GoogleSignin.signOut();
                console.log('🔓 Signed out from previous session');
            } catch (signOutError) {
                console.log('Sign out error (can be ignored):', signOutError);
            }

            // Check if Google Play Services are available
            console.log('🎮 Checking Google Play Services...');
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

            // Sign in with Google
            console.log('📝 Signing in with Google...');
            const userInfo = await GoogleSignin.signIn();

            console.log('✅ Google sign-in successful');
            console.log('User data:', {
                hasName: !!userInfo.data?.user?.name,
                hasEmail: !!userInfo.data?.user?.email,
                hasPhoto: !!userInfo.data?.user?.photo
            });

            const googleUser = {
                name: userInfo.data?.user?.name || "",
                email: userInfo.data?.user?.email || "",
                image: userInfo.data?.user?.photo || "",
            };

            // Validate that we have required data
            if (!googleUser.email) {
                throw new Error('No email received from Google');
            }

            // console.log('📤 Sending to backend:', `${BACKEND_URL}/googleauth`);

            const response = await axios.post(`${BACKEND_URL}/googleauth`, googleUser, {
                timeout: 10000,
            });

            console.log('✅ Backend response received');
            const token = response.data.token;

            await AsyncStorage.setItem("authToken", token);
            setusertokenatom(token);

            console.log('🏠 Navigating to Home');
            navigation.replace("Home");

        } catch (error: any) {
            console.error('❌ Google Sign-In error:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);

            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                // Don't show alert for user cancellation
                console.log('User cancelled sign-in');
            } else if (error.code === statusCodes.IN_PROGRESS) {
                console.log('Sign-In already in progress');
            } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                Alert.alert('Error', 'Google Play Services not available or outdated');
            } else if (error.response) {
                // Backend error
                console.error('Backend error:', error.response.data);
                Alert.alert('Authentication Error', 'Failed to authenticate with server. Please try again.');
            } else if (error.request) {
                // Network error
                Alert.alert('Network Error', 'Cannot reach the server. Please check your connection.');
            } else {
                Alert.alert('Error', `Google Sign-In failed: ${error.message}`);
            }
        } finally {
            setGoogleLoading(false);
        }
    };

    // Show loading screen while checking token
    if (initialLoading) {
        return <LoadingScreen message="Checking authentication..." />;
    }

    return (
        <View className="flex-1 bg-black p-10 items-center">
            <KeyboardAvoidingView>
                {/* Backend connection indicator */}
                <Pressable
                    onPress={checkBackendConnection}
                    className="absolute top-2 right-2"
                >
                    <View className="flex-row items-center bg-gray-800 px-3 py-1 rounded-full">
                        <View
                            className={`w-2 h-2 rounded-full mr-2 ${backendConnected ? 'bg-green-500' : 'bg-red-500'
                                }`}
                        />
                        <Text className="text-white text-xs">
                            {backendConnected ? 'Connected' : 'Tap to Retry'}
                        </Text>
                    </View>
                </Pressable>

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