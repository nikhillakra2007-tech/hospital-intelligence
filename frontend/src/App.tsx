import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Hospitals from "@/pages/Hospitals";
import Patients from "@/pages/Patients";
import Risk from "@/pages/Risk";
import Environment from "@/pages/Environment";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="/hospitals" element={<Hospitals />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/risk" element={<Risk />} />
        <Route path="/environment" element={<Environment />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
