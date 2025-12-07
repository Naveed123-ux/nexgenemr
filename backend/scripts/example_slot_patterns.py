"""
Example script demonstrating various slot recurrence patterns.
Use this as a reference for creating different types of recurring slots.
"""

import requests
from typing import Dict, Any
import json


class SlotPatternExamples:
    """Collection of example slot patterns for different scenarios"""

    def __init__(self, base_url: str, auth_token: str):
        self.base_url = base_url
        self.headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }

    def create_pattern(self, pattern_data: Dict[str, Any]) -> Dict:
        """Create a slot pattern via API"""
        response = requests.post(
            f"{self.base_url}/api/appointment-slots/recurrence-patterns",
            headers=self.headers,
            json=pattern_data
        )
        response.raise_for_status()
        return response.json()

    def example_1_standard_office_hours(self):
        """
        Example 1: Standard Office Hours
        Monday to Friday, 9 AM - 5 PM, with 1-hour lunch break
        """
        print("\n=== Example 1: Standard Office Hours ===")
        
        # Morning slots (9 AM - 12 PM)
        morning_pattern = {
            "name": "Morning Consultation Slots",
            "session_type": "on_site",
            "start_time_of_day": "09:00",
            "end_time_of_day": "12:00",
            "recurrence_config": {
                "duration": "weekly",
                "start_date": "2025-06-09",  # Monday
                "end_date": "2025-12-31",
                "selected_option": "on_day",
                "selected_days": ["Mon", "Tue", "Wed", "Thu", "Fri"]
            }
        }
        
        # Afternoon slots (1 PM - 5 PM)
        afternoon_pattern = {
            "name": "Afternoon Consultation Slots",
            "session_type": "on_site",
            "start_time_of_day": "13:00",
            "end_time_of_day": "17:00",
            "recurrence_config": {
                "duration": "weekly",
                "start_date": "2025-06-09",
                "end_date": "2025-12-31",
                "selected_option": "on_day",
                "selected_days": ["Mon", "Tue", "Wed", "Thu", "Fri"]
            }
        }
        
        morning_result = self.create_pattern(morning_pattern)
        afternoon_result = self.create_pattern(afternoon_pattern)
        
        print(f"✓ Created morning slots: {morning_result['sessions_generated_count']} slots")
        print(f"✓ Created afternoon slots: {afternoon_result['sessions_generated_count']} slots")

    def example_2_telehealth_tuesdays_thursdays(self):
        """
        Example 2: Telehealth Appointments
        Every Tuesday and Thursday, 2 PM - 4 PM
        """
        print("\n=== Example 2: Telehealth Appointments ===")
        
        pattern = {
            "name": "Virtual Consultation",
            "session_type": "off_site",
            "start_time_of_day": "14:00",
            "end_time_of_day": "16:00",
            "recurrence_config": {
                "duration": "weekly",
                "start_date": "2025-06-10",  # Tuesday
                "end_date": "2025-12-31",
                "selected_option": "on_day",
                "selected_days": ["Tue", "Thu"]
            }
        }
        
        result = self.create_pattern(pattern)
        print(f"✓ Created telehealth slots: {result['sessions_generated_count']} slots")

    def example_3_monthly_specialist_visits(self):
        """
        Example 3: Monthly Specialist Visits
        First Monday of each month, 2 PM - 5 PM
        """
        print("\n=== Example 3: Monthly Specialist Visits ===")
        
        pattern = {
            "name": "Cardiology Specialist",
            "session_type": "on_site",
            "start_time_of_day": "14:00",
            "end_time_of_day": "17:00",
            "recurrence_config": {
                "duration": "monthly",
                "start_date": "2025-06-01",
                "repeat_count": 12,  # 12 months
                "selected_option": "on_day",
                "week": "first",
                "week_day": "Mon"
            }
        }
        
        result = self.create_pattern(pattern)
        print(f"✓ Created specialist slots: {result['sessions_generated_count']} slots")

    def example_4_bi_weekly_follow_ups(self):
        """
        Example 4: Bi-weekly Follow-ups
        Every other Monday, 10 AM - 11 AM
        """
        print("\n=== Example 4: Bi-weekly Follow-ups ===")
        
        pattern = {
            "name": "Follow-up Appointments",
            "session_type": "on_site",
            "start_time_of_day": "10:00",
            "end_time_of_day": "11:00",
            "recurrence_config": {
                "duration": "weekly",
                "start_date": "2025-06-09",  # Monday
                "end_date": "2025-12-31",
                "selected_option": "on_day",
                "selected_days": ["Mon"]  # Every Monday (filter bi-weekly in app logic)
            }
        }
        
        result = self.create_pattern(pattern)
        print(f"✓ Created follow-up slots: {result['sessions_generated_count']} slots")
        print("  Note: Filter every other occurrence in your booking logic")

    def example_5_monthly_review_sessions(self):
        """
        Example 5: Monthly Review Sessions
        1st and 15th of each month, 3 PM - 4 PM
        """
        print("\n=== Example 5: Monthly Review Sessions ===")
        
        pattern = {
            "name": "Monthly Patient Review",
            "session_type": "on_site",
            "start_time_of_day": "15:00",
            "end_time_of_day": "16:00",
            "recurrence_config": {
                "duration": "monthly",
                "start_date": "2025-06-01",
                "repeat_count": 12,
                "selected_option": "on_date",
                "month_days": [1, 15]
            }
        }
        
        result = self.create_pattern(pattern)
        print(f"✓ Created review slots: {result['sessions_generated_count']} slots")

    def example_6_weekend_emergency_slots(self):
        """
        Example 6: Weekend Emergency Slots
        Saturdays and Sundays, 9 AM - 12 PM
        """
        print("\n=== Example 6: Weekend Emergency Slots ===")
        
        pattern = {
            "name": "Weekend Emergency Consultation",
            "session_type": "on_site",
            "start_time_of_day": "09:00",
            "end_time_of_day": "12:00",
            "recurrence_config": {
                "duration": "weekly",
                "start_date": "2025-06-07",  # Saturday
                "end_date": "2025-12-31",
                "selected_option": "on_day",
                "selected_days": ["Sat", "Sun"]
            }
        }
        
        result = self.create_pattern(pattern)
        print(f"✓ Created weekend slots: {result['sessions_generated_count']} slots")

    def example_7_last_friday_monthly_meeting(self):
        """
        Example 7: Last Friday Monthly Meeting
        Last Friday of each month, 4 PM - 5 PM
        """
        print("\n=== Example 7: Last Friday Monthly Meeting ===")
        
        pattern = {
            "name": "Monthly Team Meeting",
            "session_type": "on_site",
            "start_time_of_day": "16:00",
            "end_time_of_day": "17:00",
            "recurrence_config": {
                "duration": "monthly",
                "start_date": "2025-06-01",
                "repeat_count": 12,
                "selected_option": "on_day",
                "week": "last",
                "week_day": "Fri"
            }
        }
        
        result = self.create_pattern(pattern)
        print(f"✓ Created monthly meeting slots: {result['sessions_generated_count']} slots")

    def example_8_daily_morning_slots_limited(self):
        """
        Example 8: Daily Morning Slots (Limited Duration)
        Every day for 30 days, 8 AM - 9 AM
        """
        print("\n=== Example 8: Daily Morning Slots (30 days) ===")
        
        pattern = {
            "name": "Early Morning Consultation",
            "session_type": "on_site",
            "start_time_of_day": "08:00",
            "end_time_of_day": "09:00",
            "recurrence_config": {
                "duration": "daily",
                "start_date": "2025-06-11",
                "repeat_count": 30,
                "selected_option": "on_day"
            }
        }
        
        result = self.create_pattern(pattern)
        print(f"✓ Created daily morning slots: {result['sessions_generated_count']} slots")

    def example_9_mixed_schedule(self):
        """
        Example 9: Mixed Schedule
        Different slots for different days of the week
        """
        print("\n=== Example 9: Mixed Schedule ===")
        
        # Monday, Wednesday, Friday - Regular consultations
        mwf_pattern = {
            "name": "MWF Regular Consultation",
            "session_type": "on_site",
            "start_time_of_day": "09:00",
            "end_time_of_day": "12:00",
            "recurrence_config": {
                "duration": "weekly",
                "start_date": "2025-06-09",
                "end_date": "2025-12-31",
                "selected_option": "on_day",
                "selected_days": ["Mon", "Wed", "Fri"]
            }
        }
        
        # Tuesday, Thursday - Telehealth
        tth_pattern = {
            "name": "T-Th Telehealth",
            "session_type": "off_site",
            "start_time_of_day": "14:00",
            "end_time_of_day": "17:00",
            "recurrence_config": {
                "duration": "weekly",
                "start_date": "2025-06-10",
                "end_date": "2025-12-31",
                "selected_option": "on_day",
                "selected_days": ["Tue", "Thu"]
            }
        }
        
        mwf_result = self.create_pattern(mwf_pattern)
        tth_result = self.create_pattern(tth_pattern)
        
        print(f"✓ Created MWF slots: {mwf_result['sessions_generated_count']} slots")
        print(f"✓ Created T-Th slots: {tth_result['sessions_generated_count']} slots")

    def example_10_quarterly_reviews(self):
        """
        Example 10: Quarterly Reviews
        First Monday of every 3rd month
        """
        print("\n=== Example 10: Quarterly Reviews ===")
        
        # Create patterns for each quarter
        quarters = [
            ("2025-06-01", "Q2 2025"),
            ("2025-09-01", "Q3 2025"),
            ("2025-12-01", "Q4 2025"),
            ("2026-03-01", "Q1 2026")
        ]
        
        for start_date, quarter_name in quarters:
            pattern = {
                "name": f"Quarterly Review {quarter_name}",
                "session_type": "on_site",
                "start_time_of_day": "10:00",
                "end_time_of_day": "12:00",
                "recurrence_config": {
                    "duration": "monthly",
                    "start_date": start_date,
                    "repeat_count": 1,
                    "selected_option": "on_day",
                    "week": "first",
                    "week_day": "Mon"
                }
            }
            
            result = self.create_pattern(pattern)
            print(f"✓ Created {quarter_name} review slot")

    def run_all_examples(self):
        """Run all example patterns"""
        print("\n" + "="*60)
        print("APPOINTMENT SLOT PATTERN EXAMPLES")
        print("="*60)
        
        try:
            self.example_1_standard_office_hours()
            self.example_2_telehealth_tuesdays_thursdays()
            self.example_3_monthly_specialist_visits()
            self.example_4_bi_weekly_follow_ups()
            self.example_5_monthly_review_sessions()
            self.example_6_weekend_emergency_slots()
            self.example_7_last_friday_monthly_meeting()
            self.example_8_daily_morning_slots_limited()
            self.example_9_mixed_schedule()
            self.example_10_quarterly_reviews()
            
            print("\n" + "="*60)
            print("✓ All examples completed successfully!")
            print("="*60)
            
        except Exception as e:
            print(f"\n✗ Error: {str(e)}")
            raise


def main():
    """Main function to run examples"""
    import sys
    
    # Configuration
    BASE_URL = "http://localhost:8000"
    AUTH_TOKEN = "your_auth_token_here"  # Replace with actual token
    
    if len(sys.argv) > 1:
        AUTH_TOKEN = sys.argv[1]
    
    if AUTH_TOKEN == "your_auth_token_here":
        print("Error: Please provide an authentication token")
        print("Usage: python example_slot_patterns.py YOUR_AUTH_TOKEN")
        sys.exit(1)
    
    # Create examples instance
    examples = SlotPatternExamples(BASE_URL, AUTH_TOKEN)
    
    # Run specific example or all
    if len(sys.argv) > 2:
        example_num = sys.argv[2]
        method_name = f"example_{example_num}"
        
        if hasattr(examples, method_name):
            print(f"\nRunning example {example_num}...")
            getattr(examples, method_name)()
        else:
            print(f"Error: Example {example_num} not found")
            print("Available examples: 1-10")
    else:
        # Run all examples
        examples.run_all_examples()


if __name__ == "__main__":
    main()
