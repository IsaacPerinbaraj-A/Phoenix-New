import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import AssessPage from "./pages/AssessPage.jsx";
import CaseDetailPage from "./pages/CaseDetailPage.jsx";
import HistoryPage from "./pages/HistoryPage.jsx";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/assess" element={<AssessPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/cases/:id" element={<CaseDetailPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>
    </Routes>
  );
}
