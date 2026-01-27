"use client";

import { useForm, FormProvider } from "react-hook-form"; // Import FormProvider
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createStaff } from "@/app/_apis/hospital_Admin/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import toast from "react-hot-toast";
import { Upload } from "lucide-react";

// Custom TagsInput Component

const doctorSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  job_title: z.string().min(1, "please select a job title"),
  phone_number: z.string().min(10, "Phone number must be at least 10 digits").optional().or(z.literal("")),
});

type BasicInfoData = z.infer<typeof doctorSchema>;

export default function CreateDoctor() {
  const [loading, setLoading] = useState(false);
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const basicForm = useForm<BasicInfoData>({
    resolver: zodResolver(doctorSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      job_title: "",
      phone_number: "",
    },
  });

  const onBasicSubmit = async (data: BasicInfoData) => {
    const validationErrors: string[] = [];
    if (!logoFile) {
      validationErrors.push("Logo is required");
    }

    setErrors([]);

    const formData = new FormData();
    const roleMapping: Record<string, string> = {
      receptionist: "Receptionist",
      staff: "Receptionist",
      lab_technician: "Lab_Technician",
    };

    formData.append(
      "details",
      JSON.stringify({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        job_title: data.job_title,
        phone_number: data.phone_number,
        role_name: roleMapping[data.job_title] || "Receptionist",
      })
    );
    if (logoFile) {
      formData.append("profile_picture", logoFile);
    }

    let loadingId;
    try {
      loadingId = toast.loading("Creating staff...");
      setLoading(true);

      const response = await createStaff(formData);
      console.log("staff created successfully:", data);
      toast.success("staff created successfully", { id: loadingId });
      basicForm.reset();
      setLogoFile(null);
      setLogoImage(null);
      setErrors([]);
    } catch (error) {
      console.error("Error creating staff:", error);
      setErrors([
        error instanceof Error ? error.message : "An unexpected error occurred",
      ]);
      if (error instanceof Error) {
        toast.error(error.message || "Error creating staff", {
          id: loadingId,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setErrors((prev) => prev.filter((error) => !error.includes("logo")));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 ">
      <Card className="w-full mx-auto shadow-lg">
        <CardContent className="p-0">
          <h2 className="text-accent-foreground font-bold ms-6">
            Create Staff
          </h2>
          <div className="p-8">
            {errors.length > 0 && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="text-sm font-medium text-red-800 mb-2">
                  Please fix the following errors:
                </h3>
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, index) => (
                    <li key={index} className="text-sm text-red-700">
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Wrap the form with FormProvider */}
            <FormProvider {...basicForm}>
              <form
                onSubmit={basicForm.handleSubmit(onBasicSubmit)}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      placeholder=""
                      className="h-12 bg-gray-50 border-0"
                      {...basicForm.register("first_name")}
                    />
                    {basicForm.formState.errors.first_name && (
                      <p className="text-sm text-red-500">
                        {basicForm.formState.errors.first_name.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      placeholder=""
                      className="h-12 bg-gray-50 border-0"
                      {...basicForm.register("last_name")}
                    />
                    {basicForm.formState.errors.last_name && (
                      <p className="text-sm text-red-500">
                        {basicForm.formState.errors.last_name.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder=""
                      className="h-12 bg-gray-50 border-0"
                      {...basicForm.register("email")}
                    />
                    {basicForm.formState.errors.email && (
                      <p className="text-sm text-red-500">
                        {basicForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone_number">Phone Number</Label>
                    <Input
                      id="phone_number"
                      placeholder="e.g. +1234567890"
                      className="h-12 bg-gray-50 border-0"
                      {...basicForm.register("phone_number")}
                    />
                    {basicForm.formState.errors.phone_number && (
                      <p className="text-sm text-red-500">
                        {basicForm.formState.errors.phone_number.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="job_title">JobTitle</Label>
                    <Select
                      onValueChange={(value) =>
                        basicForm.setValue("job_title", value)
                      }
                      defaultValue={basicForm.getValues("job_title")}
                    >
                      <SelectTrigger
                        className=" bg-gray-50 border-0 w-full m-0"
                        style={{ height: "48px" }}
                      >
                        <SelectValue placeholder="Select job_title" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="receptionist">
                          receptionist
                        </SelectItem>
                        <SelectItem value="staff">staff</SelectItem>
                        <SelectItem value="lab_technician">
                          lab technician
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {basicForm.formState.errors.job_title && (
                      <p className="text-sm text-red-500">
                        {basicForm.formState.errors.job_title.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="logo">Logo</Label>
                    <div
                      className={`border-2 border-dashed rounded-lg bg-gray-50 overflow-hidden ${errors.some((error) => error.includes("logo"))
                        ? "border-red-300"
                        : "border-gray-300"
                        }`}
                    >
                      {logoImage ? (
                        <div className="relative">
                          <img
                            src={logoImage}
                            alt="Doctor Logo"
                            className="w-full h-48 object-contain bg-white"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button
                              onClick={() => logoInputRef.current?.click()}
                              type="button"
                              className="bg-green-primary hover:bg-green-700 text-white"
                            >
                              <Upload className="w-4 h-4 mr-2" /> Change Logo
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 text-center">
                          <p className="text-sm text-gray-500 mb-4">
                            Upload a logo image.
                          </p>
                          <Button
                            onClick={() => logoInputRef.current?.click()}
                            type="button"
                            className="bg-green-primary hover:bg-green-700 text-white"
                          >
                            <Upload className="w-4 h-4 mr-2" /> UPLOAD
                          </Button>
                        </div>
                      )}
                    </div>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-6">
                  <Button
                    type="submit" // Changed to type="submit" to trigger form submission
                    className="bg-green-primary hover:bg-green-700 text-white px-8 py-3"
                    disabled={loading}
                  >
                    CREATE STAFF
                  </Button>
                </div>
              </form>
            </FormProvider>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
