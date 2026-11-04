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
  return process.env.EXPO_PUBLIC_API_URL || 'https://whatslandlord-backend-production.up.railway.app/api/v1';
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

function formatValidationErrorMessage(rawMessage, details) {
  const isValidation = (rawMessage && (rawMessage.toLowerCase().includes('payload') || rawMessage.toLowerCase().includes('validation failed')));
  if (!isValidation && (!details || !Array.isArray(details) || details.length === 0)) {
    return rawMessage;
  }

  if (Array.isArray(details) && details.length > 0) {
    const fieldNames = details.map((d) => {
      let f = d.field || (Array.isArray(d.path) ? d.path.join('.') : d.path) || '';
      if (typeof f === 'string') {
        f = f.replace(/^(body|query|params)\./i, '');
        f = f.replace(/([A-Z])/g, ' $1').replace(/[._]/g, ' ').trim();
        if (f) {
          f = f.charAt(0).toUpperCase() + f.slice(1);
        }
      }
      const msg = d.message && d.message.toLowerCase() !== 'required' ? ` (${d.message})` : '';
      return f ? `${f}${msg}` : d.message;
    }).filter(Boolean);

    if (fieldNames.length === 1) {
      return `Please fill the required field: ${fieldNames[0]}`;
    } else if (fieldNames.length > 1) {
      return `Please fill the required fields:\n• ${fieldNames.join('\n• ')}`;
    }
  }

  return 'Please fill all required input fields before submitting.';
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

  // Format validation errors into clean user-friendly field instructions
  const friendlyMessage = formatValidationErrorMessage(message, details);

  const err = new Error(friendlyMessage);
  err.status = response.status;
  err.code = code;
  err.details = details;
  // Provide Axios-compatible response object for screens checking e.response?.data
  err.response = {
    status: response.status,
    data: {
      message: friendlyMessage,
      error: { message: friendlyMessage, code, details },
      errors: Array.isArray(details) ? details : undefined,
    },
  };
  throw err;
}

const isNetworkResetError = (err) => {
  if (!err) return false;
  const msg = String(err.message || err).toLowerCase();
  return (
    msg.includes('connection reset') ||
    msg.includes('socketexception') ||
    msg.includes('network request failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('broken pipe') ||
    msg.includes('econnreset') ||
    msg.includes('econnrefused')
  );
};

async function fetchWithRetry(url, options, maxRetries = 2) {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      return await fetch(url, options);
    } catch (err) {
      attempt++;
      if (attempt > maxRetries || !isNetworkResetError(err)) {
        throw err;
      }
      // Small pause before retrying with fresh socket to recover from OkHttp connection pooling resets
      await new Promise((r) => setTimeout(r, attempt * 250));
    }
  }
}

let currentAuthToken = null;

export const setAuthToken = (token) => {
  currentAuthToken = token;
};

export const normalizeUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  const [pathname, query] = url.split('?');
  const queryStr = query ? `?${query}` : '';

  // 1. CRM Leads (Live backend mounts at /portal/crm/leads)
  if (pathname === '/crm/leads' || pathname === '/leads') {
    return `/portal/crm/leads${queryStr}`;
  }

  // 2. Notifications (Live backend mounts at /notifications)
  if (pathname === '/portal/notifications') {
    return `/notifications${queryStr}`;
  }

  // 3. Work Orders (Live backend mounts at /work-orders)
  if (pathname === '/portal/work-orders') {
    return `/work-orders${queryStr}`;
  }

  // 4. Leases (Live backend mounts at /leases)
  if (pathname === '/leasing/leases') {
    return `/leases${queryStr}`;
  }

  return url;
};

export const apiClient = {
  setAuthToken,
  normalizeUrl,

  getToken: async () => {
    try {
      const { useAuthStore } = require('../store/useStore');
      const storeUser = useAuthStore.getState()?.user;
      if (storeUser?.token || storeUser?.accessToken) {
        currentAuthToken = storeUser.token || storeUser.accessToken;
        return currentAuthToken;
      }
    } catch (e) {}

    if (currentAuthToken) return currentAuthToken;

    try {
      const userStr = await safeStorage.getItem('user');
      if (userStr) {
        const u = JSON.parse(userStr);
        if (u.token || u.accessToken) {
          currentAuthToken = u.token || u.accessToken;
          return currentAuthToken;
        }
      }
    } catch (e) {}

    return null;
  },

  getHeaders: async () => {
    const token = await apiClient.getToken();
    const language = (await safeStorage.getItem('language')) || 'en';
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Connection': 'close',
      'Accept-Language': language,
      'x-language': language,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  },

  getAuthHeaders: async () => {
    const token = await apiClient.getToken();
    const language = (await safeStorage.getItem('language')) || 'en';
    return {
      'Accept': 'application/json',
      'Connection': 'close',
      'Accept-Language': language,
      'x-language': language,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  },

  get: async (rawUrl, logoutFn, refreshFn) => {
    const url = normalizeUrl(rawUrl);
    try {
      const headers = await apiClient.getHeaders();
      let response = await fetchWithRetry(`${BASE_URL}${url}`, {
        method: 'GET',
        headers,
      });

      if (response.status === 401) {
        const refreshed = await handleUnauthorized(logoutFn, refreshFn);
        if (refreshed) {
          const newHeaders = await apiClient.getHeaders();
          response = await fetchWithRetry(`${BASE_URL}${url}`, {
            method: 'GET',
            headers: newHeaders,
          });
        }
      }

      // If 404, attempt transparent fallback before failing
      if (response.status === 404) {
        let fallbackUrl = null;
        if (url.startsWith('/portal/crm/leads')) {
          fallbackUrl = '/applications';
        } else if (url.startsWith('/notifications')) {
          fallbackUrl = '/portal/tenant/notifications';
        } else if (url.startsWith('/work-orders')) {
          fallbackUrl = '/portal/tenant/maintenance';
        } else if (url.startsWith('/leases')) {
          fallbackUrl = '/portal/tenant/leases';
        }

        if (fallbackUrl) {
          try {
            const fallbackHeaders = await apiClient.getHeaders();
            const fallbackRes = await fetchWithRetry(`${BASE_URL}${fallbackUrl}`, {
              method: 'GET',
              headers: fallbackHeaders,
            });
            if (fallbackRes.ok) {
              return await fallbackRes.json();
            }
          } catch (fallbackErr) {
            // proceed to standard response handling
          }
        }
      }

      if (!response.ok) {
        await handleResponseError(response);
      }
      return await response.json();
    } catch (e) {
      console.debug(`[API] GET ${rawUrl}:`, e.message);
      throw e;
    }
  },

  post: async (rawUrl, data, logoutFn, refreshFn) => {
    const url = normalizeUrl(rawUrl);
    try {
      const isFormData = data instanceof FormData;
      const headers = isFormData ? await apiClient.getAuthHeaders() : await apiClient.getHeaders();

      let response = await fetchWithRetry(`${BASE_URL}${url}`, {
        method: 'POST',
        headers,
        body: isFormData ? data : JSON.stringify(data),
      });

      if (response.status === 401) {
        const refreshed = await handleUnauthorized(logoutFn, refreshFn);
        if (refreshed) {
          const newHeaders = isFormData ? await apiClient.getAuthHeaders() : await apiClient.getHeaders();
          response = await fetchWithRetry(`${BASE_URL}${url}`, {
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
      console.log(`POST ${rawUrl} error:`, e.message);
      throw e;
    }
  },

  put: async (rawUrl, data, logoutFn, refreshFn) => {
    const url = normalizeUrl(rawUrl);
    try {
      const isFormData = data instanceof FormData;
      const headers = isFormData ? await apiClient.getAuthHeaders() : await apiClient.getHeaders();

      let response = await fetchWithRetry(`${BASE_URL}${url}`, {
        method: 'PUT',
        headers,
        body: isFormData ? data : data ? JSON.stringify(data) : undefined,
      });

      if (response.status === 401) {
        const refreshed = await handleUnauthorized(logoutFn, refreshFn);
        if (refreshed) {
          const newHeaders = isFormData ? await apiClient.getAuthHeaders() : await apiClient.getHeaders();
          response = await fetchWithRetry(`${BASE_URL}${url}`, {
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
      console.log(`PUT ${rawUrl} error:`, e.message);
      throw e;
    }
  },

  delete: async (rawUrl, logoutFn, refreshFn) => {
    const url = normalizeUrl(rawUrl);
    try {
      const headers = await apiClient.getHeaders();
      let response = await fetchWithRetry(`${BASE_URL}${url}`, {
        method: 'DELETE',
        headers,
      });

      if (response.status === 401) {
        const refreshed = await handleUnauthorized(logoutFn, refreshFn);
        if (refreshed) {
          const newHeaders = await apiClient.getHeaders();
          response = await fetchWithRetry(`${BASE_URL}${url}`, {
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
      console.log(`DELETE ${rawUrl} error:`, e.message);
      throw e;
    }
  },

  uploadFile: async (rawUrl, fileInput, options = {}, logoutFn, refreshFn) => {
    const url = normalizeUrl(rawUrl);
    const token = await apiClient.getToken();

    let uri = '';
    let rawFileName = '';
    let inputMimeType = '';

    if (typeof fileInput === 'string') {
      uri = fileInput;
    } else if (fileInput && typeof fileInput === 'object') {
      uri = fileInput.uri || '';
      rawFileName = fileInput.name || '';
      inputMimeType = fileInput.mimeType || fileInput.type || '';
    }

    const pathPart = uri.split('/').pop() || `doc_${Date.now()}`;
    const fileName = options.fileName || options.parameters?.name || rawFileName || pathPart;
    const ext = (fileName.split('.').pop() || pathPart.split('.').pop() || '').toLowerCase();

    let mimeType = inputMimeType || options.mimeType;
    if (!mimeType || mimeType === 'application/octet-stream') {
      if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
      else if (ext === 'png') mimeType = 'image/png';
      else if (ext === 'webp') mimeType = 'image/webp';
      else if (ext === 'gif') mimeType = 'image/gif';
      else if (ext === 'pdf') mimeType = 'application/pdf';
      else if (ext === 'csv') mimeType = 'text/csv';
      else if (ext === 'doc') mimeType = 'application/msword';
      else if (ext === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      else if (ext === 'xls') mimeType = 'application/vnd.ms-excel';
      else if (ext === 'xlsx') mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      else if (ext === 'txt') mimeType = 'text/plain';
      else mimeType = 'application/octet-stream';
    }

    // Use React Native's native FormData polyfill with XMLHttpRequest to bypass Expo's WinterCG fetch limitation
    const formData = new FormData();
    formData.append(options.fieldName || 'file', {
      uri,
      name: fileName,
      type: mimeType,
    });

    if (options.parameters) {
      Object.keys(options.parameters).forEach((key) => {
        const val = options.parameters[key];
        if (val !== undefined && val !== null && val !== '') {
          formData.append(key, String(val));
        }
      });
    }

    const doXhrUpload = (authToken) => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(options.method || 'POST', `${BASE_URL}${url}`);

        xhr.setRequestHeader('Accept', 'application/json');
        if (authToken) {
          xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
        }
        if (options.headers) {
          Object.keys(options.headers).forEach((h) => {
            if (h.toLowerCase() !== 'content-type') {
              xhr.setRequestHeader(h, options.headers[h]);
            }
          });
        }

        xhr.onload = () => {
          let responseData = xhr.response || xhr.responseText;
          try {
            responseData = JSON.parse(responseData);
          } catch (_) {}

          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(responseData);
          } else {
            let errorMsg = 'Upload failed';
            if (responseData) {
              if (responseData.error && typeof responseData.error === 'object') {
                errorMsg = responseData.error.message || errorMsg;
              } else if (responseData.message) {
                errorMsg = responseData.message;
              } else if (typeof responseData.error === 'string') {
                errorMsg = responseData.error;
              }
            }
            const err = new Error(errorMsg);
            err.status = xhr.status;
            err.response = responseData;
            reject(err);
          }
        };

        xhr.onerror = () => {
          reject(new Error('Network request failed during document upload'));
        };

        xhr.ontimeout = () => {
          reject(new Error('Document upload timed out'));
        };

        xhr.timeout = 60000;
        xhr.send(formData);
      });
    };

    try {
      return await doXhrUpload(token);
    } catch (err) {
      if (err.status === 401 && (logoutFn || refreshFn)) {
        const refreshed = await handleUnauthorized(logoutFn, refreshFn);
        if (refreshed) {
          const newToken = await apiClient.getToken();
          return await doXhrUpload(newToken);
        }
      }
      throw err;
    }
  },
};

export default apiClient;
