"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PatientIntake } from "@/hooks/types/types";
import { submitPatientIntakeForm } from "@/app/_apis/staff/receptionist";
import toast from "react-hot-toast";
import { Loader2, UserPlus, CheckCircle2 } from "lucide-react";

// Base Schema for common fields
const baseSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Please enter a valid email address"),
    phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
    clientType: z.string().min(1, "Client type is required"),
    chief_complaint: z.string().optional(),
    bay_or_room: z.string().optional(),
    triage_level: z.string().optional(),
    lab_status: z.string().optional(),
});

// Schema for Self-Pay
const selfPaySchema = baseSchema.extend({
    billingType: z.literal("Self-Pay"),
});

// Schema for Insurance
const insuranceSchema = baseSchema.extend({
    billingType: z.enum(["Insurance", "Self-Pay"]),
    insurerName: z.string().min(1, "Insurer name is required"),
    memberId: z.string().min(1, "Member ID is required"),
    groupId: z.string().min(1, "Group ID is required"),
    subscriberFirstName: z.string().min(1, "Subscriber first name is required"),
    subscriberLastName: z.string().min(1, "Subscriber last name is required"),
    subscriberDob: z.string().min(1, "Subscriber DOB is required"),
    subscriberRelationshipToPatient: z.string().min(1, "Relationship is required"),
});

const formSchema = z.union([selfPaySchema, insuranceSchema]);
type FormData = z.infer<typeof formSchema>;

export default function DoctorRegisterPatient() {
    const [billingType, setBillingType] = useState<"Self-Pay" | "Insurance">("Self-Pay");
    const [loading, setLoading] = useState(false);

    const form = useForm<FormData>({
        resolver: zodResolver(billingType === "Self-Pay" ? selfPaySchema : insuranceSchema),
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
            let patientData: PatientIntake;

            if (data.billingType === "Insurance") {
                patientData = {
                    first_name: data.firstName,
                    last_name: data.lastName,
                    email: data.email,
                    phone_number: data.phoneNumber,
                    client_type: data.clientType,
                    billing_type: "Insurance",
                    chief_complaint: data.chief_complaint || "",
                    bay_or_room: data.bay_or_room || "",
                    triage_level: data.triage_level || "",
                    lab_status: data.lab_status || "",
                    insurer_name: data.insurerName,
                    member_id: data.memberId,
                    group_id: data.groupId,
                    subscriber_first_name: data.subscriberFirstName,
                    subscriber_last_name: data.subscriberLastName,
                    subscriber_dob: data.subscriberDob,
                    subscriber_relationship_to_patient: data.subscriberRelationshipToPatient,
                };
            } else {
                patientData = {
                    first_name: data.firstName,
                    last_name: data.lastName,
                    email: data.email,
                    phone_number: data.phoneNumber,
                    client_type: data.clientType,
                    billing_type: "Self-Pay",
                };
            }

            toastId = toast.loading("Registering patient...");
            await submitPatientIntakeForm(patientData);

            toast.success(
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    <div>
                        <p className="font-semibold">Patient registered successfully!</p>
                        <p className="text-sm text-gray-600">Patient has been assigned to you automatically</p>
                    </div>
                </div>,
                { id: toastId, duration: 5000 }
            );

            form.reset();
        } catch (error) {
            console.error("Error registering patient:", error);
            if (toastId) toast.dismiss(toastId);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            toast.error(`Registration failed: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    const renderBasicInfo = () => (
        <Card>
            <CardHeader>
                <CardTitle>Patient Information</CardTitle>
                <CardDescription>Enter the patient's basic demographic information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>First Name *</FormLabel>
                                <FormControl>
                                    <Input placeholder="John" {...field} />
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
                                <FormLabel>Last Name *</FormLabel>
                                <FormControl>
                                    <Input placeholder="Doe" {...field} />
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
                                <FormLabel>Email *</FormLabel>
                                <FormControl>
                                    <Input type="email" placeholder="john.doe@example.com" {...field} />
                                </FormControl>
                                <FormDescription>Patient will receive login credentials here</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="phoneNumber"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Phone Number *</FormLabel>
                                <FormControl>
                                    <Input placeholder="+1 (555) 123-4567" {...field} />
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
                            <FormLabel>Client Type *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select client type" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Adult">Adult</SelectItem>
                                    <SelectItem value="Pediatric">Pediatric</SelectItem>
                                    <SelectItem value="Geriatric">Geriatric</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </CardContent>
        </Card>
    );

    const renderClinicalDetails = () => (
        <Card>
            <CardHeader>
                <CardTitle>Clinical Details</CardTitle>
                <CardDescription>Optional clinical information (can be added later)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <FormField
                    control={form.control}
                    name="chief_complaint"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Chief Complaint</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Chest pain, Headache" {...field} />
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
                                    <Input placeholder="e.g., Room 101" {...field} />
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
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select level" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Level 1 - Critical">Level 1 - Critical</SelectItem>
                                        <SelectItem value="Level 2 - Emergent">Level 2 - Emergent</SelectItem>
                                        <SelectItem value="Level 3 - Urgent">Level 3 - Urgent</SelectItem>
                                        <SelectItem value="Level 4 - Less Urgent">Level 4 - Less Urgent</SelectItem>
                                        <SelectItem value="Level 5 - Non-Urgent">Level 5 - Non-Urgent</SelectItem>
                                    </SelectContent>
                                </Select>
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
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Pending">Pending</SelectItem>
                                        <SelectItem value="In Progress">In Progress</SelectItem>
                                        <SelectItem value="Completed">Completed</SelectItem>
                                        <SelectItem value="Not Required">Not Required</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </CardContent>
        </Card>
    );

    const renderInsuranceInfo = () => (
        <Card>
            <CardHeader>
                <CardTitle>Insurance Information</CardTitle>
                <CardDescription>Patient's insurance coverage details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <FormField
                    control={form.control}
                    name="insurerName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Insurance Company *</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Blue Cross Blue Shield" {...field} />
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
                                <FormLabel>Member ID *</FormLabel>
                                <FormControl>
                                    <Input placeholder="ABC123456789" {...field} />
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
                                <FormLabel>Group ID *</FormLabel>
                                <FormControl>
                                    <Input placeholder="GRP987654" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="border-t pt-6 mt-6">
                    <h4 className="text-sm font-semibold mb-4">Subscriber Information</h4>
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="subscriberFirstName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Subscriber First Name *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Jane" {...field} />
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
                                        <FormLabel>Subscriber Last Name *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Doe" {...field} />
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
                                        <FormLabel>Subscriber Date of Birth *</FormLabel>
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
                                        <FormLabel>Relationship to Patient *</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select relationship" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Self">Self</SelectItem>
                                                <SelectItem value="Spouse">Spouse</SelectItem>
                                                <SelectItem value="Parent">Parent</SelectItem>
                                                <SelectItem value="Child">Child</SelectItem>
                                                <SelectItem value="Other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-[#388fe5] rounded-lg">
                            <UserPlus className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-semibold text-gray-900">Register New Patient</h1>
                    </div>
                    <p className="text-gray-600 ml-14">
                        Add a new patient to your practice. They will be automatically assigned to you.
                    </p>
                </div>

                <Tabs
                    value={billingType}
                    onValueChange={(value) => setBillingType(value as "Self-Pay" | "Insurance")}
                    className="w-full"
                >
                    <TabsList className="grid w-full grid-cols-2 mb-8">
                        <TabsTrigger value="Self-Pay" className="text-base">
                            Self-Pay Patient
                        </TabsTrigger>
                        <TabsTrigger value="Insurance" className="text-base">
                            Insurance Patient
                        </TabsTrigger>
                    </TabsList>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <TabsContent value="Self-Pay" className="space-y-6">
                                {renderBasicInfo()}
                                {renderClinicalDetails()}
                            </TabsContent>

                            <TabsContent value="Insurance" className="space-y-6">
                                {renderBasicInfo()}
                                {renderClinicalDetails()}
                                {renderInsuranceInfo()}
                            </TabsContent>

                            <div className="flex justify-end gap-4 pt-4 sticky bottom-0 bg-gray-50 py-4 border-t">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => form.reset()}
                                    disabled={loading}
                                >
                                    Clear Form
                                </Button>
                                <Button type="submit" disabled={loading} size="lg" className="bg-[#388fe5] hover:bg-[#6fb043]">
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {loading ? "Registering..." : "Register Patient"}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </Tabs>
            </div>
        </div>
    );
}
