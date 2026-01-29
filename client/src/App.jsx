import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PatternListPage from './pages/PatternListPage.jsx';
import PatternEditPage from './pages/PatternEditPage.jsx';
import PatternViewPage from './pages/PatternViewPage.jsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PatternListPage />} />
        <Route path="/new" element={<PatternEditPage />} />
        <Route path="/edit/:id" element={<PatternEditPage />} />
        <Route path="/view/:id" element={<PatternViewPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
