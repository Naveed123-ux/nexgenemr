# backend/utils/stripe_utils.py
import stripe
import os
from dotenv import load_dotenv
from typing import Optional
import logging

load_dotenv()

# Configure Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY")

logger = logging.getLogger(__name__)

def create_payment_intent(amount: float, currency: str = "usd", metadata: dict = None) -> dict:
    """
    Create a Stripe payment intent
    
    Args:
        amount: Amount in dollars (will be converted to cents)
        currency: Currency code (default: usd)
        metadata: Additional metadata to attach to the payment intent
    
    Returns:
        dict: Payment intent details including client_secret
    """
    try:
        # Convert amount to cents (Stripe uses smallest currency unit)
        amount_cents = int(amount * 100)
        
        payment_intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency=currency,
            metadata=metadata or {},
            automatic_payment_methods={
                'enabled': True,
            }
        )
        
        logger.info(f"Created payment intent: {payment_intent.id} for amount: ${amount}")
        
        return {
            "id": payment_intent.id,
            "client_secret": payment_intent.client_secret,
            "amount": amount,
            "currency": currency,
            "status": payment_intent.status
        }
    
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating payment intent: {str(e)}")
        raise Exception(f"Failed to create payment intent: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error creating payment intent: {str(e)}")
        raise Exception(f"Failed to create payment intent: {str(e)}")

def confirm_payment_intent(payment_intent_id: str, payment_method_id: str) -> dict:
    """
    Confirm a payment intent with a payment method
    
    Args:
        payment_intent_id: Stripe payment intent ID
        payment_method_id: Stripe payment method ID
    
    Returns:
        dict: Confirmed payment intent details
    """
    try:
        payment_intent = stripe.PaymentIntent.confirm(
            payment_intent_id,
            payment_method=payment_method_id
        )
        
        logger.info(f"Confirmed payment intent: {payment_intent_id}")
        
        return {
            "id": payment_intent.id,
            "status": payment_intent.status,
            "amount": payment_intent.amount / 100,  # Convert back to dollars
            "charge_id": payment_intent.latest_charge if hasattr(payment_intent, 'latest_charge') else None
        }
    
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error confirming payment: {str(e)}")
        raise Exception(f"Failed to confirm payment: {str(e)}")

def retrieve_payment_intent(payment_intent_id: str) -> dict:
    """
    Retrieve a payment intent by ID
    
    Args:
        payment_intent_id: Stripe payment intent ID
    
    Returns:
        dict: Payment intent details
    """
    try:
        payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        
        return {
            "id": payment_intent.id,
            "status": payment_intent.status,
            "amount": payment_intent.amount / 100,
            "currency": payment_intent.currency,
            "charge_id": payment_intent.latest_charge if hasattr(payment_intent, 'latest_charge') else None
        }
    
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error retrieving payment intent: {str(e)}")
        raise Exception(f"Failed to retrieve payment intent: {str(e)}")

def create_refund(charge_id: str, amount: Optional[float] = None) -> dict:
    """
    Create a refund for a charge
    
    Args:
        charge_id: Stripe charge ID
        amount: Amount to refund in dollars (None for full refund)
    
    Returns:
        dict: Refund details
    """
    try:
        refund_params = {"charge": charge_id}
        
        if amount is not None:
            refund_params["amount"] = int(amount * 100)
        
        refund = stripe.Refund.create(**refund_params)
        
        logger.info(f"Created refund: {refund.id} for charge: {charge_id}")
        
        return {
            "id": refund.id,
            "status": refund.status,
            "amount": refund.amount / 100,
            "charge_id": charge_id
        }
    
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating refund: {str(e)}")
        raise Exception(f"Failed to create refund: {str(e)}")

def get_publishable_key() -> str:
    """
    Get the Stripe publishable key for frontend use
    
    Returns:
        str: Stripe publishable key
    """
    if not STRIPE_PUBLISHABLE_KEY:
        raise Exception("STRIPE_PUBLISHABLE_KEY not configured in environment variables")
    
    return STRIPE_PUBLISHABLE_KEY
