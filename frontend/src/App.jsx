/**
 * 메인 App 컴포넌트
 */
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import TeacherLogin from './pages/TeacherLogin';
import TeacherHome from './pages/TeacherHome';
import TemplateCreate from './pages/TemplateCreate';
import RunNew from './pages/RunNew';
import RunNewStep1 from './pages/RunNewStep1';
import RunNewSimple from './pages/RunNewSimple';
import RunLive from './pages/RunLive';
import RunLiveSimple from './pages/RunLiveSimple';
import SessionManage from './pages/SessionManage';
import StudentJoin from './pages/StudentJoin';
import StudentLearn from './pages/StudentLearn';
import SocraticTemplateTest from './pages/SocraticTemplateTest';
import SocraticStudentTest from './pages/SocraticStudentTest';
import SocraticIframeTest from './pages/SocraticIframeTest';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          {/* React Hot Toast 설정 */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                iconTheme: {
                  primary: '#4aed88',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ff6b6b',
                  secondary: '#fff',
                },
              },
            }}
          />

          {/* 라우트 설정 */}
          <Routes>
            {/* 루트 경로 - 로그인 페이지로 리다이렉트 */}
            <Route path="/" element={<Navigate to="/teacher/login" replace />} />
            
            {/* 교사 로그인 페이지 */}
            <Route path="/teacher/login" element={<TeacherLogin />} />
            
            {/* 교사 홈 페이지 (보호된 라우트) */}
            <Route 
              path="/teacher/home" 
              element={
                <ProtectedRoute>
                  <TeacherHome />
                </ProtectedRoute>
              } 
            />

            {/* 템플릿 생성 페이지 (보호된 라우트) */}
            <Route 
              path="/teacher/template/new" 
              element={
                <ProtectedRoute>
                  <TemplateCreate />
                </ProtectedRoute>
              } 
            />

            {/* 세션 관리 페이지 (보호된 라우트) */}
            <Route 
              path="/teacher/run/manage" 
              element={
                <ProtectedRoute>
                  <SessionManage />
                </ProtectedRoute>
              } 
            />

            {/* 기존 Run 생성 페이지 (호환성) */}
            <Route 
              path="/teacher/run/new" 
              element={
                <ProtectedRoute>
                  <RunNewStep1 />
                </ProtectedRoute>
              } 
            />

            {/* Run 라이브 페이지 (보호된 라우트) */}
            <Route 
              path="/teacher/run/live" 
              element={
                <ProtectedRoute>
                  <RunLiveSimple />
                </ProtectedRoute>
              } 
            />

            {/* 교사 경로 단축 */}
            <Route path="/teacher" element={<Navigate to="/teacher/home" replace />} />

            {/* 학생 라우트 (인증 불필요) */}
            <Route path="/student/join" element={<StudentJoin />} />
            <Route path="/student/learn" element={<StudentLearn />} />

            {/* 임시 테스트 페이지 */}
            <Route path="/test/socratic" element={<SocraticTemplateTest />} />
            <Route path="/test/socratic-student" element={<SocraticStudentTest />} />
            <Route path="/test/socratic-iframe" element={<SocraticIframeTest />} />

            {/* 404 처리 */}
            <Route path="*" element={<Navigate to="/teacher/login" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;