import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import PatternListPage from './pages/PatternListPage.jsx';
import PatternEditPage from './pages/PatternEditPage.jsx';
import PatternViewPage from './pages/PatternViewPage.jsx';

const router = createBrowserRouter([
  { path: '/', element: <PatternListPage /> },
  { path: '/new', element: <PatternEditPage /> },
  { path: '/edit/:id', element: <PatternEditPage /> },
  { path: '/view/:id', element: <PatternViewPage /> },
]);

function App() {
  return (
    <RouterProvider router={router} />
  );
}

export default App;
