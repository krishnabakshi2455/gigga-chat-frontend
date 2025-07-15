import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import "./global.css"

export default function App() {
  return (
    <View className='flex-1 bg-[#fff] items-center justify-center'>
      <Text className='text-blue-700'>Open up App.tsx to start working on your app!</Text>
      <Text className='text-4xl text-purple-600 bg-black text-center py-4'>
        this is going to start tonight
      </Text>
      <StatusBar style="auto" />
    </View>
  );
}

  