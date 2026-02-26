"use client";

import { connectGoogle, disconnectGoogle } from "@/app/_apis/doctor/doctor";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchDoctorInfo } from "@/store/slices/authSlice";

export default function GoogleMeet() {
  const dispatch = useAppDispatch();
  const { is_google_connected } = useAppSelector((state) => state.auth);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === "google-auth-success") {
        toast.success("Google Calendar connected successfully!");
        dispatch(fetchDoctorInfo());
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [dispatch]);

  const connectMeet = async () => {
    setLoading(true);
    try {
      const response = await connectGoogle();
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      window.open(
        response?.authorization_url,
        "_blank",
        `width=${width},height=${height},top=${top},left=${left},resizable,scrollbars`
      );
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message || "error connecting");
      } else {
        toast.error("error connecting google");
      }
    } finally {
      setLoading(false);
    }
  };

  const disconnectMeet = async () => {
    setLoading(true);
    try {
      await disconnectGoogle();
      toast.success("Google account disconnected successfully!");
      dispatch(fetchDoctorInfo());
    } catch (error) {
      toast.error("Failed to disconnect Google account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-0 py-4">
      <div className="bg-white rounded-lg border p-8 w-full min-h-[80vh]">
        <h1 className="text-2xl mt-2 sm:mb-6 mb-2 font-semibold text-gray-900 ">
          Profile
        </h1>
        <div className="min-h-[200px] pb-3 ">
          <div className="flex items-center gap-2">
            <Image
              width={60}
              height={60}
              src={"/meetImage.png"}
              alt="meetImage"
            />
            <div className="flex flex-col gap-2">
              <div className="text-[1rem] text-gray-900 font-medium">
                Connect Your Google Calendar{" "}
              </div>
              <div className="text-sm text-gray-500 ">
                Connect your Google Calendar to automatically create Google Meet
                links for your virtual appointments.
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-3 gap-3">
            {is_google_connected && (
              <Button
                type="button"
                variant="destructive"
                className="px-5 py-2 rounded-sm tracking-wider"
                onClick={() => disconnectMeet()}
                disabled={loading}
              >
                Disconnect
              </Button>
            )}
            <Button
              type="button"
              className={`px-5 py-2 rounded-sm tracking-wider cursor-pointer ${is_google_connected
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-green-primary hover:bg-green-primary"
                } text-white`}
              onClick={() => connectMeet()}
              disabled={loading}
            >
              {is_google_connected ? "Reconnect" : "Connect with Google"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
