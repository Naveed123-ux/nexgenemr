import os
import google.generativeai as genai
from typing import Dict, Any
import json

class GeminiService:
    """Service for interacting with Google Gemini AI API"""
    
    def __init__(self):
        # Configure Gemini API
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.5-flash')
    
    def generate_handoff_note(self, patient_context: Dict[str, Any]) -> Dict[str, str]:
        """
        Generate a comprehensive handoff note using Gemini AI
        
        Args:
            patient_context: Dictionary containing all patient information
            
        Returns:
            Dictionary with structured handoff note sections
        """
        
        # Create detailed prompt for Gemini
        prompt = self._create_handoff_prompt(patient_context)
        
        try:
            # Generate content using Gemini
            response = self.model.generate_content(prompt)
            
            # Parse the response into structured sections
            handoff_content = self._parse_handoff_response(response.text)
            
            return handoff_content
            
        except Exception as e:
            # Fallback to basic summary if AI fails
            return self._create_fallback_handoff(patient_context, str(e))
    
    def _create_handoff_prompt(self, context: Dict[str, Any]) -> str:
        """Create a detailed prompt for Gemini to generate handoff note"""
        
        patient_info = context.get('patient_profile', {})
        appointments = context.get('appointments', [])
        prescriptions = context.get('prescriptions', [])
        lab_results = context.get('lab_results', [])
        vitals = context.get('latest_vitals', {})
        medical_history = context.get('medical_history', {})
        
        prompt = f"""
You are a medical professional creating a patient handoff note for shift change. 
Generate a comprehensive, structured handoff note based on the following patient information.

PATIENT INFORMATION:
- Name: {context.get('patient_name', 'Unknown')}
- Age: {context.get('patient_age', 'Unknown')}
- Gender: {context.get('patient_gender', 'Unknown')}

MEDICAL HISTORY:
{json.dumps(medical_history, indent=2) if medical_history else 'No medical history available'}

RECENT APPOINTMENTS ({len(appointments)} total):
{self._format_appointments_for_prompt(appointments)}

CURRENT MEDICATIONS ({len(prescriptions)} total):
{self._format_prescriptions_for_prompt(prescriptions)}

LATEST VITAL SIGNS:
{self._format_vitals_for_prompt(vitals)}

RECENT LAB RESULTS ({len(lab_results)} total):
{self._format_labs_for_prompt(lab_results)}

Please generate a structured handoff note with the following sections. Use clear, concise medical language:

1. PATIENT OVERVIEW: Brief summary of patient demographics and admission reason
2. CURRENT CONDITION: Current clinical status and stability
3. ACTIVE PROBLEMS: List of current active medical problems
4. RECENT CHANGES: Any significant changes in the last 24-48 hours
5. CURRENT MEDICATIONS: Active medications with dosages
6. PENDING TASKS: Outstanding orders, tests, or procedures
7. IMPORTANT ALERTS: Critical information (allergies, precautions, etc.)
8. CARE PLAN: Ongoing care plan and treatment goals
9. FAMILY COMMUNICATION: Family involvement and communication needs

Format each section clearly with the section name followed by the content. 
Be specific, factual, and clinically relevant. Prioritize patient safety.
"""
        
        return prompt
    
    def _format_appointments_for_prompt(self, appointments: list) -> str:
        """Format appointments for the prompt"""
        if not appointments:
            return "No recent appointments"
        
        formatted = []
        for apt in appointments[:5]:  # Last 5 appointments
            # Get appointment date from slot if available
            apt_date = "Unknown date"
            if hasattr(apt, 'slot') and apt.slot and hasattr(apt.slot, 'start_time'):
                apt_date = apt.slot.start_time.strftime('%Y-%m-%d') if apt.slot.start_time else "Unknown date"
            
            soap = getattr(apt, 'soap_note', None)
            if soap:
                formatted.append(f"- Date: {apt_date}, Reason: {apt.reason_for_visit}")
                if soap.subjective:
                    formatted.append(f"  Subjective: {soap.subjective[:200]}")
                if soap.assessment:
                    formatted.append(f"  Assessment: {soap.assessment[:200]}")
            elif apt.reason_for_visit:
                # Include appointment even without SOAP note
                formatted.append(f"- Date: {apt_date}, Reason: {apt.reason_for_visit}")
        
        return "\n".join(formatted) if formatted else "No detailed appointment data"
    
    def _format_prescriptions_for_prompt(self, prescriptions: list) -> str:
        """Format prescriptions for the prompt"""
        if not prescriptions:
            return "No current medications"
        
        formatted = []
        for rx in prescriptions[:10]:  # Top 10 medications
            if rx.status == "active" or rx.status == "ACTIVE":
                formatted.append(f"- {rx.medication} {rx.dosage} {rx.frequency}")
        
        return "\n".join(formatted) if formatted else "No active medications"
    
    def _format_vitals_for_prompt(self, vitals: Any) -> str:
        """Format vitals for the prompt"""
        if not vitals:
            return "No recent vitals"
        
        parts = []
        if hasattr(vitals, 'blood_pressure') and vitals.blood_pressure:
            parts.append(f"BP: {vitals.blood_pressure}")
        if hasattr(vitals, 'heart_rate') and vitals.heart_rate:
            parts.append(f"HR: {vitals.heart_rate}")
        if hasattr(vitals, 'temperature') and vitals.temperature:
            parts.append(f"Temp: {vitals.temperature}°F")
        if hasattr(vitals, 'oxygen_saturation') and vitals.oxygen_saturation:
            parts.append(f"O2: {vitals.oxygen_saturation}%")
        
        return ", ".join(parts) if parts else "No vitals available"
    
    def _format_labs_for_prompt(self, lab_results: list) -> str:
        """Format lab results for the prompt"""
        if not lab_results:
            return "No recent lab results"
        
        formatted = []
        for lab in lab_results[:3]:  # Most recent 3 lab results
            if hasattr(lab, 'hemoglobin') and lab.hemoglobin:
                formatted.append(f"- Hemoglobin: {lab.hemoglobin} g/dL")
            if hasattr(lab, 'wbc') and lab.wbc:
                formatted.append(f"- WBC: {lab.wbc}")
            if hasattr(lab, 'glucose') and lab.glucose:
                formatted.append(f"- Glucose: {lab.glucose} mg/dL")
        
        return "\n".join(formatted) if formatted else "No lab data available"
    
    def _parse_handoff_response(self, response_text: str) -> Dict[str, str]:
        """Parse Gemini's response into structured sections"""
        
        sections = {
            'ai_generated_summary': response_text,  # Full response
            'patient_overview': '',
            'current_condition': '',
            'active_problems': '',
            'recent_changes': '',
            'current_medications': '',
            'pending_tasks': '',
            'important_alerts': '',
            'care_plan': '',
            'family_communication': ''
        }
        
        # Try to extract sections from the response
        lines = response_text.split('\n')
        current_section = None
        current_content = []
        
        section_keywords = {
            'PATIENT OVERVIEW': 'patient_overview',
            'CURRENT CONDITION': 'current_condition',
            'ACTIVE PROBLEMS': 'active_problems',
            'RECENT CHANGES': 'recent_changes',
            'CURRENT MEDICATIONS': 'current_medications',
            'PENDING TASKS': 'pending_tasks',
            'IMPORTANT ALERTS': 'important_alerts',
            'CARE PLAN': 'care_plan',
            'FAMILY COMMUNICATION': 'family_communication'
        }
        
        for line in lines:
            line_upper = line.strip().upper()
            
            # Check if this line is a section header
            found_section = False
            for keyword, section_key in section_keywords.items():
                if keyword in line_upper:
                    # Save previous section
                    if current_section and current_content:
                        sections[current_section] = '\n'.join(current_content).strip()
                    
                    # Start new section
                    current_section = section_key
                    current_content = []
                    found_section = True
                    break
            
            # Add content to current section
            if not found_section and current_section and line.strip():
                current_content.append(line.strip())
        
        # Save last section
        if current_section and current_content:
            sections[current_section] = '\n'.join(current_content).strip()
        
        return sections
    
    def generate_patient_friendly_summary(self, patient_context: Dict[str, Any]) -> Dict[str, str]:
        """
        Generate a patient-friendly summary using Gemini AI
        
        Args:
            patient_context: Dictionary containing all patient information
            
        Returns:
            Dictionary with structured patient-friendly sections
        """
        
        # Create detailed prompt for Gemini
        prompt = self._create_patient_friendly_prompt(patient_context)
        
        try:
            # Generate content using Gemini
            response = self.model.generate_content(prompt)
            
            # Parse the response into structured sections
            summary_content = self._parse_patient_summary_response(response.text)
            
            return summary_content
            
        except Exception as e:
            # Fallback to basic summary if AI fails
            return self._create_fallback_patient_summary(patient_context, str(e))
    
    def _create_patient_friendly_prompt(self, context: Dict[str, Any]) -> str:
        """Create a detailed prompt for Gemini to generate patient-friendly summary"""
        
        patient_info = context.get('patient_profile', {})
        appointments = context.get('appointments', [])
        prescriptions = context.get('prescriptions', [])
        lab_results = context.get('lab_results', [])
        vitals = context.get('latest_vitals', {})
        medical_history = context.get('medical_history', {})
        
        prompt = f"""
You are a compassionate doctor explaining medical information to a patient in simple, easy-to-understand language.
Generate a patient-friendly medical summary that avoids medical jargon and uses everyday language.

PATIENT INFORMATION:
- Name: {context.get('patient_name', 'Unknown')}
- Age: {context.get('patient_age', 'Unknown')}

MEDICAL HISTORY:
{json.dumps(medical_history, indent=2) if medical_history else 'No medical history available'}

RECENT VISITS ({len(appointments)} total):
{self._format_appointments_for_prompt(appointments)}

CURRENT MEDICATIONS ({len(prescriptions)} total):
{self._format_prescriptions_for_prompt(prescriptions)}

LATEST VITAL SIGNS:
{self._format_vitals_for_prompt(vitals)}

RECENT LAB RESULTS ({len(lab_results)} total):
{self._format_labs_for_prompt(lab_results)}

Please generate a patient-friendly summary with the following sections. Use simple, clear language that a person without medical training can understand. Avoid medical jargon. Be warm, reassuring, and encouraging:

1. WHAT WE FOUND: Explain what the doctor discovered during the visit in simple terms
2. WHAT IT MEANS: Explain what the findings mean for the patient's health
3. YOUR DIAGNOSIS: Explain the diagnosis in plain, everyday language (avoid medical terms)
4. YOUR TREATMENT PLAN: Explain the treatment plan step-by-step in simple terms
5. YOUR MEDICATIONS: List medications with simple explanations of what each does and how to take it
6. WHAT TO WATCH FOR: Warning signs to look out for, explained clearly
7. NEXT STEPS: What the patient should do next (appointments, tests, etc.)
8. LIFESTYLE TIPS: Simple lifestyle changes that can help
9. QUESTIONS TO ASK: Common questions patients have and their answers

IMPORTANT GUIDELINES:
- Use "you" and "your" to speak directly to the patient
- Replace medical terms with everyday language (e.g., "high blood pressure" not "hypertension")
- Be encouraging and positive while being honest
- Use short sentences and simple words
- Include specific examples when helpful
- Be warm and compassionate in tone

Format each section clearly with the section name followed by the content.
"""
        
        return prompt
    
    def _parse_patient_summary_response(self, response_text: str) -> Dict[str, str]:
        """Parse Gemini's response into structured patient-friendly sections"""
        
        sections = {
            'ai_generated_summary': response_text,  # Full response
            'what_we_found': '',
            'what_it_means': '',
            'your_diagnosis': '',
            'your_treatment_plan': '',
            'your_medications': '',
            'what_to_watch_for': '',
            'next_steps': '',
            'lifestyle_tips': '',
            'questions_to_ask': ''
        }
        
        # Try to extract sections from the response
        lines = response_text.split('\n')
        current_section = None
        current_content = []
        
        section_keywords = {
            'WHAT WE FOUND': 'what_we_found',
            'WHAT IT MEANS': 'what_it_means',
            'YOUR DIAGNOSIS': 'your_diagnosis',
            'YOUR TREATMENT PLAN': 'your_treatment_plan',
            'YOUR MEDICATIONS': 'your_medications',
            'WHAT TO WATCH FOR': 'what_to_watch_for',
            'NEXT STEPS': 'next_steps',
            'LIFESTYLE TIPS': 'lifestyle_tips',
            'QUESTIONS TO ASK': 'questions_to_ask'
        }
        
        for line in lines:
            line_upper = line.strip().upper()
            
            # Check if this line is a section header
            found_section = False
            for keyword, section_key in section_keywords.items():
                if keyword in line_upper:
                    # Save previous section
                    if current_section and current_content:
                        sections[current_section] = '\n'.join(current_content).strip()
                    
                    # Start new section
                    current_section = section_key
                    current_content = []
                    found_section = True
                    break
            
            # Add content to current section
            if not found_section and current_section and line.strip():
                current_content.append(line.strip())
        
        # Save last section
        if current_section and current_content:
            sections[current_section] = '\n'.join(current_content).strip()
        
        return sections
    
    def _create_fallback_patient_summary(self, context: Dict[str, Any], error: str) -> Dict[str, str]:
        """Create a basic patient summary if AI generation fails"""
        
        patient_name = context.get('patient_name', 'Unknown')
        appointments = context.get('appointments', [])
        prescriptions = context.get('prescriptions', [])
        
        return {
            'ai_generated_summary': f"Summary for {patient_name}. AI generation encountered an error: {error}. Please contact your doctor for detailed information.",
            'what_we_found': "Please contact your doctor for information about your visit.",
            'what_it_means': "Your doctor will explain your results to you.",
            'your_diagnosis': "Please speak with your doctor about your diagnosis.",
            'your_treatment_plan': "Your doctor will discuss your treatment plan with you.",
            'your_medications': f"You have {len(prescriptions)} medications prescribed. Please review with your doctor.",
            'what_to_watch_for': "Contact your doctor if you have any concerns.",
            'next_steps': "Follow up with your doctor as scheduled.",
            'lifestyle_tips': "Your doctor will provide personalized recommendations.",
            'questions_to_ask': "Write down any questions for your next appointment."
        }
    
    def _create_fallback_handoff(self, context: Dict[str, Any], error: str) -> Dict[str, str]:
        """Create a basic handoff note if AI generation fails"""
        
        patient_name = context.get('patient_name', 'Unknown')
        appointments = context.get('appointments', [])
        prescriptions = context.get('prescriptions', [])
        
        return {
            'ai_generated_summary': f"Handoff note for {patient_name}. AI generation encountered an error: {error}. Please review patient chart for complete information.",
            'patient_overview': f"Patient: {patient_name}",
            'current_condition': "Please review patient chart",
            'active_problems': f"Total appointments: {len(appointments)}",
            'recent_changes': "Please review recent appointments",
            'current_medications': f"Total medications: {len(prescriptions)}",
            'pending_tasks': "Please review orders",
            'important_alerts': "Please check for allergies and alerts",
            'care_plan': "Please review care plan",
            'family_communication': "Please review family communication log"
        }
