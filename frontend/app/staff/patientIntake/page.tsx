"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect } from "react"; // Import useEffect
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PatientIntake } from "@/hooks/types/types"; // Assuming this path is correct
import { submitPatientIntakeForm } from "@/app/_apis/staff/receptionist";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

// --- Base Schema for common fields ---
const baseSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  clientType: z.string().min(1, "Client type is required"),
  chief_complaint: z.string().min(1, "Chief complaint is required"),
  bay_or_room: z.string().min(1, "Bay or room is required"),
  triage_level: z.string().min(1, "Triage level is required"),
  lab_status: z.string().min(1, "Lab status is required"),
});

// --- Schema for Self-Pay ---
const selfPaySchema = baseSchema.extend({
  billingType: z.literal("Self-Pay"),
});

// --- Schema for Insurance ---
const insuranceSchema = baseSchema.extend({
  billingType: z.enum(["Insurance", "Self-Pay"]),
  insurerName: z.string().min(1, "Insurer name is required"),
  memberId: z.string().min(1, "Member ID is required"),
  groupId: z.string().min(1, "Group ID is required"),
  subscriberFirstName: z.string().min(1, "Subscriber first name is required"),
  subscriberLastName: z.string().min(1, "Subscriber last name is required"),
  subscriberDob: z.string().min(1, "Subscriber DOB is required"),
  subscriberRelationshipToPatient: z
    .string()
    .min(1, "Relationship is required"),
});

// Combined schema for type inference
const formSchema = z.union([selfPaySchema, insuranceSchema]);
type FormData = z.infer<typeof formSchema>;

export default function PatientForm() {
  const [billingType, setBillingType] = useState<"Self-Pay" | "Insurance">(
    "Self-Pay"
  );
  const [loading, setLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(
      billingType === "Self-Pay" ? selfPaySchema : insuranceSchema
    ),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      clientType: "Adult",
      billingType: billingType,
      chief_complaint: "",
      bay_or_room: "",
      triage_level: "",
      lab_status: "",
      insurerName: "",
      memberId: "",
      groupId: "",
      subscriberFirstName: "",
      subscriberLastName: "",
      subscriberDob: "",
      subscriberRelationshipToPatient: "Self",
    },
  });

  // ✅ FIX 1: Use useEffect to react to billingType changes.
  useEffect(() => {
    if (billingType) {
      form.reset({
        ...form.getValues(),
        billingType: billingType,
      });
    }
  }, [billingType, form]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    let toastId;

    try {
      // ✅ FIX 2: Construct the patientData object within the if/else blocks.
      // This allows TypeScript to correctly infer the type.
      let patientData: PatientIntake;

      if (data.billingType === "Insurance") {
        // TypeScript knows this is the InsurancePatient shape
        patientData = {
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email,
          phone_number: data.phoneNumber,
          client_type: data.clientType,
          billing_type: "Insurance",
          chief_complaint: data.chief_complaint,
          bay_or_room: data.bay_or_room,
          triage_level: data.triage_level,
          lab_status: data.lab_status,
          insurer_name: data.insurerName,
          member_id: data.memberId,
          group_id: data.groupId,
          subscriber_first_name: data.subscriberFirstName,
          subscriber_last_name: data.subscriberLastName,
          subscriber_dob: data.subscriberDob,
          subscriber_relationship_to_patient:
            data.subscriberRelationshipToPatient,
        };
      } else {
        // TypeScript knows this is the SelfPayPatient shape
        patientData = {
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email,
          phone_number: data.phoneNumber,
          client_type: data.clientType,
          billing_type: "Self-Pay",
          chief_complaint: data.chief_complaint,
          bay_or_room: data.bay_or_room,
          triage_level: data.triage_level,
          lab_status: data.lab_status,
        };
      }

      toastId = toast.loading("Submitting patient intake form...");
      await submitPatientIntakeForm(patientData);

      toast.success("Patient intake form submitted successfully!", {
        id: toastId,
      });
      form.reset();
    } catch (error) {
      console.error("Error submitting patient intake form:", error);
      if (toastId) toast.dismiss(toastId);
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred.";
      toast.error(`Submission failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const renderFormFields = () => (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Patient Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="clientType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client Type</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clinical Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormField
            control={form.control}
            name="chief_complaint"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Chief Complaint</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField
              control={form.control}
              name="bay_or_room"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bay / Room</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="triage_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Triage Level</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lab_status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lab Status</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-semibold text-gray-900 mb-8">
          Patient Intake
        </h1>

        <Tabs
          value={billingType}
          onValueChange={(value) =>
            setBillingType(value as "Self-Pay" | "Insurance")
          }
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="Self-Pay">Self-Pay</TabsTrigger>
            <TabsTrigger value="Insurance">Insurance</TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-8 mt-8"
            >
              <TabsContent value="Self-Pay">
                <div className="space-y-8">{renderFormFields()}</div>
              </TabsContent>

              <TabsContent value="Insurance">
                <div className="space-y-8">
                  {renderFormFields()}
                  <Card>
                    <CardHeader>
                      <CardTitle>Insurance Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <FormField
                        control={form.control}
                        name="insurerName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Insurer Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="memberId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Member ID</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="groupId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Group ID</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="subscriberFirstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Subscriber First Name</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="subscriberLastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Subscriber Last Name</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="subscriberDob"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Subscriber DOB</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="subscriberRelationshipToPatient"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Relationship to Patient</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={loading} size="lg">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? "Submitting..." : "Submit Intake Form"}
                </Button>
              </div>
            </form>
          </Form>
        </Tabs>
      </div>
    </div>
  );
}
