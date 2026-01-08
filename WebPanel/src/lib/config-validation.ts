// 3x-ui Inbound Validation
// Based on INBOUND_VALIDATION_DOCUMENTATION.md

// ============= PROTOCOL DEFINITIONS =============

export type Protocol = 'vmess' | 'vless' | 'trojan' | 'shadowsocks' | 'tunnel' | 'mixed' | 'http' | 'wireguard';
export type StreamingProtocol = 'vmess' | 'vless' | 'trojan' | 'shadowsocks';
export type Transport = 'tcp' | 'kcp' | 'ws' | 'grpc' | 'httpupgrade' | 'xhttp';
export type Security = 'none' | 'tls' | 'reality';
export type Flow = string; // '' | 'xtls-rprx-vision' | 'xtls-rprx-vision-udp443'

// Shadowsocks methods
export type ShadowsocksMethod = 
  | 'aes-256-gcm'
  | 'chacha20-poly1305'
  | 'chacha20-ietf-poly1305'
  | 'xchacha20-ietf-poly1305'
  | '2022-blake3-aes-128-gcm'
  | '2022-blake3-aes-256-gcm'
  | '2022-blake3-chacha20-poly1305';

// uTLS Fingerprints
export type Fingerprint = 
  | 'chrome' | 'firefox' | 'safari' | 'ios' | 'android' 
  | 'edge' | '360' | 'qq' | 'random' | 'randomized' | 'randomizednoalpn' | 'unsafe';

// ALPN Options
export type ALPN = 'h3' | 'h2' | 'http/1.1';

// KCP Header Types
export type KcpHeaderType = 'none' | 'srtp' | 'utp' | 'wechat-video' | 'dtls' | 'wireguard' | 'dns';

// TCP Header Types
export type TcpHeaderType = 'none' | 'http';

// XHTTP Mode
export type XhttpMode = 'auto' | 'packet-up' | 'stream-up' | 'stream-one';

// VMESS Client Security
export type VmessSecurity = 'aes-128-gcm' | 'chacha20-poly1305' | 'auto' | 'none' | 'zero';

// ============= CONSTANTS =============

export const PROTOCOLS: Protocol[] = ['vmess', 'vless', 'trojan', 'shadowsocks', 'tunnel', 'mixed', 'http', 'wireguard'];
export const STREAMING_PROTOCOLS: StreamingProtocol[] = ['vmess', 'vless', 'trojan', 'shadowsocks'];
export const TRANSPORTS: Transport[] = ['tcp', 'kcp', 'ws', 'grpc', 'httpupgrade', 'xhttp'];

export const FLOWS: { value: string; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'xtls-rprx-vision', label: 'xtls-rprx-vision' },
  { value: 'xtls-rprx-vision-udp443', label: 'xtls-rprx-vision-udp443' }
];

export const SHADOWSOCKS_METHODS: ShadowsocksMethod[] = [
  'aes-256-gcm',
  'chacha20-poly1305',
  'chacha20-ietf-poly1305',
  'xchacha20-ietf-poly1305',
  '2022-blake3-aes-128-gcm',
  '2022-blake3-aes-256-gcm',
  '2022-blake3-chacha20-poly1305'
];

export const FINGERPRINTS: Fingerprint[] = [
  'chrome', 'firefox', 'safari', 'ios', 'android',
  'edge', '360', 'qq', 'random', 'randomized', 'randomizednoalpn', 'unsafe'
];

export const ALPN_OPTIONS: ALPN[] = ['h3', 'h2', 'http/1.1'];

export const KCP_HEADER_TYPES: KcpHeaderType[] = ['none', 'srtp', 'utp', 'wechat-video', 'dtls', 'wireguard', 'dns'];

export const TCP_HEADER_TYPES: TcpHeaderType[] = ['none', 'http'];

export const XHTTP_MODES: XhttpMode[] = ['auto', 'packet-up', 'stream-up', 'stream-one'];

export const VMESS_SECURITY_OPTIONS: VmessSecurity[] = ['aes-128-gcm', 'chacha20-poly1305', 'auto', 'none', 'zero'];

// ============= VALIDATION INTERFACES =============

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ConfigValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// Default Reality targets from 3x-ui
export const REALITY_TARGETS = [
  { target: 'www.icloud.com:443', sni: 'www.icloud.com,icloud.com' },
  { target: 'www.apple.com:443', sni: 'www.apple.com,apple.com' },
  { target: 'www.tesla.com:443', sni: 'www.tesla.com,tesla.com' },
  { target: 'www.sony.com:443', sni: 'www.sony.com,sony.com' },
  { target: 'www.nvidia.com:443', sni: 'www.nvidia.com,nvidia.com' },
  { target: 'www.amd.com:443', sni: 'www.amd.com,amd.com' },
  { target: 'azure.microsoft.com:443', sni: 'azure.microsoft.com,www.azure.com' },
  { target: 'aws.amazon.com:443', sni: 'aws.amazon.com,amazon.com' },
  { target: 'www.bing.com:443', sni: 'www.bing.com,bing.com' },
  { target: 'www.oracle.com:443', sni: 'www.oracle.com,oracle.com' },
  { target: 'www.intel.com:443', sni: 'www.intel.com,intel.com' },
  { target: 'www.microsoft.com:443', sni: 'www.microsoft.com,microsoft.com' },
  { target: 'www.amazon.com:443', sni: 'www.amazon.com,amazon.com' }
];

export interface TemplateConfig {
  tag: string;
  protocol: Protocol;
  transport: Transport;
  security: Security;
  port?: number;
  
  // Protocol-specific
  flow?: Flow;
  ssMethod?: ShadowsocksMethod;
  
  // Transport settings
  path?: string;
  host?: string;
  serviceName?: string;
  headerType?: string;
  kcpSeed?: string;
  xhttpMode?: XhttpMode;
  
  // TLS settings
  sni?: string;
  alpn?: ALPN[];
  fingerprint?: Fingerprint;
  allowInsecure?: boolean;
  
  // Reality settings
  realityDest?: string;
  realityServerNames?: string;
  realityPrivateKey?: string;
  realityPublicKey?: string;
  realityShortIds?: string;
  realitySpiderX?: string;
  realityShow?: boolean;
  realityXver?: number;
  realityMaxTimediff?: number;
  realityMinClientVer?: string;
  realityMaxClientVer?: string;
}

// ============= 3X-UI CORE VALIDATION LOGIC =============
// From inbound.js: canEnableTls(), canEnableReality(), canEnableTlsFlow(), canEnableStream()

/**
 * canEnableStream - Determines if Stream Settings are available
 * Only streaming protocols support transport/security settings
 */
export function canEnableStream(protocol: Protocol): boolean {
  return STREAMING_PROTOCOLS.includes(protocol as StreamingProtocol);
}

/**
 * canEnableTls - Determines if TLS security option is available
 * Protocols: vmess, vless, trojan, shadowsocks
 * Networks: tcp, ws, http(grpc), grpc, httpupgrade, xhttp (NOT kcp)
 */
export function canEnableTls(protocol: Protocol, transport: Transport): boolean {
  if (!(['vmess', 'vless', 'trojan', 'shadowsocks'] as Protocol[]).includes(protocol)) {
    return false;
  }
  return ['tcp', 'ws', 'grpc', 'httpupgrade', 'xhttp'].includes(transport);
}

/**
 * canEnableReality - Determines if Reality security option is available
 * Protocols: vless, trojan ONLY (NOT vmess, NOT shadowsocks)
 * Networks: tcp, http(grpc), grpc, xhttp (NOT ws, NOT httpupgrade, NOT kcp)
 */
export function canEnableReality(protocol: Protocol, transport: Transport): boolean {
  if (!(['vless', 'trojan'] as Protocol[]).includes(protocol)) {
    return false;
  }
  return ['tcp', 'grpc', 'xhttp'].includes(transport);
}

/**
 * canEnableTlsFlow - Determines if Flow control is available
 * ONLY when ALL conditions are met:
 * 1. Protocol = vless
 * 2. Security = tls OR reality
 * 3. Network = tcp
 */
export function canEnableTlsFlow(protocol: Protocol, transport: Transport, security: Security): boolean {
  if (protocol !== 'vless') return false;
  if (transport !== 'tcp') return false;
  if (security !== 'tls' && security !== 'reality') return false;
  return true;
}

/**
 * Check if Shadowsocks method supports multi-user mode
 * ALL methods support multi-user EXCEPT 2022-blake3-chacha20-poly1305
 */
export function isSsMultiUser(method: ShadowsocksMethod): boolean {
  return method !== '2022-blake3-chacha20-poly1305';
}

/**
 * Check if Shadowsocks method is a 2022 method (requires base64 key)
 */
export function isSs2022(method: ShadowsocksMethod): boolean {
  return method.startsWith('2022');
}

// ============= VALID OPTIONS HELPER =============

export interface ValidOptions {
  // Protocol capabilities
  supportsStream: boolean;
  
  // Available security options for dropdown
  securityOptions: Security[];
  
  // Field visibility
  showTransportSettings: boolean;
  showTlsSettings: boolean;
  showRealitySettings: boolean;
  showFlowField: boolean;
  showSsMethod: boolean;
  
  // Transport-specific fields
  showPathField: boolean;
  showHostField: boolean;
  showServiceName: boolean;
  showTcpHeaderType: boolean;
  showKcpSettings: boolean;
  showXhttpMode: boolean;
  
  // Available options for current transport
  headerTypes: string[];
  
  // Dynamic labels
  pathLabel: string;
  hostLabel: string;
}

/**
 * Get valid options based on current protocol + transport + security
 * Used to dynamically show/hide fields and filter dropdown options
 */
export function getValidOptions(config: Partial<TemplateConfig>): ValidOptions {
  const { protocol = 'vless', transport = 'tcp', security = 'none' } = config;

  const supportsStream = canEnableStream(protocol);

  // Build security options based on protocol + transport
  const securityOptions: Security[] = ['none'];
  if (supportsStream && canEnableTls(protocol, transport)) {
    securityOptions.push('tls');
  }
  if (supportsStream && canEnableReality(protocol, transport)) {
    securityOptions.push('reality');
  }

  // Transport-specific visibility
  const isTcp = transport === 'tcp';
  const isKcp = transport === 'kcp';
  const isWs = transport === 'ws';
  const isGrpc = transport === 'grpc';
  const isHttpUpgrade = transport === 'httpupgrade';
  const isXhttp = transport === 'xhttp';

  return {
    supportsStream,
    securityOptions,
    
    // Show transport settings only for streaming protocols
    showTransportSettings: supportsStream,
    
    // TLS settings shown when security === 'tls'
    showTlsSettings: supportsStream && security === 'tls',
    
    // Reality settings shown when security === 'reality'
    showRealitySettings: supportsStream && security === 'reality',
    
    // Flow shown only for VLESS + TCP + (TLS/Reality)
    showFlowField: canEnableTlsFlow(protocol, transport, security),
    
    // Shadowsocks method shown only for shadowsocks protocol
    showSsMethod: protocol === 'shadowsocks',
    
    // Path field: ws, httpupgrade, xhttp
    showPathField: isWs || isHttpUpgrade || isXhttp,
    
    // Host field: ws, httpupgrade, xhttp
    showHostField: isWs || isHttpUpgrade || isXhttp,
    
    // Service name for gRPC
    showServiceName: isGrpc,
    
    // TCP header type
    showTcpHeaderType: isTcp,
    
    // KCP settings (header + seed)
    showKcpSettings: isKcp,
    
    // XHTTP mode
    showXhttpMode: isXhttp,
    
    // Header types based on transport
    headerTypes: isTcp ? TCP_HEADER_TYPES : (isKcp ? KCP_HEADER_TYPES : []),
    
    // Dynamic labels
    pathLabel: 'Path',
    hostLabel: 'Host'
  };
}

// ============= MAIN VALIDATION =============

export function validateTemplateConfig(config: TemplateConfig): ConfigValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const validOptions = getValidOptions(config);

  // 1. Tag validation
  if (!config.tag || config.tag.trim() === '') {
    errors.push({
      field: 'tag',
      message: 'Tag is required',
      severity: 'error'
    });
  }

  // 2. Port validation
  if (config.port !== undefined) {
    if (config.port < 1 || config.port > 65535) {
      errors.push({
        field: 'port',
        message: 'Port must be between 1 and 65535',
        severity: 'error'
      });
    }
  }

  // 3. Stream settings validation (only for streaming protocols)
  if (canEnableStream(config.protocol)) {
    // Security validation
    if (config.security === 'tls' && !canEnableTls(config.protocol, config.transport)) {
      errors.push({
        field: 'security',
        message: `TLS is not available for ${config.protocol.toUpperCase()} with ${config.transport.toUpperCase()}`,
        severity: 'error'
      });
    }

    if (config.security === 'reality' && !canEnableReality(config.protocol, config.transport)) {
      if (!['vless', 'trojan'].includes(config.protocol)) {
        errors.push({
          field: 'security',
          message: `Reality is only available for VLESS and TROJAN protocols`,
          severity: 'error'
        });
      } else {
        errors.push({
          field: 'security',
          message: `Reality is not available with ${config.transport.toUpperCase()} transport`,
          severity: 'error'
        });
      }
    }

    // 4. Flow validation - only for VLESS + TCP + TLS/Reality
    if (config.flow && config.flow !== 'none' && config.flow !== '') {
      if (!canEnableTlsFlow(config.protocol, config.transport, config.security)) {
        errors.push({
          field: 'flow',
          message: 'Flow requires VLESS + TCP + TLS/Reality',
          severity: 'error'
        });
      }
    }

    // 5. Path validation for transports that need it
    if (['ws', 'httpupgrade', 'xhttp'].includes(config.transport)) {
      if (config.path && !config.path.startsWith('/')) {
        errors.push({
          field: 'path',
          message: 'Path must start with "/"',
          severity: 'error'
        });
      }
    }
  }

  // 6. Shadowsocks method validation
  if (config.protocol === 'shadowsocks' && !config.ssMethod) {
    errors.push({
      field: 'ssMethod',
      message: 'Encryption method is required for Shadowsocks',
      severity: 'error'
    });
  }

  // 7. Reality validation
  if (config.security === 'reality') {
    if (!config.realityDest || config.realityDest.trim() === '') {
      errors.push({
        field: 'realityDest',
        message: 'Destination is required for Reality',
        severity: 'error'
      });
    }

    if (!config.realityServerNames || config.realityServerNames.trim() === '') {
      errors.push({
        field: 'realityServerNames',
        message: 'Server Names are required for Reality',
        severity: 'error'
      });
    }

    if (!config.realityPrivateKey || config.realityPrivateKey.trim() === '') {
      errors.push({
        field: 'realityPrivateKey',
        message: 'Private Key is required for Reality',
        severity: 'error'
      });
    }

    if (!config.realityPublicKey || config.realityPublicKey.trim() === '') {
      errors.push({
        field: 'realityPublicKey',
        message: 'Public Key is required for Reality',
        severity: 'error'
      });
    }

    // ShortIds are optional, but validate format if provided
    if (config.realityShortIds && config.realityShortIds.trim() !== '') {
      // Validate ShortId format (hex, 0-16 chars, empty string allowed)
      const ids = config.realityShortIds.split(',').map(s => s.trim());
      for (const id of ids) {
        if (id !== '' && !/^[0-9a-fA-F]{1,16}$/.test(id)) {
          warnings.push({
            field: 'realityShortIds',
            message: `Short ID "${id}" should be 0-16 hex characters`,
            severity: 'warning'
          });
        }
      }
    }

    if (!config.fingerprint) {
      warnings.push({
        field: 'fingerprint',
        message: 'Fingerprint is recommended for Reality',
        severity: 'warning'
      });
    }
  }

  // 8. TLS validation
  if (config.security === 'tls') {
    if (!config.sni || config.sni.trim() === '') {
      warnings.push({
        field: 'sni',
        message: 'SNI is recommended for TLS',
        severity: 'warning'
      });
    }
  }

  // 9. Protocol-specific warnings
  if (config.protocol === 'trojan' && config.security === 'none') {
    warnings.push({
      field: 'security',
      message: 'Trojan without TLS/Reality is insecure',
      severity: 'warning'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// ============= HELPER FUNCTIONS =============

/**
 * Generate a suggested tag based on protocol + transport + security
 */
export function generateSuggestedTag(config: Partial<TemplateConfig>): string {
  const parts: string[] = [];
  
  if (config.protocol) {
    parts.push(config.protocol.toUpperCase());
  }
  
  if (config.transport) {
    parts.push(config.transport.toUpperCase());
  }
  
  if (config.security && config.security !== 'none') {
    parts.push(config.security.toUpperCase());
  }
  
  return parts.join(' ') || 'New Template';
}

/**
 * Get the valid security for current protocol + transport
 * Used for auto-resetting security when protocol/transport changes
 */
export function getValidSecurity(protocol: Protocol, transport: Transport, currentSecurity: Security): Security {
  // Non-streaming protocols always get 'none'
  if (!canEnableStream(protocol)) {
    return 'none';
  }
  
  if (currentSecurity === 'tls' && !canEnableTls(protocol, transport)) {
    return 'none';
  }
  if (currentSecurity === 'reality' && !canEnableReality(protocol, transport)) {
    // If reality not supported but TLS is, fallback to TLS
    if (canEnableTls(protocol, transport)) {
      return 'tls';
    }
    return 'none';
  }
  return currentSecurity;
}

/**
 * Get the valid flow for current settings
 * Used for auto-resetting flow when protocol/transport/security changes
 */
export function getValidFlow(protocol: Protocol, transport: Transport, security: Security, currentFlow: string): string {
  if (!canEnableTlsFlow(protocol, transport, security)) {
    return 'none';
  }
  return currentFlow;
}
