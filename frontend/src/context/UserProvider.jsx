import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import { UserContext } from "./UserContext";

const API_URL = "http://localhost:5000";

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
  friends: [{ username: "Aryan_99", status: "online" }],
  friendRequests: [],
  notifications: [],
  matches: []
};

export function UserProvider({ children }) {
  const [user, setUser] = useState(DEFAULT_USER);
  const [socket, setSocket] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Establish socket connection
  const connectSocket = (token) => {
    if (!token) return null;
    
    // Disconnect existing socket first
    if (socket) {
      socket.disconnect();
    }

    const newSocket = io(API_URL, {
      auth: { token }
    });
    
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("[SOCKET] Connected to real-time server");
    });

    newSocket.on("error", (err) => {
      console.error("[SOCKET ERROR]", err.message);
    });

    return newSocket;
  };

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
            setUser({
              ...data.user,
              isLoggedIn: true,
              friends: [{ username: "Aryan_99", status: "online" }],
              friendRequests: [],
              notifications: [],
              matches: []
            });
            connectSocket(token);
          } else {
            console.warn("Session token expired or invalid");
            localStorage.removeItem("codearena_token");
          }
        } catch (e) {
          console.error("Failed to restore operator session", e);
        }
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

  const login = async (email, password) => {
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
      setUser({
        ...data.user,
        isLoggedIn: true,
        friends: [{ username: "Aryan_99", status: "online" }],
        friendRequests: [],
        notifications: [],
        matches: []
      });
      connectSocket(data.token);
      return { success: true };
    } catch (error) {
      console.error("[LOGIN ERROR]", error);
      return { success: false, message: error.message };
    }
  };

  const signup = async (email, username, selectedClass, avatarUrl, password) => {
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
      setUser({
        ...data.user,
        isLoggedIn: true,
        friends: [{ username: "Aryan_99", status: "online" }],
        friendRequests: [],
        notifications: [],
        matches: []
      });
      connectSocket(data.token);
      return { success: true };
    } catch (error) {
      console.error("[SIGNUP ERROR]", error);
      return { success: false, message: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem("codearena_token");
    setUser(DEFAULT_USER);
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  };

  const updateAvatar = (newAvatarUrl) => {
    setUser((prev) => ({ ...prev, avatarUrl: newAvatarUrl }));
  };

  const updateProfile = (updatedFields) => {
    setUser((prev) => ({ ...prev, ...updatedFields }));
  };

  // Keep simulated friend functions intact to support front-end bento lists
  const sendFriendRequest = (targetUsername) => {
    if (!targetUsername) return;
    const cleanTarget = targetUsername.trim();
    const alertId = Math.random().toString(36).substring(7);
    const mockRequestAlert = {
      id: alertId,
      type: "system",
      text: `Friend request sent to ${cleanTarget} successfully.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setUser((prev) => ({
      ...prev,
      notifications: [mockRequestAlert, ...prev.notifications]
    }));
  };

  const acceptFriendRequest = (fromUsername) => {
    setUser((prev) => {
      const cleanRequests = prev.friendRequests.filter(r => r.from !== fromUsername);
      const isAlreadyFriend = prev.friends.some(f => f.username === fromUsername);
      const newFriends = isAlreadyFriend ? prev.friends : [...prev.friends, { username: fromUsername, status: "online" }];
      const systemAlert = {
        id: Math.random().toString(36).substring(7),
        type: "system",
        text: `You and ${fromUsername} are now connected.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      const cleanNotifications = prev.notifications.filter(
        n => !(n.type === "friend_request" && n.from === fromUsername)
      );
      return {
        ...prev,
        friends: newFriends,
        friendRequests: cleanRequests,
        notifications: [systemAlert, ...cleanNotifications]
      };
    });
  };

  const rejectFriendRequest = (fromUsername) => {
    setUser((prev) => {
      const cleanRequests = prev.friendRequests.filter(r => r.from !== fromUsername);
      const cleanNotifications = prev.notifications.filter(
        n => !(n.type === "friend_request" && n.from === fromUsername)
      );
      return {
        ...prev,
        friendRequests: cleanRequests,
        notifications: cleanNotifications
      };
    });
  };

  const addNotification = (type, from, text, roomId = null) => {
    const newAlert = {
      id: Math.random().toString(36).substring(7),
      type,
      from,
      text,
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
  };

  const clearNotification = (id) => {
    setUser((prev) => ({
      ...prev,
      notifications: prev.notifications.filter(n => n.id !== id)
    }));
  };

  const refreshUserStats = async () => {
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
  };

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
