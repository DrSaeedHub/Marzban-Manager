/**
 * Template Types
 */

export type TemplateProtocol = 'vless' | 'vmess' | 'trojan' | 'shadowsocks';
export type TemplateSecurity = 'none' | 'tls' | 'reality';

export interface Template {
    id: string;
    tag: string;
    protocol: TemplateProtocol;
    transport: string;
    security: TemplateSecurity;
    port: number;
    used_by_nodes: number;
    config: Record<string, unknown>;
}

// Request types
export interface CreateTemplateRequest {
    tag: string;
    protocol: TemplateProtocol;
    transport: string;
    security: TemplateSecurity;
    port: number;
    config: Record<string, unknown>;
}

export interface UpdateTemplateRequest {
    tag?: string;
    protocol?: TemplateProtocol;
    transport?: string;
    security?: TemplateSecurity;
    port?: number;
    config?: Record<string, unknown>;
}
