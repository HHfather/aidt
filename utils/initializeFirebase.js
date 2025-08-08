// Firebase 초기 데이터 설정 스크립트
import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// 테스트 가이드 데이터 생성
const initializeGuides = async () => {
  const guides = [
    { region: '1', authKey: '1', name: '김가이드' },
    { region: '2', authKey: '2', name: '이가이드' },
    { region: '3', authKey: '3', name: '박가이드' },
    { region: '4', authKey: '4', name: '최가이드' },
    { region: '5', authKey: '5', name: '정가이드' },
    { region: '6', authKey: '6', name: '강가이드' },
    { region: '7', authKey: '7', name: '조가이드' },
    { region: '8', authKey: '8', name: '윤가이드' },
    { region: '9', authKey: '9', name: '장가이드' },
    { region: '10', authKey: '10', name: '임가이드' }
  ];

  console.log('가이드 데이터 초기화 시작...');
  
  for (const guide of guides) {
    try {
      await addDoc(collection(db, 'guides'), {
        ...guide,
        isGuide: true,
        createdAt: serverTimestamp()
      });
      console.log(`${guide.region}권역 ${guide.name} 생성 완료`);
    } catch (error) {
      console.error(`가이드 생성 오류 (${guide.name}):`, error);
    }
  }
  
  console.log('가이드 데이터 초기화 완료!');
};

// 테스트 연수 참여자 데이터 생성
const initializeUsers = async () => {
  const users = [
    { region: '1', affiliation: '곡성중앙초', name: '임환진', authKey: 'test123' },
    { region: '1', affiliation: '서울초', name: '김연수', authKey: 'user1' },
    { region: '2', affiliation: '부산초', name: '박참여', authKey: 'user2' },
    { region: '3', affiliation: '대구초', name: '이학습', authKey: 'user3' }
  ];

  console.log('연수 참여자 데이터 초기화 시작...');
  
  for (const user of users) {
    try {
      await addDoc(collection(db, 'users'), {
        ...user,
        isUser: true,
        createdAt: serverTimestamp()
      });
      console.log(`${user.name} (${user.affiliation}) 생성 완료`);
    } catch (error) {
      console.error(`사용자 생성 오류 (${user.name}):`, error);
    }
  }
  
  console.log('연수 참여자 데이터 초기화 완료!');
};

// 샘플 공지사항 데이터 생성
const initializeAnnouncements = async () => {
  const announcements = [
    {
      region: '1',
      date: '2025-08-06',
      time: '09:00',
      title: '프라하 도착 안내',
      content: '프라하 공항 도착 후 집합 장소는 터미널 1층 출구입니다. 가이드가 대기하고 있겠습니다.',
      createdBy: '김가이드'
    },
    {
      region: '1',
      date: '2025-08-07',
      time: '08:00',
      title: '교육기관 방문 준비사항',
      content: '오늘 교육기관 방문 시 명함과 학교 소개 자료를 준비해주세요.',
      createdBy: '김가이드'
    }
  ];

  console.log('공지사항 데이터 초기화 시작...');
  
  for (const announcement of announcements) {
    try {
      await addDoc(collection(db, 'announcements'), {
        ...announcement,
        createdAt: serverTimestamp()
      });
      console.log(`공지사항 "${announcement.title}" 생성 완료`);
    } catch (error) {
      console.error(`공지사항 생성 오류:`, error);
    }
  }
  
  console.log('공지사항 데이터 초기화 완료!');
};

// 샘플 일정 데이터 생성
const initializeSchedules = async () => {
  const schedules = [
    // 1권역 일정
    {
      id: 'schedule_1_1',
      region: '1',
      date: '2025-08-06',
      time: '09:00',
      activityName: '프라하 성 방문',
      description: '중세 시대부터 이어져온 프라하 성의 역사와 체코의 문화를 체험하는 시간입니다.',
      details: ['성 내부 투어 및 역사 설명', '성 비투스 대성당 방문', '옛 왕궁과 황금소로 탐방', '전망대에서 프라하 시내 조망'],
      type: 'activity',
      location: '프라하 성'
    },
    {
      id: 'schedule_1_2',
      region: '1',
      date: '2025-08-06',
      time: '14:00',
      activityName: '카를교 도보 투어',
      description: '프라하의 상징적인 카를교를 거닐며 현지 문화와 역사를 체험합니다.',
      details: ['다리 위의 바로크 조각상 감상', '거리 예술가들의 공연 관람', '전통 수공예품 구경', '강변에서의 사진 촬영'],
      type: 'activity',
      location: '카를교'
    },
    {
      id: 'schedule_1_3',
      region: '1',
      date: '2025-08-07',
      time: '10:00',
      activityName: '프라하 교육청 방문',
      description: '체코의 교육 시스템과 정책에 대해 알아보는 공식 방문 일정입니다.',
      details: ['체코 교육 시스템 브리핑', '교육 정책 및 개혁 방향 설명', '한국과 체코 교육 비교 토론', '교육 자료 및 사례 제공'],
      type: 'activity',
      location: '프라하 교육청'
    },
    
    // 2권역 일정
    {
      id: 'schedule_2_1',
      region: '2',
      date: '2025-08-06',
      time: '09:30',
      activityName: '체코 국립도서관 견학',
      description: '체코의 대표적인 국립도서관을 방문하여 도서관 운영 시스템과 디지털 서비스를 살펴봅니다.',
      details: ['도서관 시설 투어', '디지털 도서관 시스템 체험', '사서와의 면담', '도서관 교육 프로그램 소개'],
      type: 'activity',
      location: '체코 국립도서관'
    },
    {
      id: 'schedule_2_2',
      region: '2',
      date: '2025-08-06',
      time: '15:00',
      activityName: '프라하 구시가 문화탐방',
      description: '프라하 구시가의 역사적 건물들과 문화유산을 탐방하는 시간입니다.',
      details: ['구시가 광장 방문', '천문시계 관람', '틴 교회 견학', '현지 가이드의 역사 해설'],
      type: 'activity',
      location: '프라하 구시가'
    },
    {
      id: 'schedule_2_3',
      region: '2',
      date: '2025-08-07',
      time: '11:00',
      activityName: '체코 중등학교 교육현장 방문',
      description: '체코의 중등교육 현장을 직접 방문하여 교육 방법론과 학교 운영 시스템을 학습합니다.',
      details: ['수업 참관', '교사 간담회', '학생들과의 교류', '체코 교육과정 설명'],
      type: 'activity',
      location: '프라하 제15중학교'
    }
  ];

  console.log('일정 데이터 초기화 시작...');
  
  for (const schedule of schedules) {
    try {
      await addDoc(collection(db, 'schedules'), {
        ...schedule,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log(`일정 "${schedule.activityName}" (${schedule.region}권역) 생성 완료`);
    } catch (error) {
      console.error(`일정 생성 오류:`, error);
    }
  }
  
  console.log('일정 데이터 초기화 완료!');
};

// 참가자 명단 데이터 생성
const initializeParticipants = async () => {
  const participants = [
    // 1권역 참가자
    { region: '1', name: '김지현', affiliation: '서울초등학교', position: '교사', phone: '010-1234-5678', email: 'kim@school.edu' },
    { region: '1', name: '이민수', affiliation: '부산초등학교', position: '교감', phone: '010-2345-6789', email: 'lee@school.edu' },
    { region: '1', name: '박영희', affiliation: '대구초등학교', position: '교사', phone: '010-3456-7890', email: 'park@school.edu' },
    
    // 2권역 참가자
    { region: '2', name: '최수현', affiliation: '인천초등학교', position: '교사', phone: '010-4567-8901', email: 'choi@school.edu' },
    { region: '2', name: '정태영', affiliation: '광주초등학교', position: '교장', phone: '010-5678-9012', email: 'jung@school.edu' },
    { region: '2', name: '강미라', affiliation: '대전초등학교', position: '교사', phone: '010-6789-0123', email: 'kang@school.edu' },
    
    // 3권역 참가자
    { region: '3', name: '윤성호', affiliation: '울산초등학교', position: '교사', phone: '010-7890-1234', email: 'yoon@school.edu' },
    { region: '3', name: '임하늘', affiliation: '세종초등학교', position: '교사', phone: '010-8901-2345', email: 'lim@school.edu' }
  ];

  console.log('참가자 명단 초기화 시작...');
  
  for (const participant of participants) {
    try {
      await addDoc(collection(db, 'participants'), {
        ...participant,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log(`참가자 "${participant.name}" (${participant.affiliation}) 생성 완료`);
    } catch (error) {
      console.error(`참가자 생성 오류:`, error);
    }
  }
  
  console.log('참가자 명단 초기화 완료!');
};

// 연수 프로젝트 데이터 생성
const initializeProjects = async () => {
  const projects = [
    {
      region: '1',
      projectName: '체코 교육시스템 탐방 연수',
      description: '체코의 선진 교육시스템과 혁신적인 교육방법론을 학습하는 해외연수 프로그램',
      startDate: '2025-08-05',
      endDate: '2025-08-12',
      destination: '프라하, 체코',
      participants: 15,
      budget: 25000000,
      status: 'active'
    },
    {
      region: '2',
      projectName: '유럽 다문화 교육 연수',
      description: '유럽의 다문화 교육 정책과 실제 현장 경험을 통한 글로벌 교육 역량 강화',
      startDate: '2025-08-05',
      endDate: '2025-08-12',
      destination: '프라하, 체코',
      participants: 12,
      budget: 22000000,
      status: 'active'
    },
    {
      region: '3',
      projectName: '창의교육 혁신 연수',
      description: '체코의 창의적 교육과정과 STEAM 교육 사례를 통한 교육혁신 역량 개발',
      startDate: '2025-08-05',
      endDate: '2025-08-12',
      destination: '프라하, 체코',
      participants: 10,
      budget: 20000000,
      status: 'active'
    }
  ];

  console.log('연수 프로젝트 초기화 시작...');
  
  for (const project of projects) {
    try {
      await addDoc(collection(db, 'projects'), {
        ...project,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log(`프로젝트 "${project.projectName}" (${project.region}권역) 생성 완료`);
    } catch (error) {
      console.error(`프로젝트 생성 오류:`, error);
    }
  }
  
  console.log('연수 프로젝트 초기화 완료!');
};

// 모든 초기 데이터 설정
export const initializeFirebaseData = async () => {
  console.log('Firebase 초기 데이터 설정 시작...');
  
  try {
    await initializeGuides();
    await initializeUsers();
    await initializeAnnouncements();
    await initializeSchedules();
    await initializeParticipants();
    await initializeProjects();
    
    console.log('🎉 Firebase 초기 데이터 설정 완료!');
    return { success: true };
  } catch (error) {
    console.error('Firebase 초기화 오류:', error);
    return { success: false, error: error.message };
  }
};
