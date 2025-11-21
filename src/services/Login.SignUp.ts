// Login.SignUp.ts
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { Alert } from "react-native";
import { BACKEND_URL, GOOGLE_Web_Client_ID } from "@env";

// Configure Google Sign-In
export const configureGoogleSignIn = () => {
    GoogleSignin.configure({
        webClientId: GOOGLE_Web_Client_ID,
        offlineAccess: true,
    });
};

// Email validation
export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Token expiration check
export const isTokenExpired = (token: string): boolean => {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return true;

        const payload = JSON.parse(atob(parts[1]));

        if (!payload.exp) return true;

        const currentTime = Math.floor(Date.now() / 1000);
        return payload.exp < currentTime;

    } catch (error) {
        console.log("Error checking token expiration:", error);
        return true;
    }
};

// Check backend connectivity
export const checkBackendConnection = async (): Promise<boolean> => {
    try {
        console.log('🔌 Checking backend connection:', BACKEND_URL);
        const response = await axios.get(`${BACKEND_URL}/health`, {
            timeout: 5000,
        });
        console.log('✅ Backend connected:', response.status === 200);
        return true;
    } catch (error) {
        console.log('❌ Backend connection failed:', error);
        return false;
    }
};

// Validate login form
export const validateLoginForm = (email: string, password: string) => {
    let tempErrors = {
        email: "",
        password: "",
    };
    let isValid = true;

    if (!email.trim()) {
        tempErrors.email = "Email is required";
        isValid = false;
    } else if (!isValidEmail(email)) {
        tempErrors.email = "Please enter a valid email address";
        isValid = false;
    }

    if (!password.trim()) {
        tempErrors.password = "Password is required";
        isValid = false;
    } else if (password.length < 6) {
        tempErrors.password = "Password must be at least 6 characters";
        isValid = false;
    }

    return { errors: tempErrors, isValid };
};

// Validate register form
export const validateRegisterForm = (name: string, email: string, password: string) => {
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

    return { errors: tempErrors, isValid };
};

// Check stored token and navigate if valid
export const checkStoredToken = async (
    setusertokenatom: (token: string) => void,
    navigationReplace: (screen: string) => void
): Promise<boolean> => {
    try {
        const token = await AsyncStorage.getItem("authToken");
        console.log('🔐 Token found:', !!token);

        if (token) {
            try {
                const parts = token.split('.');
                if (parts.length === 3) {
                    const payload = JSON.parse(atob(parts[1]));
                    const currentTime = Math.floor(Date.now() / 1000);

                    console.log('⏰ Token expires:', new Date(payload.exp * 1000));
                    console.log('⏰ Current time:', new Date(currentTime * 1000));
                    console.log('📅 Expired?', payload.exp < currentTime);

                    if (payload.exp < currentTime) {
                        console.log('🗑️ Removing expired token');
                        await AsyncStorage.removeItem("authToken");
                        setusertokenatom("");
                        return false;
                    } else {
                        console.log('✅ Token valid, navigating to Home');
                        setusertokenatom(token);
                        navigationReplace("Home");
                        return true;
                    }
                }
            } catch (error) {
                console.log('❌ Invalid token format, removing');
                await AsyncStorage.removeItem("authToken");
                setusertokenatom("");
                return false;
            }
        }

        setusertokenatom("");
        return false;

    } catch (error) {
        console.log("Error during token check:", error);
        await AsyncStorage.removeItem("authToken");
        setusertokenatom("");
        return false;
    }
};

// Handle email/password login
export const handleEmailPasswordLogin = async (
    email: string,
    password: string,
    setusertokenatom: (token: string) => void,
    navigationReplace: (screen: string) => void
): Promise<{ success: boolean; error?: string }> => {
    try {
        const user = {
            email: email,
            password: password,
        };

        const response = await axios.post(`${BACKEND_URL}/login`, user);
        const token = response.data.token;

        await AsyncStorage.setItem("authToken", token);
        setusertokenatom(token);
        navigationReplace("Home");

        return { success: true };
    } catch (error) {
        console.log("Login error:", error);
        return { success: false, error: "Invalid email or password" };
    }
};

// Handle user registration
export const handleUserRegistration = async (
    name: string,
    email: string,
    password: string,
    image: string = ""
): Promise<{ success: boolean; error?: string }> => {
    try {
        const user = {
            name: name,
            email: email,
            password: password,
            image: image,
        };

        const response = await axios.post(`${BACKEND_URL}/register`, user);
        console.log(response);

        return { success: true };
    } catch (error) {
        console.log("Registration failed", error);
        return { success: false, error: "An error occurred while registering" };
    }
};

// Handle Google Sign-In
export const handleGoogleSignIn = async (
    setusertokenatom: (token: string) => void,
    navigationReplace: (screen: string) => void
): Promise<{ success: boolean; error?: string; errorCode?: string }> => {
    try {
        console.log('🚀 Starting Google Sign-In...');

        // Verify Google configuration
        if (!GOOGLE_Web_Client_ID || GOOGLE_Web_Client_ID.includes('http')) {
            return {
                success: false,
                error: 'Google Sign-In is not properly configured. Please check your environment variables.',
                errorCode: 'CONFIG_ERROR'
            };
        }

        // Sign out first to clear any cached credentials
        try {
            await GoogleSignin.signOut();
            console.log('🔓 Signed out from previous session');
        } catch (signOutError) {
            console.log('Sign out error (can be ignored):', signOutError);
        }

        // Check if Google Play Services are available
        console.log('🎮 Checking Google Play Services...');
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

        // Sign in with Google
        console.log('📝 Signing in with Google...');
        const userInfo = await GoogleSignin.signIn();

        console.log('✅ Google sign-in successful');
        console.log('User data:', {
            hasName: !!userInfo.data?.user?.name,
            hasEmail: !!userInfo.data?.user?.email,
            hasPhoto: !!userInfo.data?.user?.photo
        });

        const googleUser = {
            name: userInfo.data?.user?.name || "",
            email: userInfo.data?.user?.email || "",
            image: userInfo.data?.user?.photo || "",
        };

        // Validate that we have required data
        if (!googleUser.email) {
            throw new Error('No email received from Google');
        }

        const response = await axios.post(`${BACKEND_URL}/googleauth`, googleUser, {
            timeout: 10000,
        });

        console.log('✅ Backend response received');
        const token = response.data.token;

        await AsyncStorage.setItem("authToken", token);
        setusertokenatom(token);

        console.log('🏠 Navigating to Home');
        navigationReplace("Home");

        return { success: true };

    } catch (error: any) {
        console.error('❌ Google Sign-In error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);

        if (error.code === statusCodes.SIGN_IN_CANCELLED) {
            console.log('User cancelled sign-in');
            return { success: false, errorCode: 'CANCELLED' };
        } else if (error.code === statusCodes.IN_PROGRESS) {
            console.log('Sign-In already in progress');
            return { success: false, error: 'Sign-in already in progress', errorCode: 'IN_PROGRESS' };
        } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
            return { success: false, error: 'Google Play Services not available or outdated', errorCode: 'PLAY_SERVICES' };
        } else if (error.response) {
            console.error('Backend error:', error.response.data);
            return { success: false, error: 'Failed to authenticate with server. Please try again.', errorCode: 'BACKEND_ERROR' };
        } else if (error.request) {
            return { success: false, error: 'Cannot reach the server. Please check your connection.', errorCode: 'NETWORK_ERROR' };
        } else {
            return { success: false, error: `Google Sign-In failed: ${error.message}`, errorCode: 'UNKNOWN' };
        }
    }
};

// Clear all auth data (for logout)
export const clearAuthData = async (setusertokenatom: (token: string) => void): Promise<void> => {
    try {
        await AsyncStorage.removeItem("authToken");
        setusertokenatom("");
        console.log('🗑️ Auth data cleared');
    } catch (error) {
        console.log('Error clearing auth data:', error);
    }
};