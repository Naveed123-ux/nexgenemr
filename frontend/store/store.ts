import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import departmentReducer from "./slices/departmentSlice";
import superAdminReducer from "./slices/superAdminslice";
import auditReducer from "./slices/AuditSlice";
import allDoctors from "./slices/allDoctors";
import allStaff from "./slices/AllStaff";
import AllchatReducer from "./slices/chat";
import patientReducer from "./slices/patientSlice";
import DoctorSideBar from "./slices/DoctorSidebar";
import soapReducer from "./slices/soapSlice";
import patientSnapshot from "./slices/patientSnapshotSlice";
import staffSidePatients from "./slices/staffSlice";
import hospitalRequestsReducer from "./slices/hospitalRequestsSlice";
import availabilityReducer from "./slices/availabilitySlice";
import hospitalProfileReducer from "./slices/hospitalProfileSlice";
import dashboardStatsSlice from "./slices/dashboardStatsSlice";
import profilePictureReducer from "./slices/profilePictureSlice";
import appointmentReducer from "./slices/appointmentSlice";
import availableSlotsReducer from "./slices/availableSlotsSlice";
import soapNoteReducer from "./slices/soapNoteSlice";
import patientSynopsisReducer from "./slices/patientSynopsisSlice";
import allPatientsReducer from "./slices/allPatientsSlice";
import prescriptionReducer from "./slices/prescriptionSlice";
import patientPrescriptionsReducer from "./slices/patientPrescriptionsSlice";
import clinicalDataReducer from "./slices/clinicalDataSlice";
import patientDashboardReducer from './slices/patientDashboardSlice'
import hospitalPatientsReducer from './slices/hospitalPatientsSlice'
import claimsReducer from './slices/claimsSlice'
import invoiceReducer from './slices/invoiceSlice'
import dischargeSummaryReducer from './slices/dischargeSummarySlice'
import handoffNoteReducer from './slices/handoffNoteSlice'
import patientSummaryReducer from './slices/patientSummarySlice'
import sessionsReducer from './slices/sessionsSlice'
export const store = configureStore({
  reducer: {
    auth: authReducer,
    department: departmentReducer,
    superAdmin: superAdminReducer,
    allDoctors: allDoctors,
    audit: auditReducer,
    allStaff: allStaff,
    allChat: AllchatReducer,
    patient: patientReducer,
    staffSidePatients: staffSidePatients,
    patientSnapshot: patientSnapshot,
    doctorSidebar: DoctorSideBar,
    soap: soapReducer,
    hospitalRequests: hospitalRequestsReducer,
    availability: availabilityReducer,
    hospitalProfile: hospitalProfileReducer,
    dashboardStats: dashboardStatsSlice,
    profilePicture: profilePictureReducer,
    appointments: appointmentReducer,
    availableSlots: availableSlotsReducer,
    soapNote: soapNoteReducer,
    patientSynopsis: patientSynopsisReducer,
    allPatients: allPatientsReducer,
    prescriptions: prescriptionReducer,
    patientPrescriptions: patientPrescriptionsReducer,
    clinicalData: clinicalDataReducer,
    patientDashboard: patientDashboardReducer,
    hospitalPatients: hospitalPatientsReducer,
    claims: claimsReducer,
    invoices: invoiceReducer,
    dischargeSummaries: dischargeSummaryReducer,
    handoffNotes: handoffNoteReducer,
    patientSummaries: patientSummaryReducer,
    sessions: sessionsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
