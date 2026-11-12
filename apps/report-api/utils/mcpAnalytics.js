import crypto from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { logger } from '@httparchive/shared';

export const MCP_SERVER_NAME = 'tech-report';
export const MCP_SERVER_VERSION = '1.0.0';
export const MCP_EVENT_NAME = 'mcp.server.operation';

export const REGISTERED_MCP_TOOLS = Object.freeze([
  'search_technologies',
  'list_categories',
  'get_adoption_metrics',
  'get_cwv_metrics',
  'get_lighthouse_metrics',
  'get_page_weight_metrics',
  'get_audits_metrics',
  'get_geo_breakdown',
  'get_cwv_distribution',
  'list_ranks',
  'list_geos',
  'list_versions',
]);

const META_ARG_KEYS = new Set(['caption', 'conversation_id', 'operation_id']);

const ALLOWED_ARG_KEYS = new Set([
  'technology',
  'category',
  'sort',
  'limit',
  'geo',
  'rank',
  'start',
  'end',
  'date',
  'version',
  'caption',
  'conversation_id',
  'operation_id',
]);

const SESSION_TOKEN_PREFIX = 's1';
const MAX_HEADER_TOKEN_LENGTH = 256;
const MAX_ARG_STRING_LENGTH = 512;
const SESSION_WINDOW_MS = 30 * 60 * 1000; // 30-minute fallback session window

// ============================================================================
// Pure Functional Core
// ============================================================================

/**
 * Truncates string values safely to bound Cloud Logging entry sizes.
 */
export const truncateString = (value, maxLength = MAX_ARG_STRING_LENGTH) => {
  if (typeof value !== 'string') return value;
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
};

/**
 * Encodes stateless session & client metadata into an MCP-compliant
 * Mcp-Session-Id header value (visible ASCII 0x21..0x7E only).
 */
export const encodeSessionToken = ({
  sessionId = crypto.randomUUID(),
  clientName = null,
  clientVersion = null,
  protocolVersion = null,
} = {}) => {
  const cleanId = String(sessionId).replace(/[^\x21-\x7E]/g, '').slice(0, 64) || crypto.randomUUID();
  const meta = {};
  if (clientName) meta.c = String(clientName).slice(0, 64);
  if (clientVersion) meta.v = String(clientVersion).slice(0, 32);
  if (protocolVersion) meta.p = String(protocolVersion).slice(0, 24);

  if (Object.keys(meta).length === 0) {
    return `${SESSION_TOKEN_PREFIX}.${cleanId}`;
  }

  const encodedMeta = Buffer.from(JSON.stringify(meta), 'utf8').toString('base64url');
  const token = `${SESSION_TOKEN_PREFIX}.${cleanId}.${encodedMeta}`;
  return token.length <= MAX_HEADER_TOKEN_LENGTH ? token : `${SESSION_TOKEN_PREFIX}.${cleanId}`;
};

/**
 * Decodes an incoming Mcp-Session-Id header value (either our stateless token
 * or any external client/proxy session ID).
 */
export const decodeSessionToken = (headerValue) => {
  if (typeof headerValue !== 'string' || !headerValue.trim()) {
    return null;
  }
  const trimmed = headerValue.trim().slice(0, MAX_HEADER_TOKEN_LENGTH);
  const parts = trimmed.split('.');

  if (parts[0] === SESSION_TOKEN_PREFIX && parts.length >= 2 && parts[1]) {
    let meta = {};
    if (parts[2]) {
      try {
        const parsed = JSON.parse(Buffer.from(parts[2], 'base64url').toString('utf8'));
        if (parsed && typeof parsed === 'object') {
          meta = parsed;
        }
      } catch {
        // Ignore malformed metadata segment and still preserve session ID
      }
    }
    return {
      mcpSessionId: `${SESSION_TOKEN_PREFIX}_${parts[1]}`,
      rawHeader: trimmed,
      clientName: typeof meta.c === 'string' ? meta.c : null,
      clientVersion: typeof meta.v === 'string' ? meta.v : null,
      protocolVersion: typeof meta.p === 'string' ? meta.p : null,
    };
  }

  return {
    mcpSessionId: trimmed.replace(/[^\x21-\x7E]/g, ''),
    rawHeader: trimmed,
    clientName: null,
    clientVersion: null,
    protocolVersion: null,
  };
};

/**
 * Parses a normalized client name and version from an HTTP User-Agent string
 * when MCP initialize clientInfo is unavailable (e.g. stateless curl / scripts).
 */
export const parseUserAgentClient = (userAgent) => {
  if (typeof userAgent !== 'string' || !userAgent.trim()) {
    return { clientName: 'unknown', clientVersion: null };
  }
  const ua = userAgent.trim();

  const knownPatterns = [
    { regex: /claude-code\/([^\s(]+)/i, name: 'claude-code' },
    { regex: /claude-ai\/([^\s(]+)|claude-user\/([^\s(]+)|ClaudeDesktop\/([^\s(]+)/i, name: 'claude' },
    { regex: /cursor\/([^\s(]+)/i, name: 'cursor' },
    { regex: /windsurf\/([^\s(]+)/i, name: 'windsurf' },
    { regex: /antigravity\/([^\s(]+)/i, name: 'antigravity' },
    { regex: /gemini-cli\/([^\s(]+)/i, name: 'gemini-cli' },
    { regex: /codex(?:-cli)?\/([^\s(]+)/i, name: 'codex' },
    { regex: /vscode\/([^\s(]+)|Code\/([^\s(]+)/i, name: 'vscode' },
    { regex: /openai-mcp\/([^\s(]+)|ChatGPT-User\/([^\s(]+)/i, name: 'openai' },
    { regex: /python-httpx\/([^\s(]+)/i, name: 'python-httpx' },
    { regex: /python-requests\/([^\s(]+)/i, name: 'python-requests' },
    { regex: /Go-http-client\/([^\s(]+)/i, name: 'go-http-client' },
    { regex: /curl\/([^\s(]+)/i, name: 'curl' },
    { regex: /undici\/?([^\s(]*)|^node$/i, name: 'node' },
  ];

  for (const { regex, name } of knownPatterns) {
    const match = regex.exec(ua);
    if (match) {
      const version = match.slice(1).find(Boolean) || null;
      return { clientName: name, clientVersion: version };
    }
  }

  const firstProduct = /^([A-Za-z0-9._-]+)(?:\/([A-Za-z0-9._+-]+))?/.exec(ua);
  if (firstProduct) {
    const rawName = firstProduct[1];
    if (rawName === 'Mozilla') {
      return { clientName: 'browser', clientVersion: firstProduct[2] || null };
    }
    return {
      clientName: rawName.toLowerCase().slice(0, 64),
      clientVersion: firstProduct[2] ? firstProduct[2].slice(0, 32) : null,
    };
  }

  return { clientName: 'unknown', clientVersion: null };
};

/**
 * Extracts client IP from X-Forwarded-For or socket ONLY in-memory to compute
 * a privacy-safe hashed fallback session fingerprint. Raw IP is never logged.
 */
export const computeSessionFingerprint = (headers = {}, remoteAddress = '', nowMs = Date.now()) => {
  const xff = typeof headers['x-forwarded-for'] === 'string'
    ? headers['x-forwarded-for'].split(',')[0].trim()
    : '';
  const ip = xff || remoteAddress || 'unknown-ip';
  const ua = headers['user-agent'] || 'unknown-ua';
  const timeBucket = Math.floor(nowMs / SESSION_WINDOW_MS);
  const digest = crypto
    .createHash('sha256')
    .update(`mcp-fp:${ip}|${ua}|${timeBucket}`)
    .digest('hex')
    .slice(0, 16);
  return `fp_${digest}`;
};

/**
 * Resolves unified session & tracking identifiers across conversation args,
 * HTTP headers, MCP session token, and privacy-safe request fingerprint.
 */
export const resolveSessionDetails = ({
  args = {},
  headers = {},
  decodedToken = null,
  mintedToken = null,
  remoteAddress = '',
  nowMs = Date.now(),
} = {}) => {
  const conversationId = (typeof args.conversation_id === 'string' && args.conversation_id.trim())
    || (typeof headers['x-conversation-id'] === 'string' && headers['x-conversation-id'].trim())
    || undefined;

  const operationId = (typeof args.operation_id === 'string' && args.operation_id.trim())
    || (typeof headers['x-operation-id'] === 'string' && headers['x-operation-id'].trim())
    || undefined;

  const mcpSessionId = decodedToken?.mcpSessionId || mintedToken?.mcpSessionId || undefined;

  let sessionId;
  let sessionSource;
  if (conversationId) {
    sessionId = conversationId;
    sessionSource = 'conversation_id';
  } else if (mcpSessionId) {
    sessionId = mcpSessionId;
    sessionSource = 'mcp_session_id';
  } else {
    sessionId = computeSessionFingerprint(headers, remoteAddress, nowMs);
    sessionSource = 'fingerprint';
  }

  return {
    session_id: truncateString(sessionId, 128),
    session_source: sessionSource,
    mcp_session_id: mcpSessionId ? truncateString(mcpSessionId, 128) : undefined,
    conversation_id: conversationId ? truncateString(conversationId, 128) : undefined,
    operation_id: operationId ? truncateString(operationId, 128) : undefined,
  };
};

/**
 * Resolves client metadata from MCP initialize clientInfo, stateless session token,
 * custom headers, or HTTP User-Agent fallback.
 */
export const resolveClientDetails = ({
  initClientInfo = null,
  initProtocolVersion = null,
  decodedToken = null,
  headers = {},
} = {}) => {
  const headerClientName = headers['x-mcp-client-name'] || headers['x-client-name'];
  const headerClientVersion = headers['x-mcp-client-version'] || headers['x-client-version'];
  const headerProtocolVersion = headers['mcp-protocol-version'];
  const uaParsed = parseUserAgentClient(headers['user-agent']);

  const clientName = initClientInfo?.name
    || decodedToken?.clientName
    || headerClientName
    || uaParsed.clientName
    || 'unknown';

  const clientVersion = initClientInfo?.version
    || decodedToken?.clientVersion
    || headerClientVersion
    || uaParsed.clientVersion
    || undefined;

  const protocolVersion = initProtocolVersion
    || decodedToken?.protocolVersion
    || headerProtocolVersion
    || undefined;

  return {
    client_name: truncateString(String(clientName), 64),
    client_version: clientVersion ? truncateString(String(clientVersion), 32) : undefined,
    protocol_version: protocolVersion ? truncateString(String(protocolVersion), 24) : undefined,
  };
};

/**
 * Computes Levenshtein edit distance between two lowercase strings.
 */
export const levenshteinDistance = (a, b) => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  const curr = new Array(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost
      );
    }
    for (let j = 0; j <= b.length; j++) {
      prev[j] = curr[j];
    }
  }
  return prev[b.length];
};

/**
 * Suggests the closest registered MCP tool name when an agent requests a
 * hallucinated or misspelled tool (mcpspan "Missing Tools" feature).
 */
export const suggestClosestTool = (requestedTool, registeredTools = REGISTERED_MCP_TOOLS) => {
  if (typeof requestedTool !== 'string' || !requestedTool.trim() || !registeredTools.length) {
    return undefined;
  }

  const normalized = requestedTool
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[-\s.]+/g, '_')
    .toLowerCase();

  const reqTokens = new Set(normalized.split('_').filter(Boolean));
  let bestTool;
  let bestScore = -Infinity;

  for (const candidate of registeredTools) {
    const candNorm = candidate.toLowerCase();
    if (candNorm === normalized) {
      return candidate;
    }

    const dist = levenshteinDistance(normalized, candNorm);
    const maxLen = Math.max(normalized.length, candNorm.length, 1);
    const editSimilarity = 1 - dist / maxLen;

    const candTokens = candNorm.split('_').filter(Boolean);
    const sharedTokens = candTokens.filter(t => reqTokens.has(t)).length;
    const unionSize = new Set([...reqTokens, ...candTokens]).size || 1;
    const tokenJaccard = sharedTokens / unionSize;

    const substringBonus = (candNorm.includes(normalized) || normalized.includes(candNorm)) ? 0.25 : 0;
    const score = editSimilarity * 0.55 + tokenJaccard * 0.45 + substringBonus;

    if (score > bestScore) {
      bestScore = score;
      bestTool = candidate;
    }
  }

  return bestScore >= 0.38 ? bestTool : undefined;
};

/**
 * Safely clones, sanitizes, and hashes tool arguments.
 * Excludes meta keys (caption, conversation_id, operation_id) from args_hash
 * so identical domain queries within a session produce the same hash for loop detection.
 */
export const sanitizeAndHashArgs = (rawArgs) => {
  if (!rawArgs || typeof rawArgs !== 'object' || Array.isArray(rawArgs)) {
    return {
      sanitizedArgs: {},
      argKeys: [],
      extraArgKeys: undefined,
      argsHash: 'empty',
      caption: undefined,
    };
  }

  const sanitizedArgs = {};
  const domainArgsForHash = {};
  const argKeys = [];
  const extraArgKeys = [];

  // Explicitly include meta keys even if defined as non-enumerable getters
  const keySet = new Set([
    ...Object.keys(rawArgs),
    ...(['caption', 'conversation_id', 'operation_id'].filter(k => k in rawArgs)),
  ]);
  const keys = Array.from(keySet).sort();
  for (const key of keys) {
    const val = rawArgs[key];
    if (val === undefined) continue;

    if (!ALLOWED_ARG_KEYS.has(key)) {
      extraArgKeys.push(truncateString(key, 64));
      sanitizedArgs[truncateString(key, 64)] = '[REDACTED_UNEXPECTED_ARG]';
      domainArgsForHash[key] = typeof val === 'string' ? val.trim() : val;
      continue;
    }

    const cleanVal = typeof val === 'string'
      ? truncateString(val)
      : (typeof val === 'number' || typeof val === 'boolean' || val === null ? val : truncateString(JSON.stringify(val)));

    sanitizedArgs[key] = cleanVal;

    if (!META_ARG_KEYS.has(key)) {
      argKeys.push(key);
      domainArgsForHash[key] = typeof val === 'string' ? val.trim() : val;
    }
  }

  const argsHash = argKeys.length === 0 && extraArgKeys.length === 0
    ? 'empty'
    : crypto.createHash('sha256').update(JSON.stringify(domainArgsForHash)).digest('hex').slice(0, 16);

  return {
    sanitizedArgs,
    argKeys,
    extraArgKeys: extraArgKeys.length > 0 ? extraArgKeys : undefined,
    argsHash,
    caption: typeof sanitizedArgs.caption === 'string' ? sanitizedArgs.caption : undefined,
  };
};

/**
 * Classifies MCP method into high-level mcpspan action primitive.
 */
export const classifyActionType = (method) => {
  if (typeof method !== 'string') return 'protocol';
  if (method === 'tools/call') return 'tool';
  if (method === 'tools/list') return 'discovery';
  if (method === 'initialize' || method === 'notifications/initialized' || method === 'ping') {
    return 'lifecycle';
  }
  if (method.startsWith('resources/')) return 'resource';
  if (method.startsWith('prompts/')) return 'prompt';
  if (method.startsWith('notifications/')) return 'notification';
  return 'protocol';
};

/**
 * Classifies execution outcome into mcpspan error & status categories:
 * - success
 * - missing_tool
 * - refused_argument
 * - error_result
 * - error_thrown
 * - unsupported_method
 * - protocol_error
 */
export const classifyMcpOutcome = ({
  method,
  toolName,
  registeredTools = REGISTERED_MCP_TOOLS,
  handlerEntered = true,
  thrownError = null,
  responseMessage = null,
} = {}) => {
  if (responseMessage?.error) {
    const rpcCode = responseMessage.error.code;
    const rpcMsg = responseMessage.error.message || 'JSON-RPC error';
    if (rpcCode === -32601) {
      return {
        status: 'unsupported_method',
        error_type: 'MethodNotFound',
        error_message: truncateString(rpcMsg, 256),
        statusCode: 400,
      };
    }
    if (rpcCode === -32602 && method === 'tools/call') {
      return {
        status: 'refused_argument',
        error_type: 'InvalidParams',
        error_message: truncateString(rpcMsg, 256),
        statusCode: 400,
      };
    }
    return {
      status: 'protocol_error',
      error_type: `JsonRpcError_${rpcCode ?? 'unknown'}`,
      error_message: truncateString(rpcMsg, 256),
      statusCode: 400,
    };
  }

  if (method === 'tools/call') {
    const isRegistered = Boolean(toolName && registeredTools.includes(toolName));
    if (!isRegistered) {
      const resultText = responseMessage?.result?.content?.[0]?.text;
      return {
        status: 'missing_tool',
        error_type: 'MissingTool',
        error_message: truncateString(resultText || `Tool ${toolName || '<empty>'} not found`, 256),
        suggested_tool: suggestClosestTool(toolName, registeredTools),
        statusCode: 404,
      };
    }

    if (thrownError) {
      const code = thrownError.statusCode ?? thrownError.status;
      if (code === 400) {
        return {
          status: 'refused_argument',
          error_type: thrownError.name || 'BadRequestError',
          error_message: truncateString(thrownError.message || 'Invalid tool argument', 256),
          statusCode: 400,
        };
      }
      return {
        status: 'error_thrown',
        error_type: thrownError.name || 'Error',
        error_message: truncateString(thrownError.message || 'Internal tool error', 256),
        statusCode: typeof code === 'number' ? code : 500,
      };
    }

    if (responseMessage?.result?.isError) {
      const errText = responseMessage.result.content?.[0]?.text || 'Tool returned error';
      if (
        !handlerEntered
        || errText.includes('Input validation error:')
        || errText.includes('Invalid arguments for tool')
      ) {
        return {
          status: 'refused_argument',
          error_type: 'SchemaValidationError',
          error_message: truncateString(errText, 256),
          statusCode: 400,
        };
      }
      return {
        status: 'error_result',
        error_type: 'ToolErrorResult',
        error_message: truncateString(errText, 256),
        statusCode: 400,
      };
    }
  }

  return {
    status: 'success',
    error_type: undefined,
    error_message: undefined,
    suggested_tool: undefined,
    statusCode: 200,
  };
};

/**
 * Extracts result_count and empty_result from raw data or serialized CallToolResult.
 */
export const summarizeToolResult = (rawData, responseMessage) => {
  if (rawData !== undefined) {
    if (Array.isArray(rawData)) {
      return { result_count: rawData.length, empty_result: rawData.length === 0 };
    }
    if (rawData === null) {
      return { result_count: 0, empty_result: true };
    }
    if (typeof rawData === 'object') {
      const keys = Object.keys(rawData);
      return { result_count: keys.length > 0 ? 1 : 0, empty_result: keys.length === 0 };
    }
    return { result_count: 1, empty_result: false };
  }

  const text = responseMessage?.result?.content?.[0]?.text;
  if (typeof text === 'string' && !responseMessage?.result?.isError) {
    const trimmed = text.trim();
    if (trimmed === '[]' || trimmed === '{}' || trimmed === 'null' || trimmed === '') {
      return { result_count: 0, empty_result: true };
    }
  }

  return { result_count: undefined, empty_result: false };
};

/**
 * Builds the structured Cloud Logging event payload for an MCP server operation.
 */
export const buildMcpOperationPayload = ({
  method,
  toolName,
  actionType,
  outcome,
  durationMs,
  requestSizeBytes,
  responseSizeBytes,
  resultSummary,
  argSummary,
  sessionDetails,
  clientDetails,
  headers = {},
  serverVersion = MCP_SERVER_VERSION,
  serverRevision = process.env.K_REVISION || 'local',
} = {}) => {
  const payload = {
    event_name: MCP_EVENT_NAME,
    action_type: actionType,
    mcp_method: method,
    status: outcome.status,
    duration_ms: typeof durationMs === 'number' ? Math.round(durationMs * 100) / 100 : undefined,
    request_size_bytes: requestSizeBytes,
    response_size_bytes: responseSizeBytes,
    ...sessionDetails,
    ...clientDetails,
    user_agent: headers['user-agent'],
    host: headers.host,
    server_version: serverVersion,
    server_revision: serverRevision,
  };

  if (method === 'tools/call') {
    payload.tool = toolName;
    payload.arguments = argSummary?.sanitizedArgs;
    payload.arg_keys = argSummary?.argKeys;
    if (argSummary?.extraArgKeys) {
      payload.extra_arg_keys = argSummary.extraArgKeys;
    }
    payload.args_hash = argSummary?.argsHash;
    payload.caption = argSummary?.caption;
    if (outcome.status === 'success') {
      payload.empty_result = Boolean(resultSummary?.empty_result);
      if (resultSummary?.result_count !== undefined) {
        payload.result_count = resultSummary.result_count;
      }
    } else {
      payload.empty_result = false;
    }
  }

  if (outcome.suggested_tool) {
    payload.suggested_tool = outcome.suggested_tool;
  }
  if (outcome.error_type) {
    payload.error_type = outcome.error_type;
  }
  if (outcome.error_message) {
    payload.error_message = outcome.error_message;
  }
  if (outcome.statusCode && outcome.statusCode !== 200) {
    payload.statusCode = outcome.statusCode;
  }

  // Strip undefined properties so JSON logs stay compact
  return Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined));
};

// ============================================================================
// Imperative Shell: Transport + McpServer Instrumentation
// ============================================================================

const parseIncomingBody = (rawBody) => {
  let body = rawBody;
  let requestSizeBytes;

  if (Buffer.isBuffer(rawBody)) {
    requestSizeBytes = rawBody.byteLength;
    body = rawBody.toString('utf8');
  } else if (typeof rawBody === 'string') {
    requestSizeBytes = Buffer.byteLength(rawBody, 'utf8');
  } else if (rawBody && typeof rawBody === 'object') {
    requestSizeBytes = Buffer.byteLength(JSON.stringify(rawBody), 'utf8');
  }

  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return { parsedMessages: null, requestSizeBytes, parseFailed: true };
    }
  }

  if (Array.isArray(body)) {
    return { parsedMessages: body, requestSizeBytes, parseFailed: false };
  }
  if (body && typeof body === 'object') {
    return { parsedMessages: [body], requestSizeBytes, parseFailed: false };
  }
  return { parsedMessages: null, requestSizeBytes, parseFailed: Boolean(rawBody) };
};

const emitMcpSpanLog = (payload, thrownError = null) => {
  const message = payload.mcp_method === 'tools/call'
    ? `MCP Tool Call: ${payload.tool || 'unknown'}`
    : `MCP ${payload.action_type}: ${payload.mcp_method}`;

  // Emit all analytics spans at INFO so client errors (missing_tool, refused_argument)
  // never trigger Cloud Monitoring WARNING/ERROR alert policies.
  logger.info(message, payload);

  // For genuine 5xx runtime/backend exceptions, also log ERROR with stack_trace
  // so Cloud Error Reporting and alerting capture backend failures.
  if (payload.status === 'error_thrown' && thrownError instanceof Error) {
    logger.error(`MCP Tool Execution Error (${payload.tool || 'unknown'})`, thrownError);
  }
};

/**
 * Creates a per-request MCP analytics tracker and instruments McpServer + Transport.
 */
export const createMcpAnalyticsSession = (req, res) => {
  const headers = req?.headers || {};
  const remoteAddress = req?.socket?.remoteAddress || req?.ip || '';
  const decodedToken = decodeSessionToken(headers['mcp-session-id']);
  const registeredTools = [];

  // Map<requestId, { startMs, message, argSummary, rawData, thrownError, logged }>
  const inflightById = new Map();
  let initClientInfo = null;
  let initProtocolVersion = null;
  let mintedToken = null;
  let anySpanLogged = false;

  const prepareRequestMessages = () => {
    if (req?.method !== 'POST') return null;

    const { parsedMessages, requestSizeBytes, parseFailed } = parseIncomingBody(req.body);
    if (parseFailed) {
      return { parsedMessages: null, requestSizeBytes, parseFailed: true };
    }
    if (!parsedMessages) return null;

    // Pre-extract arguments synchronously so malformed/throwing getters surface cleanly,
    // and mint stateless Mcp-Session-Id header before transport writes response headers.
    const prepared = [];
    for (const msg of parsedMessages) {
      if (!msg || typeof msg !== 'object') continue;
      if (msg.method === 'initialize') {
        initClientInfo = msg.params?.clientInfo || null;
        initProtocolVersion = msg.params?.protocolVersion || null;
        const tokenString = encodeSessionToken({
          clientName: initClientInfo?.name,
          clientVersion: initClientInfo?.version,
          protocolVersion: initProtocolVersion,
        });
        mintedToken = decodeSessionToken(tokenString);
        if (typeof res?.setHeader === 'function') {
          res.setHeader('mcp-session-id', tokenString);
        }
      }

      const argSummary = msg.method === 'tools/call'
        ? sanitizeAndHashArgs(msg.params?.arguments)
        : undefined;

      prepared.push({ msg, argSummary, requestSizeBytes });
    }

    return { parsedMessages: prepared, requestSizeBytes, parseFailed: false };
  };

  const instrumentServer = (mcpServer) => {
    if (!mcpServer || typeof mcpServer.tool !== 'function') return mcpServer;
    const origTool = mcpServer.tool.bind(mcpServer);

    mcpServer.tool = (name, ...rest) => {
      if (!registeredTools.includes(name)) {
        registeredTools.push(name);
      }
      const cbIndex = rest.length - 1;
      const origCallback = rest[cbIndex];
      if (typeof origCallback !== 'function') {
        return origTool(name, ...rest);
      }

      const wrappedCallback = async (...cbArgs) => {
        const extra = cbArgs.length > 1 ? cbArgs[1] : cbArgs[0];
        const reqId = extra?.requestId;
        const entry = reqId !== undefined ? inflightById.get(reqId) : undefined;
        if (entry) {
          entry.handlerEntered = true;
        }
        try {
          const result = await origCallback(...cbArgs);
          if (entry && entry.rawData === undefined && result?.__rawData !== undefined) {
            entry.rawData = result.__rawData;
          }
          return result;
        } catch (err) {
          if (entry) {
            entry.thrownError = err;
          }
          throw err;
        }
      };

      const nextArgs = [...rest];
      nextArgs[cbIndex] = wrappedCallback;
      return origTool(name, ...nextArgs);
    };

    return mcpServer;
  };

  const recordToolData = (extra, data) => {
    const reqId = extra?.requestId;
    if (reqId !== undefined && inflightById.has(reqId)) {
      inflightById.get(reqId).rawData = data;
    }
  };

  const attachTransport = (transport, preparedInfo) => {
    if (!transport) return { usedLiveHooks: false };

    const preparedById = new Map();
    if (preparedInfo?.parsedMessages) {
      for (const item of preparedInfo.parsedMessages) {
        if (item.msg.id !== undefined && item.msg.id !== null) {
          preparedById.set(item.msg.id, item);
        }
      }
    }

    const origOnMessage = transport.onmessage;
    const origSend = typeof transport.send === 'function' ? transport.send.bind(transport) : null;
    const origOnError = transport.onerror;

    if (typeof origOnMessage !== 'function' || !origSend) {
      // Stub/mock transport in unit tests where server.connect() is a no-op
      return { usedLiveHooks: false };
    }

    transport.onmessage = (message, extra) => {
      try {
        if (message && typeof message === 'object' && message.method) {
          const prep = message.id !== undefined ? preparedById.get(message.id) : undefined;
          const argSummary = prep?.argSummary || (
            message.method === 'tools/call' ? sanitizeAndHashArgs(message.params?.arguments) : undefined
          );
          const startMs = performance.now();

          if (message.id !== undefined && message.id !== null) {
            inflightById.set(message.id, {
              startMs,
              message,
              argSummary,
              requestSizeBytes: prep?.requestSizeBytes ?? preparedInfo?.requestSizeBytes,
              handlerEntered: false,
              rawData: undefined,
              thrownError: null,
              logged: false,
            });
          } else {
            // JSON-RPC notification (e.g. notifications/initialized) — no response via send()
            const actionType = classifyActionType(message.method);
            const sessionDetails = resolveSessionDetails({
              headers,
              decodedToken,
              mintedToken,
              remoteAddress,
            });
            const clientDetails = resolveClientDetails({
              initClientInfo,
              initProtocolVersion,
              decodedToken,
              headers,
            });
            const payload = buildMcpOperationPayload({
              method: message.method,
              actionType,
              outcome: { status: 'success', statusCode: 202 },
              durationMs: 0,
              requestSizeBytes: preparedInfo?.requestSizeBytes,
              responseSizeBytes: 0,
              sessionDetails,
              clientDetails,
              headers,
            });
            anySpanLogged = true;
            emitMcpSpanLog(payload);
          }
        }
      } catch (err) {
        logger.error('Failed to log MCP incoming message', err);
      }
      return origOnMessage(message, extra);
    };

    transport.send = async (responseMessage, options) => {
      try {
        const reqId = responseMessage?.id ?? options?.relatedRequestId;
        const entry = reqId !== undefined ? inflightById.get(reqId) : undefined;

        if (entry && !entry.logged && (responseMessage?.result !== undefined || responseMessage?.error !== undefined)) {
          entry.logged = true;
          const durationMs = performance.now() - entry.startMs;
          const responseSizeBytes = Buffer.byteLength(JSON.stringify(responseMessage), 'utf8');
          const method = entry.message.method;
          const toolName = method === 'tools/call' ? entry.message.params?.name : undefined;
          const toolsList = registeredTools.length > 0 ? registeredTools : REGISTERED_MCP_TOOLS;

          const outcome = classifyMcpOutcome({
            method,
            toolName,
            registeredTools: toolsList,
            handlerEntered: entry.handlerEntered,
            thrownError: entry.thrownError,
            responseMessage,
          });
          const resultSummary = method === 'tools/call'
            ? summarizeToolResult(entry.rawData, responseMessage)
            : undefined;
          const sessionDetails = resolveSessionDetails({
            args: entry.message.params?.arguments,
            headers,
            decodedToken,
            mintedToken,
            remoteAddress,
          });
          const clientDetails = resolveClientDetails({
            initClientInfo,
            initProtocolVersion,
            decodedToken,
            headers,
          });

          const payload = buildMcpOperationPayload({
            method,
            toolName,
            actionType: classifyActionType(method),
            outcome,
            durationMs,
            requestSizeBytes: entry.requestSizeBytes,
            responseSizeBytes,
            resultSummary,
            argSummary: entry.argSummary,
            sessionDetails,
            clientDetails,
            headers,
          });

          // Log BEFORE origSend flushes/closes the response stream (Cloud Run CPU lifecycle safe)
          anySpanLogged = true;
          emitMcpSpanLog(payload, entry.thrownError);
        }
      } catch (err) {
        logger.error('Failed to log MCP response span', err);
      }

      return origSend(responseMessage, options);
    };

    transport.onerror = (error) => {
      try {
        if (!anySpanLogged && req?.method === 'POST') {
          const sessionDetails = resolveSessionDetails({
            headers,
            decodedToken,
            mintedToken,
            remoteAddress,
          });
          const clientDetails = resolveClientDetails({
            initClientInfo,
            initProtocolVersion,
            decodedToken,
            headers,
          });
          const payload = buildMcpOperationPayload({
            method: 'unknown',
            actionType: 'protocol',
            outcome: {
              status: 'protocol_error',
              error_type: error?.name || 'TransportError',
              error_message: truncateString(error?.message || String(error), 256),
              statusCode: 400,
            },
            requestSizeBytes: preparedInfo?.requestSizeBytes,
            sessionDetails,
            clientDetails,
            headers,
          });
          anySpanLogged = true;
          emitMcpSpanLog(payload);
        }
      } catch (err) {
        logger.error('Failed to log MCP transport error', err);
      }
      if (typeof origOnError === 'function') {
        origOnError(error);
      }
    };

    return { usedLiveHooks: true };
  };

  /**
   * Emits pre-request fallback spans ONLY when transport/server are mocked stubs
   * (e.g. unit tests mocking McpServer.connect as a no-op).
   */
  const emitFallbackIfUninstrumented = (preparedInfo) => {
    if (anySpanLogged || !preparedInfo?.parsedMessages) return;
    const toolsList = registeredTools.length > 0 ? registeredTools : REGISTERED_MCP_TOOLS;

    for (const { msg, argSummary, requestSizeBytes } of preparedInfo.parsedMessages) {
      if (!msg?.method) continue;
      const toolName = msg.method === 'tools/call' ? msg.params?.name : undefined;
      const outcome = classifyMcpOutcome({
        method: msg.method,
        toolName,
        registeredTools: toolsList,
      });
      const sessionDetails = resolveSessionDetails({
        args: msg.params?.arguments,
        headers,
        decodedToken,
        mintedToken,
        remoteAddress,
      });
      const clientDetails = resolveClientDetails({
        initClientInfo,
        initProtocolVersion,
        decodedToken,
        headers,
      });
      const payload = buildMcpOperationPayload({
        method: msg.method,
        toolName,
        actionType: classifyActionType(msg.method),
        outcome,
        durationMs: 0,
        requestSizeBytes,
        argSummary,
        sessionDetails,
        clientDetails,
        headers,
      });
      anySpanLogged = true;
      emitMcpSpanLog(payload);
    }
  };

  return {
    prepareRequestMessages,
    instrumentServer,
    recordToolData,
    attachTransport,
    emitFallbackIfUninstrumented,
  };
};
