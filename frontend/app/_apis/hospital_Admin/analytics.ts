import { privateApi } from "@/lib/axios";

export interface AnalyticsDashboard {
  overview: {
    hospital_id: number;
    hospital_name: string;
    overview: {
      total_patients: number;
      total_doctors: number;
      total_staff: number;
      total_departments: number;
      total_appointments: number;
      total_bills: number;
    };
    appointments: {
      total: number;
      by_status: Record<string, number>;
    };
    financial: {
      total_revenue: number;
      total_collected: number;
      total_outstanding: number;
      collection_rate: number;
      bills_by_status: Record<string, number>;
    };
    claims: {
      total: number;
      by_status: Record<string, number>;
    };
    recent_activity_30d: {
      new_patients: number;
      appointments: number;
      revenue: number;
    };
    generated_at: string;
  };
  patients: {
    total_patients: number;
    by_billing_type: Record<string, number>;
    new_patients_trend: Array<{
      month: string;
      count: number;
    }>;
    top_diagnoses_count: number;
  };
  doctors: {
    total_doctors: number;
    by_department: Record<string, number>;
    by_specialization: Record<string, number>;
    top_performers: Array<{
      name: string;
      appointments: number;
    }>;
    average_appointments_per_doctor: number;
  };
  appointments: {
    total_appointments: number;
    period_days: number;
    appointments_in_period: number;
    by_status: Record<string, number>;
    by_type: Record<string, number>;
    daily_trend: Array<any>;
    cancellation_rate: number;
  };
  financial: {
    total_metrics: {
      total_billed: number;
      total_collected: number;
      total_outstanding: number;
      collection_rate: number;
    };
    period_metrics: {
      days: number;
      billed: number;
      collected: number;
    };
    bills_by_status: Record<string, {
      count: number;
      outstanding: number;
    }>;
    overdue: {
      count: number;
      amount: number;
    };
    revenue_trend: Array<{
      date: string;
      amount: number;
    }>;
    average_bill_amount: number;
    payment_methods: Record<string, {
      count: number;
      total: number;
    }>;
  };
  claims: {
    total_claims: number;
    by_status: Record<string, number>;
    by_insurance: Record<string, number>;
    approval_rate: number;
  };
  departments: {
    total_departments: number;
    departments: Array<{
      department_id: number;
      department_name: string;
      doctors: number;
      appointments: number;
    }>;
  };
  generated_at: string;
}

export async function fetchAnalyticsDashboard(): Promise<AnalyticsDashboard> {
  try {
    const response = await privateApi.get<AnalyticsDashboard>("/analytics/dashboard");
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to fetch analytics dashboard");
  }
}