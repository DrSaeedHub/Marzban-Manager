/**
 * Panel Types
 */

export type PanelStatus = 'connected' | 'connecting' | 'error' | 'disabled';

export interface Panel {
    id: string;
    name: string;
    url: string;
    username: string;
    password?: string;
    status: PanelStatus;
    status_message?: string;
    last_sync: string | null;
    node_count: number;
    certificate: string | null;
}

// Request types
export interface CreatePanelRequest {
    name: string;
    url: string;
    username: string;
    password: string;
}

export interface UpdatePanelRequest {
    name?: string;
    url?: string;
    username?: string;
    password?: string;
}

export interface TestPanelConnectionRequest {
    url: string;
    username: string;
    password: string;
}

export interface TestPanelConnectionResponse {
    connected: boolean;
    panel_version?: string | null;
    admin_username?: string | null;
    error?: string | null;
}

export interface UpdatePanelCredentialsRequest {
    username?: string;
    password: string;
}

// Response types
export interface PanelCertificateResponse {
    certificate: string;
}
