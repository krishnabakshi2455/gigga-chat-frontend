import {
  StyleSheet,
  Text,
  View,
  TextInput,
  KeyboardAvoidingView,
  Pressable,
  Alert,
} from "react-native";
import React, { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import config from "../config";

const RegisterScreen = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [image, setImage] = useState("");
  const navigation = useNavigation();
  const handleRegister = () => {
    const user = {
      name: name,
      email: email,
      password: password,
      image: image,
    };

  
    axios
      .post(`${config.BACKEND_URL}/register`, user)
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
      })
      .catch((error) => {
        Alert.alert(
          "Registration Error",
          "An error occurred while registering"
        );
        console.log("registration failed", error);
      });
  };
  return (
    <View
      className="bg-black flex-1 p-3 items-center"
    >
      <KeyboardAvoidingView>
        <View
          className="mt-28 justify-center items-center"
        >
          <Text className="text-white text-lg font-semibold">
            Register
          </Text>

          <Text className="text-lg font-semibold mt-4 text-white">
            Register To your Account
          </Text>
        </View>

        <View className="mt-12 w-full flex flex-col items-center justify-center ">
          <View className="mt-3">
            <Text className="text-lg font-semibold text-white">
              Name
            </Text>

            <TextInput
              value={name}
              onChangeText={(text) => setName(text)}
              className={`text-lg border-b-gray-600 border-b my-3 w-72 text-white`}
              placeholderTextColor={"gray"}
              placeholder="Enter your name"
            />
          </View>

          <View>
            <Text className="text-lg font-semibold text-white">
              Email
            </Text>

            <TextInput
              value={email}
              onChangeText={(text) => setEmail(text)}
              className={`text-lg border-b-gray-600 border-b my-3 w-72 text-white`}
              placeholderTextColor={"gray"}
              placeholder="enter Your Email"
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
              className={`text-lg border-b-gray-600 border-b my-3 w-72 text-white`}
              placeholderTextColor={"gray"}
              placeholder="Passowrd"
            />
          </View>

          <View className="mt-3">
            <Text className="text-lg font-semibold text-white">
              Image
            </Text>

            <TextInput
              value={image}
              onChangeText={(text) => setImage(text)}
              className={`text-lg border-b-gray-600 border-b my-3 w-72 text-white`}
              placeholderTextColor={"gray"}
              placeholder="Image"
            />
          </View>

          <Pressable
            onPress={handleRegister}
            className="w-52 bg-blue-600 mt-12 mx-auto p-4 rounded-md"
          >
            <Text
              className="text-white text-base font-bold text-center"
            >
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
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default RegisterScreen;

const styles = StyleSheet.create({});