/**
 * Xray Config API Endpoints
 */

import { apiClient } from './client';
import type {
    GetXrayConfigResponse,
    UpdateXrayConfigRequest,
    UpdateXrayConfigResponse,
    RestartXrayCoreResponse,
} from '@/types';

// ============= Xray Config =============

export const getXrayConfig = (panelId: string): Promise<GetXrayConfigResponse> => {
    return apiClient.get(`/api/panels/${panelId}/xray-config`);
};

export const updateXrayConfig = (
    panelId: string,
    data: UpdateXrayConfigRequest
): Promise<UpdateXrayConfigResponse> => {
    return apiClient.put(`/api/panels/${panelId}/xray-config`, data);
};

export const restartXrayCore = (panelId: string): Promise<RestartXrayCoreResponse> => {
    return apiClient.post(`/api/panels/${panelId}/xray-restart`);
};
