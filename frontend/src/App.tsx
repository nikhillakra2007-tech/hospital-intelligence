import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { LoadingState } from "@/components/common/states";

// Route-level code splitting: each page (and the heavy map/chart libraries it
// pulls in) loads on demand instead of in one monolithic first-load bundle.
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Hospitals = lazy(() => import("@/pages/Hospitals"));
const Patients = lazy(() => import("@/pages/Patients"));
const Risk = lazy(() => import("@/pages/Risk"));
const Environment = lazy(() => import("@/pages/Environment"));

function RouteFallback() {
  return (
    <div className="py-8">
      <LoadingState label="Loading page…" rows={4} />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route
          index
          element={
            <Suspense fallback={<RouteFallback />}>
              <Dashboard />
            </Suspense>
          }
        />
        <Route
          path="/hospitals"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Hospitals />
            </Suspense>
          }
        />
        <Route
          path="/patients"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Patients />
            </Suspense>
          }
        />
        <Route
          path="/risk"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Risk />
            </Suspense>
          }
        />
        <Route
          path="/environment"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Environment />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
