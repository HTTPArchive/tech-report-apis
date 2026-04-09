import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

import {
  queryTechnologies,
  queryCategories,
  queryReport,
  queryRanks,
  queryGeos,
  queryVersions,
  queryCWVDistribution,
} from './utils/reportService.js';

const createMcpServer = () => {
  const server = new McpServer({
    name: 'tech-report',
    version: '1.0.0',
  });

  server.tool(
    'search_technologies',
    'Search and filter web technologies tracked by HTTP Archive Tech Report. Returns technology metadata including categories, descriptions, and origin counts.',
    {
      technology: z.string().optional().describe('Comma-separated technology names to filter by (e.g. "WordPress,Drupal")'),
      category: z.string().optional().describe('Comma-separated category names to filter by (e.g. "CMS,CDN")'),
      sort: z.enum(['name']).optional().describe('Sort results by "name" (defaults to popularity)'),
      limit: z.number().optional().describe('Limit the number of results returned'),
    },
    async ({ technology, category, sort, limit }) => {
      const data = await queryTechnologies({ technology, category, sort, limit });
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  server.tool(
    'list_categories',
    'List all technology categories tracked by HTTP Archive Tech Report (e.g. CMS, CDN, JavaScript, Analytics).',
    {
      category: z.string().optional().describe('Comma-separated category names to filter results'),
      sort: z.enum(['name']).optional().describe('Sort results by "name" (defaults to popularity)'),
      limit: z.number().optional().describe('Limit the number of results returned'),
    },
    async ({ category, sort, limit }) => {
      const data = await queryCategories({ category, sort, limit });
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  server.tool(
    'get_adoption_metrics',
    'Get web technology adoption metrics over time from HTTP Archive. Returns the percentage of websites using a technology for a given geography, rank segment, and date range.',
    {
      technology: z.string().describe('Comma-separated technology names (e.g. "WordPress" or "WordPress,Drupal")'),
      geo: z.string().optional().describe('Geographic region (e.g. "ALL", "US", "GB"). Defaults to "ALL"'),
      rank: z.string().optional().describe('Traffic rank segment (e.g. "ALL", "top 1000", "top 10000"). Defaults to "ALL"'),
      start: z.string().optional().describe('Start date in YYYY-MM-DD format, or "latest" for most recent data'),
      end: z.string().optional().describe('End date in YYYY-MM-DD format'),
    },
    async ({ technology, geo, rank, start, end }) => {
      const data = await queryReport('adoption', { technology, geo, rank, start, end });
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  server.tool(
    'get_cwv_metrics',
    'Get Core Web Vitals (CWV) metrics for websites using specific web technologies. Returns good/needs improvement/poor rates for LCP, CLS, INP, and TTFB.',
    {
      technology: z.string().describe('Comma-separated technology names (e.g. "WordPress" or "WordPress,Drupal")'),
      geo: z.string().optional().describe('Geographic region (e.g. "ALL", "US", "GB"). Defaults to "ALL"'),
      rank: z.string().optional().describe('Traffic rank segment (e.g. "ALL", "top 1000", "top 10000"). Defaults to "ALL"'),
      start: z.string().optional().describe('Start date in YYYY-MM-DD format, or "latest" for most recent data'),
      end: z.string().optional().describe('End date in YYYY-MM-DD format'),
    },
    async ({ technology, geo, rank, start, end }) => {
      const data = await queryReport('cwv', { technology, geo, rank, start, end });
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  server.tool(
    'get_lighthouse_metrics',
    'Get Google Lighthouse audit scores for websites using specific web technologies. Returns median scores for Performance, Accessibility, Best Practices, and SEO.',
    {
      technology: z.string().describe('Comma-separated technology names (e.g. "WordPress" or "WordPress,Drupal")'),
      geo: z.string().optional().describe('Geographic region (e.g. "ALL", "US", "GB"). Defaults to "ALL"'),
      rank: z.string().optional().describe('Traffic rank segment (e.g. "ALL", "top 1000", "top 10000"). Defaults to "ALL"'),
      start: z.string().optional().describe('Start date in YYYY-MM-DD format, or "latest" for most recent data'),
      end: z.string().optional().describe('End date in YYYY-MM-DD format'),
    },
    async ({ technology, geo, rank, start, end }) => {
      const data = await queryReport('lighthouse', { technology, geo, rank, start, end });
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  server.tool(
    'get_page_weight_metrics',
    'Get page weight and size metrics for websites using specific web technologies. Returns total page weight, JavaScript size, CSS size, and other resource sizes in bytes.',
    {
      technology: z.string().describe('Comma-separated technology names (e.g. "WordPress" or "WordPress,Drupal")'),
      geo: z.string().optional().describe('Geographic region (e.g. "ALL", "US", "GB"). Defaults to "ALL"'),
      rank: z.string().optional().describe('Traffic rank segment (e.g. "ALL", "top 1000", "top 10000"). Defaults to "ALL"'),
      start: z.string().optional().describe('Start date in YYYY-MM-DD format, or "latest" for most recent data'),
      end: z.string().optional().describe('End date in YYYY-MM-DD format'),
    },
    async ({ technology, geo, rank, start, end }) => {
      const data = await queryReport('pageWeight', { technology, geo, rank, start, end });
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  server.tool(
    'get_audits_metrics',
    'Get web performance and quality audit metrics for websites using specific technologies, sourced from HTTP Archive crawl data.',
    {
      technology: z.string().describe('Comma-separated technology names (e.g. "WordPress" or "WordPress,Drupal")'),
      geo: z.string().optional().describe('Geographic region (e.g. "ALL", "US", "GB"). Defaults to "ALL"'),
      rank: z.string().optional().describe('Traffic rank segment (e.g. "ALL", "top 1000", "top 10000"). Defaults to "ALL"'),
      start: z.string().optional().describe('Start date in YYYY-MM-DD format, or "latest" for most recent data'),
      end: z.string().optional().describe('End date in YYYY-MM-DD format'),
    },
    async ({ technology, geo, rank, start, end }) => {
      const data = await queryReport('audits', { technology, geo, rank, start, end });
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  server.tool(
    'get_geo_breakdown',
    'Get Core Web Vitals breakdown by geography for a given technology, rank, and snapshot date. Returns a single month of CWV data (LCP, CLS, INP, TTFB) across all geographies.',
    {
      technology: z.string().optional().describe('Comma-separated technology names (e.g. "WordPress" or "WordPress,Drupal"). Defaults to "ALL"'),
      rank: z.string().optional().describe('Traffic rank segment (e.g. "ALL", "top 1000", "top 10000"). Defaults to "ALL"'),
      end: z.string().optional().describe('Snapshot date in YYYY-MM-DD format. Defaults to the latest available date'),
    },
    async ({ technology, rank, end }) => {
      const data = await queryReport('cwv', { crossGeo: true, technology, rank, end });
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  server.tool(
    'get_cwv_distribution',
    'Get Core Web Vitals metric distribution histograms for websites using specific web technologies. Returns per-bucket origin counts for LCP, INP, CLS, FCP, and TTFB, optionally filtered by geography and rank.',
    {
      technology: z.string().describe('Comma-separated technology names (e.g. "WordPress" or "Wix,WordPress")'),
      date: z.string().describe('Crawl date in YYYY-MM-DD format (e.g. "2026-02-01")'),
      geo: z.string().optional().describe('Geographic filter — a country name (e.g. "United States of America") or "ALL" for global data. Defaults to "ALL"'),
      rank: z.string().optional().describe('Numeric rank ceiling (e.g. "10000"). Omit or set to "ALL" for all ranks'),
    },
    async ({ technology, date, geo, rank }) => {
      const data = await queryCWVDistribution({ technology, date, geo: geo || 'ALL', rank: rank && rank !== 'ALL' ? rank : null });
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  server.tool(
    'list_ranks',
    'List available traffic rank segments for filtering Tech Report data (e.g. "top 1000", "top 10000", "top 100000", "ALL").',
    async () => {
      const data = await queryRanks();
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  server.tool(
    'list_geos',
    'List available geographic regions for filtering Tech Report data (e.g. "ALL", "US", "GB", "IN").',
    async () => {
      const data = await queryGeos();
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  server.tool(
    'list_versions',
    'List technology versions tracked in HTTP Archive Tech Report.',
    {
      technology: z.string().optional().describe('Comma-separated technology names to filter versions'),
      version: z.string().optional().describe('Exact version string to look up'),
    },
    async ({ technology, version }) => {
      const data = await queryVersions({ technology, version });
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  return server;
};

export const handleMcp = async (req, res) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless — safe for Cloud Run
  });

  const server = createMcpServer();
  await server.connect(transport);

  res.on('close', () => {
    transport.close();
    server.close();
  });

  await transport.handleRequest(req, res, req.body);
};
