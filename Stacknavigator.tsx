import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as React from 'react';
import { useEffect, useState } from 'react';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import FriendsScreen from './screens/FriendsScreen';
import ChatsScreen from './screens/ChatsScreen';
import ChatMessagesScreen from './screens/ChatMessagesScreen';

const NAVIGATION_STATE_KEY = '@navigation_state';

const Stack = createNativeStackNavigator();

const Stacknavigator = () => {
    const [isReady, setIsReady] = useState(false);
    const [initialState, setInitialState] = useState();

    // Restore navigation state on mount
    useEffect(() => {
        const restoreState = async () => {
            try {
                const savedStateString = await AsyncStorage.getItem(NAVIGATION_STATE_KEY);
                const state = savedStateString ? JSON.parse(savedStateString) : undefined;

                if (state !== undefined) {
                    setInitialState(state);
                }
            } catch (e) {
                console.log('Failed to restore navigation state:', e);
            } finally {
                setIsReady(true);
            }
        };

        restoreState();
    }, []);

    // Show nothing while loading (or return your splash screen here)
    if (!isReady) {
        return null;
    }

    return (
        <NavigationContainer
            initialState={initialState}
            onStateChange={(state) => {
                // Save navigation state whenever it changes
                AsyncStorage.setItem(NAVIGATION_STATE_KEY, JSON.stringify(state));
            }}
        >
            <Stack.Navigator>
                <Stack.Screen
                    name="Login"
                    component={LoginScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="Register"
                    component={RegisterScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="Home"
                    component={HomeScreen}
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
                <Stack.Screen
                    name="Friends"
                    component={FriendsScreen}
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
                <Stack.Screen
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
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default Stacknavigator;