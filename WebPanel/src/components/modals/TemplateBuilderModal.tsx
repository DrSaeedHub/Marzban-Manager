import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { Template } from '@/types';
import { useCreateTemplate, useUpdateTemplate } from '@/hooks/use-templates';
import { 
  validateTemplateConfig, 
  getValidOptions, 
  generateSuggestedTag,
  getValidSecurity,
  getValidFlow,
  canEnableTlsFlow,
  canEnableStream,
  type TemplateConfig,
  type Protocol,
  type Transport,
  type Security,
  type Flow,
  type ShadowsocksMethod,
  type Fingerprint,
  type XhttpMode,
  STREAMING_PROTOCOLS,
  TRANSPORTS,
  FLOWS,
  SHADOWSOCKS_METHODS,
  FINGERPRINTS,
  ALPN_OPTIONS,
  KCP_HEADER_TYPES,
  TCP_HEADER_TYPES,
  XHTTP_MODES,
  REALITY_TARGETS
} from '@/lib/config-validation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Check, AlertTriangle, X, Sparkles, Info, AlertCircle, RefreshCw, Shuffle, ChevronDown, Copy, Upload, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { JsonViewer } from '@/components/common/JsonViewer';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TemplateBuilderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTemplate?: Template | null;
}

// Only streaming protocols for template builder
const protocols: Protocol[] = ['vless', 'vmess', 'trojan', 'shadowsocks'];
const transports = TRANSPORTS;

export function TemplateBuilderModal({ open, onOpenChange, editTemplate }: TemplateBuilderModalProps) {
  const isEditing = !!editTemplate;
  
  // API mutations
  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();
  const isPending = createMutation.isPending || updateMutation.isPending;
  
  // Core fields
  const [tag, setTag] = useState(editTemplate?.tag || '');
  const [port, setPort] = useState(editTemplate?.port?.toString() || '443');
  const [protocol, setProtocol] = useState<Protocol>((editTemplate?.protocol as Protocol) || 'vless');
  const [transport, setTransport] = useState<Transport>((editTemplate?.transport as Transport) || 'tcp');
  const [security, setSecurity] = useState<Security>((editTemplate?.security as Security) || 'reality');
  
  // Protocol settings
  const [flow, setFlow] = useState<string>('none');
  const [ssMethod, setSsMethod] = useState<ShadowsocksMethod>('2022-blake3-aes-256-gcm');
  
  // TLS settings
  const [sni, setSni] = useState('');
  const [fingerprint, setFingerprint] = useState<Fingerprint>('chrome');
  const [alpn, setAlpn] = useState<string[]>([]);
  
  // Reality settings
  const [dest, setDest] = useState('www.apple.com:443');
  const [serverNames, setServerNames] = useState('www.apple.com,apple.com');
  const [privateKey, setPrivateKey] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [shortIds, setShortIds] = useState('');
  const [spiderX, setSpiderX] = useState('/');
  const [realityShow, setRealityShow] = useState(false);
  const [realityXver, setRealityXver] = useState(0);
  const [realityMaxTimediff, setRealityMaxTimediff] = useState(0);
  const [realityMinClientVer, setRealityMinClientVer] = useState('');
  const [realityMaxClientVer, setRealityMaxClientVer] = useState('');
  
  // Transport settings
  const [path, setPath] = useState('/');
  const [host, setHost] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [tcpHeaderType, setTcpHeaderType] = useState<string>('none');
  const [kcpHeaderType, setKcpHeaderType] = useState<string>('none');
  const [kcpSeed, setKcpSeed] = useState('');
  const [xhttpMode, setXhttpMode] = useState<XhttpMode>('auto');
  
  // TCP HTTP Obfuscation settings
  const [tcpAcceptProxyProtocol, setTcpAcceptProxyProtocol] = useState(false);
  const [httpRequestVersion, setHttpRequestVersion] = useState('1.1');
  const [httpRequestMethod, setHttpRequestMethod] = useState('GET');
  const [httpRequestPath, setHttpRequestPath] = useState('/');
  const [httpRequestHost, setHttpRequestHost] = useState('');
  const [httpResponseVersion, setHttpResponseVersion] = useState('1.1');
  const [httpResponseStatus, setHttpResponseStatus] = useState('200');
  const [httpResponseReason, setHttpResponseReason] = useState('OK');
  
  // mKCP settings
  const [kcpMtu, setKcpMtu] = useState(1250);
  const [kcpTti, setKcpTti] = useState(50);
  const [kcpUplinkCapacity, setKcpUplinkCapacity] = useState(5);
  const [kcpDownlinkCapacity, setKcpDownlinkCapacity] = useState(20);
  const [kcpCongestion, setKcpCongestion] = useState(false);
  const [kcpReadBuffer, setKcpReadBuffer] = useState(2);
  const [kcpWriteBuffer, setKcpWriteBuffer] = useState(2);
  
  // WebSocket settings
  const [wsAcceptProxyProtocol, setWsAcceptProxyProtocol] = useState(false);
  const [wsHeartbeatPeriod, setWsHeartbeatPeriod] = useState(0);
  
  // gRPC settings
  const [grpcAuthority, setGrpcAuthority] = useState('');
  const [grpcMultiMode, setGrpcMultiMode] = useState(false);
  
  // HTTPUpgrade settings
  const [httpUpgradeAcceptProxyProtocol, setHttpUpgradeAcceptProxyProtocol] = useState(false);
  
  // XHTTP settings
  const [xhttpPaddingBytes, setXhttpPaddingBytes] = useState('100-1000');
  const [xhttpNoSSEHeader, setXhttpNoSSEHeader] = useState(false);
  const [xhttpMaxBufferedPosts, setXhttpMaxBufferedPosts] = useState(30);
  const [xhttpMaxEachPostBytes, setXhttpMaxEachPostBytes] = useState('1000000');
  const [xhttpStreamUpServerSecs, setXhttpStreamUpServerSecs] = useState('20-80');
  
  // Sniffing settings
  const [sniffingEnabled, setSniffingEnabled] = useState(true);
  const [sniffingDestOverride, setSniffingDestOverride] = useState<string[]>(['http', 'tls', 'quic', 'fakedns']);
  const [sniffingMetadataOnly, setSniffingMetadataOnly] = useState(false);
  const [sniffingRouteOnly, setSniffingRouteOnly] = useState(false);
  
  // TLS Certificate settings
  const [tlsMinVersion, setTlsMinVersion] = useState('1.2');
  const [tlsMaxVersion, setTlsMaxVersion] = useState('1.3');
  const [tlsCipherSuites, setTlsCipherSuites] = useState('');
  const [tlsAllowInsecure, setTlsAllowInsecure] = useState(false);
  const [tlsRejectUnknownSni, setTlsRejectUnknownSni] = useState(false);
  const [tlsDisableSystemRoot, setTlsDisableSystemRoot] = useState(false);
  const [tlsEnableSessionResumption, setTlsEnableSessionResumption] = useState(false);
  const [tlsCertUseFile, setTlsCertUseFile] = useState(true);
  const [tlsCertFile, setTlsCertFile] = useState('');
  const [tlsKeyFile, setTlsKeyFile] = useState('');
  const [tlsCertContent, setTlsCertContent] = useState('');
  const [tlsKeyContent, setTlsKeyContent] = useState('');
  const [tlsCertUsage, setTlsCertUsage] = useState<string>('encipherment');
  const [tlsOneTimeLoading, setTlsOneTimeLoading] = useState(false);
  
  // Sockopt settings
  const [sockoptTcpFastOpen, setSockoptTcpFastOpen] = useState(false);
  const [sockoptTcpFastOpenQueueLength, setSockoptTcpFastOpenQueueLength] = useState(256);
  const [sockoptTcpKeepAliveIdle, setSockoptTcpKeepAliveIdle] = useState(0);
  const [sockoptTcpKeepAliveInterval, setSockoptTcpKeepAliveInterval] = useState(0);
  const [sockoptTcpCongestion, setSockoptTcpCongestion] = useState('');
  const [sockoptTcpNoDelay, setSockoptTcpNoDelay] = useState(false);
  const [sockoptTcpMptcp, setSockoptTcpMptcp] = useState(false);
  const [sockoptMark, setSockoptMark] = useState(0);
  const [sockoptTproxy, setSockoptTproxy] = useState<'redirect' | 'tproxy' | 'off'>('off');
  const [sockoptAcceptProxyProtocol, setSockoptAcceptProxyProtocol] = useState(false);
  const [sockoptDomainStrategy, setSockoptDomainStrategy] = useState<'AsIs' | 'UseIP' | 'UseIPv4' | 'UseIPv6'>('AsIs');
  const [sockoptDialerProxy, setSockoptDialerProxy] = useState('');
  const [sockoptInterface, setSockoptInterface] = useState('');
  const [sockoptTcpWindowClamp, setSockoptTcpWindowClamp] = useState(0);
  const [sockoptTcpUserTimeout, setSockoptTcpUserTimeout] = useState(0);
  const [sockoptV6Only, setSockoptV6Only] = useState(false);
  
  // Fallback settings (for VLESS/Trojan)
  const [fallbacksEnabled, setFallbacksEnabled] = useState(false);
  const [fallbacks, setFallbacks] = useState<Array<{
    name?: string;
    alpn?: string;
    path?: string;
    dest: string;
    xver: number;
  }>>([]);
  
  // Response Headers (for HTTP obfuscation)
  const [httpResponseHeaders, setHttpResponseHeaders] = useState<Array<{key: string; value: string}>>([
    { key: 'Content-Type', value: 'application/octet-stream' },
    { key: 'Transfer-Encoding', value: 'chunked' },
    { key: 'Connection', value: 'keep-alive' }
  ]);
  
  // Request Headers (for HTTP obfuscation)
  const [httpRequestHeaders, setHttpRequestHeaders] = useState<Array<{key: string; value: string}>>([
    { key: 'User-Agent', value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    { key: 'Accept-Encoding', value: 'gzip, deflate' },
    { key: 'Connection', value: 'keep-alive' }
  ]);
  
  // Import JSON modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJson, setImportJson] = useState('');

  // Get valid options based on current selections
  const validOptions = useMemo(() => getValidOptions({
    protocol,
    transport,
    security
  }), [protocol, transport, security]);

  // Auto-reset security when protocol or transport changes
  useEffect(() => {
    const validSec = getValidSecurity(protocol, transport, security);
    if (validSec !== security) {
      setSecurity(validSec);
    }
  }, [protocol, transport]);

  // Auto-reset flow when it becomes invalid
  useEffect(() => {
    const validFlowVal = getValidFlow(protocol, transport, security, flow);
    if (validFlowVal !== flow) {
      setFlow(validFlowVal);
    }
  }, [protocol, transport, security]);

  // Build config object for validation
  const config: TemplateConfig = useMemo(() => ({
    tag,
    protocol,
    transport,
    security,
    port: parseInt(port) || 0,
    flow,
    ssMethod,
    path,
    host,
    serviceName,
    headerType: transport === 'tcp' ? tcpHeaderType : (transport === 'kcp' ? kcpHeaderType : undefined),
    kcpSeed,
    xhttpMode,
    sni,
    alpn: alpn.length > 0 ? alpn as any : undefined,
    fingerprint,
    realityDest: dest,
    realityServerNames: serverNames,
    realityPrivateKey: privateKey,
    realityPublicKey: publicKey,
    realityShortIds: shortIds,
    realitySpiderX: spiderX,
    realityShow,
    realityXver,
    realityMaxTimediff,
    realityMinClientVer,
    realityMaxClientVer
  }), [tag, protocol, transport, security, port, flow, ssMethod, path, host, serviceName, tcpHeaderType, kcpHeaderType, kcpSeed, xhttpMode, sni, alpn, fingerprint, dest, serverNames, privateKey, publicKey, shortIds, spiderX, realityShow, realityXver, realityMaxTimediff, realityMinClientVer, realityMaxClientVer]);

  // Validate config
  const validation = useMemo(() => validateTemplateConfig(config), [config]);

  const generateConfig = () => {
    const configObj: Record<string, unknown> = {
      tag,
      listen: "",
      port: parseInt(port),
      protocol,
      settings: {
        clients: [],
        ...(protocol === 'vless' && { 
          decryption: 'none',
          ...(flow && { fallbacks: [] })
        }),
        ...(protocol === 'shadowsocks' && { 
          method: ssMethod,
          password: '',
          network: 'tcp,udp'
        }),
        ...(protocol === 'trojan' && { fallbacks: [] }),
      },
      streamSettings: {
        network: transport,
        security,
        ...(transport === 'tcp' && {
          tcpSettings: {
            acceptProxyProtocol: tcpAcceptProxyProtocol,
            header: tcpHeaderType === 'http' ? {
              type: 'http',
              request: {
                version: httpRequestVersion,
                method: httpRequestMethod,
                path: httpRequestPath.split(',').map(p => p.trim()),
                headers: httpRequestHeaders.reduce((acc, h) => {
                  if (h.key && h.value) {
                    acc[h.key] = h.value.includes(',') ? h.value.split(',').map(v => v.trim()) : [h.value];
                  }
                  return acc;
                }, { Host: httpRequestHost ? httpRequestHost.split(',').map(h => h.trim()) : [] } as Record<string, string[]>)
              },
              response: {
                version: httpResponseVersion,
                status: httpResponseStatus,
                reason: httpResponseReason,
                headers: httpResponseHeaders.reduce((acc, h) => {
                  if (h.key && h.value) {
                    acc[h.key] = h.value.includes(',') ? h.value.split(',').map(v => v.trim()) : [h.value];
                  }
                  return acc;
                }, {} as Record<string, string[]>)
              }
            } : { type: 'none' }
          }
        }),
        ...(transport === 'kcp' && {
          kcpSettings: {
            mtu: kcpMtu,
            tti: kcpTti,
            uplinkCapacity: kcpUplinkCapacity,
            downlinkCapacity: kcpDownlinkCapacity,
            congestion: kcpCongestion,
            readBufferSize: kcpReadBuffer,
            writeBufferSize: kcpWriteBuffer,
            header: { type: kcpHeaderType },
            ...(kcpSeed && { seed: kcpSeed })
          }
        }),
        ...(transport === 'ws' && {
          wsSettings: {
            acceptProxyProtocol: wsAcceptProxyProtocol,
            path,
            ...(host && { host }),
            headers: host ? { Host: host } : {},
            heartbeatPeriod: wsHeartbeatPeriod
          }
        }),
        ...(transport === 'grpc' && {
          grpcSettings: {
            serviceName: serviceName || '',
            authority: grpcAuthority,
            multiMode: grpcMultiMode
          }
        }),
        ...(transport === 'httpupgrade' && {
          httpupgradeSettings: {
            acceptProxyProtocol: httpUpgradeAcceptProxyProtocol,
            path,
            ...(host && { host }),
            headers: {}
          }
        }),
        ...(transport === 'xhttp' && {
          xhttpSettings: {
            path,
            ...(host && { host }),
            headers: {},
            mode: xhttpMode,
            xPaddingBytes: xhttpPaddingBytes,
            noSSEHeader: xhttpNoSSEHeader,
            ...(xhttpMode === 'packet-up' && {
              scMaxBufferedPosts: xhttpMaxBufferedPosts,
              scMaxEachPostBytes: xhttpMaxEachPostBytes
            }),
            ...(xhttpMode === 'stream-up' && {
              scStreamUpServerSecs: xhttpStreamUpServerSecs
            })
          }
        }),
        ...(security === 'tls' && {
          tlsSettings: {
            serverName: sni || '',
            minVersion: tlsMinVersion,
            maxVersion: tlsMaxVersion,
            cipherSuites: tlsCipherSuites,
            rejectUnknownSni: tlsRejectUnknownSni,
            disableSystemRoot: tlsDisableSystemRoot,
            enableSessionResumption: tlsEnableSessionResumption,
            certificates: tlsCertUseFile ? [
              ...(tlsCertFile || tlsKeyFile ? [{
                certificateFile: tlsCertFile,
                keyFile: tlsKeyFile,
                oneTimeLoading: tlsOneTimeLoading,
                usage: tlsCertUsage
              }] : [])
            ] : [
              ...(tlsCertContent || tlsKeyContent ? [{
                certificate: tlsCertContent,
                key: tlsKeyContent,
                oneTimeLoading: tlsOneTimeLoading,
                usage: tlsCertUsage
              }] : [])
            ],
            ...(alpn.length > 0 && { alpn }),
            settings: {
              allowInsecure: tlsAllowInsecure,
              fingerprint: fingerprint || 'chrome'
            }
          }
        }),
        ...(security === 'reality' && {
          realitySettings: {
            show: realityShow,
            xver: realityXver,
            dest,
            serverNames: serverNames.split(',').map(s => s.trim()).filter(Boolean),
            privateKey: privateKey || '',
            minClientVer: realityMinClientVer,
            maxClientVer: realityMaxClientVer,
            maxTimediff: realityMaxTimediff,
            shortIds: shortIds ? shortIds.split(',').map(s => s.trim()).filter(Boolean) : [],
            settings: {
              publicKey: publicKey || '',
              fingerprint: fingerprint || 'chrome',
              serverName: serverNames.split(',')[0]?.trim() || '',
              spiderX: spiderX
            }
          }
        }),
        sockopt: {
          tcpFastOpen: sockoptTcpFastOpen,
          tcpFastOpenQueueLength: sockoptTcpFastOpenQueueLength,
          tcpKeepAliveIdle: sockoptTcpKeepAliveIdle,
          tcpKeepAliveInterval: sockoptTcpKeepAliveInterval,
          ...(sockoptTcpCongestion && { tcpCongestion: sockoptTcpCongestion }),
          tcpNoDelay: sockoptTcpNoDelay,
          tcpMptcp: sockoptTcpMptcp,
          mark: sockoptMark,
          tproxy: sockoptTproxy,
          acceptProxyProtocol: sockoptAcceptProxyProtocol,
          domainStrategy: sockoptDomainStrategy,
          ...(sockoptDialerProxy && { dialerProxy: sockoptDialerProxy }),
          ...(sockoptInterface && { interface: sockoptInterface }),
          tcpWindowClamp: sockoptTcpWindowClamp,
          tcpUserTimeout: sockoptTcpUserTimeout,
          v6Only: sockoptV6Only
        }
      },
      sniffing: {
        enabled: sniffingEnabled,
        destOverride: sniffingDestOverride,
        metadataOnly: sniffingMetadataOnly,
        routeOnly: sniffingRouteOnly
      }
    };
    
    // Add fallbacks for VLESS/Trojan if enabled
    if (fallbacksEnabled && fallbacks.length > 0 && (protocol === 'vless' || protocol === 'trojan')) {
      (configObj.settings as Record<string, unknown>).fallbacks = fallbacks.map(fb => ({
        ...(fb.name && { name: fb.name }),
        ...(fb.alpn && { alpn: fb.alpn }),
        ...(fb.path && { path: fb.path }),
        dest: fb.dest,
        xver: fb.xver
      }));
    }
    
    return JSON.stringify(configObj, null, 2);
  };

  const handleSubmit = () => {
    if (!validation.isValid) return;
    
    const templateData = {
      tag,
      protocol: protocol as 'vless' | 'vmess' | 'trojan' | 'shadowsocks',
      transport,
      security: security as 'none' | 'tls' | 'reality',
      port: parseInt(port),
      config: JSON.parse(generateConfig()),
    };
    
    if (isEditing && editTemplate) {
      updateMutation.mutate(
        { id: editTemplate.id, data: templateData },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createMutation.mutate(templateData, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleAutoGenerateTag = () => {
    const suggested = generateSuggestedTag({ protocol, transport, security });
    setTag(suggested);
  };

  // Get field error/warning
  const getFieldStatus = (field: string) => {
    const error = validation.errors.find(e => e.field === field);
    const warning = validation.warnings.find(w => w.field === field);
    return { error, warning };
  };

  const FieldLabel = ({ field, children, required }: { field: string; children: React.ReactNode; required?: boolean }) => {
    const { error, warning } = getFieldStatus(field);
    return (
      <div className="flex items-center gap-2">
        <Label className={cn(error && "text-destructive")}>
          {children}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        {(error || warning) && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                {error ? (
                  <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-status-connecting" />
                )}
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[300px]">
                <p className="text-xs">{error?.message || warning?.message}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  };

  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(importJson);
      
      // Extract and set values from the parsed JSON
      if (parsed.tag) setTag(parsed.tag);
      if (parsed.port) setPort(parsed.port.toString());
      if (parsed.protocol) setProtocol(parsed.protocol);
      
      // Stream settings
      if (parsed.streamSettings) {
        const stream = parsed.streamSettings;
        if (stream.network) setTransport(stream.network);
        if (stream.security) setSecurity(stream.security);
        
        // TLS settings
        if (stream.tlsSettings) {
          const tls = stream.tlsSettings;
          if (tls.serverName) setSni(tls.serverName);
          if (tls.fingerprint) setFingerprint(tls.fingerprint);
          if (tls.alpn) setAlpn(tls.alpn);
        }
        
        // Reality settings
        if (stream.realitySettings) {
          const reality = stream.realitySettings;
          if (reality.dest) setDest(reality.dest);
          if (reality.serverNames) setServerNames(reality.serverNames.join(','));
          if (reality.privateKey) setPrivateKey(reality.privateKey);
          if (reality.publicKey) setPublicKey(reality.publicKey);
          if (reality.shortIds) setShortIds(reality.shortIds.join(','));
          if (reality.spiderX) setSpiderX(reality.spiderX);
        }
        
        // TCP settings
        if (stream.tcpSettings?.header?.type) {
          setTcpHeaderType(stream.tcpSettings.header.type);
        }
        
        // WS settings
        if (stream.wsSettings) {
          if (stream.wsSettings.path) setPath(stream.wsSettings.path);
          if (stream.wsSettings.headers?.Host) setHost(stream.wsSettings.headers.Host);
        }
        
        // gRPC settings  
        if (stream.grpcSettings?.serviceName) {
          setServiceName(stream.grpcSettings.serviceName);
        }
      }
      
      // Protocol settings
      if (parsed.settings) {
        if (parsed.protocol === 'vless' && parsed.settings.decryption === 'none') {
          // Check for flow in clients if present
        }
      }
      
      toast.success('Configuration imported successfully');
      setShowImportModal(false);
      setImportJson('');
    } catch (e) {
      toast.error('Invalid JSON format');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="font-heading">
            {isEditing ? 'Edit Configuration Template' : 'Create Configuration Template'}
          </DialogTitle>
          <DialogDescription>
            Build an Xray inbound configuration with real-time validation
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* Builder Form */}
            <ScrollArea className="h-[300px] sm:h-[400px] lg:h-[500px] pr-4">
            <div className="space-y-6">
              {/* Base Fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <FieldLabel field="tag" required>Template Name (Tag)</FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      placeholder="VLESS TCP REALITY"
                      value={tag}
                      onChange={(e) => setTag(e.target.value)}
                      className={cn(getFieldStatus('tag').error && "border-destructive")}
                    />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={handleAutoGenerateTag}
                          >
                            <Sparkles className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Auto-generate tag</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <FieldLabel field="port" required>Port</FieldLabel>
                  <Input
                    type="number"
                    placeholder="443"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    className={cn(getFieldStatus('port').error && "border-destructive")}
                  />
                </div>
                
                <div className="space-y-2">
                  <FieldLabel field="protocol" required>Protocol</FieldLabel>
                  <Select value={protocol} onValueChange={(v) => setProtocol(v as Protocol)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {protocols.map(p => (
                        <SelectItem key={p} value={p}>{p.toUpperCase()}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <FieldLabel field="transport" required>Transport (Network)</FieldLabel>
                  <Select value={transport} onValueChange={(v) => setTransport(v as Transport)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {transports.map(t => (
                        <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <FieldLabel field="security" required>Security</FieldLabel>
                  <Select value={security} onValueChange={(v) => setSecurity(v as Security)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {validOptions.securityOptions.map(s => (
                        <SelectItem key={s} value={s}>{s.toUpperCase()}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validOptions.securityOptions.length === 1 && (
                    <p className="text-xs text-muted-foreground">
                      Only 'none' is available for {transport.toUpperCase()}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Flow Field - VLESS + TCP + TLS/Reality only */}
              {validOptions.showFlowField && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground">VLESS Flow Control</h4>
                    <div className="space-y-2">
                      <FieldLabel field="flow">Flow</FieldLabel>
                      <Select value={flow} onValueChange={(v) => setFlow(v as Flow)}>
                        <SelectTrigger className={cn(getFieldStatus('flow').error && "border-destructive")}>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          {FLOWS.map(f => (
                            <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        XTLS Vision flow for enhanced performance
                      </p>
                    </div>
                  </div>
                </>
              )}
              
              {/* Shadowsocks Settings */}
              {validOptions.showSsMethod && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Shadowsocks Settings</h4>
                    <div className="space-y-2">
                      <FieldLabel field="ssMethod" required>Encryption Method</FieldLabel>
                      <Select value={ssMethod} onValueChange={(v) => setSsMethod(v as ShadowsocksMethod)}>
                        <SelectTrigger className={cn(getFieldStatus('ssMethod').error && "border-destructive")}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SHADOWSOCKS_METHODS.map(m => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {ssMethod.startsWith('2022') ? '2022 methods require base64-encoded keys' : 'Legacy method'}
                      </p>
                    </div>
                  </div>
                </>
              )}
              
              {/* TCP Settings */}
              {validOptions.showTcpHeaderType && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground">TCP Settings</h4>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="tcpProxyProtocol" 
                        checked={tcpAcceptProxyProtocol}
                        onCheckedChange={(checked) => setTcpAcceptProxyProtocol(!!checked)}
                      />
                      <label htmlFor="tcpProxyProtocol" className="text-sm cursor-pointer">
                        Accept Proxy Protocol
                      </label>
                    </div>
                    
                    <div className="space-y-2">
                      <FieldLabel field="tcpHeaderType">Header Type (HTTP Camouflage)</FieldLabel>
                      <Select value={tcpHeaderType} onValueChange={setTcpHeaderType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TCP_HEADER_TYPES.map(h => (
                            <SelectItem key={h} value={h}>{h === 'none' ? 'None' : 'HTTP Obfuscation'}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
              {/* HTTP Obfuscation Settings */}
                    {tcpHeaderType === 'http' && (
                      <div className="space-y-4 pl-4 border-l-2 border-border">
                        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Request Settings</h5>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <FieldLabel field="httpRequestVersion">Version</FieldLabel>
                            <Input
                              placeholder="1.1"
                              value={httpRequestVersion}
                              onChange={(e) => setHttpRequestVersion(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <FieldLabel field="httpRequestMethod">Method</FieldLabel>
                            <Select value={httpRequestMethod} onValueChange={setHttpRequestMethod}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="GET">GET</SelectItem>
                                <SelectItem value="POST">POST</SelectItem>
                                <SelectItem value="HEAD">HEAD</SelectItem>
                                <SelectItem value="PUT">PUT</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <FieldLabel field="httpRequestPath">Path(s)</FieldLabel>
                          <Input
                            placeholder="/,/video,/api"
                            value={httpRequestPath}
                            onChange={(e) => setHttpRequestPath(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">Comma-separated list of paths</p>
                        </div>
                        
                        <div className="space-y-2">
                          <FieldLabel field="httpRequestHost">Host Header(s)</FieldLabel>
                          <Input
                            placeholder="www.example.com,cdn.example.com"
                            value={httpRequestHost}
                            onChange={(e) => setHttpRequestHost(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">Comma-separated list of hosts</p>
                        </div>
                        
                        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-2">Response Settings</h5>
                        
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-2">
                            <FieldLabel field="httpResponseVersion">Version</FieldLabel>
                            <Input
                              placeholder="1.1"
                              value={httpResponseVersion}
                              onChange={(e) => setHttpResponseVersion(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <FieldLabel field="httpResponseStatus">Status</FieldLabel>
                            <Input
                              placeholder="200"
                              value={httpResponseStatus}
                              onChange={(e) => setHttpResponseStatus(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <FieldLabel field="httpResponseReason">Reason</FieldLabel>
                            <Input
                              placeholder="OK"
                              value={httpResponseReason}
                              onChange={(e) => setHttpResponseReason(e.target.value)}
                            />
                          </div>
                        </div>
                        
                        {/* Request Headers - Collapsed */}
                        <Collapsible defaultOpen={false} className="space-y-2">
                          <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors group">
                            <ChevronDown className="w-4 h-4 transition-transform group-data-[state=open]:rotate-180" />
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Request Headers</span>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="space-y-3 pt-2">
                            {httpRequestHeaders.map((h, idx) => (
                              <div key={idx} className="flex gap-2 items-center">
                                <Input
                                  placeholder="Header Name"
                                  value={h.key}
                                  onChange={(e) => {
                                    const updated = [...httpRequestHeaders];
                                    updated[idx].key = e.target.value;
                                    setHttpRequestHeaders(updated);
                                  }}
                                  className="flex-1"
                                />
                                <Input
                                  placeholder="Header Value"
                                  value={h.value}
                                  onChange={(e) => {
                                    const updated = [...httpRequestHeaders];
                                    updated[idx].value = e.target.value;
                                    setHttpRequestHeaders(updated);
                                  }}
                                  className="flex-1"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setHttpRequestHeaders(httpRequestHeaders.filter((_, i) => i !== idx))}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setHttpRequestHeaders([...httpRequestHeaders, { key: '', value: '' }])}
                            >
                              Add Request Header
                            </Button>
                          </CollapsibleContent>
                        </Collapsible>
                        
                        {/* Response Headers - Collapsed */}
                        <Collapsible defaultOpen={false} className="space-y-2">
                          <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors group">
                            <ChevronDown className="w-4 h-4 transition-transform group-data-[state=open]:rotate-180" />
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Response Headers</span>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="space-y-3 pt-2">
                            {httpResponseHeaders.map((h, idx) => (
                              <div key={idx} className="flex gap-2 items-center">
                                <Input
                                  placeholder="Header Name"
                                  value={h.key}
                                  onChange={(e) => {
                                    const updated = [...httpResponseHeaders];
                                    updated[idx].key = e.target.value;
                                    setHttpResponseHeaders(updated);
                                  }}
                                  className="flex-1"
                                />
                                <Input
                                  placeholder="Header Value"
                                  value={h.value}
                                  onChange={(e) => {
                                    const updated = [...httpResponseHeaders];
                                    updated[idx].value = e.target.value;
                                    setHttpResponseHeaders(updated);
                                  }}
                                  className="flex-1"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setHttpResponseHeaders(httpResponseHeaders.filter((_, i) => i !== idx))}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setHttpResponseHeaders([...httpResponseHeaders, { key: '', value: '' }])}
                            >
                              Add Response Header
                            </Button>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    )}
                  </div>
                </>
              )}
              
              {/* KCP Settings */}
              {validOptions.showKcpSettings && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground">mKCP Settings</h4>
                    
                    <div className="space-y-2">
                      <FieldLabel field="kcpHeaderType">Camouflage Header Type</FieldLabel>
                      <Select value={kcpHeaderType} onValueChange={setKcpHeaderType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {KCP_HEADER_TYPES.map(h => (
                            <SelectItem key={h} value={h}>
                              {h === 'none' ? 'None' : h === 'wechat-video' ? 'WeChat Video' : h.toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <FieldLabel field="kcpSeed">Seed (Password)</FieldLabel>
                      <Input
                        placeholder="Encryption seed"
                        value={kcpSeed}
                        onChange={(e) => setKcpSeed(e.target.value)}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <FieldLabel field="kcpMtu">MTU</FieldLabel>
                        <Input
                          type="number"
                          min={576}
                          max={1460}
                          value={kcpMtu.toString()}
                          onChange={(e) => setKcpMtu(parseInt(e.target.value) || 1250)}
                        />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel field="kcpTti">TTI (ms)</FieldLabel>
                        <Input
                          type="number"
                          min={10}
                          max={100}
                          value={kcpTti.toString()}
                          onChange={(e) => setKcpTti(parseInt(e.target.value) || 50)}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <FieldLabel field="kcpUplinkCapacity">Uplink (MB/s)</FieldLabel>
                        <Input
                          type="number"
                          min={0}
                          value={kcpUplinkCapacity.toString()}
                          onChange={(e) => setKcpUplinkCapacity(parseInt(e.target.value) || 5)}
                        />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel field="kcpDownlinkCapacity">Downlink (MB/s)</FieldLabel>
                        <Input
                          type="number"
                          min={0}
                          value={kcpDownlinkCapacity.toString()}
                          onChange={(e) => setKcpDownlinkCapacity(parseInt(e.target.value) || 20)}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <FieldLabel field="kcpReadBuffer">Read Buffer (MB)</FieldLabel>
                        <Input
                          type="number"
                          min={0}
                          value={kcpReadBuffer.toString()}
                          onChange={(e) => setKcpReadBuffer(parseInt(e.target.value) || 2)}
                        />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel field="kcpWriteBuffer">Write Buffer (MB)</FieldLabel>
                        <Input
                          type="number"
                          min={0}
                          value={kcpWriteBuffer.toString()}
                          onChange={(e) => setKcpWriteBuffer(parseInt(e.target.value) || 2)}
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="kcpCongestion" 
                        checked={kcpCongestion}
                        onCheckedChange={(checked) => setKcpCongestion(!!checked)}
                      />
                      <label htmlFor="kcpCongestion" className="text-sm cursor-pointer">
                        Enable Congestion Control
                      </label>
                    </div>
                  </div>
                </>
              )}
              
              {/* WebSocket Settings */}
              {transport === 'ws' && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground">WebSocket Settings</h4>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="wsProxyProtocol" 
                        checked={wsAcceptProxyProtocol}
                        onCheckedChange={(checked) => setWsAcceptProxyProtocol(!!checked)}
                      />
                      <label htmlFor="wsProxyProtocol" className="text-sm cursor-pointer">
                        Accept Proxy Protocol
                      </label>
                    </div>
                    
                    <div className="space-y-2">
                      <FieldLabel field="path">Path</FieldLabel>
                      <Input
                        placeholder="/"
                        value={path}
                        onChange={(e) => setPath(e.target.value)}
                        className={cn(getFieldStatus('path').error && "border-destructive")}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <FieldLabel field="host">Host</FieldLabel>
                      <Input
                        placeholder="example.com"
                        value={host}
                        onChange={(e) => setHost(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <FieldLabel field="wsHeartbeatPeriod">Heartbeat Period (seconds)</FieldLabel>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={wsHeartbeatPeriod.toString()}
                        onChange={(e) => setWsHeartbeatPeriod(parseInt(e.target.value) || 0)}
                      />
                      <p className="text-xs text-muted-foreground">0 = disabled</p>
                    </div>
                  </div>
                </>
              )}
              
              {/* HTTPUpgrade Settings */}
              {transport === 'httpupgrade' && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground">HTTPUpgrade Settings</h4>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="httpUpgradeProxyProtocol" 
                        checked={httpUpgradeAcceptProxyProtocol}
                        onCheckedChange={(checked) => setHttpUpgradeAcceptProxyProtocol(!!checked)}
                      />
                      <label htmlFor="httpUpgradeProxyProtocol" className="text-sm cursor-pointer">
                        Accept Proxy Protocol
                      </label>
                    </div>
                    
                    <div className="space-y-2">
                      <FieldLabel field="path">Path</FieldLabel>
                      <Input
                        placeholder="/"
                        value={path}
                        onChange={(e) => setPath(e.target.value)}
                        className={cn(getFieldStatus('path').error && "border-destructive")}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <FieldLabel field="host">Host</FieldLabel>
                      <Input
                        placeholder="example.com"
                        value={host}
                        onChange={(e) => setHost(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}
              
              {/* XHTTP Settings */}
              {transport === 'xhttp' && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground">XHTTP Settings</h4>
                    
                    <div className="space-y-2">
                      <FieldLabel field="path">Path</FieldLabel>
                      <Input
                        placeholder="/"
                        value={path}
                        onChange={(e) => setPath(e.target.value)}
                        className={cn(getFieldStatus('path').error && "border-destructive")}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <FieldLabel field="host">Host</FieldLabel>
                      <Input
                        placeholder="example.com"
                        value={host}
                        onChange={(e) => setHost(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <FieldLabel field="xhttpMode">Mode</FieldLabel>
                      <Select value={xhttpMode} onValueChange={(v) => setXhttpMode(v as XhttpMode)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {XHTTP_MODES.map(m => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <FieldLabel field="xhttpPaddingBytes">Padding Bytes</FieldLabel>
                      <Input
                        placeholder="100-1000"
                        value={xhttpPaddingBytes}
                        onChange={(e) => setXhttpPaddingBytes(e.target.value)}
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="xhttpNoSSEHeader" 
                        checked={xhttpNoSSEHeader}
                        onCheckedChange={(checked) => setXhttpNoSSEHeader(!!checked)}
                      />
                      <label htmlFor="xhttpNoSSEHeader" className="text-sm cursor-pointer">
                        No SSE Header
                      </label>
                    </div>
                    
                    {/* Mode-specific settings */}
                    {xhttpMode === 'packet-up' && (
                      <div className="space-y-4 pl-4 border-l-2 border-border">
                        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Packet-Up Settings</h5>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <FieldLabel field="xhttpMaxBufferedPosts">Max Buffered Posts</FieldLabel>
                            <Input
                              type="number"
                              min={0}
                              value={xhttpMaxBufferedPosts.toString()}
                              onChange={(e) => setXhttpMaxBufferedPosts(parseInt(e.target.value) || 30)}
                            />
                          </div>
                          <div className="space-y-2">
                            <FieldLabel field="xhttpMaxEachPostBytes">Max Post Size (bytes)</FieldLabel>
                            <Input
                              placeholder="1000000"
                              value={xhttpMaxEachPostBytes}
                              onChange={(e) => setXhttpMaxEachPostBytes(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {xhttpMode === 'stream-up' && (
                      <div className="space-y-4 pl-4 border-l-2 border-border">
                        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Stream-Up Settings</h5>
                        <div className="space-y-2">
                          <FieldLabel field="xhttpStreamUpServerSecs">Server Timeout (seconds)</FieldLabel>
                          <Input
                            placeholder="20-80"
                            value={xhttpStreamUpServerSecs}
                            onChange={(e) => setXhttpStreamUpServerSecs(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
              
              {/* gRPC Settings */}
              {validOptions.showServiceName && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground">gRPC Settings</h4>
                    
                    <div className="space-y-2">
                      <FieldLabel field="serviceName">Service Name</FieldLabel>
                      <Input
                        placeholder="grpc-service"
                        value={serviceName}
                        onChange={(e) => setServiceName(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <FieldLabel field="grpcAuthority">Authority</FieldLabel>
                      <Input
                        placeholder="Optional authority header"
                        value={grpcAuthority}
                        onChange={(e) => setGrpcAuthority(e.target.value)}
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="grpcMultiMode" 
                        checked={grpcMultiMode}
                        onCheckedChange={(checked) => setGrpcMultiMode(!!checked)}
                      />
                      <label htmlFor="grpcMultiMode" className="text-sm cursor-pointer">
                        Multi Mode
                      </label>
                    </div>
                  </div>
                </>
              )}
              
              {/* Reality Settings */}
              {validOptions.showRealitySettings && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-muted-foreground">Reality Settings</h4>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                const randomTarget = REALITY_TARGETS[Math.floor(Math.random() * REALITY_TARGETS.length)];
                                setDest(randomTarget.target);
                                setServerNames(randomTarget.sni);
                              }}
                            >
                              <Shuffle className="w-3.5 h-3.5 mr-1" />
                              Random Target
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Pick a random target from common sites</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    
                    <div className="space-y-2">
                      <FieldLabel field="realityDest" required>Target (dest)</FieldLabel>
                      <Input
                        placeholder="www.apple.com:443"
                        value={dest}
                        onChange={(e) => setDest(e.target.value)}
                        className={cn(getFieldStatus('realityDest').error && "border-destructive")}
                      />
                      <p className="text-xs text-muted-foreground">Format: domain:port</p>
                    </div>
                    
                    <div className="space-y-2">
                      <FieldLabel field="realityServerNames" required>SNI (Server Names)</FieldLabel>
                      <Input
                        placeholder="www.apple.com,apple.com"
                        value={serverNames}
                        onChange={(e) => setServerNames(e.target.value)}
                        className={cn(getFieldStatus('realityServerNames').error && "border-destructive")}
                      />
                      <p className="text-xs text-muted-foreground">Comma-separated list</p>
                    </div>
                    
                    {/* Keys Section */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <FieldLabel field="realityPrivateKey" required>Private Key</FieldLabel>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  // Generate X25519 keypair using Web Crypto API
                                  crypto.subtle.generateKey(
                                    { name: 'X25519' },
                                    true,
                                    ['deriveBits']
                                  ).then(async (keyPair) => {
                                    const kp = keyPair as CryptoKeyPair;
                                    const privateKeyData = await crypto.subtle.exportKey('pkcs8', kp.privateKey);
                                    const publicKeyData = await crypto.subtle.exportKey('spki', kp.publicKey);
                                    
                                    // Extract the raw keys from PKCS8/SPKI format
                                    const privKeyBytes = new Uint8Array(privateKeyData).slice(-32);
                                    const pubKeyBytes = new Uint8Array(publicKeyData).slice(-32);
                                    
                                    // Convert to base64url (no padding)
                                    const toBase64Url = (bytes: Uint8Array) => {
                                      const base64 = btoa(String.fromCharCode(...bytes));
                                      return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                                    };
                                    
                                    setPrivateKey(toBase64Url(privKeyBytes));
                                    setPublicKey(toBase64Url(pubKeyBytes));
                                  }).catch(() => {
                                    // Fallback: generate random base64 strings (for browsers without X25519)
                                    const randomBytes = (len: number) => {
                                      const arr = new Uint8Array(len);
                                      crypto.getRandomValues(arr);
                                      return btoa(String.fromCharCode(...arr)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                                    };
                                    setPrivateKey(randomBytes(32));
                                    setPublicKey(randomBytes(32));
                                  });
                                }}
                              >
                                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                                Generate Keys
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Generate X25519 keypair for Reality</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Input
                        placeholder="X25519 private key"
                        value={privateKey}
                        onChange={(e) => setPrivateKey(e.target.value)}
                        className={cn(getFieldStatus('realityPrivateKey').error && "border-destructive")}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <FieldLabel field="realityPublicKey" required>Public Key</FieldLabel>
                      <Input
                        placeholder="X25519 public key"
                        value={publicKey}
                        onChange={(e) => setPublicKey(e.target.value)}
                        className={cn(getFieldStatus('realityPublicKey').error && "border-destructive")}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <FieldLabel field="realityShortIds">Short IDs</FieldLabel>
                      <Input
                        placeholder="abcd1234,ef567890"
                        value={shortIds}
                        onChange={(e) => setShortIds(e.target.value)}
                        className={cn(getFieldStatus('realityShortIds').warning && "border-status-connecting")}
                      />
                      <p className="text-xs text-muted-foreground">Hex strings (0-16 chars), comma-separated (optional)</p>
                    </div>
                    
                    <div className="space-y-2">
                      <FieldLabel field="fingerprint">uTLS Fingerprint</FieldLabel>
                      <Select value={fingerprint} onValueChange={(v) => setFingerprint(v as Fingerprint)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FINGERPRINTS.map(f => (
                            <SelectItem key={f} value={f}>{f}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <FieldLabel field="spiderX">SpiderX</FieldLabel>
                      <Input
                        placeholder="/"
                        value={spiderX}
                        onChange={(e) => setSpiderX(e.target.value)}
                      />
                    </div>
                    
                    {/* Advanced Reality Settings */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <FieldLabel field="realityXver">Xver</FieldLabel>
                        <Input
                          type="number"
                          min={0}
                          max={2}
                          placeholder="0"
                          value={realityXver.toString()}
                          onChange={(e) => setRealityXver(parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel field="realityMaxTimediff">Max Time Diff (ms)</FieldLabel>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={realityMaxTimediff.toString()}
                          onChange={(e) => setRealityMaxTimediff(parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <FieldLabel field="realityMinClientVer">Min Client Ver</FieldLabel>
                        <Input
                          placeholder="e.g. 25.9.11"
                          value={realityMinClientVer}
                          onChange={(e) => setRealityMinClientVer(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel field="realityMaxClientVer">Max Client Ver</FieldLabel>
                        <Input
                          placeholder="e.g. 25.9.11"
                          value={realityMaxClientVer}
                          onChange={(e) => setRealityMaxClientVer(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              {/* TLS Settings */}
              {validOptions.showTlsSettings && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground">TLS Settings</h4>
                    <div className="space-y-2">
                      <FieldLabel field="sni">SNI (Server Name)</FieldLabel>
                      <Input
                        placeholder="example.com"
                        value={sni}
                        onChange={(e) => setSni(e.target.value)}
                        className={cn(getFieldStatus('sni').error && "border-destructive")}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <FieldLabel field="tlsMinVersion">Min Version</FieldLabel>
                        <Select value={tlsMinVersion} onValueChange={setTlsMinVersion}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1.0">TLS 1.0</SelectItem>
                            <SelectItem value="1.1">TLS 1.1</SelectItem>
                            <SelectItem value="1.2">TLS 1.2</SelectItem>
                            <SelectItem value="1.3">TLS 1.3</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <FieldLabel field="tlsMaxVersion">Max Version</FieldLabel>
                        <Select value={tlsMaxVersion} onValueChange={setTlsMaxVersion}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1.0">TLS 1.0</SelectItem>
                            <SelectItem value="1.1">TLS 1.1</SelectItem>
                            <SelectItem value="1.2">TLS 1.2</SelectItem>
                            <SelectItem value="1.3">TLS 1.3</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <FieldLabel field="alpn">ALPN</FieldLabel>
                      <Select 
                        value={alpn.join(',') || 'none'} 
                        onValueChange={(v) => setAlpn(v === 'none' ? [] : v.split(','))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="h2,http/1.1">h2, http/1.1</SelectItem>
                          <SelectItem value="h3,h2,http/1.1">h3, h2, http/1.1</SelectItem>
                          <SelectItem value="h2">h2</SelectItem>
                          <SelectItem value="http/1.1">http/1.1</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <FieldLabel field="fingerprint">uTLS Fingerprint</FieldLabel>
                      <Select value={fingerprint} onValueChange={(v) => setFingerprint(v as Fingerprint)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FINGERPRINTS.map(f => (
                            <SelectItem key={f} value={f}>{f}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <FieldLabel field="tlsCipherSuites">Cipher Suites</FieldLabel>
                      <Input
                        placeholder="Leave empty for auto"
                        value={tlsCipherSuites}
                        onChange={(e) => setTlsCipherSuites(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Comma-separated list (empty = auto)</p>
                    </div>
                    
                    {/* TLS Options */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="tlsAllowInsecure" 
                          checked={tlsAllowInsecure}
                          onCheckedChange={(checked) => setTlsAllowInsecure(!!checked)}
                        />
                        <label htmlFor="tlsAllowInsecure" className="text-sm cursor-pointer">
                          Allow Insecure
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="tlsRejectUnknownSni" 
                          checked={tlsRejectUnknownSni}
                          onCheckedChange={(checked) => setTlsRejectUnknownSni(!!checked)}
                        />
                        <label htmlFor="tlsRejectUnknownSni" className="text-sm cursor-pointer">
                          Reject Unknown SNI
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="tlsDisableSystemRoot" 
                          checked={tlsDisableSystemRoot}
                          onCheckedChange={(checked) => setTlsDisableSystemRoot(!!checked)}
                        />
                        <label htmlFor="tlsDisableSystemRoot" className="text-sm cursor-pointer">
                          Disable System Root CA
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="tlsEnableSessionResumption" 
                          checked={tlsEnableSessionResumption}
                          onCheckedChange={(checked) => setTlsEnableSessionResumption(!!checked)}
                        />
                        <label htmlFor="tlsEnableSessionResumption" className="text-sm cursor-pointer">
                          Enable Session Resumption
                        </label>
                      </div>
                    </div>
                    
                    {/* TLS Certificate Settings */}
                    <div className="space-y-4 pt-2 border-t border-border">
                      <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Certificate Settings</h5>
                      
                      <div className="space-y-2">
                        <FieldLabel field="tlsCertUsage">Certificate Usage</FieldLabel>
                        <Select value={tlsCertUsage} onValueChange={setTlsCertUsage}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="encipherment">Encipherment</SelectItem>
                            <SelectItem value="verify">Verify</SelectItem>
                            <SelectItem value="issue">Issue</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="tlsCertUseFile" 
                          checked={tlsCertUseFile}
                          onCheckedChange={(checked) => setTlsCertUseFile(!!checked)}
                        />
                        <label htmlFor="tlsCertUseFile" className="text-sm cursor-pointer">
                          Use File Paths
                        </label>
                      </div>
                      
                      {tlsCertUseFile ? (
                        <>
                          <div className="space-y-2">
                            <FieldLabel field="tlsCertFile">Certificate File Path</FieldLabel>
                            <Input
                              placeholder="/path/to/cert.pem"
                              value={tlsCertFile}
                              onChange={(e) => setTlsCertFile(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <FieldLabel field="tlsKeyFile">Key File Path</FieldLabel>
                            <Input
                              placeholder="/path/to/key.pem"
                              value={tlsKeyFile}
                              onChange={(e) => setTlsKeyFile(e.target.value)}
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <FieldLabel field="tlsCertContent">Certificate (PEM)</FieldLabel>
                            <Input
                              placeholder="-----BEGIN CERTIFICATE-----"
                              value={tlsCertContent}
                              onChange={(e) => setTlsCertContent(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <FieldLabel field="tlsKeyContent">Key (PEM)</FieldLabel>
                            <Input
                              placeholder="-----BEGIN PRIVATE KEY-----"
                              value={tlsKeyContent}
                              onChange={(e) => setTlsKeyContent(e.target.value)}
                            />
                          </div>
                        </>
                      )}
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="tlsOneTimeLoading" 
                          checked={tlsOneTimeLoading}
                          onCheckedChange={(checked) => setTlsOneTimeLoading(!!checked)}
                        />
                        <label htmlFor="tlsOneTimeLoading" className="text-sm cursor-pointer">
                          One Time Loading
                        </label>
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              {/* Sniffing Settings - Collapsible */}
              {canEnableStream(protocol) && (
                <>
                  <Separator />
                  <Collapsible defaultOpen={false}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full py-2 group">
                      <h4 className="text-sm font-medium text-muted-foreground">Sniffing Settings</h4>
                      <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 pt-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="sniffingEnabled" 
                          checked={sniffingEnabled}
                          onCheckedChange={(checked) => setSniffingEnabled(!!checked)}
                        />
                        <label htmlFor="sniffingEnabled" className="text-sm cursor-pointer">
                          Enable Sniffing
                        </label>
                      </div>
                      
                      {sniffingEnabled && (
                        <>
                          <div className="space-y-2">
                            <FieldLabel field="sniffingDestOverride">Dest Override</FieldLabel>
                            <div className="grid grid-cols-2 gap-2">
                              {['http', 'tls', 'quic', 'fakedns'].map((opt) => (
                                <div key={opt} className="flex items-center space-x-2">
                                  <Checkbox 
                                    id={`sniff-${opt}`} 
                                    checked={sniffingDestOverride.includes(opt)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSniffingDestOverride([...sniffingDestOverride, opt]);
                                      } else {
                                        setSniffingDestOverride(sniffingDestOverride.filter(o => o !== opt));
                                      }
                                    }}
                                  />
                                  <label htmlFor={`sniff-${opt}`} className="text-sm cursor-pointer uppercase">
                                    {opt}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="sniffingMetadataOnly" 
                              checked={sniffingMetadataOnly}
                              onCheckedChange={(checked) => setSniffingMetadataOnly(!!checked)}
                            />
                            <label htmlFor="sniffingMetadataOnly" className="text-sm cursor-pointer">
                              Metadata Only
                            </label>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="sniffingRouteOnly" 
                              checked={sniffingRouteOnly}
                              onCheckedChange={(checked) => setSniffingRouteOnly(!!checked)}
                            />
                            <label htmlFor="sniffingRouteOnly" className="text-sm cursor-pointer">
                              Route Only
                            </label>
                          </div>
                        </>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </>
              )}
              
              {/* Sockopt Settings - Collapsible */}
              {canEnableStream(protocol) && (
                <>
                  <Separator />
                  <Collapsible defaultOpen={false}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full py-2 group">
                      <h4 className="text-sm font-medium text-muted-foreground">Socket Options (sockopt)</h4>
                      <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 pt-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="sockoptTcpFastOpen" 
                            checked={sockoptTcpFastOpen}
                            onCheckedChange={(checked) => setSockoptTcpFastOpen(!!checked)}
                          />
                          <label htmlFor="sockoptTcpFastOpen" className="text-sm cursor-pointer">
                            TCP Fast Open
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="sockoptTcpNoDelay" 
                            checked={sockoptTcpNoDelay}
                            onCheckedChange={(checked) => setSockoptTcpNoDelay(!!checked)}
                          />
                          <label htmlFor="sockoptTcpNoDelay" className="text-sm cursor-pointer">
                            TCP No Delay
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="sockoptTcpMptcp" 
                            checked={sockoptTcpMptcp}
                            onCheckedChange={(checked) => setSockoptTcpMptcp(!!checked)}
                          />
                          <label htmlFor="sockoptTcpMptcp" className="text-sm cursor-pointer">
                            Multipath TCP
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="sockoptAcceptProxyProtocol" 
                            checked={sockoptAcceptProxyProtocol}
                            onCheckedChange={(checked) => setSockoptAcceptProxyProtocol(!!checked)}
                          />
                          <label htmlFor="sockoptAcceptProxyProtocol" className="text-sm cursor-pointer">
                            Accept Proxy Protocol
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="sockoptV6Only" 
                            checked={sockoptV6Only}
                            onCheckedChange={(checked) => setSockoptV6Only(!!checked)}
                          />
                          <label htmlFor="sockoptV6Only" className="text-sm cursor-pointer">
                            IPv6 Only
                          </label>
                        </div>
                      </div>
                      
                      {sockoptTcpFastOpen && (
                        <div className="space-y-2">
                          <FieldLabel field="sockoptTcpFastOpenQueueLength">TFO Queue Length</FieldLabel>
                          <Input
                            type="number"
                            value={sockoptTcpFastOpenQueueLength}
                            onChange={(e) => setSockoptTcpFastOpenQueueLength(parseInt(e.target.value) || 256)}
                          />
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <FieldLabel field="sockoptTcpKeepAliveIdle">Keep Alive Idle (s)</FieldLabel>
                          <Input
                            type="number"
                            value={sockoptTcpKeepAliveIdle}
                            onChange={(e) => setSockoptTcpKeepAliveIdle(parseInt(e.target.value) || 0)}
                            placeholder="0 = disabled"
                          />
                        </div>
                        <div className="space-y-2">
                          <FieldLabel field="sockoptTcpKeepAliveInterval">Keep Alive Interval (s)</FieldLabel>
                          <Input
                            type="number"
                            value={sockoptTcpKeepAliveInterval}
                            onChange={(e) => setSockoptTcpKeepAliveInterval(parseInt(e.target.value) || 0)}
                            placeholder="0 = disabled"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <FieldLabel field="sockoptTcpWindowClamp">TCP Window Clamp</FieldLabel>
                          <Input
                            type="number"
                            value={sockoptTcpWindowClamp}
                            onChange={(e) => setSockoptTcpWindowClamp(parseInt(e.target.value) || 0)}
                            placeholder="0 = disabled"
                          />
                        </div>
                        <div className="space-y-2">
                          <FieldLabel field="sockoptTcpUserTimeout">TCP User Timeout (ms)</FieldLabel>
                          <Input
                            type="number"
                            value={sockoptTcpUserTimeout}
                            onChange={(e) => setSockoptTcpUserTimeout(parseInt(e.target.value) || 0)}
                            placeholder="0 = disabled"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <FieldLabel field="sockoptTcpCongestion">TCP Congestion Algorithm</FieldLabel>
                        <Select value={sockoptTcpCongestion || 'default'} onValueChange={(v) => setSockoptTcpCongestion(v === 'default' ? '' : v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="System Default" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">System Default</SelectItem>
                            <SelectItem value="bbr">BBR</SelectItem>
                            <SelectItem value="cubic">CUBIC</SelectItem>
                            <SelectItem value="reno">Reno</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <FieldLabel field="sockoptMark">SO_MARK</FieldLabel>
                          <Input
                            type="number"
                            value={sockoptMark}
                            onChange={(e) => setSockoptMark(parseInt(e.target.value) || 0)}
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <FieldLabel field="sockoptTproxy">TProxy</FieldLabel>
                          <Select value={sockoptTproxy} onValueChange={(v) => setSockoptTproxy(v as 'redirect' | 'tproxy' | 'off')}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="off">Off</SelectItem>
                              <SelectItem value="redirect">Redirect</SelectItem>
                              <SelectItem value="tproxy">TProxy</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <FieldLabel field="sockoptDomainStrategy">Domain Strategy</FieldLabel>
                        <Select value={sockoptDomainStrategy} onValueChange={(v) => setSockoptDomainStrategy(v as any)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AsIs">AsIs</SelectItem>
                            <SelectItem value="UseIP">UseIP</SelectItem>
                            <SelectItem value="UseIPv4">UseIPv4</SelectItem>
                            <SelectItem value="UseIPv6">UseIPv6</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <FieldLabel field="sockoptDialerProxy">Dialer Proxy</FieldLabel>
                        <Input
                          placeholder="Outbound tag for proxy chaining"
                          value={sockoptDialerProxy}
                          onChange={(e) => setSockoptDialerProxy(e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <FieldLabel field="sockoptInterface">Bind Interface</FieldLabel>
                        <Input
                          placeholder="Network interface name"
                          value={sockoptInterface}
                          onChange={(e) => setSockoptInterface(e.target.value)}
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </>
              )}
              
              {/* Fallback Settings (VLESS/Trojan only) */}
              {(protocol === 'vless' || protocol === 'trojan') && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Fallback Settings</h4>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="fallbacksEnabled" 
                        checked={fallbacksEnabled}
                        onCheckedChange={(checked) => setFallbacksEnabled(!!checked)}
                      />
                      <label htmlFor="fallbacksEnabled" className="text-sm cursor-pointer">
                        Enable Fallbacks
                      </label>
                    </div>
                    
                    {fallbacksEnabled && (
                      <div className="space-y-3">
                        {fallbacks.map((fb, idx) => (
                          <div key={idx} className="p-3 bg-muted/50 rounded-lg space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium">Fallback #{idx + 1}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setFallbacks(fallbacks.filter((_, i) => i !== idx))}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs">Name</Label>
                                <Input
                                  placeholder="Optional name"
                                  value={fb.name || ''}
                                  onChange={(e) => {
                                    const updated = [...fallbacks];
                                    updated[idx].name = e.target.value;
                                    setFallbacks(updated);
                                  }}
                                  className="h-8 text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">ALPN</Label>
                                <Input
                                  placeholder="h2, http/1.1"
                                  value={fb.alpn || ''}
                                  onChange={(e) => {
                                    const updated = [...fallbacks];
                                    updated[idx].alpn = e.target.value;
                                    setFallbacks(updated);
                                  }}
                                  className="h-8 text-xs"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs">Path</Label>
                                <Input
                                  placeholder="/fallback"
                                  value={fb.path || ''}
                                  onChange={(e) => {
                                    const updated = [...fallbacks];
                                    updated[idx].path = e.target.value;
                                    setFallbacks(updated);
                                  }}
                                  className="h-8 text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Xver</Label>
                                <Select 
                                  value={fb.xver.toString()} 
                                  onValueChange={(v) => {
                                    const updated = [...fallbacks];
                                    updated[idx].xver = parseInt(v);
                                    setFallbacks(updated);
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="0">0 - No Proxy Protocol</SelectItem>
                                    <SelectItem value="1">1 - Proxy Protocol v1</SelectItem>
                                    <SelectItem value="2">2 - Proxy Protocol v2</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Dest (required)</Label>
                              <Input
                                placeholder="127.0.0.1:80 or /dev/shm/fallback.sock"
                                value={fb.dest}
                                onChange={(e) => {
                                  const updated = [...fallbacks];
                                  updated[idx].dest = e.target.value;
                                  setFallbacks(updated);
                                }}
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setFallbacks([...fallbacks, { dest: '', xver: 0 }])}
                        >
                          Add Fallback
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              )}
              
            </div>
          </ScrollArea>
          
          {/* JSON Preview & Validation */}
          <div className="space-y-4 flex flex-col">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-muted-foreground">JSON Preview</h4>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowImportModal(true)}
                  className="h-7 text-xs"
                >
                  <Upload className="w-3 h-3 mr-1" />
                  Import
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(generateConfig());
                    toast.success('JSON copied to clipboard');
                  }}
                  className="h-7 text-xs"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </Button>
              </div>
            </div>
            <JsonViewer
              content={generateConfig()}
              className="h-[200px] sm:h-[280px] lg:h-[340px]"
            />
            
            {/* Validation Messages */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Info className="w-4 h-4" />
                Validation ({validation.errors.length} errors, {validation.warnings.length} warnings)
              </h4>
              <ScrollArea className="h-[80px] lg:h-[100px] rounded-lg border border-border bg-background p-2">
                {validation.errors.length === 0 && validation.warnings.length === 0 ? (
                  <div className="flex items-center gap-2 text-accent p-2">
                    <Check className="w-4 h-4" />
                    <span className="text-sm">All checks passed</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {validation.errors.map((error, i) => (
                      <div key={`err-${i}`} className="flex items-start gap-2 text-destructive p-1 text-xs">
                        <X className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span><Badge variant="outline" className="text-[10px] mr-1">{error.field}</Badge>{error.message}</span>
                      </div>
                    ))}
                    {validation.warnings.map((warning, i) => (
                      <div key={`warn-${i}`} className="flex items-start gap-2 text-status-connecting p-1 text-xs">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span><Badge variant="outline" className="text-[10px] mr-1">{warning.field}</Badge>{warning.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
          </div>
        </div>
        {/* Validation Status Bar */}
        <div className={cn(
          "p-3 rounded-lg border flex-shrink-0",
          validation.isValid 
            ? "bg-accent/10 border-accent/20 text-accent" 
            : "bg-destructive/10 border-destructive/20 text-destructive"
        )}>
          <div className="flex items-center gap-2">
            {validation.isValid ? (
              <>
                <Check className="w-4 h-4" />
                <span className="text-sm">Configuration is valid</span>
                {validation.warnings.length > 0 && (
                  <Badge variant="outline" className="ml-2 text-status-connecting border-status-connecting/30">
                    {validation.warnings.length} warning{validation.warnings.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </>
            ) : (
              <>
                <X className="w-4 h-4" />
                <span className="text-sm">
                  {validation.errors.length} error{validation.errors.length > 1 ? 's' : ''} found
                </span>
              </>
            )}
          </div>
        </div>
        
        <DialogFooter className="flex-shrink-0 flex-col-reverse sm:flex-row gap-2 pt-2">
          <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!validation.isValid || isPending} className="w-full sm:w-auto">
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Save Template'}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Import JSON Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Import from JSON</DialogTitle>
            <DialogDescription>
              Paste an Xray inbound configuration JSON to populate the form fields
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder='{"tag": "example", "port": 443, "protocol": "vless", ...}'
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              className="min-h-[200px] font-mono text-xs"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowImportModal(false); setImportJson(''); }}>
              Cancel
            </Button>
            <Button onClick={handleImportJson} disabled={!importJson.trim()}>
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
