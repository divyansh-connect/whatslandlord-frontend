import { useAuthStore } from '../store/useStore';

const getBaseUrl = () => {
  return import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
};

const BASE_URL = getBaseUrl();

// Track if a token refresh is already in progress to avoid duplicate refreshes
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function handleUnauthorized(): Promise<boolean> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = useAuthStore.getState().refreshAccessToken();

  try {
    const success = await refreshPromise;
    if (!success) {
      // Refresh failed — force logout and redirect to login
      useAuthStore.getState().logout();
      window.location.href = '/login';
      return false;
    }
    return true;
  } finally {
    isRefreshing = false;
    refreshPromise = null;
  }
}

export const apiClient = {
  getHeaders: () => {
    const userStr = sessionStorage.getItem('user');
    const token = userStr ? JSON.parse(userStr).token : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  },

  getAuthHeaders: (): Record<string, string> => {
    const userStr = sessionStorage.getItem('user');
    const token = userStr ? JSON.parse(userStr).token : null;
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  },

  handleResponseError: async (response: Response) => {
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

    const err = new Error(message) as any;
    err.status = response.status;
    err.code = code;
    err.details = details;
    throw err;
  },

  get: async <T>(url: string): Promise<T> => {
    let response: Response | null = null;
    try {
      response = await fetch(`${BASE_URL}${url}`, {
        method: 'GET',
        headers: apiClient.getHeaders(),
      });
    } catch (e) {
      response = null;
    }

    // Try fallback to local backend if remote API returns 404 or connection fails
    if ((!response || response.status === 404) && !BASE_URL.includes('localhost:5000')) {
      try {
        const localResponse = await fetch(`http://localhost:5000/api/v1${url}`, {
          method: 'GET',
          headers: apiClient.getHeaders(),
        });
        if (localResponse.ok) {
          return localResponse.json();
        }
      } catch (e) {
        // Fallback failed, continue with main response handling
      }
    }

    if (response && response.status === 401) {
      const refreshed = await handleUnauthorized();
      if (refreshed) {
        response = await fetch(`${BASE_URL}${url}`, {
          method: 'GET',
          headers: apiClient.getHeaders(),
        });
      }
    }

    if (!response || !response.ok) {
      if (response) await apiClient.handleResponseError(response);
      throw new Error(`API request failed for ${url}`);
    }
    return response.json();
  },

  post: async <T>(url: string, data: any): Promise<T> => {
    const isFormData = data instanceof FormData;
    const headers: any = isFormData ? apiClient.getAuthHeaders() : apiClient.getHeaders();
    
    let response: Response | null = null;
    try {
      response = await fetch(`${BASE_URL}${url}`, {
        method: 'POST',
        headers,
        body: isFormData ? data : JSON.stringify(data),
      });
    } catch (e) {
      response = null;
    }

    // Try fallback to local backend if remote API returns 404 or connection fails
    if ((!response || response.status === 404) && !BASE_URL.includes('localhost:5000')) {
      try {
        const localResponse = await fetch(`http://localhost:5000/api/v1${url}`, {
          method: 'POST',
          headers,
          body: isFormData ? data : JSON.stringify(data),
        });
        if (localResponse.ok) {
          return localResponse.json();
        }
      } catch (e) {
        // Fallback failed
      }
    }

    if (response && response.status === 401 && !url.includes('/auth/login')) {
      const refreshed = await handleUnauthorized();
      if (refreshed) {
        response = await fetch(`${BASE_URL}${url}`, {
          method: 'POST',
          headers,
          body: isFormData ? data : JSON.stringify(data),
        });
      }
    }

    if (!response || !response.ok) {
      if (response) await apiClient.handleResponseError(response);
      throw new Error(`API request failed for ${url}`);
    }
    return response.json();
  },

  put: async <T>(url: string, data?: any): Promise<T> => {
    const isFormData = data instanceof FormData;
    const headers: any = isFormData ? apiClient.getAuthHeaders() : apiClient.getHeaders();

    let response = await fetch(`${BASE_URL}${url}`, {
      method: 'PUT',
      headers,
      body: isFormData ? data : data ? JSON.stringify(data) : undefined,
    });

    if (response.status === 401) {
      const refreshed = await handleUnauthorized();
      if (refreshed) {
        response = await fetch(`${BASE_URL}${url}`, {
          method: 'PUT',
          headers,
          body: isFormData ? data : data ? JSON.stringify(data) : undefined,
        });
      }
    }

    if (!response.ok) {
      await apiClient.handleResponseError(response);
    }
    return response.json();
  },

  patch: async <T>(url: string, data?: any): Promise<T> => {
    const isFormData = data instanceof FormData;
    const headers: any = isFormData ? apiClient.getAuthHeaders() : apiClient.getHeaders();

    let response = await fetch(`${BASE_URL}${url}`, {
      method: 'PATCH',
      headers,
      body: isFormData ? data : data ? JSON.stringify(data) : undefined,
    });

    if (response.status === 401) {
      const refreshed = await handleUnauthorized();
      if (refreshed) {
        response = await fetch(`${BASE_URL}${url}`, {
          method: 'PATCH',
          headers,
          body: isFormData ? data : data ? JSON.stringify(data) : undefined,
        });
      }
    }

    if (!response.ok) {
      await apiClient.handleResponseError(response);
    }
    return response.json();
  },

  delete: async <T>(url: string): Promise<T> => {
    let response = await fetch(`${BASE_URL}${url}`, {
      method: 'DELETE',
      headers: apiClient.getHeaders(),
    });

    if (response.status === 401) {
      const refreshed = await handleUnauthorized();
      if (refreshed) {
        response = await fetch(`${BASE_URL}${url}`, {
          method: 'DELETE',
          headers: apiClient.getHeaders(),
        });
      }
    }

    if (!response.ok) {
      await apiClient.handleResponseError(response);
    }
    return response.json();
  },
};
export default apiClient;
