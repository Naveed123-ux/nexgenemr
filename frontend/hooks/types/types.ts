export type RoleType = "Doctor" | "Receptionist" | "Hospital_Admin" | "Super_Admin" | "Patient" | "Lab_Technician"
export interface Hospital {
  id: number;
  name: string;
  code: string;
  email: string;
  phone_number: string;
  country: string;
  address: string;
  time_zone: string;
  primary_language: string;
  header_text: string;
  tagline: string;
  description: string;
  logo_url: string;
  favicon_url: string;
  sidebar_color: string;
  header_color: string;
  admin_user_id: number;
  is_active: boolean;
}

export interface LoginSchema {
  email: string;
  password: string;
}

export interface HospitalCreationData {
  basic_info: {
    name: string;
    code: string;
    email: string;
    phone_number: string;
    country: string;
    address: string;
    time_zone: string;
    primary_language: string;
    admin_first_name: string;
    admin_last_name: string;
  };
  branding_info: {
    header_text: string;
    tagline: string;
    description: string;
    sidebar_color: string;
    header_color: string;
  };
  logo: File | null;
  favicon: File | null;
}

export interface Department {
  id: number;
  name: string;
  is_active: boolean;
  hospital_id: number;
  logo_url: string;
  no_of_members: number;
}

export interface DataHospitals {
  total: number;
  page: number;
  size: number;
  totalPages: number;
  hospitals: Hospital[];
}
// API Response interface (matches what your API actually returns)
export interface DataAuditLogs {
  total: number;
  page: number;
  size: number;
  totalPages: number;
  logs: ApiLogEntry[];
}

// Raw API log entry structure
export interface ApiLogEntry {
  Timestamp: string;
  Level: string;
  MessageTemplate: string | null;
  RenderedMessage: string | null;
  Properties: {
    ClientIP: string;
    HospitalId: number;
    LoggerName: string;
    MachineName: string;
    ProcessId: number;
    RequestMethod: string;
    RequestPath: string;
    StatusCode: number;
    ThreadId: number;
    ThreadName: string;
    UserEmail: string;
    UserRole: string;
  };
}

// Processed log interface (what your component uses)
export interface Log {
  timestamp: string;
  user_id: number;
  user_email: string;
  user_role: string;
  hospital_id: number;
  http_method: string;
  path: string;
  status_code: number;
}

export interface DoctorProfile {
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
  profile_id: number;
  specialization: string;
  department_name: string;
  profile_picture_url: string;
  is_active: boolean;
}

// State interface

export interface DataDoctors {
  total: number;
  page: number;
  size: number;
  totalPages: number;
  doctors: DoctorProfile[];
}

export interface StaffProfile {
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
  job_title: string;
  profile_picture_url: string;
  is_active: boolean;
}


export interface StaffData {
  total: number;
  page: number;
  size: number;
  totalPages: number;
  staff: StaffProfile[];
}

interface BasePatient {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  client_type: string;
  billing_type: "Self-Pay" | "Insurance";
}

// For Self-Pay
interface SelfPayPatient extends BasePatient {
  billing_type: "Self-Pay";
}
export interface Appointment {
  id: number;
  patient_name: string;
  doctor_name: string;
  start_time: string;
  end_time: string;
  is_telehealth: boolean;
  status: string;
  google_meet_link: string;
  specialization: string;
  reason_for_visit: string;
}

// For Insurance
interface InsurancePatient extends BasePatient {
  billing_type: "Insurance" | "Self-Pay";
  insurer_name: string;
  member_id: string;
  triage_level: string;
  bay_or_room: string;
  lab_status: string;
  group_id: string;
  chief_complaint: string;
  subscriber_first_name: string;
  subscriber_last_name: string;
  subscriber_dob: string;
  subscriber_relationship_to_patient: string;
}

// Union type (final patient type)
export type PatientIntake = SelfPayPatient | InsurancePatient;

export interface ScheduleSlot {
  id: number;
  start_time: string; // ISO datetime string
  end_time: string; // ISO datetime string
  status: "Available" | "Booked" | "Blocked"; // union type for safety
}

export interface PatientProfile {
  user_id: number;
  profile_id: number;
  email: string;
  full_name: string;
  status: boolean;
  assigned_doctor_id: number;
}

export interface CreateAppointmentRequest {
  patient_user_id: number; // The ID of the patient profile
  appointment_slot_id: number; // The ID of the slot being booked
  is_telehealth: boolean; // Whether it is a telehealth appointment or not
  reason_for_visit: string; // Reason for visit text
  icd_code_id: number; // Add this new field
}
export interface Slot {
  day_of_week: string;
  start_time: string;
  end_time: string;
  is_telemedicine: boolean;
  slot_duration_minutes: number;
}
// Single participant in a conversation
export interface ConversationParticipant {
  user_id: number;
  first_name: string;
  last_name: string;
  role: string;
  profile_picture_url: string;
}

// Single message in a conversation
export interface ConversationMessage {
  id: number | string;
  sender_id: number | null;
  sender_name: string | null;
  content: string;
  created_at: string;
  isTemp?: boolean; // Flag to identify temporary messages
  tempId?: string; // Store original temp ID for replacement
}

// Conversation details API
export interface ConversationDetail {
  id: number | string;
  subject: string;
  current_user_id: number;
  participants: ConversationParticipant[];
  messages: ConversationMessage[];
}

// Conversation list preview API
export interface Conversation {
  conversation_id: number;
  subject: string;
  receiver_id: number;
  receiver_name: string;
  last_message_preview: string;
  last_message_timestamp: string;
}

export interface Staff {
  first_name: string;
  last_name: string;
  email: string;
  job_title: string;
}

export interface SingAppPatient {

  apppointment_id: number;
  patient_name: string;
  status: string;
  doctor_name: string;
}
export interface VitalSignsPayload {
  blood_pressure: string;
  heart_rate: number;
  respiratory_rate: number;
  temperature: number;
  oxygen_saturation: number;
  pain_level: string; // API expects a string for pain_level
}

// Interface for the medical history data based on your curl command
export interface MedicalHistoryPayload {
  allergies: string[];
  current_medications: string[];
  past_medical_history: string[];
}

export interface PatientListItem {
  patientID: number;
  patient_name: string;
  assigned_md: string;
  visit_status: string;
  chief_complaint: string | null;
  length_of_stay: string;
  bay_or_room: string | null;
  triage_level: string | null;
  lab_status: string | null;
}

export interface Prescription {
  id: number;
  patient_user_id: number;
  appointment_id: number;
  medication: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  status: "active" | "cancelled";
  doctor_name?: string;
}

export interface CreatePrescriptionPayload {
  patient_user_id: number;
  appointment_id: number;
  medication: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date?: string;
  notes?: string;
}

export interface UpcomingAppointment {
  id: number;
  doctor_name: string;
  department_name: string;
  start_time: string;
  is_telehealth: boolean;
  google_meet_link: string | null;
}

export interface RecentVitals {
  id: number;
  recorded_at: string;
  blood_pressure: string;
  heart_rate: number;
  temperature: number;
  respiratory_rate: number;
}

export interface ActiveMedication {
  id: number;
  medication_name: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date: string | null;
}

export interface RecentLabResult {
  id: number;
  test_name: string;
  result: string;
  date_reported: string;
}

export interface PatientDashboardData {
  first_name: string;
  last_name: string;
  email: string;
  profile_picture_url?: string;
  upcoming_appointments: UpcomingAppointment[];
  recent_vitals: RecentVitals | null;
  active_medications: ActiveMedication[];
  recent_lab_results: RecentLabResult[];
}

export interface HospitalPatient {
  user_id: number;
  profile_id: number;
  email: string;
  full_name: string;
  client_type: string;
  billing_type: "Insurance" | "Self-Pay";
  status: boolean;
  assigned_doctor_id: number | null;
  assigned_doctor_name: string | null;
  chief_complaint: string | null;
  bay_or_room: string | null;
  triage_level: string | null;
  lab_status: string | null;
  insurer_name: string | null;
  member_id: string | null;
}

export interface Claim {
  id: number;
  patient_name: string;
  code: string;
  icd_description: string;
  doctor_info: string;
  due_date: string;
  amount: number;
  insurance_company: string;
  appointment_id: number;
  status: "pending" | "approved" | "denied" | "paid";
  reason_for_denial: string | null;
}

export interface GenerateClaimResponse {
  message: string;
}

export interface EligibilityResponse {
  transactionId: string;
  checkDate: string;
  eligibilityStatus: "Eligible" | "Ineligible";
  patientDetails: {
    name: string;
    memberId: string;
  };
  providerDetails: {
    name: string;
    npi: string;
  };
  serviceDetails: {
    serviceCode: string;
    serviceDescription: string;
    serviceDate: string;
  };
  coverageDetails: {
    planName: string;
    coPay: string;
    deductible: string;
    coInsurance: string;
    limitations: string[];
  };
  rejectionReason?: string;
}

export interface SubmissionResponse {
  message: string;
  submissionStatus: "Accepted" | "Rejected";
  confirmationId: string;
  submittedData: {
    header: {
      submissionId: string;
      submissionDate: string;
    };
    payer: {
      name: string;
      payerId: string;
    };
    provider: {
      name: string;
      npi: string;
    };
    patient: {
      name: string;
      memberId: string;
      dateOfBirth: string;
    };
    claimDetails: {
      claimId: number;
      serviceDate: string;
      diagnoses: Array<{
        code: string;
        type: string;
      }>;
      totalAmount: number;
    };
  };
}

export interface BillItem {
  id: number;
  appointment_id: number;
  description: string;
  icd_code: string;
  icd_description: string;
  service_date: string;
  amount: number;
  quantity: number;
  unit_price: number;
}

export interface Bill {
  id: number;
  patient_user_id: number;
  patient_profile_id: number;
  patient_name: string;
  hospital_id: number;
  hospital_name?: string;
  bill_number: string;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  status: "pending" | "paid" | "overdue" | "cancelled";
  issue_date: string;
  due_date: string;
  paid_date?: string | null;
  payment_method?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  bill_items?: BillItem[];
}

export interface GenerateBillRequest {
  patient_user_id: number;
  notes?: string;
}

export interface UpdateBillRequest {
  status?: "pending" | "paid" | "overdue" | "cancelled";
  notes?: string;
  due_date?: string;
}