import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';

// Safe storage wrapper to prevent native module crashes in Expo Go
let localCache = {};
const safeStorage = {
  getItem: async (key) => {
    try {
      if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
        const val = await AsyncStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch (e) {
      console.log('AsyncStorage.getItem fallback:', e.message);
    }
    return localCache[key] || null;
  },
  setItem: async (key, value) => {
    localCache[key] = value;
    try {
      if (AsyncStorage && typeof AsyncStorage.setItem === 'function') {
        await AsyncStorage.setItem(key, value);
      }
    } catch (e) {
      console.log('AsyncStorage.setItem fallback:', e.message);
    }
  },
  removeItem: async (key) => {
    delete localCache[key];
    try {
      if (AsyncStorage && typeof AsyncStorage.removeItem === 'function') {
        await AsyncStorage.removeItem(key);
      }
    } catch (e) {
      console.log('AsyncStorage.removeItem fallback:', e.message);
    }
  }
};

const getBaseUrl = () => {
  // Use live production Railway backend URL matching Web App
  return process.env.EXPO_PUBLIC_API_URL || 'https://doorloop-backend-production-5d5d.up.railway.app/api/v1';
};

const BASE_URL = getBaseUrl();

let isRefreshing = false;
let refreshPromise = null;

async function handleUnauthorized(logoutFn, refreshFn) {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  if (typeof refreshFn === 'function') {
    refreshPromise = refreshFn();
  } else {
    refreshPromise = Promise.resolve(false);
  }

  try {
    const success = await refreshPromise;
    if (!success && typeof logoutFn === 'function') {
      logoutFn();
      return false;
    }
    return true;
  } finally {
    isRefreshing = false;
    refreshPromise = null;
  }
}

async function handleResponseError(response) {
  let message = 'API request failed';
  let code = 'API_ERROR';
  let details = undefined;
  
  try {
    const errData = await response.json();
    if (errData) {
      if (errData.error && typeof errData.error === 'object') {
        message = errData.error.message || message;
        code = errData.error.code || code;
        details = errData.error.details || details;
      } else if (errData.message) {
        message = errData.message;
      } else if (typeof errData.error === 'string') {
        message = errData.error;
      }
    }
  } catch (e) {
    // Ignore JSON parsing failure
  }

  const err = new Error(message);
  err.status = response.status;
  err.code = code;
  err.details = details;
  throw err;
}

export const apiClient = {
  getHeaders: async () => {
    const userStr = await safeStorage.getItem('user');
    const token = userStr ? JSON.parse(userStr).token : null;
    const language = (await safeStorage.getItem('language')) || 'en';
    return {
      'Content-Type': 'application/json',
      'Accept-Language': language,
      'x-language': language,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  },

  getAuthHeaders: async () => {
    const userStr = await safeStorage.getItem('user');
    const token = userStr ? JSON.parse(userStr).token : null;
    const language = (await safeStorage.getItem('language')) || 'en';
    return {
      'Accept-Language': language,
      'x-language': language,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  },

  get: async (url, logoutFn, refreshFn) => {
    try {
      const headers = await apiClient.getHeaders();
      let response = await fetch(`${BASE_URL}${url}`, {
        method: 'GET',
        headers,
      });

      if (response.status === 401) {
        const refreshed = await handleUnauthorized(logoutFn, refreshFn);
        if (refreshed) {
          const newHeaders = await apiClient.getHeaders();
          response = await fetch(`${BASE_URL}${url}`, {
            method: 'GET',
            headers: newHeaders,
          });
        }
      }

      if (!response.ok) {
        await handleResponseError(response);
      }
      return await response.json();
    } catch (e) {
      console.log(`GET ${url} error:`, e.message);
      throw e;
    }
  },

  post: async (url, data, logoutFn, refreshFn) => {
    try {
      const isFormData = data instanceof FormData;
      const headers = isFormData ? await apiClient.getAuthHeaders() : await apiClient.getHeaders();

      let response = await fetch(`${BASE_URL}${url}`, {
        method: 'POST',
        headers,
        body: isFormData ? data : JSON.stringify(data),
      });

      if (response.status === 401) {
        const refreshed = await handleUnauthorized(logoutFn, refreshFn);
        if (refreshed) {
          const newHeaders = isFormData ? await apiClient.getAuthHeaders() : await apiClient.getHeaders();
          response = await fetch(`${BASE_URL}${url}`, {
            method: 'POST',
            headers: newHeaders,
            body: isFormData ? data : JSON.stringify(data),
          });
        }
      }

      if (!response.ok) {
        await handleResponseError(response);
      }
      return await response.json();
    } catch (e) {
      console.log(`POST ${url} error:`, e.message);
      throw e;
    }
  },

  put: async (url, data, logoutFn, refreshFn) => {
    try {
      const isFormData = data instanceof FormData;
      const headers = isFormData ? await apiClient.getAuthHeaders() : await apiClient.getHeaders();

      let response = await fetch(`${BASE_URL}${url}`, {
        method: 'PUT',
        headers,
        body: isFormData ? data : data ? JSON.stringify(data) : undefined,
      });

      if (response.status === 401) {
        const refreshed = await handleUnauthorized(logoutFn, refreshFn);
        if (refreshed) {
          const newHeaders = isFormData ? await apiClient.getAuthHeaders() : await apiClient.getHeaders();
          response = await fetch(`${BASE_URL}${url}`, {
            method: 'PUT',
            headers: newHeaders,
            body: isFormData ? data : data ? JSON.stringify(data) : undefined,
          });
        }
      }

      if (!response.ok) {
        await handleResponseError(response);
      }
      return await response.json();
    } catch (e) {
      console.log(`PUT ${url} error:`, e.message);
      throw e;
    }
  },

  delete: async (url, logoutFn, refreshFn) => {
    try {
      const headers = await apiClient.getHeaders();
      let response = await fetch(`${BASE_URL}${url}`, {
        method: 'DELETE',
        headers,
      });

      if (response.status === 401) {
        const refreshed = await handleUnauthorized(logoutFn, refreshFn);
        if (refreshed) {
          const newHeaders = await apiClient.getHeaders();
          response = await fetch(`${BASE_URL}${url}`, {
            method: 'DELETE',
            headers: newHeaders,
          });
        }
      }

      if (!response.ok) {
        await handleResponseError(response);
      }
      return await response.json();
    } catch (e) {
      console.log(`DELETE ${url} error:`, e.message);
      throw e;
    }
  },
};

export default apiClient;
