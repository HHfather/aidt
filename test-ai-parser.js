const fs = require('fs');
const https = require('https');
const http = require('http');

async function testAIParser() {
  try {
    const testData = fs.readFileSync('test-schedule.txt', 'utf-8');
    
    const data = JSON.stringify({
      text: testData
    });

    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/parse-schedule-text',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          
          if (result.success) {
            console.log('✅ AI 파싱 성공!');
            console.log('📊 파싱 결과:');
            console.log('- 사용된 방법:', result.meta.parseMethod);
            console.log('- 스케줄 개수:', result.meta.scheduleCount);
            console.log('\n📅 파싱된 스케줄:');
            
            result.data.schedules.forEach((schedule, index) => {
              console.log(`${index + 1}. ${schedule.date} ${schedule.time} - ${schedule.activity}`);
              console.log(`   📍 ${schedule.location}`);
              console.log(`   🏷️ ${schedule.category}\n`);
            });
            
            console.log('📋 메타데이터:');
            console.log('- 제목:', result.data.metadata.title);
            console.log('- 기간:', result.data.metadata.duration);
            console.log('- 목적지:', result.data.metadata.destination);
          } else {
            console.error('❌ AI 파싱 실패:', result);
          }
        } catch (error) {
          console.error('응답 파싱 오류:', error);
          console.log('응답 본문:', body);
        }
      });
    });

    req.on('error', (error) => {
      console.error('🚨 요청 오류:', error.message);
    });

    req.write(data);
    req.end();
    
  } catch (error) {
    console.error('🚨 테스트 오류:', error.message);
  }
}

testAIParser();
