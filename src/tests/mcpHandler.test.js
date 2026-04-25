import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';

jest.unstable_mockModule('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: class {
    tool() {}
    connect() {}
    close() {}
  }
}), { virtual: true });

jest.unstable_mockModule('@modelcontextprotocol/sdk/server/streamableHttp.js', () => ({
  StreamableHTTPServerTransport: class {
    close() {}
    async handleRequest() {}
  }
}), { virtual: true });

describe('mcpHandler Telemetry and Handlers', () => {
    let handleMcp;

    beforeAll(async () => {
        const module = await import('../mcpHandler.js');
        handleMcp = module.handleMcp;
    });

    it('should log telemetry for MCP tools/call request with arguments context', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        const mockReq = {
            method: 'POST',
            body: {
                jsonrpc: '2.0',
                method: 'tools/call',
                params: {
                    name: 'get_cwv_metrics',
                    arguments: {
                        technology: 'WordPress',
                        caption: 'Analyze CWV for WordPress',
                        conversation_id: 'conv-123',
                        operation_id: 'op-456'
                    }
                }
            },
            headers: {
                'user-agent': 'test-agent/1.0',
                'host': 'localhost'
            }
        };

        const mockRes = {
            on: jest.fn(),
            writeHead: jest.fn(),
            setHeader: jest.fn(),
            write: jest.fn(),
            end: jest.fn()
        };

        // Execution
        await handleMcp(mockReq, mockRes);

        // Verification
        expect(consoleSpy).toHaveBeenCalled();
        const loggedCall = consoleSpy.mock.calls.find(call => 
            typeof call[0] === 'string' && call[0].includes('MCP Tool Call')
        );
        expect(loggedCall).toBeDefined();

        const logPayload = JSON.parse(loggedCall[0]);
        expect(logPayload.severity).toBe('INFO');
        expect(logPayload.tool).toBe('get_cwv_metrics');
        expect(logPayload.caption).toBe('Analyze CWV for WordPress');
        expect(logPayload.conversation_id).toBe('conv-123');
        expect(logPayload.operation_id).toBe('op-456');
        expect(logPayload.user_agent).toBe('test-agent/1.0');

        consoleSpy.mockRestore();
    });

    it('should fall back to HTTP headers for tracking IDs if absent in arguments', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        const mockReq = {
            method: 'POST',
            body: {
                method: 'tools/call',
                params: {
                    name: 'search_technologies',
                    arguments: {
                        // explicitly ommiting caption, operation_id and conversation_id
                    }
                }
            },
            headers: {
                'x-conversation-id': 'header-conv-id',
                'x-operation-id': 'header-op-id',
                'user-agent': 'fallback-agent/2.0'
            }
        };

        const mockRes = {
            on: jest.fn(),
            writeHead: jest.fn(),
            setHeader: jest.fn(),
            write: jest.fn(),
            end: jest.fn()
        };

        await handleMcp(mockReq, mockRes);

        const loggedCall = consoleSpy.mock.calls.find(call => 
            typeof call[0] === 'string' && call[0].includes('MCP Tool Call')
        );
        const logPayload = JSON.parse(loggedCall[0]);
        
        expect(logPayload.conversation_id).toBe('header-conv-id');
        expect(logPayload.operation_id).toBe('header-op-id');
        expect(logPayload.user_agent).toBe('fallback-agent/2.0');

        consoleSpy.mockRestore();
    });

    it('should silently handle and log error when encountering malformed JSON block', async () => {
        const infoSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        // Injecting an object that throws upon property access or acts differently to crash JSON
        const badArguments = {};
        Object.defineProperty(badArguments, 'caption', {
           get() { throw new Error('Simulated payload error'); }
        });

        const mockReq = {
            method: 'POST',
            body: {
                method: 'tools/call',
                params: {
                    name: 'search_technologies',
                    arguments: badArguments
                }
            },
            headers: {}
        };

        const mockRes = {
            on: jest.fn(),
            writeHead: jest.fn(),
            setHeader: jest.fn(),
            write: jest.fn(),
            end: jest.fn()
        };

        // We expect it NOT to throw an error out to the caller
        await expect(handleMcp(mockReq, mockRes)).resolves.not.toThrow();

        // But we expect standard console.error to have been called by the catch block
        expect(errorSpy).toHaveBeenCalled();
        const loggedErrorCall = errorSpy.mock.calls[0];
        const logErrorPayload = JSON.parse(loggedErrorCall[0]);
        expect(logErrorPayload.severity).toBe('ERROR');
        expect(logErrorPayload.message).toBe('Failed to log MCP request');

        infoSpy.mockRestore();
        errorSpy.mockRestore();
    });
});
