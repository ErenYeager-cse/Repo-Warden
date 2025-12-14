#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { spawn } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// 1. Initialize the Server
const server = new McpServer({
  name: "repo-warden-mcp",
  version: "1.0.0",
});

const KESTRA_API = process.env.KESTRA_API_BASE || "http://localhost:8080/api/v1";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// 2. Define Tools
server.tool(
  "list_flows",
  "List all available Kestra workflows.",
  {},
  async () => {
    try {
      const response = await fetch(`${KESTRA_API}/flows/search?q=*`);
      const data = await response.json();

      const list = (data.results || [])
        .map(f => `- ${f.id} (${f.namespace})`)
        .join("\n");

      return {
        content: [{ type: "text", text: `Flows found:\n${list}` }],
      };
    } catch (err) {
      return { content: [{ type: "text", text: "Error fetching flows." }] };
    }
  }
);

server.tool(
  "get_ranked_prs",
  "Get the list of open PRs sorted by AI-determined priority.",
  z.object({
    repo: z.string().describe("Repository in format 'owner/repo'"),
    limit: z.number().optional().describe("Maximum number of PRs to return"),
  }),
  async ({ repo, limit = 10 }) => {
    try {
      const headers = GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {};
      const response = await fetch(`https://api.github.com/repos/${repo}/pulls?state=open`, { headers });
      if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
      const prs = await response.json();

      // Sort: Critical first, then by other priorities
      const ranked = prs.sort((a, b) => {
         const priorities = { "🔴 Critical": 3, "🟡 High": 2, "🟢 Low": 1 };
         const aPriority = a.labels.find(l => priorities[l.name]) ? priorities[a.labels.find(l => priorities[l.name]).name] : 0;
         const bPriority = b.labels.find(l => priorities[l.name]) ? priorities[b.labels.find(l => priorities[l.name]).name] : 0;
         return bPriority - aPriority;
      }).slice(0, limit);

      const result = ranked.map(pr => `${pr.title} (${pr.labels.map(l => l.name).join(', ')})`).join('\n');
      return {
        content: [{ type: "text", text: `Ranked PRs for ${repo}:\n${result}` }]
      };
    } catch (err) {
      return { content: [{ type: "text", text: `Error fetching PRs: ${err.message}` }] };
    }
  }
);

server.tool(
  "trigger_flow",
  "Run a Kestra workflow.",
  z.object({
    namespace: z.string().describe("The namespace (e.g. company.team)"),
    flowId: z.string().describe("The ID of the flow to run"),
  }),
  async ({ namespace, flowId }) => {
    try {
      const response = await fetch(`${KESTRA_API}/executions/${namespace}/${flowId}`, {
        method: "POST"
      });
      if (!response.ok) return { content: [{ type: "text", text: "Failed" }]};
      const data = await response.json();
      return { content: [{ type: "text", text: `✅ Started! ID: ${data.id}` }] };
    } catch (err) {
      return { content: [{ type: "text", text: `Error: ${err.message}` }] };
    }
  }
);

server.tool(
  "get_flow_status",
  "Get the status of a Kestra flow execution.",
  z.object({
    executionId: z.string().describe("The execution ID to check"),
  }),
  async ({ executionId }) => {
    try {
      const response = await fetch(`${KESTRA_API}/executions/${executionId}`);
      if (!response.ok) return { content: [{ type: "text", text: "Failed to fetch status" }]};
      const data = await response.json();
      return { content: [{ type: "text", text: `Status: ${data.state.current}` }] };
    } catch (err) {
      return { content: [{ type: "text", text: `Error: ${err.message}` }] };
    }
  }
);

server.tool(
  "analyze_code_changes",
  "Analyze code changes and generate documentation updates.",
  z.object({
    diff: z.string().describe("The git diff content to analyze"),
  }),
  async ({ diff }) => {
    return new Promise((resolve) => {
      try {
        const tempFile = join(tmpdir(), `diff_${Date.now()}.txt`);
        writeFileSync(tempFile, diff);

        const pythonProcess = spawn('python', ['../../ai-engine/generate_docs.py', tempFile], {
          cwd: process.cwd()
        });

        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => {
          output += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        pythonProcess.on('close', (code) => {
          unlinkSync(tempFile);
          if (code !== 0) {
            resolve({ content: [{ type: "text", text: `Error running Oumi script: ${errorOutput}` }] });
          } else {
            resolve({ content: [{ type: "text", text: output.trim() }] });
          }
        });

        pythonProcess.on('error', (err) => {
          unlinkSync(tempFile);
          resolve({ content: [{ type: "text", text: `Failed to start Python process: ${err.message}` }] });
        });
      } catch (err) {
        resolve({ content: [{ type: "text", text: `Error: ${err.message}` }] });
      }
    });
  }
);

// 3. Connect
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("RepoWarden MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
