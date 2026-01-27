# Waitlist Frontend Testing Guide

Complete guide to test all waitlist functionality and user flows.

## Table of Contents
1. [Test Users Setup](#test-users-setup)
2. [Staff Workflows](#staff-workflows)
3. [Doctor Workflows](#doctor-workflows)
4. [Patient Workflows](#patient-workflows)
5. [Edge Cases & Error Scenarios](#edge-cases--error-scenarios)
6. [Integration Points](#integration-points)

---

## Test Users Setup

### Required Test Users

You'll need the following user accounts to test all scenarios:

1. **Staff User** (Front_Desk_Staff, Receptionist, or Hospital_Admin)
   - Email: `staff@example.com`
   - Has full waitlist management access
   - Can add, edit, remove waitlist entries
   - Can send invitations and manually book

2. **Doctor User**
   - Email: `doctor@example.com`
   - Has read-only access to aggregate data
   - Cannot manage individual waitlist entries
   - Can view waitlist summary on dashboard

3. **Patient User**
   - Email: `patient@example.com`
   - Receives invitation emails
   - Can claim appointments via booking link

---

## Staff Workflows

### Scenario 1: Add Patient to Waitlist from Patient Stats Page

**Path**: `/staff/patient-stats/{patient_id}`

**Steps**:
1. Login as staff user
2. Navigate to staff dashboard (`/staff`)
3. Click on any patient in the patient table
4. You should see 4 tabs: Overview, Journey, Prescriptions, **Waitlist**
5. Click on the **Waitlist** tab
6. Click on **"Add to Waitlist"** tab (within the waitlist panel)
7. Fill out the form:
   - **Patient**: Should be pre-selected (disabled field)
   - **Doctor**: Select a doctor from dropdown
   - **Priority**: Choose "Normal" or "High"
   - **Preferred Days**: 
     - Option A: Check "Anytime"
     - Option B: Select specific days (Mon, Tue, Wed, etc.)
   - **Notes**: Add optional notes (e.g., "Patient prefers morning appointments")
   - **Expiry Date**: Select date (defaults to +30 days)
8. Click **"Add to Waitlist"** button

**Expected Results**:
- ✅ Success toast: "Patient added to waitlist"
- ✅ Form resets
- ✅ Stats update (Total Pending count increases)
- ✅ Entry appears in "Manage Waitlist" tab

**What to Check**:
- Entry shows correct patient name
- Priority badge displays correctly (gray for normal, red for high)
- Status shows as "pending"
- Preferred days display correctly
- Expiry date is shown

---

### Scenario 2: View and Filter Waitlist Entries

**Path**: `/staff/patient-stats/{patient_id}` → Waitlist tab

**Steps**:
1. Stay on the Waitlist tab
2. Click on **"Manage Waitlist"** tab
3. View the list of waitlist entries
4. Test filters:
   - **Status Filter**: Select "Pending", "Invited", "Booked", etc.
   - **Priority Filter**: Select "Normal", "High", or "All"

**Expected Results**:
- ✅ Entries filter correctly based on selection
- ✅ Each entry shows:
  - Patient name
  - Priority badge
  - Status badge
  - Phone number (currently null)
  - Preferred days
  - Expiry date
  - Notes (if any)
  - Date added
- ✅ Edit and Delete buttons visible

**What to Check**:
- Filters work independently
- Combining filters works correctly
- Empty state shows when no entries match filters

---

### Scenario 3: Edit Waitlist Entry

**Path**: `/staff/patient-stats/{patient_id}` → Waitlist tab → Manage Waitlist

**Steps**:
1. Find a "pending" entry in the list
2. Click the **Edit** button (pencil icon)
3. Edit dialog opens
4. Modify any of:
   - Priority (change from normal to high or vice versa)
   - Preferred days (check/uncheck days)
   - Notes (update text)
   - Expiry date (select new date)
5. Click **"Save Changes"**

**Expected Results**:
- ✅ Success toast: "Waitlist entry updated"
- ✅ Dialog closes
- ✅ Entry updates in the list
- ✅ Changes are reflected immediately

**What to Check**:
- Can only edit "pending" entries (Edit button disabled for other statuses)
- All fields update correctly
- Priority badge color changes if priority was modified

---

### Scenario 4: Remove Waitlist Entry

**Path**: `/staff/patient-stats/{patient_id}` → Waitlist tab → Manage Waitlist

**Steps**:
1. Find any entry (except "booked" or "cancelled")
2. Click the **Delete** button (trash icon)
3. Confirm the deletion in the confirmation dialog
4. Click "OK"

**Expected Results**:
- ✅ Success toast: "Patient removed from waitlist"
- ✅ Entry status changes to "cancelled"
- ✅ Entry disappears from pending list (if status filter is "pending")
- ✅ Entry appears in cancelled list (if you switch filter to "cancelled")

**What to Check**:
- Cannot delete "booked" entries (button disabled)
- Cannot delete "cancelled" entries (button disabled)
- Confirmation dialog appears before deletion

---

### Scenario 5: Add Patient to Waitlist from Appointment Booking Modal

**Path**: `/staff/appointments` → Book Appointment

**Steps**:
1. Navigate to `/staff/appointments`
2. Click **"Book Appointment"** button
3. Select a doctor
4. Select a date
5. If no slots available, you'll see "Add to Waitlist" button
6. Click **"Add to Waitlist"**
7. Waitlist panel appears in the modal
8. Fill out the form (similar to Scenario 1)
9. Click **"Add to Waitlist"**

**Expected Results**:
- ✅ Success toast: "Patient added to waitlist successfully!"
- ✅ Waitlist panel closes
- ✅ Returns to booking view

**What to Check**:
- "Add to Waitlist" button only appears when appropriate
- Can switch back to booking view with "Back to Booking" button
- Patient and doctor are pre-selected based on booking context

---

### Scenario 6: View Waitlist Badges on Calendar Slots

**Path**: `/staff/appointments` → View Calendar

**Steps**:
1. Navigate to `/staff/appointments`
2. Select a doctor who has waitlist entries
3. Select a date
4. Look for available slots with waitlist badges
5. Badges show:
   - Number of matching patients (e.g., "3")
   - Red indicator if high priority matches exist

**Expected Results**:
- ✅ Badges appear on available slots only
- ✅ Badge shows correct match count
- ✅ Red indicator appears for high priority matches
- ✅ No badges on booked or blocked slots

**What to Check**:
- Badge count matches the number of patients with matching day preferences
- High priority indicator works correctly
- Badges update when waitlist entries are added/removed

---

### Scenario 7: Open Triage Interface from Calendar Badge

**Path**: `/staff/appointments` → Click Waitlist Badge

**Steps**:
1. On the appointment calendar, find a slot with a waitlist badge
2. Click on the **waitlist badge** (not the slot itself)
3. Triage interface modal opens
4. View the list of matching patients

**Expected Results**:
- ✅ Modal opens with slot details:
  - Doctor name
  - Date and time
  - Match count
- ✅ List of matching patients sorted by:
  - Priority (high first)
  - Days waiting (oldest first)
- ✅ Each patient shows:
  - Name
  - Priority badge
  - Days waiting
  - Preferred days
  - Notes
  - Phone number (if available)
- ✅ Two action buttons per patient:
  - "Send Invite" button
  - "Call & Book" button

**What to Check**:
- Patients are sorted correctly (high priority first, then by wait time)
- All patient information displays correctly
- Modal can be closed with X button or clicking outside

---

### Scenario 8: Send Invitation to Patient

**Path**: Triage Interface → Send Invite

**Steps**:
1. In the triage interface (from Scenario 7)
2. Select a patient from the list
3. Click **"Send Invite"** button
4. Confirm the action if prompted
5. Wait for the invitation to be sent

**Expected Results**:
- ✅ Loading state shows on the button
- ✅ Success toast: "Invitation sent successfully!"
- ✅ Patient's status changes to "invited"
- ✅ Patient receives email with booking link
- ✅ Entry updates in waitlist management panel
- ✅ Match count on badge decreases by 1

**What to Check**:
- Email is sent to patient's email address
- Email contains valid booking link
- Token expires in 24 hours
- Entry status updates to "invited" in database
- `invited_at` timestamp is set

---

### Scenario 9: Manually Book Patient from Waitlist

**Path**: Triage Interface → Call & Book

**Steps**:
1. In the triage interface
2. Select a patient from the list
3. Click **"Call & Book"** button
4. Fill out the booking form:
   - **Is Telehealth**: Toggle on/off
   - **Reason for Visit**: Enter reason (e.g., "Follow-up appointment")
5. Click **"Confirm Booking"**

**Expected Results**:
- ✅ Loading state shows
- ✅ Success toast: "Appointment booked successfully!"
- ✅ Appointment is created in the system
- ✅ Slot is marked as booked
- ✅ Waitlist entry status changes to "booked"
- ✅ Triage modal closes
- ✅ Calendar refreshes to show booked slot
- ✅ Badge disappears from the slot

**What to Check**:
- Appointment appears in appointments list
- Patient receives confirmation email
- Slot is no longer available
- Waitlist entry cannot be edited or deleted after booking

---

## Doctor Workflows

### Scenario 10: View Waitlist Summary on Dashboard

**Path**: `/doctor/dashboard`

**Steps**:
1. Login as doctor user
2. Navigate to doctor dashboard
3. Scroll to find the **"Waitlist Summary"** card

**Expected Results**:
- ✅ Card displays:
  - **Total Pending**: Number of patients waiting
  - **High Priority**: Number of high priority patients
  - **Day Distribution**: Bar chart or list showing preferred days
    - Mon: X patients
    - Tue: Y patients
    - Wed: Z patients
    - etc.
- ✅ Data is for the logged-in doctor only
- ✅ Updates in real-time when entries are added/removed

**What to Check**:
- Only aggregate data is shown (no patient names or contact info)
- Numbers are accurate
- Day distribution adds up to total pending
- Card is read-only (no edit/delete buttons)

---

### Scenario 11: Doctor Cannot Access Patient Waitlist Tab

**Path**: `/doctor/patient-stats/{patient_id}` (if accessible)

**Steps**:
1. Login as doctor user
2. Navigate to a patient stats page
3. Check the available tabs

**Expected Results**:
- ✅ Only 3 tabs visible: Overview, Journey, Prescriptions
- ✅ **Waitlist tab is hidden**
- ✅ Tab grid shows `grid-cols-3` (not 4)

**What to Check**:
- Waitlist tab does not appear at all
- No way to access waitlist management from doctor account
- Doctor can still view their own waitlist summary on dashboard

---

### Scenario 12: Doctor Cannot Access Waitlist Management Endpoints

**Path**: API calls from doctor account

**Steps**:
1. Login as doctor
2. Try to access staff-only endpoints (via browser console or API client):
   - `GET /api/waitlist/doctors/{doctor_id}/entries`
   - `POST /api/waitlist/entries`
   - `PATCH /api/waitlist/entries/{entry_id}`
   - `DELETE /api/waitlist/entries/{entry_id}`

**Expected Results**:
- ✅ All requests return **403 Forbidden**
- ✅ Error message: "You don't have permission to perform this action"

**What to Check**:
- Authorization is enforced at API level
- Doctor can only access summary endpoint: `GET /api/waitlist/doctors/{doctor_id}/summary`

---

## Patient Workflows

### Scenario 13: Patient Receives Invitation Email

**Prerequisites**: Staff has sent an invitation (Scenario 8)

**Steps**:
1. Check patient's email inbox
2. Find email with subject like "Appointment Available - [Doctor Name]"
3. Email should contain:
   - Doctor name
   - Appointment date and time
   - Appointment type (telehealth or in-person)
   - Hospital name/address (if in-person)
   - **Booking link** with token
   - Expiry notice (24 hours)

**Expected Results**:
- ✅ Email is received within 1-2 minutes
- ✅ All information is correct
- ✅ Booking link is clickable
- ✅ Link format: `/patient/book-waitlist/{token}`

**What to Check**:
- Email formatting is professional
- All placeholders are replaced with actual data
- Link is not broken

---

### Scenario 14: Patient Claims Appointment via Booking Link

**Path**: `/patient/book-waitlist/{token}` (from email)

**Steps**:
1. Click the booking link from email
2. Booking page loads
3. Review appointment details:
   - Patient name
   - Doctor name
   - Date and time
   - Appointment type
   - Location (if in-person)
4. Optionally update "Reason for Visit"
5. Click **"Confirm Appointment"** button

**Expected Results**:
- ✅ Page loads with all details
- ✅ "Confirm Appointment" button is enabled
- ✅ After clicking:
  - Loading state shows
  - Success message appears
  - Appointment is created
  - Waitlist entry status changes to "booked"
  - Patient receives confirmation email
  - Redirects to confirmation page

**What to Check**:
- All appointment details are accurate
- Slot is still available (not booked by someone else)
- Token is valid (not expired)
- Confirmation email is sent

---

### Scenario 15: Patient Tries to Use Expired Token

**Path**: `/patient/book-waitlist/{expired_token}`

**Steps**:
1. Wait 24+ hours after invitation was sent
2. Click the booking link from old email
3. Booking page loads

**Expected Results**:
- ✅ Page shows error message:
  - "This invitation has expired"
  - "Please contact the office to reschedule"
- ✅ "Confirm Appointment" button is disabled
- ✅ Appointment details are not shown

**What to Check**:
- Clear error message
- No way to proceed with booking
- Helpful instructions for patient

---

### Scenario 16: Patient Tries to Book Already-Filled Slot

**Path**: `/patient/book-waitlist/{token}` (slot was booked by another patient)

**Steps**:
1. Two patients receive invitations for the same slot
2. Patient A books the slot
3. Patient B tries to book the same slot

**Expected Results**:
- ✅ Patient B sees error message:
  - "Sorry, this appointment has already been filled"
  - "Please contact the office to be added back to the waitlist"
- ✅ "Confirm Appointment" button is disabled
- ✅ Race condition is handled correctly

**What to Check**:
- Database transaction prevents double-booking
- Clear error message for second patient
- First patient's booking is not affected

---

## Edge Cases & Error Scenarios

### Scenario 17: Duplicate Waitlist Entry Prevention

**Steps**:
1. Add a patient to waitlist for a specific doctor
2. Try to add the same patient to waitlist for the same doctor again

**Expected Results**:
- ✅ Error toast: "Patient already on waitlist for this doctor"
- ✅ HTTP 409 Conflict error
- ✅ Entry is not duplicated

**What to Check**:
- Duplicate check works correctly
- Can add same patient for different doctors
- Can add same patient again after previous entry is cancelled/booked

---

### Scenario 18: Invalid Preferred Days

**Steps**:
1. Try to create waitlist entry with empty preferred_days array
2. Try to create entry with invalid day name

**Expected Results**:
- ✅ Validation error: "preferred_days cannot be empty"
- ✅ Validation error: "Invalid day: XYZ"
- ✅ Entry is not created

**What to Check**:
- Frontend validation prevents submission
- Backend validation catches any bypassed frontend validation

---

### Scenario 19: Expired Entries Auto-Cleanup

**Prerequisites**: Background job is running (`scheduler.py`)

**Steps**:
1. Create a waitlist entry with expiry date in the past
2. Wait for background job to run (runs every 6 hours)
3. Check entry status

**Expected Results**:
- ✅ Entry status changes to "expired"
- ✅ Entry no longer appears in pending list
- ✅ Entry appears in expired list
- ✅ Audit log records the expiry

**What to Check**:
- Background job runs on schedule
- Only pending entries are expired
- Invited/booked entries are not affected

---

### Scenario 20: Permission Denied for Unauthorized Users

**Steps**:
1. Login as a user without waitlist permissions (e.g., RCM staff)
2. Try to access waitlist endpoints

**Expected Results**:
- ✅ HTTP 403 Forbidden
- ✅ Error message: "You don't have permission to perform this action"

**What to Check**:
- Only authorized roles can access: Front_Desk_Staff, Receptionist, Hospital_Admin
- Doctors can only access summary endpoint
- Other roles are blocked

---

### Scenario 21: Network Error Handling

**Steps**:
1. Disconnect from network
2. Try to perform any waitlist action
3. Reconnect and retry

**Expected Results**:
- ✅ Error toast: "Failed to [action]"
- ✅ Loading state clears
- ✅ User can retry after reconnecting

**What to Check**:
- Graceful error handling
- No data corruption
- Clear error messages

---

## Integration Points

### Scenario 22: Waitlist Badge Updates After Booking

**Steps**:
1. View calendar with waitlist badges
2. Book an appointment (not from waitlist)
3. Check if badge updates

**Expected Results**:
- ✅ Badge remains if there are still matches
- ✅ Badge disappears if no more matches
- ✅ Match count decreases

---

### Scenario 23: Waitlist Summary Updates in Real-Time

**Steps**:
1. Doctor views dashboard with waitlist summary
2. Staff adds a patient to waitlist for that doctor
3. Refresh doctor's dashboard

**Expected Results**:
- ✅ Total pending count increases
- ✅ High priority count increases (if high priority)
- ✅ Day distribution updates

---

### Scenario 24: Appointment Confirmation Email After Booking

**Steps**:
1. Patient claims appointment via booking link
2. Check patient's email

**Expected Results**:
- ✅ Confirmation email is sent
- ✅ Email contains:
  - Appointment details
  - Doctor name
  - Date and time
  - Location or meet link
  - Instructions

---

## Quick Test Checklist

Use this checklist to quickly verify all functionality:

### Staff User Tests
- [ ] Add patient to waitlist from patient stats page
- [ ] Add patient to waitlist from appointment booking modal
- [ ] View waitlist entries with filters
- [ ] Edit pending waitlist entry
- [ ] Remove waitlist entry
- [ ] View waitlist badges on calendar
- [ ] Open triage interface from badge
- [ ] Send invitation to patient
- [ ] Manually book patient from waitlist
- [ ] Verify stats update correctly

### Doctor User Tests
- [ ] View waitlist summary on dashboard
- [ ] Verify waitlist tab is hidden on patient stats
- [ ] Verify cannot access staff-only endpoints

### Patient User Tests
- [ ] Receive invitation email
- [ ] Claim appointment via booking link
- [ ] Receive confirmation email
- [ ] Handle expired token gracefully
- [ ] Handle already-booked slot gracefully

### Edge Cases
- [ ] Duplicate entry prevention
- [ ] Invalid data validation
- [ ] Permission checks
- [ ] Network error handling
- [ ] Race condition handling

---

## Testing Tips

### 1. Use Browser DevTools
- Open Network tab to see API calls
- Check Console for errors
- Verify correct HTTP status codes

### 2. Check Database State
- Verify entries are created/updated correctly
- Check status transitions
- Verify audit logs

### 3. Test Email Delivery
- Use a test email service (Mailtrap, MailHog)
- Verify email content and formatting
- Test token expiry

### 4. Test Different Browsers
- Chrome
- Firefox
- Safari
- Edge

### 5. Test Mobile Responsiveness
- Test on mobile devices
- Verify modals work correctly
- Check touch interactions

---

## Common Issues & Solutions

### Issue: Waitlist badge not showing
**Solution**: 
- Verify slot is available (not booked/blocked)
- Check that waitlist entries exist for that doctor
- Verify day-of-week matches preferred days
- Check backend is returning `waitlist_match_count`

### Issue: Cannot send invitation
**Solution**:
- Verify entry status is "pending"
- Check slot is still available
- Verify email configuration in `.env`
- Check SMTP settings

### Issue: Token validation fails
**Solution**:
- Check token hasn't expired (24 hours)
- Verify slot is still available
- Check entry status is "invited"
- Verify token exists in database

### Issue: Permission denied
**Solution**:
- Verify user has correct role
- Check authentication token is valid
- Verify backend permission checks

---

## Automated Testing Script

Here's a quick script to test the API endpoints:

```bash
#!/bin/bash

# Set your auth token
TOKEN="your_auth_token_here"
BASE_URL="http://localhost:8000"

echo "Testing Waitlist API Endpoints..."

# Test 1: Create waitlist entry
echo "1. Creating waitlist entry..."
curl -X POST "$BASE_URL/api/waitlist/entries" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_profile_id": 1,
    "doctor_user_id": 2,
    "priority": "high",
    "preferred_days": ["Mon", "Wed", "Fri"],
    "notes": "Test entry"
  }'

# Test 2: Get entries for doctor
echo -e "\n\n2. Getting entries for doctor..."
curl -X GET "$BASE_URL/api/waitlist/doctors/2/entries" \
  -H "Authorization: Bearer $TOKEN"

# Test 3: Get waitlist summary
echo -e "\n\n3. Getting waitlist summary..."
curl -X GET "$BASE_URL/api/waitlist/doctors/2/summary" \
  -H "Authorization: Bearer $TOKEN"

# Test 4: Get slot matches
echo -e "\n\n4. Getting slot matches..."
curl -X GET "$BASE_URL/api/waitlist/slots/1/matches" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\nTests completed!"
```

---

## Conclusion

This guide covers all major workflows and edge cases for the waitlist functionality. Follow these scenarios to ensure complete integration and proper functionality across all user roles.

For any issues or questions, refer to:
- `WAITLIST_INTEGRATION_STATUS.md` - Integration overview
- `frontend/WAITLIST_FRONTEND_GUIDE.md` - Developer guide
- `backend/WAITLIST_AUTHORIZATION_IMPLEMENTATION.md` - Authorization details
