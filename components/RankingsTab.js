import { useState } from 'react'

export default function RankingsTab({ user, userStats, rankings, onRefreshRankings }) {
  return (
    <div className="space-y-6">
      {/* 나의 활동 점수 */}
      <div className="bg-gradient-to-r from-green-400 to-blue-500 rounded-lg p-6 text-white shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold flex items-center">
            🌟 {user?.name}님의 활동 점수
          </h2>
          <button
            onClick={onRefreshRankings}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-1 rounded-full text-sm transition-all"
          >
            🔄 새로고침
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          <div className="text-center bg-white bg-opacity-10 rounded-lg p-3">
            <div className="text-2xl font-bold">{userStats.totalScore}</div>
            <div className="text-sm opacity-90">총점</div>
          </div>
          <div className="text-center bg-white bg-opacity-10 rounded-lg p-3">
            <div className="text-2xl font-bold">{userStats.rank}</div>
            <div className="text-sm opacity-90">순위</div>
          </div>
          <div className="text-center bg-white bg-opacity-10 rounded-lg p-3">
            <div className="text-2xl font-bold">{userStats.commentsAdded}</div>
            <div className="text-sm opacity-90">댓글</div>
          </div>
          <div className="text-center bg-white bg-opacity-10 rounded-lg p-3">
            <div className="text-2xl font-bold">{userStats.photosAdded}</div>
            <div className="text-sm opacity-90">사진</div>
          </div>
          <div className="text-center bg-white bg-opacity-10 rounded-lg p-3">
            <div className="text-2xl font-bold">{userStats.emojisAdded}</div>
            <div className="text-sm opacity-90">이모지</div>
          </div>
        </div>
      </div>

      {/* 랭킹 목록 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🏆 전체 랭킹</h3>
        <div className="space-y-3">
          {rankings.slice(0, 10).map((ranking, index) => (
            <div key={ranking.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                  index === 0 ? 'bg-yellow-500' :
                  index === 1 ? 'bg-gray-400' :
                  index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{ranking.name}</div>
                  <div className="text-sm text-gray-600">{ranking.affiliation}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-gray-900">{ranking.totalScore}점</div>
                <div className="text-xs text-gray-500">
                  댓글 {ranking.commentsAdded} | 사진 {ranking.photosAdded} | 이모지 {ranking.emojisAdded}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 