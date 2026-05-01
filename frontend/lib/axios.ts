import axios, { InternalAxiosRequestConfig } from "axios";


export function getTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(^| )token=([^;]+)/);
  return match ? match[2] : null;
}

// Create Axios instance
//public for public routes without authentication access or third party API.
const publicApi = axios.create({
  baseURL: typeof window ==='undefined'? process.env.NEXT_PRIVATE_API_BASE_URL:process.env.NEXT_PUBLIC_API_BASE_URL  ,
  headers: {
    "Content-Type": "application/json",
  },
});
export const privateApi = axios.create({
  baseURL: typeof window ==='undefined'? process.env.NEXT_PRIVATE_API_BASE_URL:process.env.NEXT_PUBLIC_API_BASE_URL  ,
  headers: { "Content-Type": "application/json" },
});

privateApi.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getTokenFromCookie();
    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for global error handling
privateApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle authentication errors globally
    if (error.response?.status === 401) {
      // Clear the token cookie
      if (typeof document !== "undefined") {
        document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      }
      
      // Redirect to login page if we're in the browser
      if (typeof window !== "undefined" && !window.location.pathname.includes('/auth/')) {
        window.location.href = '/auth/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default publicApi;

export const verifyRole = async (token: string) => {
  try {
    // console.log("heo");
    // Pass the token directly in the request headers
    const response = await publicApi.get("/users/me/role", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error(error);
    return null;
  }
};
