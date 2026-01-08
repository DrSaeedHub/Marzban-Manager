/**
 * API Client
 * 
 * Base HTTP client for all API requests.
 * Uses config.apiBaseUrl - never hard-codes URLs.
 */

import { config } from '@/lib/config';

// ============= Error Classes =============

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public detail: string,
    public code?: string
  ) {
    super(detail);
    this.name = 'ApiClientError';
  }
}

// ============= Types =============

interface ApiErrorResponse {
  detail: string;
  code?: string;
}

// Backend response envelope
interface ApiResponseEnvelope<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    request_id?: string;
  };
}

// ============= API Client Class =============

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = config.apiBaseUrl;
    this.token = localStorage.getItem('auth_token');
  }

  /**
   * Get current auth token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Set or clear auth token
   */
  setToken(token: string | null): void {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.token !== null;
  }

  /**
   * Internal request method with error handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: AbortSignal.timeout(30000), // 30s timeout
      });

      // Handle empty responses (e.g., 204 No Content)
      if (response.status === 204) {
        return {} as T;
      }

      if (!response.ok) {
        let errorMessage: string;
        let errorCode: string | undefined;
        
        try {
          const error = await response.json();
          
          // Handle Pydantic validation errors (422) where detail is an array
          if (response.status === 422 && Array.isArray(error.detail)) {
            errorMessage = error.detail
              .map((e: { loc?: string[]; msg: string }) => {
                const field = e.loc?.slice(-1)[0] || 'field';
                return `${field}: ${e.msg}`;
              })
              .join('; ');
          } else {
            errorMessage = typeof error.detail === 'string' ? error.detail : 'Unknown error occurred';
            errorCode = error.code;
          }
        } catch {
          errorMessage = 'Unknown error occurred';
        }
        
        throw new ApiClientError(response.status, errorMessage, errorCode);
      }

      // Handle responses that might be empty
      const text = await response.text();
      if (!text) {
        return {} as T;
      }

      const json = JSON.parse(text);
      
      // Unwrap backend response envelope { success, data, error }
      if (json && typeof json === 'object' && 'success' in json) {
        const envelope = json as ApiResponseEnvelope<T>;
        
        // Check for error in envelope
        if (!envelope.success && envelope.error) {
          throw new ApiClientError(
            response.status,
            envelope.error.message || 'Request failed',
            envelope.error.code
          );
        }
        
        // Return unwrapped data
        if ('data' in envelope && envelope.data !== undefined) {
          return envelope.data as T;
        }
        
        // Return empty object for success without data
        return {} as T;
      }
      
      // If not an envelope, return as-is (backwards compatibility)
      return json as T;
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error;
      }
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new ApiClientError(0, 'Network error: Unable to connect to server');
      }
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        throw new ApiClientError(408, 'Request timeout');
      }
      throw new ApiClientError(0, 'An unexpected error occurred');
    }
  }

  /**
   * GET request
   */
  get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST request
   */
  post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  put<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * PATCH request
   */
  patch<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE request
   */
  delete<T>(endpoint: string, options?: { data?: unknown }): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      body: options?.data ? JSON.stringify(options.data) : undefined,
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
