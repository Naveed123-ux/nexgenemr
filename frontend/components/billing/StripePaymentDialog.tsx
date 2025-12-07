"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPaymentIntent, processPayment } from "@/app/_apis/patient/billing";
import { InfinitySpin } from "react-loader-spinner";
import toast from "react-hot-toast";
import { CreditCard, Lock } from "lucide-react";
import { CardElement, Elements, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripe } from "@/lib/stripe";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billId: number;
  billNumber: string;
  outstandingAmount: number;
  onPaymentSuccess: () => void;
}

// Stripe card element styling
const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: "#32325d",
      fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
      fontSmoothing: "antialiased",
      fontSize: "16px",
      "::placeholder": {
        color: "#aab7c4",
      },
    },
    invalid: {
      color: "#fa755a",
      iconColor: "#fa755a",
    },
  },
};

// Inner payment form that uses Stripe hooks
function PaymentForm({
  billId,
  billNumber,
  outstandingAmount,
  onPaymentSuccess,
  onClose,
}: {
  billId: number;
  billNumber: string;
  outstandingAmount: number;
  onPaymentSuccess: () => void;
  onClose: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(outstandingAmount.toString());
  const [cardholderName, setCardholderName] = useState("");

  const validateForm = () => {
    if (!cardholderName.trim()) {
      toast.error("Please enter cardholder name");
      return false;
    }
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid payment amount");
      return false;
    }
    if (amount > outstandingAmount) {
      toast.error("Payment amount cannot exceed outstanding amount");
      return false;
    }
    if (!stripe || !elements) {
      toast.error("Stripe is not loaded yet");
      return false;
    }
    return true;
  };

  const handlePayment = async () => {
    if (!validateForm()) return;

    setProcessing(true);
    try {
      const amount = parseFloat(paymentAmount);

      // STEP 1: Create payment intent on backend
      toast.loading("Creating payment intent...");
      const paymentIntent = await createPaymentIntent(billId, amount);
      console.log("Payment Intent Created:", paymentIntent);

      toast.dismiss();

      // STEP 2: Confirm payment with Stripe using CardElement
      toast.loading("Confirming payment with Stripe...");

      const cardElement = elements!.getElement(CardElement);

      if (!cardElement) {
        throw new Error("Card element not found");
      }

      // Use Stripe.js to confirm the payment
      const { error: confirmError, paymentIntent: confirmedIntent } = await stripe!.confirmCardPayment(
        paymentIntent.client_secret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: cardholderName,
            },
          },
        }
      );

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      if (!confirmedIntent || confirmedIntent.status !== "succeeded") {
        throw new Error("Payment confirmation failed");
      }

      toast.dismiss();

      // STEP 3: Process payment on backend (finalize)
      toast.loading("Processing payment...");
      const result = await processPayment(billId, confirmedIntent.payment_method as string, amount);

      toast.dismiss();

      if (result.success) {
        toast.success(result.message);
        onPaymentSuccess();
        onClose();
      } else {
        toast.error("Payment failed. Please try again.");
      }
    } catch (error: any) {
      toast.dismiss();
      toast.error(error.message || "Payment failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Bill Information */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Bill Number:</span>
          <span className="font-semibold">{billNumber}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Outstanding Amount:</span>
          <span className="font-bold text-red-600">${outstandingAmount.toFixed(2)}</span>
        </div>
      </div>

      {/* Payment Amount */}
      <div>
        <Label htmlFor="amount">Payment Amount</Label>
        <div className="relative mt-2">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            max={outstandingAmount}
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            className="pl-7"
            placeholder="0.00"
            disabled={processing}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          You can make a partial payment or pay the full amount
        </p>
      </div>

      {/* Cardholder Name */}
      <div>
        <Label htmlFor="cardholderName">Cardholder Name</Label>
        <Input
          id="cardholderName"
          type="text"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          placeholder="John Doe"
          className="mt-2"
          disabled={processing}
        />
      </div>

      {/* Stripe Card Element */}
      <div>
        <Label>Card Details</Label>
        <div className="mt-2 p-3 border rounded-md">
          <CardElement options={CARD_ELEMENT_OPTIONS} />
        </div>
      </div>

      {/* Security Notice */}
      <div className="flex items-center gap-2 text-xs text-gray-600 bg-blue-50 p-3 rounded">
        <Lock className="w-4 h-4 text-blue-600" />
        <span>Your payment information is encrypted and secure with Stripe</span>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={processing}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          onClick={handlePayment}
          disabled={processing || !stripe || !elements}
          className="flex-1 bg-[#388fe5] hover:bg-[#6fb043] text-white"
        >
          {processing ? (
            <InfinitySpin width="16" color="#ffffff" />
          ) : (
            `Pay $${parseFloat(paymentAmount || "0").toFixed(2)}`
          )}
        </Button>
      </div>
    </div>
  );
}

// Main dialog component
export default function StripePaymentDialog({
  open,
  onOpenChange,
  billId,
  billNumber,
  outstandingAmount,
  onPaymentSuccess,
}: PaymentDialogProps) {
  const stripePromise = getStripe();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Pay Bill
          </DialogTitle>
        </DialogHeader>

        {stripePromise ? (
          <Elements stripe={stripePromise}>
            <PaymentForm
              billId={billId}
              billNumber={billNumber}
              outstandingAmount={outstandingAmount}
              onPaymentSuccess={onPaymentSuccess}
              onClose={() => onOpenChange(false)}
            />
          </Elements>
        ) : (
          <div className="text-center py-8 text-red-600">
            <p>Stripe is not configured. Please add your Stripe publishable key to environment variables.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
