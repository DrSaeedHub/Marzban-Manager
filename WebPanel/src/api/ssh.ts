/**
 * SSH Installation API Endpoints
 */

import { apiClient } from './client';
import type {
    SSHInstallRequest,
    SSHInstallStartResponse,
    SSHInstallStatusResponse,
} from '@/types';

// ============= SSH Installation =============

export const startSSHInstall = (
    panelId: string,
    data: SSHInstallRequest
): Promise<SSHInstallStartResponse> => {
    return apiClient.post(`/api/panels/${panelId}/nodes/ssh-install`, data);
};

export const getSSHInstallStatus = (jobId: string): Promise<SSHInstallStatusResponse> => {
    return apiClient.get(`/api/ssh-install/${jobId}/status`);
};
