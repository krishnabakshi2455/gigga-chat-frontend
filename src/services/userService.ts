import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { BACKEND_URL } from '@env';
import { FriendRequest, UserItem } from '../lib/types/types';

interface DecodedToken {
    userId: string;
}

// User Service Class
class UserService {
    private static instance: UserService;

    private constructor() { }

    public static getInstance(): UserService {
        if (!UserService.instance) {
            UserService.instance = new UserService();
        }
        return UserService.instance;
    }

    // Auth & Token Management
    async getAuthToken(): Promise<string | null> {
        try {
            return await AsyncStorage.getItem('authToken');
        } catch (error) {
            console.log('Error getting auth token:', error);
            return null;
        }
    }

    async getUserIdFromToken(): Promise<string | null> {
        try {
            const token = await this.getAuthToken();
            if (!token) return null;

            const decodedToken = jwtDecode(token) as DecodedToken;
            return decodedToken.userId;
        } catch (error) {
            console.log('Error decoding token:', error);
            return null;
        }
    }

    // User Operations
    async fetchUsers(userId: string): Promise<UserItem[]> {
        try {
            const response = await axios.get(`${BACKEND_URL}/users/${userId}`);
            return response.data;
        } catch (error) {
            console.log('Error retrieving users:', error);
            throw error;
        }
    }

    async fetchUserFriends(userId: string): Promise<string[]> {
        try {
            const response = await fetch(`${BACKEND_URL}/friends/${userId}`);
            const data = await response.json();

            if (response.ok) {
                return data;
            } else {
                console.log('Error retrieving user friends:', response.status);
                return [];
            }
        } catch (error) {
            console.log('Error fetching user friends:', error);
            return [];
        }
    }

    // Accepted Friends Operations
    async fetchAcceptedFriends(userId: string): Promise<UserItem[]> {
        try {
            const response = await fetch(
                `${BACKEND_URL}/accepted-friends/${userId}`
            );
            const data = await response.json();

            if (response.ok) {
                return data;
            } else {
                console.log("error fetching accepted friends", response.status);
                return [];
            }
        } catch (error) {
            console.log("error showing the accepted friends", error);
            return [];
        }
    }

    // Friend Request Operations
    async fetchSentFriendRequests(userId: string): Promise<FriendRequest[]> {
        try {
            const response = await fetch(
                `${BACKEND_URL}/friend-requests/sent/${userId}`
            );
            const data = await response.json();

            if (response.ok) {
                return data;
            } else {
                console.log('Error fetching sent friend requests:', response.status);
                return [];
            }
        } catch (error) {
            console.log('Error fetching sent friend requests:', error);
            return [];
        }
    }

    async fetchReceivedFriendRequests(userId: string): Promise<FriendRequest[]> {
        try {
            const response = await axios.get(`${BACKEND_URL}/friend-request/${userId}`);

            if (response.status === 200 && response.data) {
                return response.data;
            }
            return [];
        } catch (error) {
            console.log('Error fetching received friend requests:', error);
            return [];
        }
    }

    async sendFriendRequest(currentUserId: string, selectedUserId: string): Promise<boolean> {
        try {
            const response = await fetch(`${BACKEND_URL}/friend-request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ currentUserId, selectedUserId }),
            });

            return response.ok;
        } catch (error) {
            console.log('Error sending friend request:', error);
            return false;
        }
    }

    // Friend Request Management
    async acceptFriendRequest(senderId: string, recipientId: string): Promise<boolean> {
        try {
            const response = await fetch(`${BACKEND_URL}/friend-request/accept`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    senderId: senderId,
                    recepientId: recipientId,
                }),
            });

            if (response.ok) {
                return true;
            } else {
                console.log("Failed to accept friend request", response.status);
                return false;
            }
        } catch (error) {
            console.log("Error accepting the friend request:", error);
            return false;
        }
    }

    async rejectFriendRequest(senderId: string, recipientId: string): Promise<boolean> {
        try {
            const response = await fetch(`${BACKEND_URL}/friend-request/reject`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ senderId: senderId, recepientId: recipientId }),
            });

            if (response.ok) {
                return true;
            } else {
                console.log("Failed to reject friend request", response.status);
                return false;
            }
        } catch (error) {
            console.log("Error rejecting the friend request:", error);
            return false;
        }
    }

    // Friend Request Notification Management
    async getReadFriendRequestIds(): Promise<string[]> {
        try {
            const readIds = await AsyncStorage.getItem('readFriendRequestIds');
            return readIds ? JSON.parse(readIds) : [];
        } catch (error) {
            console.log('Error getting read friend request IDs:', error);
            return [];
        }
    }

    async saveReadFriendRequestIds(ids: string[]): Promise<void> {
        try {
            await AsyncStorage.setItem('readFriendRequestIds', JSON.stringify(ids));
        } catch (error) {
            console.log('Error saving read friend request IDs:', error);
        }
    }

    async checkForUnreadRequests(userId: string): Promise<boolean> {
        try {
            const requests = await this.fetchReceivedFriendRequests(userId);

            if (requests.length === 0) {
                return false;
            }

            // Get the IDs of current friend requests
            const currentRequestIds = requests.map((request) => request._id);

            // Get previously read request IDs
            const readIds = await this.getReadFriendRequestIds();

            // Check if there are any NEW unread requests
            const hasUnreadRequests = currentRequestIds.some((id) => !readIds.includes(id));

            return hasUnreadRequests;
        } catch (error) {
            console.log('Error checking for unread requests:', error);
            return false;
        }
    }

    async markFriendRequestsAsRead(userId: string): Promise<void> {
        try {
            const requests = await this.fetchReceivedFriendRequests(userId);

            if (requests.length === 0) return;

            const currentRequestIds = requests.map((request) => request._id);

            // Get existing read IDs and add new ones
            const existingReadIds = await this.getReadFriendRequestIds();
            const updatedReadIds = [...new Set([...existingReadIds, ...currentRequestIds])];

            // Save updated read IDs
            await this.saveReadFriendRequestIds(updatedReadIds);
        } catch (error) {
            console.log('Error marking requests as read:', error);
        }
    }

    // Combined Operations
    async initializeUserData(): Promise<{
        userId: string | null;
        users: UserItem[];
        hasUnreadRequests: boolean;
    }> {
        try {
            const userId = await this.getUserIdFromToken();

            if (!userId) {
                return { userId: null, users: [], hasUnreadRequests: false };
            }

            const users = await this.fetchUsers(userId);
            const hasUnreadRequests = await this.checkForUnreadRequests(userId);

            return { userId, users, hasUnreadRequests };
        } catch (error) {
            console.log('Error initializing user data:', error);
            return { userId: null, users: [], hasUnreadRequests: false };
        }
    }
}

// Export singleton instance
export const userService = UserService.getInstance();