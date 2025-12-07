"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Check, Download, CreditCard } from "lucide-react";
import { AdminHeader } from "@/components/admin-header";

const upgradeSchema = z.object({
  billedTo: z.string().min(1, "Name is required"),
  cardNumber: z.string().min(16, "Please enter a valid card number"),
  expiry: z.string().regex(/^\d{2}\/\d{2}$/, "Please enter MM/YY format"),
  cvv: z.string().min(3, "CVV must be at least 3 digits"),
  country: z.string().min(1, "Please select a country"),
  zipCode: z.string().min(1, "Zip code is required"),
  membershipType: z.enum(["monthly", "annually"]),
  aiAccelerator: z.boolean().default(false),
});

type UpgradeFormData = z.infer<typeof upgradeSchema>;

export default function SubscriptionsPage() {
  const [currentView, setCurrentView] = useState<
    "plans" | "subscriptions" | "upgrade"
  >("plans");
  const [selectedPlan, setSelectedPlan] = useState<string>("");

  const upgradeForm = useForm<UpgradeFormData>({
    resolver: zodResolver(upgradeSchema),
    defaultValues: {
      billedTo: "",
      cardNumber: "",
      expiry: "",
      cvv: "",
      country: "",
      zipCode: "",
      membershipType: "monthly",
      aiAccelerator: false,
    },
  });

  const onUpgradeSubmit = (data: UpgradeFormData) => {
    console.log("Upgrade data:", { ...data, selectedPlan });
    // Handle subscription upgrade
  };

  const plans = [
    {
      name: "Basic",
      price: 9.99,
      features: [
        "Up to 5 doctors",
        "Appointment scheduling",
        "Patient records",
        "Email support",
      ],
    },
    {
      name: "Standard",
      price: 15.99,
      features: [
        "Up to 10 doctors",
        "Appointment scheduling",
        "Patient records",
        "Email support",
        "AI Assistance",
      ],
      recommended: true,
    },
    {
      name: "Pro",
      price: 50.99,
      features: [
        "Up to 20 doctors",
        "Appointment scheduling",
        "Patient records",
        "Email support",
        "AI Assistance",
      ],
    },
  ];

  const billingHistory = [
    {
      id: 1,
      doctor: "Doctor 001",
      billingDate: "May 15, 2022",
      status: "Paid",
      amount: "$9.99",
      plan: "Basic",
    },
    {
      id: 2,
      doctor: "Doctor 002",
      billingDate: "Nov 28, 2020",
      status: "Paid",
      amount: "$9.99",
      plan: "Basic",
    },
    {
      id: 3,
      doctor: "Doctor 003",
      billingDate: "Nov 13, 2018",
      status: "Paid",
      amount: "$9.99",
      plan: "Basic",
    },
    {
      id: 4,
      doctor: "Doctor 004",
      billingDate: "Mar 9, 2013",
      status: "Paid",
      amount: "$9.99",
      plan: "Basic",
    },
    {
      id: 5,
      doctor: "Doctor 005",
      billingDate: "Nov 2, 2011",
      status: "Paid",
      amount: "$49.99",
      plan: "Enterprise",
    },
    {
      id: 6,
      doctor: "Doctor 006",
      billingDate: "Dec 20, 2009",
      status: "Paid",
      amount: "$9.99",
      plan: "Basic",
    },
    {
      id: 7,
      doctor: "Doctor 007",
      billingDate: "Nov 22, 2008",
      status: "Paid",
      amount: "$9.99",
      plan: "Basic",
    },
    {
      id: 8,
      doctor: "Doctor 008",
      billingDate: "Apr 16, 2007",
      status: "Cancelled",
      amount: "$19.99",
      plan: "Pro",
    },
  ];

  const PlansView = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold text-gray-800">
          Select a Plan that helps You Grow...
        </h2>
        <p className="text-gray-600">
          Read all the plans and select the best one that suits you
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`relative ${
              plan.recommended
                ? "ring-2 ring-blue-500 bg-slate-800 text-white"
                : ""
            }`}
          >
            <CardHeader>
              <div className="space-y-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">${plan.price}</span>
                  <span className="text-sm text-gray-500">per Month</span>
                </div>
                <CardTitle
                  className={plan.recommended ? "text-white" : "text-gray-800"}
                >
                  {plan.name}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span
                      className={`text-sm ${
                        plan.recommended ? "text-gray-200" : "text-gray-600"
                      }`}
                    >
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
              <Button
                className={`w-full ${
                  plan.recommended
                    ? "bg-white text-slate-800 hover:bg-gray-100"
                    : "bg-slate-800 text-white hover:bg-slate-700"
                }`}
                onClick={() => {
                  setSelectedPlan(plan.name);
                  setCurrentView("upgrade");
                }}
              >
                Select Plan
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const SubscriptionsView = () => (
    <div className="space-y-6">
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-gray-800">
                Plan: Professional
              </h3>
              <p className="text-sm text-gray-600">
                Take your Plan to the next level with more features.
              </p>
              <p className="text-green-primary font-semibold">$9.99 / month</p>
            </div>
            <Button
              variant="outline"
              className="text-green-primary border-green-primary hover:bg-blue-50 bg-transparent"
            >
              Upgrade Plan
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">
                    Doctors ↓
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">
                    Billing Date ↓
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">
                    Status ↓
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">
                    Amount ↓
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">
                    Plan ↓
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600"></th>
                </tr>
              </thead>
              <tbody>
                {billingHistory.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{item.doctor}</td>
                    <td className="py-3 px-4">{item.billingDate}</td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          item.status === "Paid" ? "default" : "destructive"
                        }
                        className={
                          item.status === "Paid"
                            ? "bg-green-100 text-green-800"
                            : ""
                        }
                      >
                        {item.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">{item.amount}</td>
                    <td className="py-3 px-4">{item.plan}</td>
                    <td className="py-3 px-4">
                      <Button size="sm" variant="ghost">
                        <Download className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const UpgradeView = () => (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <CreditCard className="h-6 w-6 text-green-primary" />
          </div>
          <CardTitle className="text-xl">Upgrade to a Pro Membership</CardTitle>
          <p className="text-gray-600">
            Get all access and an extra 20% off when you subscribe annually
          </p>
        </CardHeader>
        <CardContent>
          <Form {...upgradeForm}>
            <form
              onSubmit={upgradeForm.handleSubmit(onUpgradeSubmit)}
              className="space-y-6"
            >
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <FormField
                    control={upgradeForm.control}
                    name="billedTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Billed To</FormLabel>
                        <FormControl>
                          <Input placeholder="John Smith" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={upgradeForm.control}
                    name="cardNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Card Number</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              placeholder="•••• •••• •••• ••••"
                              {...field}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                              <div className="w-6 h-4 bg-red-500 rounded-sm"></div>
                              <div className="w-6 h-4 bg-orange-500 rounded-sm"></div>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={upgradeForm.control}
                      name="expiry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>MM / YY</FormLabel>
                          <FormControl>
                            <Input placeholder="MM / YY" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={upgradeForm.control}
                      name="cvv"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CVV</FormLabel>
                          <FormControl>
                            <Input placeholder="CVV" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={upgradeForm.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="United States" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="us">🇺🇸 United States</SelectItem>
                            <SelectItem value="ca">🇨🇦 Canada</SelectItem>
                            <SelectItem value="uk">
                              🇬🇧 United Kingdom
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={upgradeForm.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zip Code</FormLabel>
                        <FormControl>
                          <Input placeholder="Zip Code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-6">
                  <FormField
                    control={upgradeForm.control}
                    name="membershipType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">
                          Membership Type
                        </FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="mt-3 space-y-3"
                          >
                            <div className="flex items-center space-x-2 p-3 border rounded-lg">
                              <RadioGroupItem value="monthly" id="monthly" />
                              <div className="flex-1">
                                <Label
                                  htmlFor="monthly"
                                  className="font-medium"
                                >
                                  Pay Monthly
                                </Label>
                                <p className="text-sm text-gray-500">
                                  $20 / Month Per Member
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 p-3 border rounded-lg bg-blue-50 border-blue-200">
                              <RadioGroupItem value="annually" id="annually" />
                              <div className="flex-1">
                                <Label
                                  htmlFor="annually"
                                  className="font-medium"
                                >
                                  Pay Annually
                                </Label>
                                <p className="text-sm text-gray-500">
                                  $16 / Month Per Member
                                </p>
                              </div>
                              <Badge className="bg-green-100 text-green-800">
                                Save 20%
                              </Badge>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={upgradeForm.control}
                    name="aiAccelerator"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">
                          Add ons
                        </FormLabel>
                        <div className="mt-3 p-3 border rounded-lg">
                          <div className="flex items-center space-x-2">
                            <FormControl>
                              <input
                                type="checkbox"
                                className="rounded"
                                checked={field.value}
                                onChange={field.onChange}
                              />
                            </FormControl>
                            <div className="flex-1">
                              <Label className="font-medium">
                                AI Particle Accelerator
                              </Label>
                              <p className="text-sm text-gray-500">
                                $5 / Month Per Member
                              </p>
                              <p className="text-xs text-gray-400">
                                Unlimited use of AI Q&A, Autofill and more
                              </p>
                            </div>
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-lg font-semibold">
                        $20.00 / Month / User
                      </span>
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-green-primary hover:bg-green-700"
                    >
                      Upgrade to Plus
                    </Button>
                    <p className="text-xs text-gray-500 text-center mt-2">
                      By Continuing you agree to our terms and conditions
                    </p>
                  </div>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex space-x-1 border-b">
          <button
            onClick={() => setCurrentView("plans")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              currentView === "plans"
                ? "border-blue-500 text-green-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Plans
          </button>
          <button
            onClick={() => setCurrentView("subscriptions")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              currentView === "subscriptions"
                ? "border-blue-500 text-green-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Subscriptions
          </button>
        </div>
      </div>

      {currentView === "plans" && <PlansView />}
      {currentView === "subscriptions" && <SubscriptionsView />}
      {currentView === "upgrade" && <UpgradeView />}
    </div>
  );
}
