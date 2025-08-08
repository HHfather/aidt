import React from 'react'

function Error({ statusCode }) {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">
          {statusCode || '오류'}
        </h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          {statusCode
            ? `서버에서 ${statusCode} 오류가 발생했습니다`
            : '클라이언트에서 오류가 발생했습니다'}
        </h2>
        <div className="space-y-4">
          <p className="text-gray-600">
            페이지를 찾을 수 없거나 일시적인 오류가 발생했습니다.
          </p>
          <div className="space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              새로고침
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              홈으로 가기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}

export default Error
