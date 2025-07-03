"use client";

import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/Header";

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <>
      <Header />
      <RequireAuth>
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 px-2 sm:px-0">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-4 sm:p-8 w-full max-w-md flex flex-col items-center">
            {user?.image && (
              <img src={user.image} alt={user.name} className="w-20 h-20 sm:w-24 sm:h-24 rounded-full mb-4" />
            )}
            <h2 className="text-xl sm:text-2xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{user?.name}</h2>
            <p className="text-gray-700 mb-2 text-sm sm:text-base">{user?.email}</p>
            <span className="text-xs sm:text-sm text-gray-400">User ID: {user?.id}</span>
          </div>
        </div>
      </RequireAuth>
    </>
  );
} 