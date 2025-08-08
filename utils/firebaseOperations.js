// Firebase 데이터베이스 작업 유틸리티
import { db } from '../firebaseConfig';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  getDoc,
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp 
} from 'firebase/firestore';

// 공지사항 관련 함수들
export const announcementOperations = {
  // 공지사항 추가
  async create(announcementData) {
    try {
      const docRef = await addDoc(collection(db, 'announcements'), {
        ...announcementData,
        updatedAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('공지사항 생성 오류:', error);
      return { success: false, error: error.message };
    }
  },

  // 권역별 공지사항 조회
  async getByRegion(region) {
    try {
      const q = query(
        collection(db, 'announcements'),
        where('region', '==', region)
      );
      const querySnapshot = await getDocs(q);
      const announcements = [];
      querySnapshot.forEach((doc) => {
        announcements.push({ id: doc.id, ...doc.data() });
      });
      // 클라이언트에서 날짜 기준으로 정렬
      announcements.sort((a, b) => {
        if (a.date && b.date) {
          return new Date(b.date) - new Date(a.date);
        }
        return 0;
      });
      return { success: true, data: announcements };
    } catch (error) {
      console.error('공지사항 조회 오류:', error);
      return { success: false, error: error.message };
    }
  },

  // 모든 공지사항 조회
  async getAll() {
    try {
      const q = query(
        collection(db, 'announcements'),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const announcements = [];
      querySnapshot.forEach((doc) => {
        announcements.push({ id: doc.id, ...doc.data() });
      });
      return { success: true, data: announcements };
    } catch (error) {
      console.error('전체 공지사항 조회 오류:', error);
      return { success: false, error: error.message };
    }
  },

  // 공지사항 삭제
  async delete(announcementId) {
    try {
      await deleteDoc(doc(db, 'announcements', announcementId));
      return { success: true };
    } catch (error) {
      console.error('공지사항 삭제 오류:', error);
      return { success: false, error: error.message };
    }
  }
};

// 자유일정 추천 관련 함수들
export const freeScheduleOperations = {
  // 자유일정 추천 저장
  async save(region, date, recommendation) {
    try {
      const docRef = await addDoc(collection(db, 'freeScheduleRecommendations'), {
        region,
        date,
        recommendation,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('자유일정 추천 저장 오류:', error);
      return { success: false, error: error.message };
    }
  },

  // 권역별, 날짜별 자유일정 추천 조회
  async getByRegionAndDate(region, date) {
    try {
      const q = query(
        collection(db, 'freeScheduleRecommendations'),
        where('region', '==', region),
        where('date', '==', date),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { success: true, data: { id: doc.id, ...doc.data() } };
      }
      return { success: true, data: null };
    } catch (error) {
      console.error('자유일정 추천 조회 오류:', error);
      return { success: false, error: error.message };
    }
  }
};

// 사용자 관련 함수들
export const userOperations = {
  // 사용자 생성
  async create(userData) {
    try {
      const docRef = await addDoc(collection(db, 'users'), {
        ...userData,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('사용자 생성 오류:', error);
      return { success: false, error: error.message };
    }
  },

  // 사용자 조회 (권역, 소속, 이름으로)
  async findByCredentials(region, affiliation, name) {
    try {
      const q = query(
        collection(db, 'users'),
        where('region', '==', region),
        where('affiliation', '==', affiliation),
        where('name', '==', name)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { success: true, data: { id: doc.id, ...doc.data() } };
      }
      return { success: true, data: null };
    } catch (error) {
      console.error('사용자 조회 오류:', error);
      return { success: false, error: error.message };
    }
  }
};

// 가이드 관련 함수들
export const guideOperations = {
  // 가이드 조회 (권역과 인증키로)
  async findByCredentials(region, authKey) {
    try {
      const q = query(
        collection(db, 'guides'),
        where('region', '==', region),
        where('authKey', '==', authKey)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { success: true, data: { id: doc.id, ...doc.data() } };
      }
      return { success: true, data: null };
    } catch (error) {
      console.error('가이드 조회 오류:', error);
      return { success: false, error: error.message };
    }
  }
};

// 일정 관련 함수들
export const scheduleOperations = {
  // 권역별 일정 조회
  async getByRegion(region) {
    try {
      const q = query(
        collection(db, 'schedules'),
        where('region', '==', region),
        orderBy('date', 'asc')
      );
      const querySnapshot = await getDocs(q);
      const schedules = [];
      querySnapshot.forEach((doc) => {
        schedules.push({ id: doc.id, ...doc.data() });
      });
      return { success: true, data: schedules };
    } catch (error) {
      console.error('일정 조회 오류:', error);
      return { success: false, error: error.message };
    }
  },

  // 특정 일정 조회
  async getById(scheduleId) {
    try {
      const docRef = doc(db, 'schedules', scheduleId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
      } else {
        return { success: true, data: null };
      }
    } catch (error) {
      console.error('일정 조회 오류:', error);
      return { success: false, error: error.message };
    }
  },

  // 일정 생성
  async create(scheduleData) {
    try {
      const docRef = await addDoc(collection(db, 'schedules'), {
        ...scheduleData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('일정 생성 오류:', error);
      return { success: false, error: error.message };
    }
  },

  // 일정 업데이트
  async update(scheduleId, updateData) {
    try {
      const docRef = doc(db, 'schedules', scheduleId);
      await updateDoc(docRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('일정 업데이트 오류:', error);
      return { success: false, error: error.message };
    }
  },

  // 일정 삭제
  async delete(scheduleId) {
    try {
      await deleteDoc(doc(db, 'schedules', scheduleId));
      return { success: true };
    } catch (error) {
      console.error('일정 삭제 오류:', error);
      return { success: false, error: error.message };
    }
  }
};

// 참가자 명단 관련 함수들
export const participantOperations = {
  // 참가자 명단 생성
  async create(participantData) {
    try {
      const docRef = await addDoc(collection(db, 'participants'), {
        ...participantData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('참가자 생성 오류:', error);
      return { success: false, error: error.message };
    }
  },

  // 권역별 참가자 조회
  async getByRegion(region) {
    try {
      const q = query(
        collection(db, 'participants'),
        where('region', '==', region),
        orderBy('name', 'asc')
      );
      const querySnapshot = await getDocs(q);
      const participants = [];
      querySnapshot.forEach((doc) => {
        participants.push({ id: doc.id, ...doc.data() });
      });
      return { success: true, data: participants };
    } catch (error) {
      console.error('참가자 조회 오류:', error);
      return { success: false, error: error.message };
    }
  },

  // 참가자 업데이트
  async update(participantId, updateData) {
    try {
      const docRef = doc(db, 'participants', participantId);
      await updateDoc(docRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('참가자 업데이트 오류:', error);
      return { success: false, error: error.message };
    }
  },

  // 참가자 삭제
  async delete(participantId) {
    try {
      await deleteDoc(doc(db, 'participants', participantId));
      return { success: true };
    } catch (error) {
      console.error('참가자 삭제 오류:', error);
      return { success: false, error: error.message };
    }
  },

  // 일괄 참가자 등록 (CSV 업로드용)
  async bulkCreate(participantsArray) {
    try {
      const results = [];
      for (const participant of participantsArray) {
        const result = await this.create(participant);
        results.push(result);
      }
      return { success: true, results };
    } catch (error) {
      console.error('일괄 참가자 생성 오류:', error);
      return { success: false, error: error.message };
    }
  }
};

// 연수 프로젝트 관련 함수들
export const projectOperations = {
  // 연수 프로젝트 생성
  async create(projectData) {
    try {
      const docRef = await addDoc(collection(db, 'projects'), {
        ...projectData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('프로젝트 생성 오류:', error);
      return { success: false, error: error.message };
    }
  },

  // 권역별 프로젝트 조회
  async getByRegion(region) {
    try {
      const q = query(
        collection(db, 'projects'),
        where('region', '==', region),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const projects = [];
      querySnapshot.forEach((doc) => {
        projects.push({ id: doc.id, ...doc.data() });
      });
      return { success: true, data: projects };
    } catch (error) {
      console.error('프로젝트 조회 오류:', error);
      return { success: false, error: error.message };
    }
  },

  // 프로젝트 업데이트
  async update(projectId, updateData) {
    try {
      const docRef = doc(db, 'projects', projectId);
      await updateDoc(docRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('프로젝트 업데이트 오류:', error);
      return { success: false, error: error.message };
    }
  },

  // 프로젝트 삭제
  async delete(projectId) {
    try {
      await deleteDoc(doc(db, 'projects', projectId));
      return { success: true };
    } catch (error) {
      console.error('프로젝트 삭제 오류:', error);
      return { success: false, error: error.message };
    }
  }
};
