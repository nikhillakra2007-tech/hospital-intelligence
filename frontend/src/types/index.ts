export type RiskCategory = "Low" | "Moderate" | "High";

export interface Patient {
  patient_id: string;
  age: number;
  gender: "M" | "F" | "Other";
  district: string;
  blood_pressure_systolic: number;
  blood_pressure_diastolic: number;
  cholesterol: number;
  glucose: number;
  bmi: number;
  heart_rate: number;
  previous_cardiac_history: boolean;
  diabetes: boolean;
  hypertension: boolean;
  hospital_id: string | null;
  hospital_name?: string | null;
}

export type HospitalType = "Government" | "Private" | "Specialty" | "Teaching";

export interface Hospital {
  hospital_id: string;
  hospital_name: string;
  district: string;
  locality: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  hospital_type: "Government" | "Private" | "Trust" | "Unknown";
  total_beds: number | null;
  icu_beds: number | null;
  emergency_beds: number | null;
  emergency: boolean | null;
  operator: string | null;
  phone: string | null;
  capacity_status: string;
  source_element: string | null;
  source_id: number | null;
  patient_count?: number;
  high_risk_count?: number;
  avg_ml_score?: number | null;
  high_risk_predicted?: number | null;
}

export interface HospitalOperation {
  operation_id: string;
  hospital_id: string;
  operation_date: string;
  admissions: number;
  discharges: number;
  emergency_visits: number;
  occupied_beds: number;
  available_beds: number;
  icu_occupied: number;
  average_wait_time_minutes: number;
}

export interface HealthGrid {
  grid_id: string;
  district: string;
  latitude: number;
  longitude: number;
  population: number;
  population_density: number;
  hospital_count: number;
  nearest_hospital_distance_km: number;
}

export interface EnvironmentalDataRecord {
  environment_id: string;
  grid_id: string;
  recorded_date: string;
  aqi: number;
  temperature_c: number;
  rainfall_mm: number;
}

export interface RiskAssessment {
  risk_assessment_id: string;
  patient_id: string;
  grid_id: string;
  assessment_date: string;
  cardiac_risk_score: number;
  overall_health_risk_score: number;
  risk_category: RiskCategory;
}

export interface DashboardSummary {
  total_patients: number;
  total_hospitals: number;
  reported_beds: number;
  hospitals_reporting_beds: number;
  icu_capacity_reported: number | null;
  emergency_capable_facilities: number;
  high_risk_patients: number;
}

export interface HospitalCapacityItem {
  hospital_id: string;
  hospital_name: string;
  district: string;
  locality: string | null;
  hospital_type: string;
  emergency: boolean | null;
  capacity_status: string;
  source_element: string | null;
  source_id: number | null;
  total_beds: number | null;
  icu_beds: number | null;
  emergency_beds: number | null;
  patient_count: number;
  high_risk_count: number;
  avg_ml_score: number | null;
  high_risk_predicted: number | null;
}

export type RiskDistribution = Record<string, number>;

export interface EnvironmentGridSummary {
  grid_id: string;
  district: string;
  records: number;
  average_aqi: number | null;
  average_temperature_c: number | null;
  total_rainfall_mm: number;
  first_recorded_date: string | null;
  last_recorded_date: string | null;
}

export interface UrbanModelStatus {
  integration: string;
  mode: string;
  model_dir: string;
  available: boolean;
  feature_count: number;
  feature_groups: string[];
  reason: string | null;
  api_url?: string;
  model_type?: string;
  output_classes?: string[];
}

export interface DelhiGridCell {
  id: number;
  lat: number;
  lng: number;
  ring: [number, number][];
}

export interface DelhiHospital {
  element: string;
  id: number;
  name: string | null;
  kind: string;
  emergency: boolean | null;
  beds: number | null;
  operator: string | null;
  phone: string | null;
  addr_street: string | null;
  addr_city: string | null;
  addr_district: string | null;
  postcode: string | null;
  lat: number;
  lng: number;
}

export interface DelhiMapData {
  source: string;
  cell_count: number;
  hospital_count: number;
  named_count: number;
  boundary_rings: [number, number][][];
  grids: DelhiGridCell[];
  hospitals: DelhiHospital[];
}


export interface RiskPredictionRow {
  patient_id: string;
  district: string;
  hospital_name: string | null;
  risk_score: number;
  risk_level: "LOW" | "MODERATE" | "HIGH";
  probabilities: { Low: number; Moderate: number; High: number };
  stored_category: string | null;
  model_version: string;
}

export interface RiskPredictionsResponse {
  source: string;
  count: number;
  generated_at?: string;
  predictions: RiskPredictionRow[];
}

export interface RiskAssessmentRunResponse extends RiskPredictionsResponse {
  status: string;
  generated_at: string;
  duration_ms: number;
  model_name: string;
  model_version: string | null;
  inference_mode: string | null;
  average_risk: number;
  level_counts: Record<"HIGH" | "MODERATE" | "LOW", number>;
}

export interface ContextualBlock {
  combined_score: number;
  clinical_score: number;
  environmental_signal: number;
  environmental_weight: number;
  method: string;
  risk_level: string;
}

export interface SingleRiskPrediction {
  patient_id: string;
  district: string;
  features_used: string[];
  prediction: {
    risk_score: number;
    risk_level: string;
    probabilities: Record<string, number>;
  };
  contextual: ContextualBlock | null;
  recorded_assessment_category: string | null;
  generated_at: string;
  factors: Array<{ label: string; value: string }>;
  model_name: string;
  model_version: string;
  inference_mode: string;
  disclaimer: string;
}

export interface RiskModelInfo {
  available: boolean;
  mode?: string;
  model_name?: string;
  model_version?: string;
  model_type?: string;
  feature_count?: number;
  feature_columns?: string[];
  levels?: string[];
  thresholds?: Record<string, number>;
  n_estimators?: number;
  metrics?: {
    training_rows?: number;
    test_rows?: number;
    metrics?: Record<string, number>;
    confusion_matrix?: { labels: string[]; matrix: number[][] };
    feature_importance?: Array<{ feature: string; importance: number }>;
    trained_at?: string;
  };
  reason?: string | null;
  disclaimer?: string;
}