// Get API base URL, use relative path if not provided (production with proxy)
export const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) return envUrl;
  
  // For production with proxy, use relative path
  if (import.meta.env.PROD) return '/api';
  
  // Development fallback
  return 'http://localhost:9000/api';
};

export const API_BASE_URL = getApiBaseUrl();