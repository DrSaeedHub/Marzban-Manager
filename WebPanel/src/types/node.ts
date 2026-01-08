/**
 * Node Types
 */

export type NodeStatus = 'connected' | 'connecting' | 'error' | 'disabled';

export interface Node {
    id: number;
    name: string;
    address: string;
    service_port: number;
    api_port: number;
    status: NodeStatus;
    xray_version: string | null;
    usage_coefficient: number;
    message?: string | null;
    assigned_templates: string[];
    uplink: number;
    downlink: number;
    ssh_profile_id?: number | null;
}

// Request types
export interface CreateNodeRequest {
    name: string;
    address: string;
    port: number;
    api_port: number;
    usage_coefficient?: number;
    add_as_new_host?: boolean;
}

export interface UpdateNodeRequest {
    name?: string;
    address?: string;
    port?: number;
    api_port?: number;
    usage_coefficient?: number;
}

export interface AssignTemplatesRequest {
    template_ids: string[];
}

// SSH Installation types
export interface SSHInstallRequest {
    ssh_host: string;
    ssh_port: number;
    ssh_username: string;
    ssh_password: string;
    node_name: string;
    service_port: number;
    api_port: number;
    install_docker: boolean;
    start_node: boolean;
    auto_ports?: boolean; // Let CLI auto-assign available ports
}

export interface SSHInstallStartResponse {
    job_id: string;
    status: 'pending';
}

export type SSHInstallJobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface SSHInstallStatusResponse {
    job_id: string;
    status: SSHInstallJobStatus;
    progress: number; // 0-100
    logs: string[];
    result?: {
        node_id: number;
        node_name: string;
        address: string;
        service_port: number;
        api_port: number;
        auto_ports_used?: boolean;
    };
    error?: string;
}

// Node logs
export interface NodeLogsResponse {
    logs: string[];
}

// Delete node options and response
export interface DeleteNodeOptions {
    delete_from_marzban: boolean;
    delete_from_server: boolean;
}

export interface DeleteNodeResponse {
    success: boolean;
    local: boolean;
    marzban?: boolean | null;
    server?: boolean | null;
    errors?: string[];
}
