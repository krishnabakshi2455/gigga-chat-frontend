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
import { useAtom } from "jotai";
import { userTokenAtom } from "../src/lib/store/userId.store";
import LoadingScreen from "../components/loader";
import { checkBackendConnection, checkStoredToken, configureGoogleSignIn, handleEmailPasswordLogin, handleGoogleSignIn, validateLoginForm } from "../src/services/Login.SignUp";


// Configure Google Sign-In on module load
configureGoogleSignIn();

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

    // Check backend connection
    const checkConnection = async (): Promise<boolean> => {
        const isConnected = await checkBackendConnection();
        setBackendConnected(isConnected);
        return isConnected;
    };

    useEffect(() => {
        const initialize = async () => {
            try {
                setInitialLoading(true);

                console.log('🔧 Configuration:');

                // Check backend connectivity silently
                await checkConnection();

                // Check if user has valid token
                await checkStoredToken(setusertokenatom, navigation.replace);

            } catch (error) {
                console.log("Error during initialization:", error);
            } finally {
                setInitialLoading(false);
            }
        };

        initialize();
    }, []);

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
        // Validate form
        const { errors: validationErrors, isValid } = validateLoginForm(email, password);

        if (!isValid) {
            setErrors(validationErrors);
            return;
        }

        // Check backend connection before attempting login
        if (!backendConnected) {
            const isConnected = await checkConnection();
            if (!isConnected) {
                Alert.alert('Connection Error', 'Cannot connect to server. Please check your connection and try again.');
                return;
            }
        }

        // Attempt login
        const result = await handleEmailPasswordLogin(
            email,
            password,
            setusertokenatom,
            navigation.replace
        );

        if (!result.success) {
            Alert.alert("Login Error", result.error || "An error occurred");
        }
    };

    const handleGoogleSignInPress = async () => {
        setGoogleLoading(true);

        // Check backend connection
        if (!backendConnected) {
            const isConnected = await checkConnection();
            if (!isConnected) {
                Alert.alert('Connection Error', 'Cannot connect to server. Please check your connection and try again.');
                setGoogleLoading(false);
                return;
            }
        }

        const result = await handleGoogleSignIn(setusertokenatom, navigation.replace);

        if (!result.success) {
            // Don't show alert for user cancellation
            if (result.errorCode !== 'CANCELLED' && result.error) {
                Alert.alert('Error', result.error);
            }
        }

        setGoogleLoading(false);
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
                    onPress={checkConnection}
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
                        onPress={handleGoogleSignInPress}
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