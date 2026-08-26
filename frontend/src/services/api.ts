import axios from "axios";
import type {
  DashboardSummary,
  DelhiMapData,
  EnvironmentalDataRecord,
  EnvironmentGridSummary,
  HealthGrid,
  Hospital,
  HospitalCapacityItem,
  HospitalOperation,
  Patient,
  RiskAssessment,
  RiskCategory,
  RiskDistribution,
  UrbanModelStatus,
  RiskModelInfo,
  RiskPredictionsResponse,
  RiskAssessmentRunResponse,
  SingleRiskPrediction,
} from "@/types";

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export const api = axios.create({
  baseURL,
  timeout: 15000,
});

export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = (
      error.response?.data as { detail?: unknown } | undefined
    )?.detail;
    if (typeof detail === "string") return detail;
    if (error.code === "ECONNABORTED") return "The request timed out.";
    if (!error.response) return "Cannot reach the API server. Is the backend running?";
    return `Request failed with status ${error.response.status}.`;
  }
  return error instanceof Error ? error.message : "An unexpected error occurred.";
}

export function checkHealth(): Promise<{ status: string }> {
  return api.get<{ status: string }>("/health").then((r) => r.data);
}

export function getDashboardSummary(): Promise<DashboardSummary> {
  return api.get<DashboardSummary>("/api/dashboard/summary").then((r) => r.data);
}

export function getHospitalCapacity(): Promise<HospitalCapacityItem[]> {
  return api
    .get<HospitalCapacityItem[]>("/api/dashboard/hospital-capacity")
    .then((r) => r.data);
}

export function getRiskDistribution(): Promise<RiskDistribution> {
  return api.get<RiskDistribution>("/api/dashboard/risk-distribution").then((r) => r.data);
}

export function getEnvironmentSummary(): Promise<EnvironmentGridSummary[]> {
  return api
    .get<EnvironmentGridSummary[]>("/api/dashboard/environment")
    .then((r) => r.data);
}

export function getUrbanModelStatus(): Promise<UrbanModelStatus> {
  return api.get<UrbanModelStatus>("/api/intelligence/urban-status").then((r) => r.data);
}

export function getDelhiMap(): Promise<DelhiMapData> {
  return api
    .get<DelhiMapData>("/api/map/delhi", { timeout: 60000 })
    .then((r) => r.data);
}

export interface ListParams {
  skip?: number;
  limit?: number;
}

export function getPatients(params?: ListParams & { district?: string }): Promise<Patient[]> {
  return api.get<Patient[]>("/api/patients", { params }).then((r) => r.data);
}

export function getPatient(patientId: string): Promise<Patient> {
  return api.get<Patient>(`/api/patients/${patientId}`).then((r) => r.data);
}

export function getHospitals(
  params?: ListParams & { district?: string; hospital_type?: string },
): Promise<Hospital[]> {
  return api.get<Hospital[]>("/api/hospitals", { params }).then((r) => r.data);
}

export function getHospitalOperations(
  params?: ListParams & { hospital_id?: string },
): Promise<HospitalOperation[]> {
  return api.get<HospitalOperation[]>("/api/hospital-operations", { params }).then((r) => r.data);
}

export function getHealthGrids(params?: ListParams & { district?: string }): Promise<HealthGrid[]> {
  return api.get<HealthGrid[]>("/api/health-grids", { params }).then((r) => r.data);
}

export function getEnvironmentalData(
  params?: ListParams & { grid_id?: string },
): Promise<EnvironmentalDataRecord[]> {
  return api.get<EnvironmentalDataRecord[]>("/api/environmental-data", { params }).then((r) => r.data);
}

export function getRiskAssessments(
  params?: ListParams & {
    patient_id?: string;
    grid_id?: string;
    risk_category?: RiskCategory;
  },
): Promise<RiskAssessment[]> {
  return api.get<RiskAssessment[]>("/api/risk-assessments", { params }).then((r) => r.data);
}

export function getRiskModelInfo(): Promise<RiskModelInfo> {
  return api.get<RiskModelInfo>("/api/risk/model-info").then((r) => r.data);
}

export function getRiskPredictions(): Promise<RiskPredictionsResponse> {
  return api
    .get<RiskPredictionsResponse>("/api/risk/predictions", { timeout: 60000 })
    .then((r) => r.data);
}

export function runRiskAssessment(): Promise<RiskAssessmentRunResponse> {
  return api
    .post<RiskAssessmentRunResponse>("/api/risk/run-assessment", null, {
      timeout: 60000,
    })
    .then((r) => r.data);
}

export function predictPatientRisk(patientId: string): Promise<SingleRiskPrediction> {
  return api
    .post<SingleRiskPrediction>("/api/risk/predict", { patient_id: patientId })
    .then((r) => r.data);
}