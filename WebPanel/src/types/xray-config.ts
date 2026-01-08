/**
 * Xray Configuration Types
 */

// Simplified Xray config interface
export interface XrayConfig {
    log?: {
        loglevel?: string;
        access?: string;
        error?: string;
    };
    routing?: {
        rules?: Array<{
            type?: string;
            ip?: string[];
            domain?: string[];
            outboundTag?: string;
            inboundTag?: string[];
        }>;
    };
    inbounds?: Array<{
        tag?: string;
        listen?: string;
        port?: number;
        protocol?: string;
        settings?: Record<string, unknown>;
        streamSettings?: Record<string, unknown>;
        sniffing?: Record<string, unknown>;
    }>;
    outbounds?: Array<{
        tag?: string;
        protocol?: string;
        settings?: Record<string, unknown>;
    }>;
    [key: string]: unknown;
}

// Request/Response types
export interface GetXrayConfigResponse {
    config: XrayConfig;
}

export interface UpdateXrayConfigRequest {
    config: XrayConfig;
}

export interface UpdateXrayConfigResponse {
    success: boolean;
    message?: string;
}

export interface RestartXrayCoreResponse {
    success: boolean;
    message?: string;
}
