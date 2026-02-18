import { Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import OvertimeEntry from './pages/OvertimeEntry';
import Import from './pages/Import';
import Reports from './pages/Reports';
import Admin from './pages/Admin';
import NotFound from './pages/NotFound';
import type { ReactNode } from 'react';

interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
}

const routes: RouteConfig[] = [
  {
    name: 'Login',
    path: '/login',
    element: <Login />,
    visible: false,
  },
  {
    name: 'Dashboard',
    path: '/dashboard',
    element: <Dashboard />,
  },
  {
    name: 'Employees',
    path: '/employees',
    element: <Employees />,
  },
  {
    name: 'Overtime Entry',
    path: '/overtime',
    element: <OvertimeEntry />,
  },
  {
    name: 'Import',
    path: '/import',
    element: <Import />,
  },
  {
    name: 'Reports',
    path: '/reports',
    element: <Reports />,
  },
  {
    name: 'Admin',
    path: '/admin',
    element: <Admin />,
  },
  {
    name: 'Root',
    path: '/',
    element: <Navigate to="/dashboard" replace />,
    visible: false,
  },
  {
    name: 'Not Found',
    path: '*',
    element: <NotFound />,
    visible: false,
  },
];

export default routes;
