import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';

const mockQueryTechnologies = jest.fn();
const mockQueryCategories = jest.fn();
const mockQueryReport = jest.fn();
const mockQueryRanks = jest.fn();
const mockQueryGeos = jest.fn();
const mockQueryVersions = jest.fn();
const mockQueryCWVDistribution = jest.fn();

jest.unstable_mockModule('../utils/reportService.js', () => ({
  queryTechnologies: mockQueryTechnologies,
  queryCategories: mockQueryCategories,
  queryReport: mockQueryReport,
  queryRanks: mockQueryRanks,
  queryGeos: mockQueryGeos,
  queryVersions: mockQueryVersions,
  queryCWVDistribution: mockQueryCWVDistribution,
}));

/**
 * Lightweight in-memory MCP Transport implementing the SDK Transport interface
 * so real McpServer + Protocol execution runs without binding TCP ports.
 */
class InMemoryMcpTransport {
  constructor() {
    this.sentMessages = [];
    this.onmessage = undefined;
    this.onerror = undefined;
    this.onclose = undefined;
  }

  async start() {}

  async close() {
    this.onclose?.();
  }

  async send(message) {
    this.sentMessages.push(message);
  }

  async receive(jsonRpcMessage) {
    await this.onmessage?.(jsonRpcMessage, { requestInfo: { headers: {} } });
    // Yield microtasks so async McpServer request handlers finish calling transport.send()
    await new Promise(resolve => setImmediate(resolve));
  }
}

describe('MCP Analytics Functional Core & End-to-End Telemetry', () => {
  let analyticsModule;
  let createMcpServer;

  beforeAll(async () => {
    analyticsModule = await import('../utils/mcpAnalytics.js');
    const handlerModule = await import('../mcpHandler.js');
    createMcpServer = handlerModule.createMcpServer;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Pure Functional Core', () => {
    it('encodes and decodes stateless session tokens with client metadata', () => {
      const { encodeSessionToken, decodeSessionToken } = analyticsModule;

      const token = encodeSessionToken({
        sessionId: 'abc-123',
        clientName: 'claude-code',
        clientVersion: '2.1.322',
        protocolVersion: '2025-03-26',
      });

      // Must strictly contain visible US-ASCII (0x21..0x7E) per MCP Streamable HTTP spec
      expect(token).toMatch(/^[\x21-\x7E]+$/);

      const decoded = decodeSessionToken(token);
      expect(decoded).toEqual({
        mcpSessionId: 's1_abc-123',
        rawHeader: token,
        clientName: 'claude-code',
        clientVersion: '2.1.322',
        protocolVersion: '2025-03-26',
      });
    });

    it('gracefully decodes external or malformed mcp-session-id headers', () => {
      const { decodeSessionToken } = analyticsModule;

      expect(decodeSessionToken(undefined)).toBeNull();
      expect(decodeSessionToken('   ')).toBeNull();
      expect(decodeSessionToken('external-uuid-999')).toEqual({
        mcpSessionId: 'external-uuid-999',
        rawHeader: 'external-uuid-999',
        clientName: null,
        clientVersion: null,
        protocolVersion: null,
      });
      expect(decodeSessionToken('s1.uuid-only.not-valid-base64!!!')).toMatchObject({
        mcpSessionId: 's1_uuid-only',
        clientName: null,
      });
    });

    it('parses known AI agent and HTTP client User-Agent strings', () => {
      const { parseUserAgentClient } = analyticsModule;

      expect(parseUserAgentClient('claude-code/2.1.322 (cli)')).toEqual({
        clientName: 'claude-code',
        clientVersion: '2.1.322',
      });
      expect(parseUserAgentClient('Cursor/0.48.2')).toEqual({
        clientName: 'cursor',
        clientVersion: '0.48.2',
      });
      expect(parseUserAgentClient('Go-http-client/2.0')).toEqual({
        clientName: 'go-http-client',
        clientVersion: '2.0',
      });
      expect(parseUserAgentClient('curl/8.7.1')).toEqual({
        clientName: 'curl',
        clientVersion: '8.7.1',
      });
      expect(parseUserAgentClient('')).toEqual({
        clientName: 'unknown',
        clientVersion: null,
      });
    });

    it('suggests closest registered tool names for hallucinated or misspelled tools', () => {
      const { suggestClosestTool } = analyticsModule;

      expect(suggestClosestTool('get_cwv')).toBe('get_cwv_metrics');
      expect(suggestClosestTool('getCwvMetrics')).toBe('get_cwv_metrics');
      expect(suggestClosestTool('list_technologies')).toBe('search_technologies');
      expect(suggestClosestTool('get_adoption')).toBe('get_adoption_metrics');
      expect(suggestClosestTool('page_weight')).toBe('get_page_weight_metrics');
      expect(suggestClosestTool('completely_unrelated_xyz_999')).toBeUndefined();
    });

    it('computes deterministic args_hash excluding meta fields for loop detection', () => {
      const { sanitizeAndHashArgs } = analyticsModule;

      const first = sanitizeAndHashArgs({
        technology: 'WordPress',
        geo: 'IT',
        caption: 'First attempt',
        conversation_id: 'conv-1',
        operation_id: 'op-1',
      });

      const second = sanitizeAndHashArgs({
        geo: 'IT',
        technology: 'WordPress',
        caption: 'Second retry with different caption',
        conversation_id: 'conv-1',
        operation_id: 'op-2',
      });

      expect(first.argsHash).toBe(second.argsHash);
      expect(first.argKeys).toEqual(['geo', 'technology']);
      expect(first.sanitizedArgs).toMatchObject({
        technology: 'WordPress',
        geo: 'IT',
        caption: 'First attempt',
      });

      const withUnexpected = sanitizeAndHashArgs({
        technology: 'React',
        secret_token: 'should-not-be-logged',
      });
      expect(withUnexpected.extraArgKeys).toEqual(['secret_token']);
      expect(withUnexpected.sanitizedArgs.secret_token).toBe('[REDACTED_UNEXPECTED_ARG]');
    });

    it('resolves session priority: conversation_id > mcp_session_id > privacy-safe fingerprint', () => {
      const { resolveSessionDetails } = analyticsModule;

      const fromConv = resolveSessionDetails({
        args: { conversation_id: 'conv-abc' },
        decodedToken: { mcpSessionId: 's1_token-id' },
        headers: { 'x-forwarded-for': '203.0.113.10', 'user-agent': 'curl/8.7.1' },
      });
      expect(fromConv.session_id).toBe('conv-abc');
      expect(fromConv.session_source).toBe('conversation_id');
      expect(fromConv.mcp_session_id).toBe('s1_token-id');

      const fromMcpSession = resolveSessionDetails({
        decodedToken: { mcpSessionId: 's1_token-id' },
        headers: { 'x-forwarded-for': '203.0.113.10', 'user-agent': 'curl/8.7.1' },
      });
      expect(fromMcpSession.session_id).toBe('s1_token-id');
      expect(fromMcpSession.session_source).toBe('mcp_session_id');

      const fromFingerprint = resolveSessionDetails({
        headers: { 'x-forwarded-for': '203.0.113.10', 'user-agent': 'curl/8.7.1' },
        nowMs: 1_700_000_000_000,
      });
      expect(fromFingerprint.session_id).toMatch(/^fp_[\da-f]{16}$/);
      expect(fromFingerprint.session_source).toBe('fingerprint');
      expect(JSON.stringify(fromFingerprint)).not.toContain('203.0.113.10');
    });
  });

  describe('End-to-End McpServer + Transport Telemetry', () => {
    const runMcpExchange = async ({ body, headers = {} }) => {
      const responseHeaders = {};
      const req = {
        method: 'POST',
        headers: {
          'user-agent': 'Go-http-client/2.0',
          host: 'cdn.httparchive.org',
          ...headers,
        },
        body,
      };
      const res = {
        setHeader: (k, v) => {
          responseHeaders[k.toLowerCase()] = v;
        },
      };

      const analytics = analyticsModule.createMcpAnalyticsSession(req, res);
      const transport = new InMemoryMcpTransport();
      const server = createMcpServer(analytics);
      await server.connect(transport);

      const prepared = analytics.prepareRequestMessages();
      analytics.attachTransport(transport, prepared);

      const messages = Array.isArray(body) ? body : [body];
      for (const msg of messages) {
        await transport.receive(msg);
      }

      await server.close();
      return { responseHeaders, sentMessages: transport.sentMessages };
    };

    const extractMcpSpans = (consoleSpy) => consoleSpy.mock.calls
      .map(call => {
        try {
          return JSON.parse(call[0]);
        } catch {
          return null;
        }
      })
      .filter(entry => entry && entry.event_name === 'mcp.server.operation');

    it('mints stateless mcp-session-id on initialize and propagates client details to tools/call', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      mockQueryTechnologies.mockResolvedValue([
        { technology: 'WordPress', category: 'CMS' },
        { technology: 'Drupal', category: 'CMS' },
      ]);

      // Step 1: MCP initialize handshake
      const { responseHeaders } = await runMcpExchange({
        body: {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2025-03-26',
            capabilities: {},
            clientInfo: {
              name: 'antigravity-client',
              version: '1.4.0',
            },
          },
        },
      });

      const sessionHeader = responseHeaders['mcp-session-id'];
      expect(sessionHeader).toBeDefined();
      expect(sessionHeader).toMatch(/^s1\./);

      // Step 2: Subsequent notifications/initialized + tools/call echoing mcp-session-id
      await runMcpExchange({
        headers: { 'mcp-session-id': sessionHeader },
        body: {
          jsonrpc: '2.0',
          method: 'notifications/initialized',
        },
      });

      await runMcpExchange({
        headers: { 'mcp-session-id': sessionHeader },
        body: {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'search_technologies',
            arguments: {
              category: 'CMS',
              caption: 'Find popular CMS platforms',
            },
          },
        },
      });

      const spans = extractMcpSpans(logSpy);
      expect(spans).toHaveLength(3);

      const [initSpan, notifSpan, toolSpan] = spans;
      expect(initSpan).toMatchObject({
        event_name: 'mcp.server.operation',
        action_type: 'lifecycle',
        mcp_method: 'initialize',
        status: 'success',
        client_name: 'antigravity-client',
        client_version: '1.4.0',
        protocol_version: '2025-03-26',
      });

      expect(notifSpan).toMatchObject({
        action_type: 'lifecycle',
        mcp_method: 'notifications/initialized',
        status: 'success',
        client_name: 'antigravity-client',
        session_id: initSpan.session_id,
      });

      expect(toolSpan).toMatchObject({
        event_name: 'mcp.server.operation',
        action_type: 'tool',
        mcp_method: 'tools/call',
        tool: 'search_technologies',
        status: 'success',
        empty_result: false,
        result_count: 2,
        client_name: 'antigravity-client',
        client_version: '1.4.0',
        protocol_version: '2025-03-26',
        session_id: initSpan.session_id,
        session_source: 'mcp_session_id',
        caption: 'Find popular CMS platforms',
        arg_keys: ['category'],
      });
      expect(typeof toolSpan.duration_ms).toBe('number');
      expect(toolSpan.response_size_bytes).toBeGreaterThan(50);

      logSpy.mockRestore();
    });

    it('flags empty_result: true when a valid tool query returns zero rows', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      mockQueryReport.mockResolvedValue([]);

      await runMcpExchange({
        body: {
          jsonrpc: '2.0',
          id: 10,
          method: 'tools/call',
          params: {
            name: 'get_cwv_metrics',
            arguments: {
              technology: 'iubenda',
              geo: 'IT',
              start: 'latest',
            },
          },
        },
      });

      const [span] = extractMcpSpans(logSpy);
      expect(span).toMatchObject({
        tool: 'get_cwv_metrics',
        status: 'success',
        empty_result: true,
        result_count: 0,
      });

      logSpy.mockRestore();
    });

    it('categorizes hallucinated tools as missing_tool with nearest suggested_tool', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await runMcpExchange({
        body: {
          jsonrpc: '2.0',
          id: 11,
          method: 'tools/call',
          params: {
            name: 'get_cwv',
            arguments: { technology: 'WordPress' },
          },
        },
      });

      const [span] = extractMcpSpans(logSpy);
      expect(span).toMatchObject({
        severity: 'INFO',
        tool: 'get_cwv',
        status: 'missing_tool',
        suggested_tool: 'get_cwv_metrics',
        error_type: 'MissingTool',
        statusCode: 404,
      });
      // Must NOT emit ERROR logs for client hallucinations
      expect(errorSpy).not.toHaveBeenCalled();

      logSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it('categorizes Zod schema validation and 400 domain errors as refused_argument', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // 1. Missing required `technology` parameter (Zod validation error)
      await runMcpExchange({
        body: {
          jsonrpc: '2.0',
          id: 12,
          method: 'tools/call',
          params: {
            name: 'get_cwv_metrics',
            arguments: { geo: 'ALL' },
          },
        },
      });

      // 2. Domain 400 error thrown by reportService (e.g. >30 technologies)
      const domainErr = new Error('Too many technologies specified. Maximum 30 allowed.');
      domainErr.statusCode = 400;
      mockQueryTechnologies.mockRejectedValueOnce(domainErr);

      await runMcpExchange({
        body: {
          jsonrpc: '2.0',
          id: 13,
          method: 'tools/call',
          params: {
            name: 'search_technologies',
            arguments: { technology: 'a,b,c' },
          },
        },
      });

      const spans = extractMcpSpans(logSpy);
      expect(spans).toHaveLength(2);
      expect(spans[0]).toMatchObject({
        tool: 'get_cwv_metrics',
        status: 'refused_argument',
        error_type: 'SchemaValidationError',
        statusCode: 400,
      });
      expect(spans[1]).toMatchObject({
        tool: 'search_technologies',
        status: 'refused_argument',
        error_message: 'Too many technologies specified. Maximum 30 allowed.',
        statusCode: 400,
      });
      expect(errorSpy).not.toHaveBeenCalled();

      logSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it('categorizes 500 backend exceptions as error_thrown and emits stack_trace to error log', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockQueryRanks.mockRejectedValueOnce(new Error('AlloyDB connection timeout'));

      await runMcpExchange({
        body: {
          jsonrpc: '2.0',
          id: 14,
          method: 'tools/call',
          params: {
            name: 'list_ranks',
            arguments: {},
          },
        },
      });

      const [span] = extractMcpSpans(logSpy);
      expect(span).toMatchObject({
        tool: 'list_ranks',
        status: 'error_thrown',
        error_message: 'AlloyDB connection timeout',
        statusCode: 500,
      });

      expect(errorSpy).toHaveBeenCalledTimes(1);
      const errorEntry = JSON.parse(errorSpy.mock.calls[0][0]);
      expect(errorEntry.severity).toBe('ERROR');
      expect(errorEntry.stack_trace).toContain('AlloyDB connection timeout');

      logSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it('logs unsupported_method when an agent probes resources/list', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await runMcpExchange({
        body: {
          jsonrpc: '2.0',
          id: 15,
          method: 'resources/list',
          params: {},
        },
      });

      const [span] = extractMcpSpans(logSpy);
      expect(span).toMatchObject({
        action_type: 'resource',
        mcp_method: 'resources/list',
        status: 'unsupported_method',
        error_type: 'MethodNotFound',
      });

      logSpy.mockRestore();
    });
  });
});
