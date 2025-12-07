"use client";

import { useForm, FormProvider } from "react-hook-form"; // Import FormProvider
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload } from "lucide-react";
import toast from "react-hot-toast";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { Department } from "@/hooks/types/types";
import { createDoctor } from "@/app/_apis/hospital_Admin/api";

// Custom TagsInput Component
const TagsInput = ({
  value,
  onValueChange,
  placeholder,
}: {
  value: string[];
  onValueChange: (tags: string[]) => void;
  placeholder: string;
}) => {
  const [inputValue, setInputValue] = useState("");
  const [tags, setTags] = useState<string[]>(value || []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      const newTags = [...tags, inputValue.trim()];
      setTags(newTags);
      onValueChange(newTags);
      setInputValue("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter((tag) => tag !== tagToRemove);
    setTags(newTags);
    onValueChange(newTags);
  };

  return (
    <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-md bg-green-field">
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full"
        >
          {tag}
          <button
            type="button"
            onClick={() => handleRemoveTag(tag)}
            className="ml-1 text-red-500 hover:text-red-700"
          >
            &times;
          </button>
        </span>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleInputKeyDown}
        placeholder={placeholder}
        className="flex-1 bg-transparent border-0 focus:outline-none text-sm"
      />
    </div>
  );
};

const doctorSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  department: z.string().min(1, "Please select a department"),
  experience: z.string().min(1, "Please select an experience"),
  npi: z.string().min(1, "Please enter Npi number"),
  qualifications: z.string().min(1, "Please select qualifications"),
  biography: z.string().min(1, "Biography is required"),
  specialization: z.string().min(1, "Please select a specialization"),
  languages: z.array(z.string()).min(1, "Please select at least one language"),
  medicalLicense: z.string().min(1, "Medical license is required"),
  deaNumber: z.string().optional(),
  availableForTelehealth: z.boolean().optional(),
});

type BasicInfoData = z.infer<typeof doctorSchema>;

export default function CreateDoctor() {
  const [loading, setLoading] = useState(false);
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const departments = useSelector(
    (state: RootState) => state.department.department
  );
  const logoInputRef = useRef<HTMLInputElement>(null);

  const basicForm = useForm<BasicInfoData>({
    resolver: zodResolver(doctorSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      department: "",
      experience: "",
      npi: "",
      qualifications: "",
      biography: "",
      specialization: "",
      languages: [], // Initialized as an empty array for TagsInput
      medicalLicense: "",
      deaNumber: "",
      availableForTelehealth: false,
    },
  });

  const onBasicSubmit = async (data: BasicInfoData) => {
    const validationErrors: string[] = [];
    const d_id = departments
      ?.filter((department) => department.name === data.department)
      .map((department) => department.id)[0];
    console.log("Department ID:", d_id);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);

    const formData = new FormData();
    formData.append(
      "doctor_details",
      JSON.stringify({
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        department_id: d_id, // matches your API
        specialization: data.specialization,
        medical_license_number: data.medicalLicense,
        qualifications: data.qualifications,
        years_of_experience: Number(data.experience),
        npi_number: data.npi,
        dea_number: data.deaNumber,
        available_for_telehealth: data.availableForTelehealth,
        biography: data.biography,
        languages_spoken: data.languages, // array ["English", "Spanish"]
      })
    );
    if (logoFile) {
      formData.append("profile_picture", logoFile);
    }

    let loadingId;
    try {
      loadingId = toast.loading("Creating doctor...");
      setLoading(true);

      const response = await createDoctor(formData);
      console.log("Doctor created successfully:", data);
      toast.success("Doctor created successfully", { id: loadingId });
      basicForm.reset();
      setLogoFile(null);
      setLogoImage(null);
      setErrors([]);
    } catch (error) {
      console.error("Error creating doctor:", error);
      setErrors([
        error instanceof Error ? error.message : "An unexpected error occurred",
      ]);
      if (error instanceof Error) {
        toast.error(error.message || "Error creating doctor", {
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
    <div className="min-h-screen bg-green-field ">
      <Card className="w-full mx-auto shadow-lg">
        <CardContent className="p-0">
          <h2 className="text-accent-foreground font-bold ms-6">
            Create Doctor
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
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      placeholder=""
                      className="h-12 bg-green-field border-0"
                      {...basicForm.register("firstName")}
                    />
                    {basicForm.formState.errors.firstName && (
                      <p className="text-sm text-red-500">
                        {basicForm.formState.errors.firstName.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder=""
                      className="h-12 bg-green-field border-0"
                      {...basicForm.register("lastName")}
                    />
                    {basicForm.formState.errors.lastName && (
                      <p className="text-sm text-red-500">
                        {basicForm.formState.errors.lastName.message}
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
                      className="h-12 bg-green-field border-0"
                      {...basicForm.register("email")}
                    />
                    {basicForm.formState.errors.email && (
                      <p className="text-sm text-red-500">
                        {basicForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Select
                      onValueChange={(value) =>
                        basicForm.setValue("department", value)
                      }
                      defaultValue={basicForm.getValues("department")}
                    >
                      <SelectTrigger className="h-12 bg-green-field border-0 w-full">
                        <SelectValue placeholder="Select Department" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(departments) &&
                          departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.name}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        <SelectItem value="cardiology">Cardiology</SelectItem>
                        <SelectItem value="neurology">Neurology</SelectItem>
                      </SelectContent>
                    </Select>
                    {basicForm.formState.errors.department && (
                      <p className="text-sm text-red-500">
                        {basicForm.formState.errors.department.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="specialization">Specialization</Label>
                    <Select
                      onValueChange={(value) =>
                        basicForm.setValue("specialization", value)
                      }
                      defaultValue={basicForm.getValues("specialization")}
                    >
                      <SelectTrigger className="h-12 bg-green-field border-0 w-full">
                        <SelectValue placeholder="Select Specialization" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cardiac">Cardiac</SelectItem>
                        <SelectItem value="neurological">
                          Neurological
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {basicForm.formState.errors.specialization && (
                      <p className="text-sm text-red-500">
                        {basicForm.formState.errors.specialization.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="experience">Years of Experience</Label>
                    <Select
                      onValueChange={(value) =>
                        basicForm.setValue("experience", value)
                      }
                      defaultValue={basicForm.getValues("experience")}
                    >
                      <SelectTrigger className="h-12 bg-green-field border-0 w-full">
                        <SelectValue placeholder="Select Years" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                      </SelectContent>
                    </Select>
                    {basicForm.formState.errors.experience && (
                      <p className="text-sm text-red-500">
                        {basicForm.formState.errors.experience.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="deaNumber">DEA Number</Label>
                    <Input
                      id="deaNumber"
                      placeholder=""
                      className="h-12 bg-green-field border-0"
                      {...basicForm.register("deaNumber")}
                    />
                    {basicForm.formState.errors.deaNumber && (
                      <p className="text-sm text-red-500">
                        {basicForm.formState.errors.deaNumber.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="npi">NPI Number</Label>
                    <Input
                      id="npi"
                      type="string"
                      placeholder=""
                      className="h-12 bg-green-field border-0"
                      {...basicForm.register("npi")}
                    />
                    {basicForm.formState.errors.npi && (
                      <p className="text-sm text-red-500">
                        {basicForm.formState.errors.npi.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={basicForm.control}
                    name="languages"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Languages Spoken</FormLabel>
                        <FormControl>
                          <TagsInput
                            value={field.value || []}
                            onValueChange={field.onChange}
                            placeholder="English, Spanish, etc."
                          />
                        </FormControl>
                        <FormDescription>Add languages.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-2">
                    <Label htmlFor="logo">Profile Picture (Optional)</Label>
                    <div
                      className="border-2 border-dashed rounded-lg bg-green-field overflow-hidden border-gray-300"
                    >
                      {logoImage ? (
                        <div className="relative">
                          <img
                            src={logoImage}
                            alt="Doctor Profile Picture"
                            className="w-full h-48 object-contain bg-white"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button
                              onClick={() => logoInputRef.current?.click()}
                              className="bg-green-primary hover:bg-green-700 text-white"
                            >
                              <Upload className="w-4 h-4 mr-2" /> Change Picture
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 text-center">
                          <p className="text-sm text-gray-500 mb-4">
                            Upload a profile picture (optional).
                          </p>
                          <Button
                            onClick={() => logoInputRef.current?.click()}
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="qualifications">Qualifications</Label>
                    <Input
                      id="qualifications"
                      placeholder="MD, PhD, Board Certifications, etc."
                      className="h-12 bg-green-field border-0"
                      {...basicForm.register("qualifications")}
                    />
                    {basicForm.formState.errors.qualifications && (
                      <p className="text-sm text-red-500">
                        {basicForm.formState.errors.qualifications.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="medicalLicense">
                      Medical License Number
                    </Label>
                    <Input
                      id="medicalLicense"
                      placeholder=""
                      className="h-12 bg-green-field border-0"
                      {...basicForm.register("medicalLicense")}
                    />
                    {basicForm.formState.errors.medicalLicense && (
                      <p className="text-sm text-red-500">
                        {basicForm.formState.errors.medicalLicense.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="availableForTelehealth"
                        {...basicForm.register("availableForTelehealth")}
                        className="h-4 w-4 text-green-primary focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <Label htmlFor="availableForTelehealth">
                        Available for Telehealth
                      </Label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="biography">Biography</Label>
                    <Textarea
                      id="biography"
                      placeholder=""
                      className="min-h-[150px] bg-green-field border-0 resize-none"
                      {...basicForm.register("biography")}
                    />
                    {basicForm.formState.errors.biography && (
                      <p className="text-sm text-red-500">
                        {basicForm.formState.errors.biography.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-6">
                  <Button
                    type="submit" // Changed to type="submit" to trigger form submission
                    className="bg-green-primary hover:bg-green-700 text-white px-8 py-3"
                    disabled={loading}
                  >
                    CREATE DOCTOR
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
