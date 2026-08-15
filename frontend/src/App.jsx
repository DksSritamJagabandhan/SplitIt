import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Group from "./pages/Group";

function Protected({ children }) {
  return localStorage.getItem("token")
    ? children
    : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={
          <Protected>
            <Dashboard />
          </Protected>
        }
        />
        <Route path="/groups/:id" element={
          <Protected>
            <Group />
          </Protected>
        }
        />
      </Routes>
    </BrowserRouter>
  );
}