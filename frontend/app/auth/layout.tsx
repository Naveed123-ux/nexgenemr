import type React from "react";
import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center">
            <Image
              src="/nexgenlogo-removebg-preview.png"
              alt="nexgen Logo"
              width={200}
              height={60}
              priority
              className="h-auto"
            />
          </div>
          {/* <p className="text-gray-600 ">Electronic Medical Record</p> */}
        </div>
        {children}
      </div>
    </div>
  );
}
