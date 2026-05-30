import { useContext, useMemo } from "react";
import { createBrowserRouter, RouterProvider, createRoutesFromElements, Route } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/AdminDashboard";
import UserDashboard from "./pages/UserDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import Standards from "./pages/Standards";
import AdminTemplates from "./pages/AdminTemplates";
import { AuthContext } from "./context/AuthContext";
import Editor from "./pages/Editor";
import MyDocuments from "./pages/MyDocuments";
import CreateDocument from "./pages/CreateDocument";
import MainLayout from "./components/MainLayout";
import CreateTemplate from "./pages/CreateTemplate";
import UserManagement from "./pages/UserManagement";
import TemplateDetails from "./pages/TemplateDetails";
import UserTemplates from "./pages/UserTemplates";
import Profile from "./pages/Profile";
import { HomeOrRedirect } from "./pages/Home";
import { Toaster } from "react-hot-toast";

function App() {
  const { user } = useContext(AuthContext);

  const router = useMemo(() => createBrowserRouter(
    createRoutesFromElements(
      <Route path="/">
        {/* PUBLIC ROUTES */}
        <Route index element={<HomeOrRedirect />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />

        {/* PROTECTED LAYOUT WRAPPER */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          {/* ADMIN SUB-ROUTES */}
          <Route path="admin">
            <Route index element={<AdminDashboard />} />
            <Route path="templates">
              <Route index element={<AdminTemplates />} />
              <Route path="create" element={<CreateTemplate />} />
              <Route path="edit/:id" element={<CreateTemplate />} />
              <Route path="details/:id" element={<TemplateDetails />} />
            </Route>
            <Route path="users" element={<UserManagement />} />
          </Route>

          {/* USER SUB-ROUTES */}
          <Route path="user">
            <Route index element={<UserDashboard />} />
            <Route path="documents">
              <Route index element={<MyDocuments />} />
              <Route path="create" element={<CreateDocument />} />
            </Route>
            <Route path="templates">
              <Route index element={<UserTemplates />} />
              <Route path="details/:id" element={<TemplateDetails />} />
              <Route path="edit/:id" element={<CreateTemplate />} />
            </Route>
          </Route>

          {/* SHARED PROTECTED ROUTES */}
          <Route path="standards/:typeId" element={<Standards />} />
          <Route path="editor/:documentId" element={<Editor />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<div>Settings Page</div>} />
        </Route>
      </Route>
    )
  ), [user?.role]);

  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      <RouterProvider router={router} />
    </>
  );
}

export default App;
