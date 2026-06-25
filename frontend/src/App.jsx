import React, { useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Matchmaking from "./pages/Matchmaking";
import Battle from "./pages/Battle";
import Result from "./pages/Result";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import { UserProvider } from "./context/UserProvider";
import { UserContext } from "./context/UserContext";
import "./App.css";

// Route wrapper for screens that require user registration / authentication
const ProtectedRoute = ({ children }) => {
  const { user, isLoading } = useContext(UserContext);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#131318] flex flex-col items-center justify-center text-[#4cd7f6]">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-t-[#4cd7f6] border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
          <div className="absolute inset-1.5 rounded-full border-4 border-[#ddb7ff] border-t-transparent border-r-transparent border-l-transparent animate-pulse"></div>
        </div>
        <p className="mt-6 text-xs tracking-widest font-mono text-[#cfc2d6] animate-pulse">
          INITIALIZING CODEARENA CORE...
        </p>
      </div>
    );
  }

  if (!user || !user.isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Route wrapper for screens that should ONLY be visible to visitors (e.g. Login, Signup)
const PublicRoute = ({ children }) => {
  const { user, isLoading } = useContext(UserContext);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#131318] flex flex-col items-center justify-center text-[#4cd7f6]">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-t-[#4cd7f6] border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
          <div className="absolute inset-1.5 rounded-full border-4 border-[#ddb7ff] border-t-transparent border-r-transparent border-l-transparent animate-pulse"></div>
        </div>
        <p className="mt-6 text-xs tracking-widest font-mono text-[#cfc2d6] animate-pulse">
          INITIALIZING CODEARENA CORE...
        </p>
      </div>
    );
  }

  if (user && user.isLoggedIn) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function AppContent() {
  return (
    <Router>
      <Navbar />
      <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={<Landing />} />

        {/* Authentication Pages (Only accessible when NOT logged in) */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          }
        />

        {/* Protected Core Screens (Require registration/login) */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/matchmaking" element={<Matchmaking />} />
        <Route path="/battle/:matchId" element={<Battle />} />
        <Route path="/result/:matchId" element={<Result />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route
          path="/profile/:username"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* Catch-all fallback navigation redirecting to Landing page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
}

export default App;
