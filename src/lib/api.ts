import axios from 'axios';
import { getSession } from 'next-auth/react';

const API = '/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API,
});

// Add auth token to requests automatically
apiClient.interceptors.request.use(async (config) => {
  const session = await getSession();
  if (session?.user) {
    // For NextAuth, we can use the session token or implement custom JWT
    // For now, we'll use a custom header to identify authenticated requests
    config.headers['X-User-Id'] = session.user.id;
    config.headers['X-User-Email'] = session.user.email;
  }
  return config;
});

// Registration function (doesn't need authentication)
export async function register({ 
  email, 
  password, 
  name 
}: { 
  email: string; 
  password: string; 
  name: string; 
}) {
  try {
    const res = await axios.post(`${API}/auth/register`, { 
      email: email.toLowerCase().trim(), 
      password, 
      name: name.trim() 
    });
    return res.data;
  } catch (error: any) {
    // Re-throw with better error handling
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw error;
  }
}

// Get current user info (using session)
export async function getCurrentUser() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error('Not authenticated');
  }
  return session.user;
}

// Video management functions
export async function uploadVideo({ 
  title, 
  url, 
  description, 
  thumbnail 
}: { 
  title: string; 
  url: string; 
  description?: string; 
  thumbnail?: string; 
}) {
  const res = await apiClient.post('/video/upload', { 
    title, 
    url, 
    description, 
    thumbnail 
  });
  return res.data;
}

export async function listVideos() {
  const res = await apiClient.get('/video/list');
  return res.data;
}

export async function updateVideo({ 
  id, 
  title, 
  description, 
  thumbnail 
}: { 
  id: string; 
  title?: string; 
  description?: string; 
  thumbnail?: string; 
}) {
  const filteredData = Object.fromEntries(
    Object.entries({ title, description, thumbnail }).filter(([_, value]) => value !== undefined)
  );
  
  const res = await apiClient.patch(`/video/${id}`, filteredData);
  return res.data;
}

export async function deleteVideo({ id }: { id: string }) {
  const res = await apiClient.delete(`/video/${id}`);
  return res.data;
}

// GIF management functions
export async function createGif({ 
  videoId, 
  startTime, 
  endTime, 
  title, 
  description, 
  caption, 
  prompt 
}: { 
  videoId: string; 
  startTime: number; 
  endTime: number; 
  title: string; 
  description?: string; 
  caption?: string; 
  prompt?: string; 
}) {
  const res = await apiClient.post('/gif/create', {
    videoId,
    startTime,
    endTime,
    title,
    description,
    caption,
    prompt
  });
  return res.data;
}

export async function listGifs() {
  const res = await apiClient.get('/gif/list');
  return res.data;
}

export async function updateGif({ 
  id, 
  title, 
  description, 
  caption, 
  prompt 
}: { 
  id: string; 
  title?: string; 
  description?: string; 
  caption?: string; 
  prompt?: string; 
}) {
  const filteredData = Object.fromEntries(
    Object.entries({ title, description, caption, prompt }).filter(([_, value]) => value !== undefined)
  );
  
  const res = await apiClient.patch(`/gif/${id}`, filteredData);
  return res.data;
}

export async function deleteGif({ id }: { id: string }) {
  const res = await apiClient.delete(`/gif/${id}`);
  return res.data;
}

// Legacy functions for backward compatibility (if you still need JWT-based auth somewhere)
export async function login({ email, password }: { email: string; password: string }) {
  // This is kept for backward compatibility, but with NextAuth you should use signIn instead
  console.warn('login() function is deprecated. Use signIn from next-auth/react instead.');
  
  const res = await axios.post(`${API}/auth/login`, { email, password });
  return res.data;
}

export async function getUser(token: string) {
  // This is kept for backward compatibility
  console.warn('getUser(token) function is deprecated. Use getCurrentUser() instead.');
  
  const res = await axios.get(`${API}/user`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

// Utility function to check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session?.user;
}