// Add this to your Stacknavigator.tsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import FriendsScreen from './screens/FriendsScreen';
import ChatsScreen from './screens/ChatsScreen';
import * as Updates from 'expo-updates';
import ChatMessagesScreen from './screens/ChatMessagesScreen';

const NAVIGATION_STATE_KEY = '@navigation_state';

const Stack = createNativeStackNavigator();

// Wrapper component that adds pull-to-refresh to any screen
const RefreshableScreen = ({ component: Component, ...props }: any) => {
    const [refreshing, setRefreshing] = React.useState(false);

    const onRefresh = async () => {
        setRefreshing(true);
        // Trigger re-render of the screen, which will refetch data
        setTimeout(() => setRefreshing(false), 1000);
        await Updates.reloadAsync();
    };

    return (
        <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor="#2563eb"
                    colors={['#2563eb']}
                />
            }
        >
            <Component {...props} />
        </ScrollView>
    );
};

const Stacknavigator = () => {
    const [isReady, setIsReady] = useState(false);
    const [initialState, setInitialState] = useState();

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

    if (!isReady) {
        return null;
    }

    return (
        <NavigationContainer
            initialState={initialState}
            onStateChange={(state) => {
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
                >
                    {(props) => <RefreshableScreen {...props} component={HomeScreen} />}
                </Stack.Screen>
                <Stack.Screen
                    name="Friends"
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
                >
                    {(props) => <RefreshableScreen {...props} component={FriendsScreen} />}
                </Stack.Screen>
                <Stack.Screen
                    name="Chats"
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
                >
                    {(props) => <RefreshableScreen {...props} component={ChatsScreen} />}
                </Stack.Screen>
                <Stack.Screen
                    name="Messages"
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
                >
                    {(props) => <RefreshableScreen {...props} component={ChatMessagesScreen} />}
                </Stack.Screen>
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default Stacknavigator;