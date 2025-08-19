
import {
    Alert,
    KeyboardAvoidingView,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import React, { useState, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import config from "../config";

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
            .post(`${config.BACKEND_URL}/login`, user)
            .then((response) => {
                // console.log(response);
                const token = response.data.token;
                AsyncStorage.setItem("authToken", token);

                navigation.replace("Home");
            })
            .catch((error) => {
                Alert.alert("Login Error", "Invalid email or password");
                // console.log("Login Error", error);
            });
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

                    <Pressable
                        onPress={handleLogin}
                        className="w-52 bg-blue-600 mt-12 mx-auto p-4 rounded-md"
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
