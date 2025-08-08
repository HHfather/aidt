// 팀별 데이터베이스 관리 유틸리티
import { collection, doc, query, where, getDocs, addDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../firebaseConfig'

// 팀 ID 생성 함수
export const generateTeamId = (projectName, year) => {
  const sanitized = projectName.replace(/[^a-zA-Z0-9가-힣]/g, '_')
  return `${year}_${sanitized}_${Date.now().toString().slice(-6)}`
}

// 팀별 컬렉션 이름 생성
export const getTeamCollection = (teamId, type) => {
  return `teams/${teamId}/${type}`
}

// 팀 데이터 CRUD 작업
export class TeamDataManager {
  constructor(teamId) {
    this.teamId = teamId
  }

  // 팀 정보 저장
  async saveTeamInfo(teamData) {
    try {
      const teamRef = doc(db, 'teams', this.teamId)
      await updateDoc(teamRef, {
        ...teamData,
        updatedAt: new Date(),
        teamId: this.teamId
      })
      return { success: true }
    } catch (error) {
      console.error('팀 정보 저장 오류:', error)
      return { success: false, error }
    }
  }

  // 팀 일정 관리
  async saveSchedule(scheduleData) {
    try {
      const scheduleRef = collection(db, this.getTeamCollection('schedules'))
      await addDoc(scheduleRef, {
        ...scheduleData,
        teamId: this.teamId,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      return { success: true }
    } catch (error) {
      console.error('일정 저장 오류:', error)
      return { success: false, error }
    }
  }

  // 팀 참가자 관리
  async saveParticipants(participantsData) {
    try {
      const participantsRef = collection(db, this.getTeamCollection('participants'))
      
      // 기존 참가자 삭제 (업데이트를 위해)
      const existingQuery = query(participantsRef, where('teamId', '==', this.teamId))
      const existingDocs = await getDocs(existingQuery)
      
      for (const doc of existingDocs.docs) {
        await deleteDoc(doc.ref)
      }
      
      // 새 참가자 데이터 저장
      for (const participant of participantsData) {
        await addDoc(participantsRef, {
          ...participant,
          teamId: this.teamId,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }
      
      return { success: true }
    } catch (error) {
      console.error('참가자 저장 오류:', error)
      return { success: false, error }
    }
  }

  // 팀 데이터 조회
  async getTeamData(type) {
    try {
      const collectionRef = collection(db, this.getTeamCollection(type))
      const q = query(collectionRef, where('teamId', '==', this.teamId))
      const querySnapshot = await getDocs(q)
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error('팀 데이터 조회 오류:', error)
      return []
    }
  }

  // 컬렉션 이름 생성 헬퍼
  getTeamCollection(type) {
    return `teams_${this.teamId}_${type}`
  }
}

// 팀 목록 조회
export const getAllTeams = async () => {
  try {
    const teamsRef = collection(db, 'teams')
    const querySnapshot = await getDocs(teamsRef)
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('팀 목록 조회 오류:', error)
    return []
  }
}

// 현재 활성 팀 설정
export const setActiveTeam = (teamId) => {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('activeTeamId', teamId)
  }
}

// 현재 활성 팀 가져오기
export const getActiveTeam = () => {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('activeTeamId')
  }
  return null
}

// 팀 생성
export const createTeam = async (teamData) => {
  try {
    const teamId = generateTeamId(teamData.projectName, teamData.year)
    const teamRef = doc(db, 'teams', teamId)
    
    await updateDoc(teamRef, {
      ...teamData,
      teamId,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active'
    })
    
    return { success: true, teamId }
  } catch (error) {
    console.error('팀 생성 오류:', error)
    return { success: false, error }
  }
}
