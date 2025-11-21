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
import { useAtom } from "jotai";
import { userTokenAtom } from "../src/lib/store/userId.store";
import {
  configureGoogleSignIn,
  validateRegisterForm,
  handleUserRegistration,
  handleGoogleSignIn,
  checkStoredToken,
} from "../src/services/Login.SignUp";

// Configure Google Sign-In on module load
configureGoogleSignIn();

const RegisterScreen = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [image, setImage] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [usertokenatom, setusertokenatom] = useAtom(userTokenAtom);
  const [errors, setErrors] = useState({
    name: "",
    email: "",
    password: "",
  });
  const navigation = useNavigation<any>();

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

  const handleRegister = async () => {
    // Validate form
    const { errors: validationErrors, isValid } = validateRegisterForm(name, email, password);

    if (!isValid) {
      setErrors(validationErrors);
      return;
    }

    // Attempt registration
    const result = await handleUserRegistration(name, email, password, image);

    if (result.success) {
      Alert.alert(
        "Registration successful",
        "You have been registered Successfully"
      );
      // Clear form
      setName("");
      setEmail("");
      setPassword("");
      setImage("");
      setErrors({
        name: "",
        email: "",
        password: "",
      });
    } else {
      Alert.alert(
        "Registration Error",
        result.error || "An error occurred while registering"
      );
    }
  };

  const handleGoogleSignInPress = async () => {
    setGoogleLoading(true);

    const result = await handleGoogleSignIn(setusertokenatom, navigation.replace);

    if (!result.success) {
      // Don't show alert for user cancellation
      if (result.errorCode !== 'CANCELLED' && result.error) {
        Alert.alert('Error', result.error);
      }
    }

    setGoogleLoading(false);
  };

  useEffect(() => {
    // Check if user is already logged in
    checkStoredToken(setusertokenatom, navigation.replace);
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

export default RegisterScreen;

const styles = StyleSheet.create({});