import { useContext } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

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

function App() {
  const { user } = useContext(AuthContext);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              {user?.role === "admin" ? <AdminDashboard /> : <UserDashboard />}
            </ProtectedRoute>
          }
        />

        <Route path="/dashboard" element={<UserDashboard />}>
          <Route path="documents" element={<MyDocuments />} />
          <Route path="create" element={<CreateDocument />} />
        </Route>
        <Route
          path="/standards/:typeId"
          element={
            <ProtectedRoute>
              <Standards />
            </ProtectedRoute>
          }
        />
        <Route
          path="/editor/:documentId"
          element={
            <ProtectedRoute>
              <Editor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/templates"
          element={
            <ProtectedRoute>
              <AdminTemplates />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
