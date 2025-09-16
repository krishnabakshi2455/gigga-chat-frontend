import {
  StyleSheet,
  Text,
  View,
  TextInput,
  KeyboardAvoidingView,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import React, { useState, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { BACKEND_URL } from "@env";

const RegisterScreen = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [image, setImage] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState({
    name: "",
    email: "",
    password: "",
  });
  const navigation = useNavigation<any>();

  // Email validation function
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Form validation function
  const validateForm = () => {
    let tempErrors = {
      name: "",
      email: "",
      password: "",
    };
    let isValid = true;

    // Name validation
    if (!name.trim()) {
      tempErrors.name = "Name is required";
      isValid = false;
    } else if (name.trim().length < 2) {
      tempErrors.name = "Name must be at least 2 characters";
      isValid = false;
    }

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
  const handleNameChange = (text: string) => {
    setName(text);
    if (errors.name) {
      setErrors(prev => ({ ...prev, name: "" }));
    }
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

  const handleRegister = () => {
    if (!validateForm()) {
      return;
    }

    const user = {
      name: name,
      email: email,
      password: password,
      image: image,
    };

    axios
      .post(`${BACKEND_URL}/register`, user)
      .then((response) => {
        console.log(response);
        Alert.alert(
          "Registration successful",
          "You have been registered Successfully"
        );
        setName("");
        setEmail("");
        setPassword("");
        setImage("");
        // Clear errors after successful registration
        setErrors({
          name: "",
          email: "",
          password: "",
        });
      })
      .catch((error) => {
        Alert.alert(
          "Registration Error",
          "An error occurred while registering"
        );
        console.log("registration failed", error);
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
      const response = await axios.post(`${BACKEND_URL}/googleauth`, googleUser);

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

  return (
    <View className="bg-black flex-1 p-3 items-center">
      <KeyboardAvoidingView>
        <View className="mt-24 justify-center items-center">
          <Text className="text-lg font-semibold mt-4 text-white">
            Register To your Account
          </Text>
        </View>

        <View className="mt-20 w-full flex flex-col items-center justify-center">
          <View className="flex flex-col gap-5">
            <View className="w-96 px-4">
              <Text className="text-lg font-semibold text-white">
                Name
              </Text>
              <TextInput
                value={name}
                onChangeText={handleNameChange}
                className={`${errors.name
                  ? "text-lg text-white border-b-2 mb-1 border-red-500"
                  : "text-lg text-white border-b-2 mb-3 border-gray-400"
                  }`}
                placeholderTextColor={"gray"}
                placeholder="Enter your name"
              />
              {errors.name ? (
                <Text className="text-red-500 text-sm mb-3">
                  {errors.name}
                </Text>
              ) : null}
            </View>

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
                placeholderTextColor={"gray"}
                placeholder="enter Your Email"
              />
              {errors.email ? (
                <Text className="text-red-500 text-sm mb-3">
                  {errors.email}
                </Text>
              ) : null}
            </View>

            <View className="w-96 px-4">
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
                placeholderTextColor={"gray"}
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
            onPress={handleRegister}
            className="w-52 bg-blue-600 mt-12 mx-auto p-4 rounded-md"
          >
            <Text className="text-white text-base font-bold text-center">
              Register
            </Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.goBack()}
            className="mt-4"
          >
            <Text className="text-center text-gray-600 text-base">
              Already Have an account? <Text className="text-blue-600">Sign In</Text>
            </Text>
          </Pressable>

          <View className="w-full py-4 flex justify-center items-center">
            <Text className="text-gray-600 font-bold text-lg">Or</Text>
          </View>

          {/* Simple Google Sign-In Button - Just like the article */}
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

export default RegisterScreen;

const styles = StyleSheet.create({});