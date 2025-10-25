import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/common/Layout';
import HomePage from './pages/HomePage';
import TestatorPage from './pages/testator/TestatorPage';
import NotaryPage from './pages/notary/NotaryPage';
import OraclePage from './pages/oracle/OraclePage';
import ExecutorPage from './pages/executor/ExecutorPage';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/testator" element={<TestatorPage />} />
          <Route path="/notary" element={<NotaryPage />} />
          <Route path="/oracle" element={<OraclePage />} />
          <Route path="/executor" element={<ExecutorPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
