"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/hooks/useStore";

// Import the thunk from your new, dedicated slice
import { uploadProfilePicture } from "@/store/slices/profilePictureSlice";

// UI Components from shadcn/ui
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Icons from lucide-react
import { Upload, LogOut, FileDown, Trash2, CalendarPlus, Loader2, User, Settings, Shield, Calendar } from "lucide-react";

// Child components for other tabs
import SessionManagementWizard from "./session-management-wizard";
import EditHospitalProfile from "./EditHospitalProfile";
import SignaturePad from "./SignaturePad";
import toast from "react-hot-toast";
// import { toast } from "sonner"; // Example for toast notifications

interface SharedProfileProps {
  adminType: "Super Admin" | "Hospital Admin" | "Doctor" | "staff";
  userName?: string;
  userTitle?: string;
}

export default function SharedProfile({
  adminType,
  userName = "Dr. Robert Patel",
  userTitle = "Dr. Robert Patel",
}: SharedProfileProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();

  // Create a ref to programmatically click the hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Select state from the appropriate slices
  const user = useAppSelector((state) => state.auth);
  const { status: uploadStatus, error: uploadError } = useAppSelector((state) => state.profilePicture);

  // Derive the loading state from the profilePicture slice's status
  const isUploading = uploadStatus === 'loading';

  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("");

  function moveToConnect() {
    router.replace("/doctor/connect");
  }

  // This function is called by the button to trigger the file dialog
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // This function handles the file selection and dispatches the upload action
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Ensure the user role is permitted to upload
    if (adminType !== "Doctor" && adminType !== "staff") {
      // toast.error("Profile picture can only be updated by Doctors or Staff.");
      console.error("User does not have permission to upload.");
      return;
    }

    try {
      // Dispatch the thunk from the new slice and use .unwrap() to handle promises
      await dispatch(uploadProfilePicture({ file, adminType })).unwrap();
      // toast.success("Profile picture updated successfully!");
    } catch (error) {
      console.error("Upload failed:", error);
      // toast.error(`Upload failed: ${error}`);
    }
  };

  // Handle signature save (optional callback)
  const handleSignatureSave = (signatureData: string) => {
    console.log("Signature saved:", signatureData);
    // Signature is now handled by SignaturePad component
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-[#388fe5] rounded-xl shadow-lg">
            <Settings className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Settings
            </h1>
            <p className="text-sm text-gray-600 mt-1">Manage your profile and preferences</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md bg-white shadow-sm border border-gray-200">
          <TabsTrigger
            value="profile"
            className="data-[state=active]:bg-[#388fe5] data-[state=active]:text-white"
          >
            <User className="h-4 w-4 mr-2" />
            Profile & Account
          </TabsTrigger>
          {adminType === "Doctor" && (
            <TabsTrigger
              value="session-management"
              className="data-[state=active]:bg-[#388fe5] data-[state=active]:text-white"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Session Management
            </TabsTrigger>
          )}
          {adminType === "Hospital Admin" && (
            <TabsTrigger
              value="edit-profile"
              className="data-[state=active]:bg-[#388fe5] data-[state=active]:text-white"
            >
              Edit Profile
            </TabsTrigger>
          )}
        </TabsList>

        {/* =================================== */}
        {/* PROFILE TAB                         */}
        {/* =================================== */}
        <TabsContent value="profile" className="mt-6">
          <div className="grid gap-8">
            {/* --- Profile Picture Card --- */}
            {adminType == 'Doctor' || adminType === "staff" && <Card className="shadow-sm overflow-hidden">
              <div className="h-20 bg-gradient-to-r from-[#388fe5] to-[#6fb043]" />
              <CardContent className="-mt-10 pb-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
                    <AvatarImage src={user?.profile_picture_url || "/doctor-profile.png"} alt={userTitle} />
                    <AvatarFallback className="bg-[#388fe5] text-white text-2xl font-semibold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 text-center sm:text-left mt-4 sm:mt-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{userName}</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Update your avatar. A square image of 256x256px is recommended.
                    </p>

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept="image/png, image/jpeg, image/gif"
                      disabled={isUploading}
                    />

                    <Button
                      onClick={handleUploadClick}
                      disabled={isUploading}
                      className="bg-[#388fe5] hover:bg-[#6fb043] text-white"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload New Image
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            }
            {/* --- Account Actions Card --- */}
            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-[#388fe5]/10 to-transparent">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-[#388fe5] rounded-lg">
                    <Shield className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <CardTitle>Account Actions</CardTitle>
                    <CardDescription>
                      Manage your account settings, integrations, and data.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-6">
                {adminType === "Doctor" && (
                  <button
                    className="w-full flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-[#388fe5] hover:bg-[#388fe5]/5 transition-all group"
                    onClick={moveToConnect}
                  >
                    <div className="p-2 bg-[#388fe5]/10 rounded-lg group-hover:bg-[#388fe5] transition-colors">
                      <CalendarPlus className="w-5 h-5 text-[#388fe5] group-hover:text-white" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-medium text-gray-900">Connect Google Calendar</p>
                      <p className="text-sm text-gray-500">Sync your appointments</p>
                    </div>
                  </button>
                )}
                <button className="w-full flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all group">
                  <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-500 transition-colors">
                    <FileDown className="w-5 h-5 text-blue-600 group-hover:text-white" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-medium text-gray-900">Export My Data</p>
                    <p className="text-sm text-gray-500">Download your information</p>
                  </div>
                </button>
                <button className="w-full flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-all group">
                  <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-gray-300 transition-colors">
                    <LogOut className="w-5 h-5 text-gray-600 group-hover:text-gray-800" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-medium text-gray-900">Logout</p>
                    <p className="text-sm text-gray-500">Sign out of your account</p>
                  </div>
                </button>
              </CardContent>
            </Card>

            {/* --- Electronic Signature Card --- */}
            <SignaturePad
              onSave={handleSignatureSave}
            />

            {/* --- Danger Zone Card --- */}
            <Card className="border-2 border-red-200 shadow-sm bg-red-50/50">
              <CardHeader className="bg-gradient-to-r from-red-100 to-transparent">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-red-500 rounded-lg">
                    <Trash2 className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-red-700">Danger Zone</CardTitle>
                    <CardDescription className="text-red-600">
                      Proceed with caution
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-700">
                  Deleting your account is a permanent action that cannot be
                  undone. All your data will be removed from our servers.
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="destructive" className="bg-red-600 hover:bg-red-700">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete My Account
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        {adminType === "Hospital Admin" && (
          <TabsContent value="edit-profile" className="mt-6">
            <EditHospitalProfile />
          </TabsContent>
        )}

        {adminType === "Doctor" && (
          <TabsContent value="session-management" className="mt-6">
            <SessionManagementWizard />
          </TabsContent>
        )}

      </Tabs>
    </div>
  );
}