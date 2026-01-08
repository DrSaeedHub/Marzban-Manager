// Mock data for Marzban Manager UI

export interface Panel {
  id: string;
  name: string;
  url: string;
  username: string;
  status: 'connected' | 'connecting' | 'error' | 'disabled';
  statusMessage?: string;
  lastSync: string | null;
  nodeCount: number;
  certificate: string | null;
}

export interface Node {
  id: number;
  name: string;
  address: string;
  port: number;
  api_port: number;
  status: 'connected' | 'connecting' | 'error' | 'disabled';
  xray_version: string | null;
  usage_coefficient: number;
  message: string | null;
  assignedTemplates: string[];
  uplink: number;
  downlink: number;
}

export interface Template {
  id: string;
  tag: string;
  protocol: 'vless' | 'vmess' | 'trojan' | 'shadowsocks';
  transport: string;
  security: 'none' | 'tls' | 'reality';
  port: number;
  usedByNodes: number;
  config: Record<string, unknown>;
}

export const mockPanels: Panel[] = [
  {
    id: "panel-1",
    name: "Germany Panel",
    url: "https://de.marzban.example.com",
    username: "admin",
    status: "connected",
    lastSync: "2024-01-08T14:32:00Z",
    nodeCount: 5,
    certificate: "-----BEGIN CERTIFICATE-----\nMIICpDCCAYwCCQDU+pQ4P3...\n-----END CERTIFICATE-----"
  },
  {
    id: "panel-2",
    name: "US Panel",
    url: "https://us.marzban.example.com",
    username: "admin",
    status: "connected",
    lastSync: "2024-01-08T14:30:00Z",
    nodeCount: 4,
    certificate: "-----BEGIN CERTIFICATE-----\nMIICpDCCAYwCCQDU+pQ4P4...\n-----END CERTIFICATE-----"
  },
  {
    id: "panel-3",
    name: "Singapore Panel",
    url: "https://sg.marzban.example.com",
    username: "admin",
    status: "error",
    statusMessage: "Authentication failed: Invalid credentials",
    lastSync: null,
    nodeCount: 3,
    certificate: null
  }
];

export const mockNodes: Record<string, Node[]> = {
  "panel-1": [
    {
      id: 1,
      name: "DE-Node-1",
      address: "185.123.45.67",
      port: 62050,
      api_port: 62051,
      status: "connected",
      xray_version: "1.8.4",
      usage_coefficient: 1.0,
      message: null,
      assignedTemplates: ["template-1", "template-2"],
      uplink: 134567890123,
      downlink: 1345678901234
    },
    {
      id: 2,
      name: "DE-Node-2",
      address: "185.123.45.68",
      port: 62050,
      api_port: 62051,
      status: "connected",
      xray_version: "1.8.4",
      usage_coefficient: 1.0,
      message: null,
      assignedTemplates: ["template-1"],
      uplink: 98765432100,
      downlink: 987654321000
    },
    {
      id: 3,
      name: "DE-Node-3",
      address: "185.123.45.69",
      port: 62050,
      api_port: 62051,
      status: "connecting",
      xray_version: null,
      usage_coefficient: 1.0,
      message: "Establishing connection...",
      assignedTemplates: [],
      uplink: 0,
      downlink: 0
    },
    {
      id: 4,
      name: "DE-Node-4",
      address: "185.123.45.70",
      port: 62050,
      api_port: 62051,
      status: "error",
      xray_version: null,
      usage_coefficient: 1.0,
      message: "Connection refused: Port 62050 not reachable",
      assignedTemplates: ["template-1"],
      uplink: 45678901234,
      downlink: 456789012345
    },
    {
      id: 5,
      name: "DE-Node-5",
      address: "185.123.45.71",
      port: 62050,
      api_port: 62051,
      status: "disabled",
      xray_version: null,
      usage_coefficient: 0.5,
      message: "Manually disabled",
      assignedTemplates: [],
      uplink: 12345678901,
      downlink: 123456789012
    }
  ],
  "panel-2": [
    {
      id: 6,
      name: "US-East-1",
      address: "45.67.89.101",
      port: 62050,
      api_port: 62051,
      status: "connected",
      xray_version: "1.8.4",
      usage_coefficient: 1.0,
      message: null,
      assignedTemplates: ["template-1", "template-3"],
      uplink: 234567890123,
      downlink: 2345678901234
    },
    {
      id: 7,
      name: "US-East-2",
      address: "45.67.89.102",
      port: 62050,
      api_port: 62051,
      status: "connected",
      xray_version: "1.8.4",
      usage_coefficient: 1.0,
      message: null,
      assignedTemplates: ["template-2"],
      uplink: 156789012345,
      downlink: 1567890123456
    },
    {
      id: 8,
      name: "US-West-1",
      address: "45.67.89.103",
      port: 62050,
      api_port: 62051,
      status: "connected",
      xray_version: "1.8.3",
      usage_coefficient: 1.5,
      message: null,
      assignedTemplates: ["template-1"],
      uplink: 89012345678,
      downlink: 890123456789
    },
    {
      id: 9,
      name: "US-West-2",
      address: "45.67.89.104",
      port: 62050,
      api_port: 62051,
      status: "connected",
      xray_version: "1.8.4",
      usage_coefficient: 1.0,
      message: null,
      assignedTemplates: [],
      uplink: 67890123456,
      downlink: 678901234567
    }
  ],
  "panel-3": [
    {
      id: 10,
      name: "SG-Node-1",
      address: "103.45.67.89",
      port: 62050,
      api_port: 62051,
      status: "error",
      xray_version: null,
      usage_coefficient: 1.0,
      message: "Panel authentication failed",
      assignedTemplates: ["template-1"],
      uplink: 0,
      downlink: 0
    },
    {
      id: 11,
      name: "SG-Node-2",
      address: "103.45.67.90",
      port: 62050,
      api_port: 62051,
      status: "error",
      xray_version: null,
      usage_coefficient: 1.0,
      message: "Panel authentication failed",
      assignedTemplates: [],
      uplink: 0,
      downlink: 0
    },
    {
      id: 12,
      name: "SG-Node-3",
      address: "103.45.67.91",
      port: 62050,
      api_port: 62051,
      status: "error",
      xray_version: null,
      usage_coefficient: 1.0,
      message: "Panel authentication failed",
      assignedTemplates: [],
      uplink: 0,
      downlink: 0
    }
  ]
};

export const mockTemplates: Template[] = [
  {
    id: "template-1",
    tag: "VLESS TCP REALITY",
    protocol: "vless",
    transport: "tcp",
    security: "reality",
    port: 443,
    usedByNodes: 6,
    config: {
      tag: "VLESS TCP REALITY",
      listen: "0.0.0.0",
      port: 443,
      protocol: "vless",
      settings: {
        clients: [],
        decryption: "none"
      },
      streamSettings: {
        network: "tcp",
        security: "reality",
        realitySettings: {
          show: false,
          dest: "www.xbox.com:443",
          xver: 0,
          serverNames: ["www.xbox.com", "xbox.com"],
          privateKey: "wNQXroPYAgtkRQBfjDzkewvXn8WW84O1hNZrOQVCeEw",
          shortIds: ["87cddfb6", "a1b2c3d4"]
        }
      }
    }
  },
  {
    id: "template-2",
    tag: "VLESS WS TLS",
    protocol: "vless",
    transport: "ws",
    security: "tls",
    port: 443,
    usedByNodes: 2,
    config: {
      tag: "VLESS WS TLS",
      listen: "0.0.0.0",
      port: 443,
      protocol: "vless",
      settings: {
        clients: [],
        decryption: "none"
      },
      streamSettings: {
        network: "ws",
        security: "tls",
        wsSettings: {
          path: "/vless",
          headers: {
            Host: "cdn.example.com"
          }
        },
        tlsSettings: {
          serverName: "cdn.example.com"
        }
      }
    }
  },
  {
    id: "template-3",
    tag: "VMess WS TLS",
    protocol: "vmess",
    transport: "ws",
    security: "tls",
    port: 443,
    usedByNodes: 2,
    config: {
      tag: "VMess WS TLS",
      listen: "0.0.0.0",
      port: 443,
      protocol: "vmess",
      settings: {
        clients: []
      },
      streamSettings: {
        network: "ws",
        security: "tls",
        wsSettings: {
          path: "/vmess",
          headers: {
            Host: "cdn.example.com"
          }
        },
        tlsSettings: {
          serverName: "cdn.example.com"
        }
      }
    }
  },
  {
    id: "template-4",
    tag: "Trojan WS TLS",
    protocol: "trojan",
    transport: "ws",
    security: "tls",
    port: 443,
    usedByNodes: 1,
    config: {
      tag: "Trojan WS TLS",
      listen: "0.0.0.0",
      port: 443,
      protocol: "trojan",
      settings: {
        clients: []
      },
      streamSettings: {
        network: "ws",
        security: "tls",
        wsSettings: {
          path: "/trojan-ws",
          headers: {
            Host: "cdn.example.com"
          }
        },
        tlsSettings: {
          serverName: "cdn.example.com"
        }
      }
    }
  },
  {
    id: "template-5",
    tag: "VLESS gRPC Reality",
    protocol: "vless",
    transport: "grpc",
    security: "reality",
    port: 443,
    usedByNodes: 0,
    config: {
      tag: "VLESS gRPC Reality",
      listen: "0.0.0.0",
      port: 443,
      protocol: "vless",
      settings: {
        clients: [],
        decryption: "none"
      },
      streamSettings: {
        network: "grpc",
        security: "reality",
        grpcSettings: {
          serviceName: "grpc-service"
        },
        realitySettings: {
          show: false,
          dest: "www.microsoft.com:443",
          serverNames: ["www.microsoft.com"],
          privateKey: "aBcDeFgHiJkLmNoPqRsTuVwXyZ123456789012345678",
          shortIds: ["abcd1234"]
        }
      }
    }
  },
  {
    id: "template-6",
    tag: "Shadowsocks TCP",
    protocol: "shadowsocks",
    transport: "tcp",
    security: "none",
    port: 8388,
    usedByNodes: 0,
    config: {
      tag: "Shadowsocks TCP",
      listen: "0.0.0.0",
      port: 8388,
      protocol: "shadowsocks",
      settings: {
        clients: [],
        network: "tcp,udp",
        method: "chacha20-poly1305"
      }
    }
  },
  {
    id: "template-7",
    tag: "VMess TCP None",
    protocol: "vmess",
    transport: "tcp",
    security: "none",
    port: 10086,
    usedByNodes: 0,
    config: {
      tag: "VMess TCP None",
      listen: "0.0.0.0",
      port: 10086,
      protocol: "vmess",
      settings: {
        clients: []
      },
      streamSettings: {
        network: "tcp",
        security: "none"
      }
    }
  },
  {
    id: "template-8",
    tag: "VLESS HTTP Upgrade TLS",
    protocol: "vless",
    transport: "httpupgrade",
    security: "tls",
    port: 443,
    usedByNodes: 0,
    config: {
      tag: "VLESS HTTP Upgrade TLS",
      listen: "0.0.0.0",
      port: 443,
      protocol: "vless",
      settings: {
        clients: [],
        decryption: "none"
      },
      streamSettings: {
        network: "httpupgrade",
        security: "tls",
        httpupgradeSettings: {
          path: "/upgrade",
          host: "cdn.example.com"
        },
        tlsSettings: {
          serverName: "cdn.example.com"
        }
      }
    }
  }
];

export const mockPanelConfig = {
  "panel-1": {
    log: {
      loglevel: "warning"
    },
    routing: {
      rules: [
        {
          ip: ["geoip:private"],
          outboundTag: "BLOCK",
          type: "field"
        }
      ]
    },
    inbounds: [
      {
        tag: "VLESS TCP REALITY",
        listen: "0.0.0.0",
        port: 443,
        protocol: "vless",
        settings: {
          clients: [],
          decryption: "none"
        },
        streamSettings: {
          network: "tcp",
          security: "reality",
          realitySettings: {
            show: false,
            dest: "www.xbox.com:443",
            xver: 0,
            serverNames: ["www.xbox.com"],
            privateKey: "wNQXroPYAgtkRQBfjDzkewvXn8WW84O1hNZrOQVCeEw",
            shortIds: ["87cddfb6"]
          }
        }
      },
      {
        tag: "VMess WS TLS",
        listen: "0.0.0.0",
        port: 8443,
        protocol: "vmess",
        settings: {
          clients: []
        },
        streamSettings: {
          network: "ws",
          security: "tls",
          wsSettings: {
            path: "/vmess",
            headers: {
              Host: "cdn.example.com"
            }
          },
          tlsSettings: {
            serverName: "cdn.example.com"
          }
        }
      }
    ],
    outbounds: [
      {
        protocol: "freedom",
        tag: "DIRECT"
      },
      {
        protocol: "blackhole",
        tag: "BLOCK"
      }
    ]
  }
};

// Helper functions
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatTimeAgo(dateString: string | null): string {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'connected': return 'status-connected';
    case 'connecting': return 'status-connecting';
    case 'error': return 'status-error';
    case 'disabled': return 'status-disabled';
    default: return 'status-disabled';
  }
}

export function getTotalNodes(): number {
  return Object.values(mockNodes).flat().length;
}

export function getConnectedNodes(): number {
  return Object.values(mockNodes).flat().filter(n => n.status === 'connected').length;
}
