"use client";

import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/Button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useToast } from "../context/ToastContext";
import { useState } from "react";

export default function Header() {
  const { user, logout, login } = useAuth();
  const pathname = usePathname();
  const { showToast } = useToast();
  const [imgError, setImgError] = useState(false);

  function getInitials(nameOrEmail: string) {
    if (!nameOrEmail) return "";
    const name = nameOrEmail.split("@")[0];
    const parts = name.split(" ");
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  const handleLogout = () => {
    logout();
    showToast("Logged out successfully!", "success");
  };

  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <span className="text-white text-xl font-bold">FF</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              FocusFlow
            </h1>
            <p className="text-sm text-gray-500">GIF Generator</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <span className="text-gray-700 font-medium flex items-center space-x-2">
                {user.image && !imgError ? (
                  <Link href="/profile">
                    <img
                      src={user.image}
                      alt={user.name || user.email}
                      className="w-8 h-8 rounded-full mr-2 cursor-pointer border-2 border-blue-500 hover:border-purple-600 transition"
                      onError={() => setImgError(true)}
                    />
                  </Link>
                ) : (
                  <div className="w-8 h-8 rounded-full mr-2 flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-lg border-2 border-blue-500">
                    {getInitials(user.name || user.email)}
                  </div>
                )}
                <span>{user.name || user.email}</span>
              </span>
              <Button variant="danger" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            pathname !== "/login" && pathname !== "/register" && (
              <Button variant="primary" size="sm" onClick={login}>
                Login
              </Button>
            )
          )}
        </div>
      </div>
    </header>
  );
} 