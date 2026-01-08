/**
 * Common API Types
 */

// Generic API response wrapper
export interface ApiResponse<T> {
    data: T;
    message?: string;
}

// Pagination types
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

// Error response from API
export interface ApiErrorResponse {
    detail: string;
    code?: string;
}

// Dashboard statistics
export interface DashboardStats {
    total_panels: number;
    total_nodes: number;
    connected_nodes: number;
    total_templates: number;
}

// Generic success response
export interface SuccessResponse {
    success: boolean;
    message?: string;
}
