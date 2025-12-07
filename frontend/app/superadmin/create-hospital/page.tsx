"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AdminHeader } from "@/components/admin-header";
import { createHospital } from "@/app/_apis/superAdmin/hospital";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload } from "lucide-react";
import toast from "react-hot-toast";

const basicInfoSchema = z.object({
  hospitalName: z.string().min(1, "Hospital name is required"),
  hospitalCode: z.string().min(1, "Hospital code is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(1, "Phone number is required"),
  country: z.string().min(1, "Please select a country"),
  address: z.string().min(1, "Address is required"),
  timezone: z.string().min(1, "Please select a timezone"),
  language: z.string().min(1, "Please select a language"),
  adminFirstName: z.string().min(1, "Admin first name is required"),
  adminLastName: z.string().min(1, "Admin last name is required"),
});

const brandingSchema = z.object({
  headerText: z.string().min(1, "Header text is required"),
  tagline: z.string().min(1, "Tagline is required"),
  description: z.string().min(1, "Description is required"),
});

type BasicInfoData = z.infer<typeof basicInfoSchema>;
type BrandingData = z.infer<typeof brandingSchema>;

export default function CreateHospitalPage() {
  const [activeTab, setActiveTab] = useState("basic");
  const [loading, setLoading] = useState(false);
  const [selectedSidebarColor, setSelectedSidebarColor] = useState("");
  const [selectedHeaderColor, setSelectedHeaderColor] = useState("");
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [faviconImage, setFaviconImage] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const basicForm = useForm<BasicInfoData>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      hospitalName: "",
      hospitalCode: "",
      email: "",
      phone: "",
      country: "",
      address: "",
      timezone: "",
      language: "",
      adminFirstName: "",
      adminLastName: "",
    },
  });

  const brandingForm = useForm<BrandingData>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      headerText: "",
      tagline: "",
      description: "",
    },
  });

  const onBasicSubmit = async (data: BasicInfoData) => {
    const isValid = await basicForm.trigger();
    if (isValid) {
      console.log("Basic info data:", data);
      setActiveTab("branding");
    }
  };

  const onBrandingSubmit = async (data: BrandingData) => {
    const isValid = await brandingForm.trigger();
    if (!isValid) return;

    // Validate required fields
    const validationErrors: string[] = [];

    if (!logoFile) {
      validationErrors.push("Hospital logo is required");
    }
    if (!faviconFile) {
      validationErrors.push("Hospital favicon is required");
    }
    if (!selectedSidebarColor) {
      validationErrors.push("Sidebar color selection is required");
    }
    if (!selectedHeaderColor) {
      validationErrors.push("Header color selection is required");
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);

    // --- FIX: Structure the data as the backend expects ---

    // 1. Create the basic_info object with backend-expected keys
    const basicInfoValues = basicForm.getValues();
    const basicInfoObject = {
      name: basicInfoValues.hospitalName,
      code: basicInfoValues.hospitalCode,
      email: basicInfoValues.email,
      phone_number: basicInfoValues.phone,
      country: basicInfoValues.country,
      address: basicInfoValues.address,
      time_zone: basicInfoValues.timezone,
      primary_language: basicInfoValues.language,
      admin_first_name: basicInfoValues.adminFirstName,
      admin_last_name: basicInfoValues.adminLastName,
    };

    // 2. Create the branding_info object with backend-expected keys
    const brandingInfoObject = {
      header_text: data.headerText,
      tagline: data.tagline,
      description: data.description,
      sidebar_color: selectedSidebarColor,
      header_color: selectedHeaderColor,
    };

    // 3. Create FormData and append the objects as JSON strings
    const formData = new FormData();
    formData.append("basic_info", JSON.stringify(basicInfoObject));
    formData.append("branding_info", JSON.stringify(brandingInfoObject));

    // --- END FIX ---

    // Append files
    if (logoFile) {
      formData.append("logo", logoFile);
    }
    if (faviconFile) {
      formData.append("favicon", faviconFile);
    }

    let loadingId;
    try {
      loadingId = toast.loading("Creating hospital...");
      setLoading(true);
      const response = await createHospital(formData);

      console.log("Hospital created successfully:");
      toast.success("Hospital created successfully", { id: loadingId });
      basicForm.reset();
      brandingForm.reset();
      setLogoFile(null);
      setFaviconFile(null);
      setLogoImage(null);
      setFaviconImage(null);
      setSelectedSidebarColor("");
      setSelectedHeaderColor("");
      setErrors([]);
      setActiveTab("basic");
    } catch (error) {
      console.error("Error creating hospital:", error);
      setErrors([
        error instanceof Error ? error.message : "An unexpected error occurred",
      ]);
      if (error instanceof Error) {
        toast.error(error.message || "Error creating hospital", {
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

  const handleFaviconUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFaviconFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setFaviconImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setErrors((prev) => prev.filter((error) => !error.includes("favicon")));
    }
  };

  const handleColorSelection = (color: string, type: "sidebar" | "header") => {
    if (type === "sidebar") {
      setSelectedSidebarColor(color);
      setErrors((prev) =>
        prev.filter((error) => !error.includes("Sidebar color"))
      );
    } else {
      setSelectedHeaderColor(color);
      setErrors((prev) =>
        prev.filter((error) => !error.includes("Header color"))
      );
    }
  };

  const sidebarColors = [
    { name: "White", value: "#ffffff", class: "bg-white border-gray-300" },
    { name: "Black", value: "#000000", class: "bg-black" },
    { name: "Blue", value: "#3b82f6", class: "bg-blue-500" },
    { name: "Light Blue", value: "#60a5fa", class: "bg-blue-400" },
    { name: "Teal", value: "#14b8a6", class: "bg-teal-500" },
    { name: "Green", value: "#22c55e", class: "bg-green-500" },
    { name: "Red", value: "#ef4444", class: "bg-red-500" },
  ];

  const headerColors = [
    {
      name: "Light Gray",
      value: "#f3f4f6",
      class: "bg-gray-100 border-gray-300",
    },
    { name: "Dark Gray", value: "#374151", class: "bg-gray-700" },
    { name: "Blue", value: "#3b82f6", class: "bg-blue-500" },
    { name: "Light Blue", value: "#60a5fa", class: "bg-blue-400" },
    { name: "Cyan", value: "#06b6d4", class: "bg-cyan-500" },
    { name: "Green", value: "#22c55e", class: "bg-green-500" },
    { name: "Red", value: "#ef4444", class: "bg-red-500" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Card className="max-w-4xl mx-auto shadow-lg">
        <CardContent className="p-0">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-8 py-6">
            <div className="flex sm:flex-row flex-col items-center justify-between">
              <h1 className="text-xl font-semibold text-gray-800 sm:text-left text-center">
                Create Hospital
              </h1>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab("basic")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor pointer${
                    activeTab === "basic"
                      ? "bg-white text-green-primary shadow-sm"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                  disabled={loading}
                >
                  Basic Info
                </button>
                <button
                  onClick={() => setActiveTab("branding")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors  cursor-pointer ${
                    activeTab === "branding"
                      ? "bg-white text-green-primary shadow-sm"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                  disabled={loading}
                >
                  Branding Section
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Error Display */}
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

            {activeTab === "basic" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="hospitalName">Hospital Name</Label>
                    <Input
                      id="hospitalName"
                      placeholder="Hospital 001"
                      className="h-12 bg-gray-50 border-0"
                      {...basicForm.register("hospitalName")}
                    />
                    {basicForm.formState.errors.hospitalName && (
                      <p className="text-sm text-red-500">
                        {basicForm.formState.errors.hospitalName.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hospitalCode">Hospital Code</Label>
                    <Input
                      id="hospitalCode"
                      placeholder="000325498945"
                      className="h-12 bg-gray-50 border-0"
                      {...basicForm.register("hospitalCode")}
                    />
                    {basicForm.formState.errors.hospitalCode && (
                      <p className="text-sm text-red-500">
                        {basicForm.formState.errors.hospitalCode.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="hospital0012@hotmail.com"
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
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      placeholder="+ 103 456 789"
                      className="h-12 bg-gray-50 border-0"
                      {...basicForm.register("phone")}
                    />
                    {basicForm.formState.errors.phone && (
                      <p className="text-sm text-red-500">
                        {basicForm.formState.errors.phone.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="adminFirstName">Admin First Name</Label>
                    <Input
                      id="adminFirstName"
                      placeholder="John"
                      className="h-12 bg-gray-50 border-0"
                      {...basicForm.register("adminFirstName")}
                    />
                    {basicForm.formState.errors.adminFirstName && (
                      <p className="text-sm text-red-500">
                        {basicForm.formState.errors.adminFirstName.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminLastName">Admin Last Name</Label>
                    <Input
                      id="adminLastName"
                      placeholder="Doe"
                      className="h-12 bg-gray-50 border-0"
                      {...basicForm.register("adminLastName")}
                    />
                    {basicForm.formState.errors.adminLastName && (
                      <p className="text-sm text-red-500">
                        {basicForm.formState.errors.adminLastName.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        placeholder="Enter country"
                        className="h-12 bg-gray-50 border-0"
                        {...basicForm.register("country")}
                      />
                      {basicForm.formState.errors.country && (
                        <p className="text-sm text-red-500">
                          {basicForm.formState.errors.country.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2 mt-4">
                      <Label htmlFor="timezone">Time Zone</Label>
                      <Select
                        onValueChange={(value) =>
                          basicForm.setValue("timezone", value)
                        }
                      >
                        <SelectTrigger className="h-12 bg-gray-50 border-0 w-full">
                          <SelectValue placeholder="GMT +00:00 - Western European Time" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GMT+00:00">
                            GMT +00:00 - Western European Time
                          </SelectItem>
                          <SelectItem value="GMT-05:00">
                            GMT -05:00 - Eastern Standard Time
                          </SelectItem>
                          <SelectItem value="GMT-08:00">
                            GMT -08:00 - Pacific Standard Time
                          </SelectItem>
                          <SelectItem value="GMT-06:00">
                            GMT -06:00 - Central Standard Time
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {basicForm.formState.errors.timezone && (
                        <p className="text-sm text-red-500">
                          {basicForm.formState.errors.timezone.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      placeholder="Enter address"
                      className="h-30 bg-gray-50 border-0"
                      {...basicForm.register("address")}
                    />
                    {basicForm.formState.errors.address && (
                      <p className="text-sm text-red-500">
                        {basicForm.formState.errors.address.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Primary Language</Label>
                  <Input
                    id="language"
                    placeholder="Enter language"
                    className="h-12 bg-gray-50 border-0 md:w-[50%] w-full"
                    {...basicForm.register("language")}
                  />
                  {basicForm.formState.errors.language && (
                    <p className="text-sm text-red-500">
                      {basicForm.formState.errors.language.message}
                    </p>
                  )}
                </div>

                <div className="flex justify-end pt-6">
                  <Button
                    onClick={() => {
                      const data = basicForm.getValues();
                      onBasicSubmit(data);
                    }}
                    className="bg-green-primary hover:bg-green-700 text-white px-8 py-3"
                  >
                    SAVE & CONTINUE
                  </Button>
                </div>
              </div>
            )}

            {activeTab === "branding" && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  {/* Left Column - Form Fields */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label
                        htmlFor="headerText"
                        className="text-sm font-medium text-gray-700"
                      >
                        Header Text
                      </Label>
                      <Input
                        id="headerText"
                        placeholder="Type Text Here"
                        className="h-12 bg-gray-50 border-0"
                        {...brandingForm.register("headerText")}
                      />
                      {brandingForm.formState.errors.headerText && (
                        <p className="text-sm text-red-500">
                          {brandingForm.formState.errors.headerText.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="tagline"
                        className="text-sm font-medium text-gray-700"
                      >
                        Tagline
                      </Label>
                      <Input
                        id="tagline"
                        placeholder="Type Tagline Here"
                        className="h-12 bg-gray-50 border-0"
                        {...brandingForm.register("tagline")}
                      />
                      {brandingForm.formState.errors.tagline && (
                        <p className="text-sm text-red-500">
                          {brandingForm.formState.errors.tagline.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="description"
                        className="text-sm font-medium text-gray-700"
                      >
                        Hospital Description
                      </Label>
                      <Textarea
                        id="description"
                        placeholder=""
                        className="min-h-[150px] bg-gray-50 border-0 resize-none"
                        {...brandingForm.register("description")}
                      />
                      {brandingForm.formState.errors.description && (
                        <p className="text-sm text-red-500">
                          {brandingForm.formState.errors.description.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Column - Upload Sections */}
                  <div className="space-y-8">
                    {/* Logo Upload */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-700">
                        Upload Hospital Logo{" "}
                        <span className="text-red-500">*</span>
                      </Label>
                      <div
                        className={`border-2 border-dashed rounded-lg bg-gray-50 overflow-hidden ${
                          errors.some((error) => error.includes("logo"))
                            ? "border-red-300"
                            : "border-gray-300"
                        }`}
                      >
                        {logoImage ? (
                          <div className="relative">
                            <img
                              src={logoImage}
                              alt="Hospital Logo"
                              className="w-full h-48 object-contain bg-white"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Button
                                onClick={() => logoInputRef.current?.click()}
                                className="bg-green-primary hover:bg-green-700 text-white"
                              >
                                <Upload className="w-4 h-4 mr-2" />
                                Change Logo
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-8 text-center">
                            <p className="text-sm text-gray-500 mb-4">
                              Upload a 255 x 255 pixel PNG image. This will be
                              the Logo for request.
                            </p>
                            <Button
                              onClick={() => logoInputRef.current?.click()}
                              className="bg-green-primary hover:bg-green-700 text-white"
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              UPLOAD
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

                    {/* Favicon Upload */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-700">
                        Upload Hospital Favicon{" "}
                        <span className="text-red-500">*</span>
                      </Label>
                      <div
                        className={`border-2 border-dashed rounded-lg bg-gray-50 overflow-hidden ${
                          errors.some((error) => error.includes("favicon"))
                            ? "border-red-300"
                            : "border-gray-300"
                        }`}
                      >
                        {faviconImage ? (
                          <div className="relative">
                            <img
                              src={faviconImage}
                              alt="Hospital Favicon"
                              className="w-full h-48 object-contain bg-white"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Button
                                onClick={() => faviconInputRef.current?.click()}
                                className="bg-green-primary hover:bg-green-700 text-white"
                              >
                                <Upload className="w-4 h-4 mr-2" />
                                Change Favicon
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-8 text-center">
                            <p className="text-sm text-gray-500 mb-4">
                              Upload a 16 x 16 pixel PNG image. This will be the
                              Favicon for request.
                            </p>
                            <Button
                              onClick={() => faviconInputRef.current?.click()}
                              className="bg-green-primary hover:bg-green-700 text-white"
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              UPLOAD
                            </Button>
                          </div>
                        )}
                      </div>
                      <input
                        ref={faviconInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFaviconUpload}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* Color Selection */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-8 border-t border-gray-200 lg:w-[50%] w-[100%]">
                  <div className="space-y-4">
                    <Label className="text-sm font-medium text-gray-700">
                      Sidebar Color <span className="text-red-500">*</span>
                    </Label>
                    <div className="grid grid-cols-3 gap-3">
                      {sidebarColors.map((color) => (
                        <button
                          key={color.value}
                          onClick={() =>
                            handleColorSelection(color.value, "sidebar")
                          }
                          className={`w-8 h-8 rounded-lg ${
                            color.class
                          } border-2 transition-all hover:scale-105 ${
                            selectedSidebarColor === color.value
                              ? "border-green-primary ring-2 ring-blue-200"
                              : errors.some((error) =>
                                  error.includes("Sidebar color")
                                )
                              ? "border-red-300"
                              : "border-gray-300"
                          }`}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-sm font-medium text-gray-700">
                      Header Color <span className="text-red-500">*</span>
                    </Label>
                    <div className="grid grid-cols-3 gap-3">
                      {headerColors.map((color) => (
                        <button
                          key={color.value}
                          onClick={() =>
                            handleColorSelection(color.value, "header")
                          }
                          className={`w-8 h-8 rounded-lg ${
                            color.class
                          } border-2 transition-all hover:scale-105 ${
                            selectedHeaderColor === color.value
                              ? "border-green-primary ring-2 ring-blue-200"
                              : errors.some((error) =>
                                  error.includes("Header color")
                                )
                              ? "border-red-300"
                              : "border-gray-300"
                          }`}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-8">
                  <Button
                    onClick={() => {
                      const data = brandingForm.getValues();
                      onBrandingSubmit(data);
                    }}
                    className="bg-green-700 hover:bg-blue-500 text-white px-8 py-1 text-sm font-medium"
                    disabled={loading}
                  >
                    CREATE HOSPITAL
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
