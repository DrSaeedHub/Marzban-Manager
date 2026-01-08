/**
 * Template API Endpoints
 */

import { apiClient } from './client';
import type {
    Template,
    CreateTemplateRequest,
    UpdateTemplateRequest,
    SuccessResponse,
} from '@/types';

// ============= Templates CRUD =============

export const getTemplates = async (): Promise<Template[]> => {
    const response = await apiClient.get<{ templates: Template[] }>('/api/templates');
    return response.templates ?? [];
};

export const getTemplate = (id: string): Promise<Template> => {
    return apiClient.get(`/api/templates/${id}`);
};

export const createTemplate = (data: CreateTemplateRequest): Promise<Template> => {
    return apiClient.post('/api/templates', data);
};

export const updateTemplate = (id: string, data: UpdateTemplateRequest): Promise<Template> => {
    return apiClient.put(`/api/templates/${id}`, data);
};

export const deleteTemplate = (id: string): Promise<SuccessResponse> => {
    return apiClient.delete(`/api/templates/${id}`);
};

// ============= Template Actions =============

export const duplicateTemplate = (id: string): Promise<Template> => {
    return apiClient.post(`/api/templates/${id}/duplicate`);
};
