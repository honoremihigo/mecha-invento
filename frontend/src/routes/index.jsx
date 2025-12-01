import { Suspense } from "react";
import {
  createBrowserRouter,
  Navigate,
  Outlet,
} from "react-router-dom";

// Pages
import Dashboard from "../page/dashboard/Dashboard";
import LoginPage from "../page/auth/admin/Login";
import EmployeeLoginPage from "../page/auth/employee/EmployeeLoginPage";
import UnlockScreen from "../page/auth/admin/UnlockScreen";
import EmployeeUnlockScreen from "../page/auth/employee/EmployeeUnlockScreen";
import AuthSelectionPage from "../page/auth/AuthSelectionPage";
import NotFoundPage from "../page/landing/NotFound";
import LandingPage from "../page/landing/Home";

// Dashboard Pages
import EmployeeManagement from "../page/dashboard/EmployeeManagement";
import TaskManagement from "../page/dashboard/TaskManagement";
import CategoryManagement from "../page/dashboard/CategoryManagement";
import ProductManagement from "../page/dashboard/ProductManagement";
import ProductViewPage from "../components/dashboard/product/ViewMorePage";
import StockInManagement from "../page/dashboard/StockInManagement";
import StockOutManagment from "../page/dashboard/StockOutManagment";
import SalesReturnManagement from "../page/dashboard/SalesReturnManagement";
import AdminProfile from "../page/dashboard/AdminProfile";
import EmployeeProfile from "../page/dashboard/EmployeeProfileManagement";
import EmployeeDashboard from "../page/dashboard/EmployeeDashboard";

// Layouts
import DashboardLayout from "../layout/DashboardLayout";
import MainLayout from "../layout/MainLayout";
import AuthLayout from "../layout/AuthLayout";
import AdminAuthLayout from "../layout/Admin/AdminAuthLayout";
import EmployeeAuthLayout from "../layout/employee/EmployeeAuthLayout";

// Protectors
import ProtectPrivateAdmin from "../components/protectors/admin/ProtectPrivateAdmin";
import ProtectPrivateEmployee from "../components/protectors/employee/ProtectPrivateAdmin"; // Note: rename this file later to ProtectPrivateEmployee

// Suspense Wrapper
const SuspenseWrapper = ({ children }) => (
  <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
);

// ========== ROUTER CONFIGURATION ==========
const routes = createBrowserRouter([
  // Root: Redirect to Auth Selection
  {
    path: "/",
    element: <Navigate to="/auth/admin/login" replace />,
  },

  // Optional: Keep landing page accessible via /home (remove if not needed)
  {
    path: "/home",
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <LandingPage />,
      },
    ],
  },

  // ========== AUTH ROUTES ==========
  {
    path: "/auth",
    element: <AuthLayout />,
    children: [
      // Default: Choose Admin or Employee
      {
        index: true,
        element: <SuspenseWrapper><AuthSelectionPage /></SuspenseWrapper>,
      },

      // Admin Auth
      {
        path: "admin",
        element: <AdminAuthLayout />,
        children: [
          {
            path: "login",
            element: <SuspenseWrapper><LoginPage /></SuspenseWrapper>,
          },
          {
            path: "unlock",
            element: <SuspenseWrapper><UnlockScreen /></SuspenseWrapper>,
          },
        ],
      },

      // Employee Auth
      {
        path: "employee",
        element: <EmployeeAuthLayout />,
        children: [
          {
            path: "login",
            element: <SuspenseWrapper><EmployeeLoginPage /></SuspenseWrapper>,
          },
          {
            path: "unlock",
            element: <SuspenseWrapper><EmployeeUnlockScreen /></SuspenseWrapper>,
          },
        ],
      },
    ],
  },

  // ========== ADMIN PROTECTED ROUTES ==========
  {
    path: "/admin",
    element: (
      <ProtectPrivateAdmin>
        <MainLayout />
      </ProtectPrivateAdmin>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/admin/dashboard" replace />,
      },
      {
        path: "dashboard",
        element: <DashboardLayout role="admin" />,
        children: [
          {
            index: true,
            element: <SuspenseWrapper><Dashboard /></SuspenseWrapper>,
          },
          {
            path: "employee",
            element: <SuspenseWrapper><EmployeeManagement role="admin" /></SuspenseWrapper>,
          },
          {
            path: "position",
            element: <SuspenseWrapper><TaskManagement role="admin" /></SuspenseWrapper>,
          },
          {
            path: "category",
            element: <SuspenseWrapper><CategoryManagement role="admin" /></SuspenseWrapper>,
          },
          {
            path: "product",
            element: <SuspenseWrapper><ProductManagement role="admin" /></SuspenseWrapper>,
          },
          {
            path: "product/:id",
            element: <SuspenseWrapper><ProductViewPage role="admin" /></SuspenseWrapper>,
          },
          {
            path: "stockin",
            element: <SuspenseWrapper><StockInManagement role="admin" /></SuspenseWrapper>,
          },
          {
            path: "stockout",
            element: <SuspenseWrapper><StockOutManagment role="admin" /></SuspenseWrapper>,
          },
          {
            path: "profile",
            element: <SuspenseWrapper><AdminProfile role="admin" /></SuspenseWrapper>,
          },
        ],
      },
    ],
  },

  // ========== EMPLOYEE PROTECTED ROUTES ==========
  {
    path: "/employee",
    element: (
      <ProtectPrivateEmployee>
        <MainLayout />
      </ProtectPrivateEmployee>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/employee/dashboard" replace />,
      },
      {
        path: "dashboard",
        element: <DashboardLayout role="employee" />,
        children: [
          {
            index: true,
            element: <SuspenseWrapper><EmployeeDashboard /></SuspenseWrapper>,
          },
          {
            path: "profile",
            element: <SuspenseWrapper><EmployeeProfile /></SuspenseWrapper>,
          },
          {
            path: "stockin",
            element: <SuspenseWrapper><StockInManagement role="employee" /></SuspenseWrapper>,
          },
          {
            path: "category",
            element: <SuspenseWrapper><CategoryManagement role="employee" /></SuspenseWrapper>,
          },
          {
            path: "product",
            element: <SuspenseWrapper><ProductManagement role="employee" /></SuspenseWrapper>,
          },
          {
            path: "product/:id",
            element: <SuspenseWrapper><ProductViewPage role="employee" /></SuspenseWrapper>,
          },
          {
            path: "stockout",
            element: <SuspenseWrapper><StockOutManagment role="employee" /></SuspenseWrapper>,
          },
        ],
      },
    ],
  },

  // ========== 404 NOT FOUND ==========
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);

export default routes;