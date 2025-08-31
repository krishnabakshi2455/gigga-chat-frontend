import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as React from 'react';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import FriendsScreen from './screens/FriendsScreen';
import ChatsScreen from './screens/ChatsScreen';
import ChatMessagesScreen from './screens/ChatMessagesScreen';


const Stack = createNativeStackNavigator();
const Stacknavigator = () => {
    return (
        <NavigationContainer>
            <Stack.Navigator>
                <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} 
                
                />
                <Stack.Screen name="Home" component={HomeScreen} 
                    options={{
                        headerShown: true,
                        headerStyle: {
                            backgroundColor: '#000000',
                        },
                        headerTintColor: '#2563eb',
                        headerTitleStyle: {
                            color: '#ffffff',
                        },
                    }}
                
                />
                <Stack.Screen name="Friends" component={FriendsScreen}
                    options={{
                        headerShown: true,
                        headerStyle: {
                            backgroundColor: '#000000', // Black background
                        },
                        headerTintColor: '#2563eb', // Blue-600 for icons and back button
                        headerTitleStyle: {
                            color: '#ffffff', // White text
                        },
                    }}
                />
                <Stack.Screen
                    name="Chats"
                    component={ChatsScreen}
                    options={{
                        headerShown: true,
                        headerStyle: {
                            backgroundColor: '#000000', 
                        },
                        headerTintColor: '#2563eb', 
                        headerTitleStyle: {
                            color: '#ffffff', 
                        },
                    }}
                />
                {/* <Stack.Screen
                    name="Messages"
                    component={ChatMessagesScreen}
                    options={{
                        headerShown: true,
                        headerStyle: {
                            backgroundColor: '#000000', 
                        },
                        headerTintColor: '#2563eb', 
                        headerTitleStyle: {
                            color: '#ffffff', 
                        },
                    }}
                /> */}
            </Stack.Navigator>
        </NavigationContainer>
    )
}
``
export default Stacknavigator

