#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

class OverseasTrainingMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'overseas-training-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    // 도구 목록 반환
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'test_connection',
            description: 'MCP 서버 연결 테스트',
            inputSchema: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  description: '테스트 메시지',
                },
              },
              required: ['message'],
            },
          },
          {
            name: 'create_project',
            description: '새로운 연수 프로젝트를 생성합니다',
            inputSchema: {
              type: 'object',
              properties: {
                projectName: {
                  type: 'string',
                  description: '프로젝트명',
                },
                authKey: {
                  type: 'string',
                  description: '참여자용 인증키',
                },
              },
              required: ['projectName', 'authKey'],
            },
          },
        ],
      };
    });

    // 도구 실행 핸들러
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'test_connection':
            return await this.testConnection(args.message);
          
          case 'create_project':
            return await this.createProject(args);
          
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `알 수 없는 도구: ${name}`
            );
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `도구 실행 오류: ${error.message}`
        );
      }
    });
  }

  async testConnection(message) {
    return {
      content: [
        {
          type: 'text',
          text: `✅ MCP 서버 연결 성공! 메시지: ${message}`,
        },
      ],
    };
  }

  async createProject(projectData) {
    try {
      // 여기서 실제로는 Firebase에 프로젝트를 생성해야 하지만
      // 일단 테스트용으로 간단히 구현
      return {
        content: [
          {
            type: 'text',
            text: `✅ 프로젝트 생성 성공: ${projectData.projectName} (인증키: ${projectData.authKey})`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ 프로젝트 생성 실패: ${error.message}`,
          },
        ],
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('🚀 국외 연수 MCP 서버가 시작되었습니다.');
  }
}

const server = new OverseasTrainingMCPServer();
server.run().catch(console.error);
