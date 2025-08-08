#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import pdf from 'pdf-parse';
import fs from 'fs';

// Firebase Admin 초기화 (서비스 계정 키 필요)
let adminApp;
try {
  // 서비스 계정 키 파일이 있는 경우
  if (fs.existsSync('./mcp-server/service-account-key.json')) {
    const serviceAccount = JSON.parse(fs.readFileSync('./mcp-server/service-account-key.json', 'utf8'));
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: "aidt-921d3.firebasestorage.app"
    });
  }
} catch (error) {
  console.error('Firebase Admin 초기화 실패:', error);
}

// Google AI 초기화
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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
            name: 'parse_pdf_schedule',
            description: 'PDF 연수 계획서에서 일정 정보를 추출합니다',
            inputSchema: {
              type: 'object',
              properties: {
                pdfFilePath: {
                  type: 'string',
                  description: 'PDF 파일 경로',
                },
              },
              required: ['pdfFilePath'],
            },
          },
          {
            name: 'generate_ai_summary',
            description: 'AI를 사용하여 텍스트를 요약하거나 개선합니다',
            inputSchema: {
              type: 'object',
              properties: {
                text: {
                  type: 'string',
                  description: '처리할 텍스트',
                },
                type: {
                  type: 'string',
                  enum: ['summary', 'comment_enhance', 'activity_record'],
                  description: '처리 유형',
                },
              },
              required: ['text', 'type'],
            },
          },
          {
            name: 'create_project',
            description: 'Firestore에 새로운 연수 프로젝트를 생성합니다',
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
                reportInfo: {
                  type: 'object',
                  description: '보고서 정보',
                },
                schedules: {
                  type: 'array',
                  description: '일정 정보',
                },
              },
              required: ['projectName', 'authKey'],
            },
          },
          {
            name: 'generate_final_report',
            description: '최종 보고서를 생성합니다',
            inputSchema: {
              type: 'object',
              properties: {
                projectId: {
                  type: 'string',
                  description: '프로젝트 ID',
                },
              },
              required: ['projectId'],
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
          case 'parse_pdf_schedule':
            return await this.parsePDFSchedule(args.pdfFilePath);
          
          case 'generate_ai_summary':
            return await this.generateAISummary(args.text, args.type);
          
          case 'create_project':
            return await this.createProject(args);
          
          case 'generate_final_report':
            return await this.generateFinalReport(args.projectId);
          
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

  async parsePDFSchedule(pdfFilePath) {
    try {
      const dataBuffer = fs.readFileSync(pdfFilePath);
      const data = await pdf(dataBuffer);
      
      // PDF 텍스트에서 일정 정보 추출 로직
      const text = data.text;
      
      // AI를 사용하여 구조화된 일정 정보 추출
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const prompt = `
다음 PDF 텍스트에서 연수 일정 정보를 JSON 형태로 추출해주세요:

${text}

다음 형식으로 반환해주세요:
{
  "reportInfo": {
    "title": "연수 제목",
    "purpose": "연수 목적",
    "necessity": "연수 필요성"
  },
  "schedules": [
    {
      "date": "2025-08-06",
      "time": "09:00",
      "activityName": "프라하 성 방문",
      "location": "프라하",
      "adminNotes": ""
    }
  ]
}
`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const extractedData = JSON.parse(response.text());

      return {
        content: [
          {
            type: 'text',
            text: `PDF 파싱 성공: ${extractedData.schedules.length}개의 일정이 추출되었습니다.`,
          },
          {
            type: 'text',
            text: JSON.stringify(extractedData, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `PDF 파싱 실패: ${error.message}`,
          },
        ],
      };
    }
  }

  async generateAISummary(text, type) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      
      let prompt = '';
      switch (type) {
        case 'summary':
          prompt = `다음 텍스트를 간결하게 요약해주세요:\n\n${text}`;
          break;
        case 'comment_enhance':
          prompt = `다음 댓글을 더 풍성하고 자연스럽게 다듬어주세요:\n\n${text}`;
          break;
        case 'activity_record':
          prompt = `다음 활동 내용을 공식 보고서용으로 정리해주세요:\n\n${text}`;
          break;
      }

      const result = await model.generateContent(prompt);
      const response = await result.response;

      return {
        content: [
          {
            type: 'text',
            text: response.text(),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `AI 처리 실패: ${error.message}`,
          },
        ],
      };
    }
  }

  async createProject(projectData) {
    try {
      if (!adminApp) {
        throw new Error('Firebase Admin이 초기화되지 않았습니다.');
      }

      const db = adminApp.firestore();
      const projectRef = db.collection('projects').doc();
      
      await projectRef.set({
        projectName: projectData.projectName,
        authKey: projectData.authKey,
        reportInfo: projectData.reportInfo || {},
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 일정 데이터가 있으면 추가
      if (projectData.schedules) {
        const schedulesRef = projectRef.collection('schedules');
        for (const schedule of projectData.schedules) {
          await schedulesRef.add(schedule);
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: `프로젝트 생성 성공: ${projectRef.id}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `프로젝트 생성 실패: ${error.message}`,
          },
        ],
      };
    }
  }

  async generateFinalReport(projectId) {
    try {
      if (!adminApp) {
        throw new Error('Firebase Admin이 초기화되지 않았습니다.');
      }

      const db = adminApp.firestore();
      
      // 프로젝트 데이터 수집
      const projectDoc = await db.collection('projects').doc(projectId).get();
      const projectData = projectDoc.data();
      
      // 일정 데이터 수집
      const schedulesSnapshot = await db.collection('projects').doc(projectId)
        .collection('schedules').get();
      const schedules = schedulesSnapshot.docs.map(doc => doc.data());
      
      // 사진 데이터 수집
      const photosSnapshot = await db.collection('photos')
        .where('projectId', '==', projectId).get();
      const photos = photosSnapshot.docs.map(doc => doc.data());

      // 보고서 생성 로직 (여기서는 간단한 텍스트 형태로)
      const reportContent = `
# ${projectData.projectName} 최종 보고서

## 연수 개요
- 목적: ${projectData.reportInfo?.purpose || '미설정'}
- 일정: ${schedules.length}개 활동
- 참여 사진: ${photos.length}장

## 상세 일정
${schedules.map(schedule => 
  `- ${schedule.date} ${schedule.time}: ${schedule.activityName} (${schedule.location})`
).join('\n')}

## 활동 기록
${schedules.map(schedule => 
  schedule.adminNotes ? `### ${schedule.activityName}\n${schedule.adminNotes}\n` : ''
).join('\n')}
`;

      return {
        content: [
          {
            type: 'text',
            text: '최종 보고서가 생성되었습니다.',
          },
          {
            type: 'text',
            text: reportContent,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `보고서 생성 실패: ${error.message}`,
          },
        ],
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('국외 연수 MCP 서버가 시작되었습니다.');
  }
}

const server = new OverseasTrainingMCPServer();
server.run().catch(console.error);
