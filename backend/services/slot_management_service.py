"""
Service for managing individual appointment slots within sessions
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import HTTPException, status

from models.appointment_slot_model import AppointmentSlot, SlotType
from models.appointment_session_model import AppointmentSession
from models.user_model import User
from schemas.appointment_slot_schema import SlotCreate, SlotUpdate, SlotResponse


class SlotManagementService:
    """Service for CRUD operations on appointment slots"""
    
    @staticmethod
    def validate_slot_within_session(
        session: AppointmentSession,
        slot_start: datetime,
        slot_end: datetime
    ) -> None:
        """Validate that a slot fits within its parent session's time range"""
        if slot_start < session.start_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Slot start time {slot_start} is before session start time {session.start_time}"
            )
        
        if slot_end > session.end_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Slot end time {slot_end} is after session end time {session.end_time}"
            )
    
    @staticmethod
    def validate_slot_duration(slot_start: datetime, slot_end: datetime, duration: int) -> None:
        """Validate that the duration matches the time range"""
        calculated_duration = int((slot_end - slot_start).total_seconds() / 60)
        if abs(calculated_duration - duration) > 1:  # Allow 1 minute tolerance
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Duration {duration} minutes does not match time range ({calculated_duration} minutes)"
            )
    
    @staticmethod
    def validate_no_overlap(
        db: Session,
        session_id: int,
        slot_start: datetime,
        slot_end: datetime,
        exclude_slot_id: Optional[int] = None
    ) -> None:
        """Validate that the slot doesn't overlap with existing slots in the same session"""
        query = db.query(AppointmentSlot).filter(
            AppointmentSlot.session_id == session_id,
            and_(
                AppointmentSlot.start_time < slot_end,
                AppointmentSlot.end_time > slot_start
            )
        )
        
        if exclude_slot_id:
            query = query.filter(AppointmentSlot.id != exclude_slot_id)
        
        overlapping_slot = query.first()
        if overlapping_slot:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Slot overlaps with existing slot (ID: {overlapping_slot.id}) from {overlapping_slot.start_time} to {overlapping_slot.end_time}"
            )
    
    @staticmethod
    def validate_total_duration(
        db: Session,
        session: AppointmentSession,
        new_slot_duration: int,
        exclude_slot_id: Optional[int] = None
    ) -> None:
        """Validate that total slot duration doesn't exceed session duration"""
        # Calculate session duration in minutes
        session_duration = int((session.end_time - session.start_time).total_seconds() / 60)
        
        # Get sum of existing slot durations
        query = db.query(AppointmentSlot).filter(AppointmentSlot.session_id == session.id)
        if exclude_slot_id:
            query = query.filter(AppointmentSlot.id != exclude_slot_id)
        
        existing_slots = query.all()
        total_existing_duration = sum(slot.duration for slot in existing_slots)
        
        total_duration = total_existing_duration + new_slot_duration
        
        if total_duration > session_duration:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Total slot duration ({total_duration} min) exceeds session duration ({session_duration} min). Available: {session_duration - total_existing_duration} min"
            )
    
    @staticmethod
    def create_slot(
        db: Session,
        session_id: int,
        slot_data: SlotCreate,
        current_user: User
    ) -> AppointmentSlot:
        """Create a new slot within a session"""
        # Get the parent session
        session = db.query(AppointmentSession).filter(
            AppointmentSession.id == session_id
        ).first()
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session with ID {session_id} not found"
            )
        
        # Verify user owns this session
        if session.doctor_user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to add slots to this session"
            )
        
        # Validate slot
        SlotManagementService.validate_slot_within_session(session, slot_data.start_time, slot_data.end_time)
        SlotManagementService.validate_slot_duration(slot_data.start_time, slot_data.end_time, slot_data.duration)
        SlotManagementService.validate_no_overlap(db, session_id, slot_data.start_time, slot_data.end_time)
        SlotManagementService.validate_total_duration(db, session, slot_data.duration)
        
        # Create the slot
        new_slot = AppointmentSlot(
            session_id=session_id,
            start_time=slot_data.start_time,
            end_time=slot_data.end_time,
            duration=slot_data.duration,
            title=slot_data.title,
            label=slot_data.label,
            slot_color=slot_data.slot_color,
            slot_type=slot_data.slot_type,
            modality=slot_data.modality,
            is_blocked=slot_data.is_blocked
        )
        
        db.add(new_slot)
        db.commit()
        db.refresh(new_slot)
        
        return new_slot
    
    @staticmethod
    def create_multiple_slots(
        db: Session,
        session_id: int,
        slots_data: List[SlotCreate],
        current_user: User
    ) -> List[AppointmentSlot]:
        """Create multiple slots within a session at once"""
        # Get the parent session
        session = db.query(AppointmentSession).filter(
            AppointmentSession.id == session_id
        ).first()
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session with ID {session_id} not found"
            )
        
        # Verify user owns this session
        if session.doctor_user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to add slots to this session"
            )
        
        # Validate all slots first
        total_duration = 0
        for slot_data in slots_data:
            SlotManagementService.validate_slot_within_session(session, slot_data.start_time, slot_data.end_time)
            SlotManagementService.validate_slot_duration(slot_data.start_time, slot_data.end_time, slot_data.duration)
            total_duration += slot_data.duration
        
        # Check total duration
        session_duration = int((session.end_time - session.start_time).total_seconds() / 60)
        if total_duration > session_duration:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Total slot duration ({total_duration} min) exceeds session duration ({session_duration} min)"
            )
        
        # Check for overlaps between the new slots
        sorted_slots = sorted(slots_data, key=lambda x: x.start_time)
        for i in range(len(sorted_slots) - 1):
            if sorted_slots[i].end_time > sorted_slots[i + 1].start_time:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Slots overlap: slot ending at {sorted_slots[i].end_time} overlaps with slot starting at {sorted_slots[i + 1].start_time}"
                )
        
        # Create all slots
        created_slots = []
        for slot_data in slots_data:
            new_slot = AppointmentSlot(
                session_id=session_id,
                start_time=slot_data.start_time,
                end_time=slot_data.end_time,
                duration=slot_data.duration,
                title=slot_data.title,
                label=slot_data.label,
                slot_color=slot_data.slot_color,
                slot_type=slot_data.slot_type,
                modality=slot_data.modality,
                is_blocked=slot_data.is_blocked
            )
            db.add(new_slot)
            created_slots.append(new_slot)
        
        db.commit()
        for slot in created_slots:
            db.refresh(slot)
        
        return created_slots
    
    @staticmethod
    def get_slot_by_id(db: Session, slot_id: int) -> Optional[AppointmentSlot]:
        """Get a slot by its ID"""
        return db.query(AppointmentSlot).filter(AppointmentSlot.id == slot_id).first()
    
    @staticmethod
    def get_session_slots(
        db: Session,
        session_id: int,
        include_blocked: bool = True,
        include_booked: bool = True,
        slot_type: Optional[SlotType] = None
    ) -> List[AppointmentSlot]:
        """Get all slots for a specific session"""
        query = db.query(AppointmentSlot).filter(AppointmentSlot.session_id == session_id)
        
        if not include_blocked:
            query = query.filter(AppointmentSlot.is_blocked == False)
        
        if not include_booked:
            query = query.filter(AppointmentSlot.is_booked == False)
        
        if slot_type:
            query = query.filter(AppointmentSlot.slot_type == slot_type)
        
        return query.order_by(AppointmentSlot.start_time).all()
    
    @staticmethod
    def get_available_slots(
        db: Session,
        doctor_id: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        slot_type: Optional[SlotType] = None
    ) -> List[AppointmentSlot]:
        """Get available (not blocked, not booked) slots"""
        query = db.query(AppointmentSlot).join(AppointmentSession).filter(
            AppointmentSlot.is_blocked == False,
            AppointmentSlot.is_booked == False
        )
        
        if doctor_id:
            query = query.filter(AppointmentSession.doctor_user_id == doctor_id)
        
        if start_date:
            query = query.filter(AppointmentSlot.start_time >= start_date)
        
        if end_date:
            query = query.filter(AppointmentSlot.start_time <= end_date)
        
        if slot_type:
            query = query.filter(AppointmentSlot.slot_type == slot_type)
        
        return query.order_by(AppointmentSlot.start_time).all()
    
    @staticmethod
    def update_slot(
        db: Session,
        slot_id: int,
        slot_data: SlotUpdate,
        current_user: User
    ) -> AppointmentSlot:
        """Update an existing slot"""
        slot = db.query(AppointmentSlot).filter(AppointmentSlot.id == slot_id).first()
        
        if not slot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Slot with ID {slot_id} not found"
            )
        
        # Verify user owns this slot's session
        if slot.session.doctor_user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to update this slot"
            )
        
        # Check if slot is booked
        if slot.is_booked:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot update a booked slot"
            )
        
        # Update fields
        update_data = slot_data.dict(exclude_unset=True)
        
        # If time or duration is being updated, validate
        new_start = update_data.get('start_time', slot.start_time)
        new_end = update_data.get('end_time', slot.end_time)
        new_duration = update_data.get('duration', slot.duration)
        
        if 'start_time' in update_data or 'end_time' in update_data or 'duration' in update_data:
            SlotManagementService.validate_slot_within_session(slot.session, new_start, new_end)
            SlotManagementService.validate_slot_duration(new_start, new_end, new_duration)
            SlotManagementService.validate_no_overlap(db, slot.session_id, new_start, new_end, exclude_slot_id=slot_id)
        
        for key, value in update_data.items():
            setattr(slot, key, value)
        
        slot.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(slot)
        
        return slot
    
    @staticmethod
    def delete_slot(db: Session, slot_id: int, current_user: User) -> dict:
        """Delete a slot"""
        slot = db.query(AppointmentSlot).filter(AppointmentSlot.id == slot_id).first()
        
        if not slot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Slot with ID {slot_id} not found"
            )
        
        # Verify user owns this slot's session
        if slot.session.doctor_user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to delete this slot"
            )
        
        # Check if slot is booked
        if slot.is_booked:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete a booked slot. Cancel the appointment first."
            )
        
        db.delete(slot)
        db.commit()
        
        return {"detail": f"Slot {slot_id} successfully deleted"}
    
    @staticmethod
    def block_slot(db: Session, slot_id: int, current_user: User) -> AppointmentSlot:
        """Block a slot to prevent booking"""
        slot = db.query(AppointmentSlot).filter(AppointmentSlot.id == slot_id).first()
        
        if not slot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Slot with ID {slot_id} not found"
            )
        
        # Verify user owns this slot's session
        if slot.session.doctor_user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to block this slot"
            )
        
        if slot.is_booked:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot block a slot that is already booked"
            )
        
        slot.is_blocked = True
        slot.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(slot)
        
        return slot
    
    @staticmethod
    def unblock_slot(db: Session, slot_id: int, current_user: User) -> AppointmentSlot:
        """Unblock a slot to allow booking"""
        slot = db.query(AppointmentSlot).filter(AppointmentSlot.id == slot_id).first()
        
        if not slot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Slot with ID {slot_id} not found"
            )
        
        # Verify user owns this slot's session
        if slot.session.doctor_user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to unblock this slot"
            )
        
        slot.is_blocked = False
        slot.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(slot)
        
        return slot
