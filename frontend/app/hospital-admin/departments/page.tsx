"use client";

import React, { useEffect, useRef, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { InfinitySpin } from "react-loader-spinner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Heart,
  Baby,
  Stethoscope,
  Plus,
  User,
  Briefcase,
  Upload,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import { createDepartment } from "@/app/_apis/hospital_Admin/api";
import toast from "react-hot-toast";
import { fetchDepartments } from "@/store/slices/departmentSlice";
import { Department } from "@/hooks/types/types";
import Image from "next/image";

// Define the schema
const departmentSchema = z.object({
  name: z.string().min(1, "Department name is required"),

  members: z.string().min(1, "Please select number of members"),

  status: z.boolean().default(true),
});

// Infer the type from schema
type DepartmentFormData = z.infer<typeof departmentSchema>;

// Department data
// const departments = [
//   { id: 1, name: "Cardiology", count: 6, icon: Heart, color: "bg-green-light" },
//   { id: 2, name: "Pediatrics", count: 3, icon: Baby, color: "bg-green-light" },
//   { id: 3, name: "ENT", count: 10, icon: Stethoscope, color: "bg-green-light" },
//   {
//     id: 4,
//     name: "Dental",
//     count: 6,
//     icon: Stethoscope,
//     color: "bg-blue-500 text-white",
//   },
// ];

// Component definition
const DepartmentsPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [depLoading, setDepLoading] = useState<boolean>(false);
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const name = useSelector((state: RootState) => state.auth.hospital?.name);
  const departments = useSelector(
    (state: RootState) => state.department.department || []
  );

  const form = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: "",

      members: "",

      status: true,
    },
  });

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  const onSubmit: SubmitHandler<DepartmentFormData> = async (data) => {
    let toastId;
    const formData = new FormData();
    if (logoFile) {
      formData.append("logo", logoFile);
    } else {
      toast.error("Upload a logo");
      return;
    }
    const details = {
      name: data.name,
      no_of_members: data.members,
      is_active: data.status,
    };
    formData.append("details", JSON.stringify(details));
    try {
      setLoading(true);
      toastId = toast.loading("Creating department...");
      const response = await createDepartment(formData);
      toast.success("Department created successfully", { id: toastId });
      setIsModalOpen(false);
      form.reset();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message, { id: toastId });
      } else {
        toast.error("An unknown error occurred", { id: toastId });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Departments
        </h2>

        {depLoading ? (
          <div className="flex items-center justify-center py-6">
            <InfinitySpin

              width="200"
              color="#388fe5"

            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {departments.map((dept: Department) => {
              return (
                <div
                  key={dept.id}
                  className={`rounded-lg p-6 text-center transition-all hover:shadow-md bg-green-light`}
                >
                  <div className="flex justify-center mb-4">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center bg-gray-200`}
                    >
                      <Image
                        src={dept.logo_url || "/default-logo.png"}
                        alt={`${dept.name} logo`}
                        width={48}
                        height={48}
                        className="rounded-full w-full auto object-cover"
                      />
                    </div>
                  </div>
                  <div className={`text-2xl font-bold mb-1 text-black`}>
                    {dept.no_of_members}
                  </div>
                  <div className={`text-sm black`}>{dept.name}</div>
                </div>
              );
            })}

            <div
              onClick={() => setIsModalOpen(true)}
              className="rounded-lg p-6 text-center bg-green-light hover:bg-gray-200 transition-all cursor-pointer hover:shadow-md"
            >
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                  <Plus className="w-6 h-6 text-gray-600" />
                </div>
              </div>
              <div className="text-2xl font-bold mb-1 text-gray-900">0</div>
              <div className="text-sm text-gray-600">Add New</div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <DialogTitle className="text-xl font-semibold">
                  Add New Department
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="grid grid-cols-1 gap-6 py-4"
            >
              {/* Left Column */}
              <div className="space-y-4">
                {/* Upload Icon */}
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full border-2 border-dashed border-green-primary flex items-center justify-center mx-auto mb-2 cursor-pointer hover:bg-blue-50">
                    {logoImage ? (
                      <div className="relative">
                        <img
                          src={logoImage}
                          alt="Hospital Logo"
                          className="w-full h-auto object-contain bg-white rounded-full"
                        />
                        <div className="absolute inset-0 bg-black rounded-full bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                            onClick={() => logoInputRef.current?.click()}
                            className="bg-green-primary text-white"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <Button
                          onClick={() => logoInputRef.current?.click()}
                          className=" text-white bg-transparent border-0"
                        >
                          <Plus className="w-6 h-6 text-green-primary hover:bg-green-200" />
                        </Button>
                      </div>
                    )}
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </div>
                  <p className="text-sm text-gray-600">Upload Icon Here</p>
                </div>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name*</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                          <Input
                            placeholder="Enter name"
                            className="pl-10"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="members"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select No of Members</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select No of Members" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="5">5 Members</SelectItem>
                          <SelectItem value="10">10 Members</SelectItem>
                          <SelectItem value="15">15 Members</SelectItem>
                          <SelectItem value="20">20 Members</SelectItem>
                          <SelectItem value="25">25 Members</SelectItem>
                          <SelectItem value="30">30 Members</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between pt-4">
                      <FormLabel>Status / Activation</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-[#388fe5]"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-green-primary hover:bg-green-primary"
                  disabled={loading}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add new
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DepartmentsPage;
