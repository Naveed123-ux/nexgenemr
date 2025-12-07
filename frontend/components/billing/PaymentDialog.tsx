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

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(" ");
    } else {
      return value;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return v.slice(0, 2) + "/" + v.slice(2, 4);
    }
    return v;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    if (formatted.replace(/\s/g, "").length <= 16) {
      setCardNumber(formatted);
    }
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiryDate(e.target.value);
    if (formatted.replace(/\//g, "").length <= 4) {
      setExpiryDate(formatted);
    }
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/gi, "");
    if (value.length <= 4) {
      setCvv(value);
    }
  };

  const validateForm = () => {
    if (!cardholderName.trim()) {
      toast.error("Please enter cardholder name");
      return false;
    }
    if (cardNumber.replace(/\s/g, "").length !== 16) {
      toast.error("Please enter a valid 16-digit card number");
      return false;
    }
    if (!expiryDate.match(/^\d{2}\/\d{2}$/)) {
      toast.error("Please enter expiry date in MM/YY format");
      return false;
    }
    if (cvv.length < 3) {
      toast.error("Please enter a valid CVV");
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
    return true;
  };

  const handlePayment = async () => {
    if (!validateForm()) return;

    setProcessing(true);
    try {
      const amount = parseFloat(paymentAmount);

      // STEP 3: Create payment intent on backend and get client_secret
      toast.loading("Creating payment intent...");
      const paymentIntent = await createPaymentIntent(billId, amount);
      console.log("Payment Intent Created:", paymentIntent);

      toast.dismiss();

      // STEP 4: Confirm payment with Stripe
      // In production with Stripe.js, you would do:
      // const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
      // const { paymentMethod, error } = await stripe.confirmCardPayment(
      //   paymentIntent.client_secret,
      //   {
      //     payment_method: {
      //       card: elements.getElement(CardElement)!,
      //       billing_details: { name: cardholderName }
      //     }
      //   }
      // );
      // const paymentMethodId = paymentMethod.id;

      // For testing, we'll confirm the payment intent on the backend
      toast.loading("Confirming payment with Stripe...");

      // Use Stripe test payment method
      const testPaymentMethodId = "pm_card_visa";

      // Confirm the payment intent with the payment method
      await confirmPaymentIntent(paymentIntent.payment_intent_id, testPaymentMethodId);

      toast.dismiss();

      // STEP 5: Process payment (finalize) - Backend confirms with Stripe and updates DB
      toast.loading("Processing payment...");
      const result = await processPayment(billId, testPaymentMethodId, amount);

      toast.dismiss();

      if (result.success) {
        toast.success(result.message);
        onPaymentSuccess();
        onOpenChange(false);

        // Reset form
        setCardNumber("");
        setExpiryDate("");
        setCvv("");
        setCardholderName("");
        setPaymentAmount(outstandingAmount.toString());
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Pay Bill
          </DialogTitle>
        </DialogHeader>

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
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              You can make a partial payment or pay the full amount
            </p>
          </div>

          {/* Card Details */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="cardholderName">Cardholder Name</Label>
              <Input
                id="cardholderName"
                type="text"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                placeholder="John Doe"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="cardNumber">Card Number</Label>
              <Input
                id="cardNumber"
                type="text"
                value={cardNumber}
                onChange={handleCardNumberChange}
                placeholder="1234 5678 9012 3456"
                className="mt-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expiry">Expiry Date</Label>
                <Input
                  id="expiry"
                  type="text"
                  value={expiryDate}
                  onChange={handleExpiryChange}
                  placeholder="MM/YY"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  type="text"
                  value={cvv}
                  onChange={handleCvvChange}
                  placeholder="123"
                  className="mt-2"
                />
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="flex items-center gap-2 text-xs text-gray-600 bg-blue-50 p-3 rounded">
            <Lock className="w-4 h-4 text-blue-600" />
            <span>Your payment information is encrypted and secure</span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={processing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayment}
              disabled={processing}
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
      </DialogContent>
    </Dialog>
  );
}
