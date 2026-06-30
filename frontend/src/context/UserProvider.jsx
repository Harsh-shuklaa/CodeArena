import React, { useState, useEffect, useCallback } from "react";
import io from "socket.io-client";
import { UserContext } from "./UserContext";

const API_URL = "http://localhost:5001";

const DEFAULT_USER = {
  username: "Guest_Coder",
  email: "guest@codearena.dev",
  selectedClass: "Algorithms",
  avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=Guest_Coder",
  elo: 1200,
  coins: 250,
  xp: 0,
  level: 1,
  wins: 0,
  losses: 0,
  isLoggedIn: false,
  friends: [],
  friendRequests: [],
  notifications: [],
  matches: [],
  achievements: []
};

export function UserProvider({ children }) {
  const [user, setUser] = useState(DEFAULT_USER);
  const [socket, setSocket] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Establish socket connection
  const connectSocket = useCallback((token) => {
    if (socket) {
      socket.disconnect();
    }

    const newSocket = io(API_URL, {
      auth: { token: token || "" }
    });
    
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("[SOCKET] Connected to real-time server");
    });

    // Real-time notification handler
    newSocket.on("newNotification", (notif) => {
      setUser((prev) => {
        const alreadyExists = prev.notifications.some(n => n.id === notif.id || n._id === notif.id);
        if (alreadyExists) return prev;
        
        const updatedNotifications = [notif, ...prev.notifications];
        let updatedRequests = [...prev.friendRequests];
        
        const senderUsername = notif.data?.senderUsername || notif.from;
        if (notif.type === "friend_request" && senderUsername && !updatedRequests.some(r => r.from === senderUsername)) {
          updatedRequests.push({ from: senderUsername });
        }
        
        return {
          ...prev,
          notifications: updatedNotifications,
          friendRequests: updatedRequests
        };
      });
    });

    // Real-time notification retraction handler
    newSocket.on("removeNotification", (data) => {
      console.log("[SOCKET DEBUG] removeNotification received:", data);
      setUser((prev) => {
        const remaining = prev.notifications.filter(n => {
          const isMatch = (n.id && n.id.toString() === data.id) || 
                          (n._id && n._id.toString() === data.id);
          return !isMatch;
        });
        console.log("[SOCKET DEBUG] Notifications count after retraction:", remaining.length);
        return {
          ...prev,
          notifications: remaining
        };
      });
    });

    // Real-time friend status update handler
    newSocket.on("friendPresenceChange", (data) => {
      setUser((prev) => {
        const updatedFriends = prev.friends.map(f => {
          if (f._id === data.userId || f.username === data.userId) {
            return { ...f, status: data.status };
          }
          return f;
        });
        return { ...prev, friends: updatedFriends };
      });
    });

    // Real-time friend add reload handler
    newSocket.on("friendAdded", async () => {
      const activeToken = localStorage.getItem("codearena_token");
      if (!activeToken) return;
      try {
        const refreshedRes = await fetch(`${API_URL}/api/user/friends/list`, {
          headers: { "Authorization": `Bearer ${activeToken}` }
        });
        if (refreshedRes.ok) {
          const refreshedFriends = await refreshedRes.json();
          setUser((prev) => ({ ...prev, friends: refreshedFriends }));
        }
      } catch (err) {
        console.error("Error refreshing friends after addition", err);
      }
    });

    newSocket.on("error", (err) => {
      console.error("[SOCKET ERROR]", err.message);
    });

    return newSocket;
  }, [socket]);

  // Helper to load friends and notifications
  const loadUserData = useCallback(async (token, userData) => {
    try {
      // Fetch friends
      const friendsRes = await fetch(`${API_URL}/api/user/friends/list`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const friends = friendsRes.ok ? await friendsRes.json() : [];

      // Fetch notifications
      const notifsRes = await fetch(`${API_URL}/api/notification`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const notifications = notifsRes.ok ? await notifsRes.json() : [];
      const friendRequests = notifications
        .filter((n) => n.type === "friend_request")
        .map((n) => ({ from: n.data?.senderUsername || n.from }));

      setUser({
        ...userData,
        isLoggedIn: true,
        friends,
        friendRequests,
        notifications,
        matches: userData.matches || [],
        achievements: userData.achievements || []
      });
    } catch (err) {
      console.error("Failed to load user relations", err);
      setUser({
        ...userData,
        isLoggedIn: true,
        friends: [],
        friendRequests: [],
        notifications: [],
        matches: [],
        achievements: []
      });
    }
  }, []);

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem("codearena_token");
      if (token) {
        try {
          const res = await fetch(`${API_URL}/api/auth/me`, {
            headers: {
              "Authorization": `Bearer ${token}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            await loadUserData(token, data.user);
            connectSocket(token);
          } else {
            console.warn("Session token expired or invalid");
            localStorage.removeItem("codearena_token");
            connectSocket(null);
          }
        } catch (e) {
          console.error("Failed to restore operator session", e);
          connectSocket(null);
        }
      } else {
        connectSocket(null);
      }
      setIsLoading(false);
    };

    restoreSession();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Emit register-user when socket and user._id are ready
  useEffect(() => {
    if (socket && user && user.isLoggedIn && user._id) {
      socket.emit("register-user", user._id.toString());
      console.log(`[SOCKET] Emitted register-user for user ${user.username} (${user._id})`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, user?._id, user?.isLoggedIn]);

  const login = useCallback(async (email, password) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to authenticate credentials");
      }

      localStorage.setItem("codearena_token", data.token);
      await loadUserData(data.token, data.user);
      connectSocket(data.token);
      return { success: true };
    } catch (error) {
      console.error("[LOGIN ERROR]", error);
      return { success: false, message: error.message };
    }
  }, [connectSocket, loadUserData]);

  const signup = useCallback(async (email, username, selectedClass, avatarUrl, password) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, selectedClass, avatarUrl, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to register new operator");
      }

      localStorage.setItem("codearena_token", data.token);
      await loadUserData(data.token, data.user);
      connectSocket(data.token);
      return { success: true };
    } catch (error) {
      console.error("[SIGNUP ERROR]", error);
      return { success: false, message: error.message };
    }
  }, [connectSocket, loadUserData]);

  const logout = useCallback(() => {
    localStorage.removeItem("codearena_token");
    setUser(DEFAULT_USER);
    connectSocket(null);
  }, [connectSocket]);

  const updateAvatar = useCallback(async (newAvatarUrl) => {
    const token = localStorage.getItem("codearena_token");
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/user/profile/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ avatarUrl: newAvatarUrl })
      });
      if (res.ok) {
        setUser((prev) => ({ ...prev, avatarUrl: newAvatarUrl }));
      }
    } catch (err) {
      console.error("Failed to persist avatar update in database", err);
    }
  }, []);

  const updateProfile = useCallback((updatedFields) => {
    setUser((prev) => ({ ...prev, ...updatedFields }));
  }, []);

  const sendFriendRequest = useCallback(async (targetUsername) => {
    if (!targetUsername) return;
    const token = localStorage.getItem("codearena_token");
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/user/friend-request/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ username: targetUsername })
      });
      const data = await res.json();
      if (res.ok) {
        const feedbackAlert = {
          id: Math.random().toString(36).substring(7),
          type: "system",
          message: `Friend request sent to ${targetUsername} successfully.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setUser((prev) => ({
          ...prev,
          notifications: [feedbackAlert, ...prev.notifications]
        }));
      } else {
        alert(data.message || "Failed to send friend request.");
      }
    } catch (err) {
      console.error("Error sending friend request", err);
    }
  }, []);

  const acceptFriendRequest = useCallback(async (fromUsername) => {
    const token = localStorage.getItem("codearena_token");
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/user/friend-request/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ senderUsername: fromUsername, action: "accept" })
      });

      if (res.ok) {
        setUser((prev) => {
          const targetLower = fromUsername.toLowerCase();
          const cleanRequests = prev.friendRequests.filter(r => r.from?.toLowerCase() !== targetLower);
          const isAlreadyFriend = prev.friends.some(f => f.username?.toLowerCase() === targetLower);
          const newFriends = isAlreadyFriend ? prev.friends : [...prev.friends, { username: fromUsername, status: "online" }];
          const systemAlert = {
            id: Math.random().toString(36).substring(7),
            type: "system",
            message: `You and ${fromUsername} are now connected.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          const cleanNotifications = prev.notifications.filter(
            n => !((n.type === "friend_request" && (n.data?.senderUsername?.toLowerCase() === targetLower || n.from?.toLowerCase() === targetLower)))
          );
          return {
            ...prev,
            friends: newFriends,
            friendRequests: cleanRequests,
            notifications: [systemAlert, ...cleanNotifications]
          };
        });
      }
    } catch (err) {
      console.error("Error accepting request", err);
    }
  }, []);

  const rejectFriendRequest = useCallback(async (fromUsername) => {
    const token = localStorage.getItem("codearena_token");
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/user/friend-request/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ senderUsername: fromUsername, action: "reject" })
      });

      if (res.ok) {
        setUser((prev) => {
          const targetLower = fromUsername.toLowerCase();
          const cleanRequests = prev.friendRequests.filter(r => r.from?.toLowerCase() !== targetLower);
          const cleanNotifications = prev.notifications.filter(
            n => !((n.type === "friend_request" && (n.data?.senderUsername?.toLowerCase() === targetLower || n.from?.toLowerCase() === targetLower)))
          );
          return {
            ...prev,
            friendRequests: cleanRequests,
            notifications: cleanNotifications
          };
        });
      }
    } catch (err) {
      console.error("Error rejecting request", err);
    }
  }, []);

  const addNotification = useCallback((type, from, message, roomId = null) => {
    const newAlert = {
      id: Math.random().toString(36).substring(7),
      type,
      from,
      message,
      roomId,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setUser((prev) => {
      let updatedRequests = [...prev.friendRequests];
      if (type === "friend_request" && !updatedRequests.some(r => r.from === from)) {
        updatedRequests.push({ from });
      }
      return {
        ...prev,
        friendRequests: updatedRequests,
        notifications: [newAlert, ...prev.notifications]
      };
    });
  }, []);

  const clearNotification = useCallback(async (id) => {
    const token = localStorage.getItem("codearena_token");
    if (!token) return;

    try {
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
      if (isObjectId) {
        await fetch(`${API_URL}/api/notification/${id}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${token}` }
        });
      }

      setUser((prev) => ({
        ...prev,
        notifications: prev.notifications.filter(n => n.id !== id)
      }));
    } catch (err) {
      console.error("Error clearing notification", err);
    }
  }, []);

  const refreshUserStats = useCallback(async () => {
    const token = localStorage.getItem("codearena_token");
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser((prev) => ({
          ...prev,
          ...data.user
        }));
      }
    } catch (e) {
      console.error("Failed to refresh user stats", e);
    }
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        socket,
        isLoading,
        login,
        signup,
        logout,
        updateAvatar,
        updateProfile,
        sendFriendRequest,
        acceptFriendRequest,
        rejectFriendRequest,
        addNotification,
        clearNotification,
        refreshUserStats
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
