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
import { useAtom } from 'jotai';
import { userTokenAtom } from './src/lib/store/userId.store';
import { isTokenExpired } from './src/services/Login.SignUp';

const NAVIGATION_STATE_KEY = '@navigation_state';

const Stack = createNativeStackNavigator();

// Wrapper component that adds pull-to-refresh to any screen
const RefreshableScreen = ({ component: Component, ...props }: any) => {
    const [refreshing, setRefreshing] = React.useState(false);

    const onRefresh = async () => {
        setRefreshing(true);
        // Trigger re-render of the screen, which will refetch data
        setTimeout(() => {
            setRefreshing(false)
            Updates.reloadAsync();
        }, 1500);
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
    const [usertokenatom, setusertokenatom] = useAtom(userTokenAtom);
    const navigationRef = React.useRef<any>(null);

    // Check token expiration periodically
    useEffect(() => {
        const checkTokenExpiration = async () => {
            try {
                const token = await AsyncStorage.getItem("authToken");

                if (token && isTokenExpired(token)) {
                    console.log('🗑️ Token expired, logging out...');

                    // Clear auth data
                    await AsyncStorage.removeItem("authToken");
                    await AsyncStorage.removeItem(NAVIGATION_STATE_KEY);
                    setusertokenatom("");

                    // Navigate to Login and reset stack
                    if (navigationRef.current) {
                        navigationRef.current.reset({
                            index: 0,
                            routes: [{ name: 'Login' }],
                        });
                    }
                }
            } catch (error) {
                console.log('Error checking token:', error);
            }
        };

        // Check immediately
        checkTokenExpiration();

        // Check every 60 seconds
        const interval = setInterval(checkTokenExpiration, 60000);

        return () => clearInterval(interval);
    }, [setusertokenatom]);

    useEffect(() => {
        const restoreState = async () => {
            try {
                const token = await AsyncStorage.getItem("authToken");

                // Check if token exists and is valid
                if (token && !isTokenExpired(token)) {
                    // Token is valid, restore navigation state
                    const savedStateString = await AsyncStorage.getItem(NAVIGATION_STATE_KEY);
                    const state = savedStateString ? JSON.parse(savedStateString) : undefined;

                    if (state !== undefined) {
                        setInitialState(state);
                    }
                } else {
                    // Token is expired or doesn't exist, clear everything
                    console.log('🗑️ Token invalid or expired on app start');
                    await AsyncStorage.removeItem("authToken");
                    await AsyncStorage.removeItem(NAVIGATION_STATE_KEY);
                    setusertokenatom("");
                    // Don't set initial state, will default to Login screen
                }
            } catch (e) {
                console.log('Failed to restore navigation state:', e);
                // On error, clear everything to be safe
                await AsyncStorage.removeItem("authToken");
                await AsyncStorage.removeItem(NAVIGATION_STATE_KEY);
                setusertokenatom("");
            } finally {
                setIsReady(true);
            }
        };

        restoreState();
    }, [setusertokenatom]);

    if (!isReady) {
        return null;
    }

    return (
        <NavigationContainer
            ref={navigationRef}
            initialState={initialState}
            onStateChange={(state) => {
                // Only save navigation state if user is authenticated
                AsyncStorage.getItem("authToken").then(token => {
                    if (token && !isTokenExpired(token)) {
                        AsyncStorage.setItem(NAVIGATION_STATE_KEY, JSON.stringify(state));
                    }
                });
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