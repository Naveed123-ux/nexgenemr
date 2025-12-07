"use client";

import Image from "next/image";

interface AdminProfileCardProps {
  name: string;
  role: string;
  imageUrl?: string;
  onClick?: () => void;
}

export function AdminProfileCard({
  name,
  role,
  imageUrl,
  onClick,
}: AdminProfileCardProps) {
  return (
    <div
      className="flex flex-col items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="w-15 h-15 rounded-2xl overflow-hidden bg-gray-200 flex-shrink-0">
        {imageUrl ? (
          <Image
            src={imageUrl || "/placeholder.svg"}
            alt={name}
            width={40}
            height={40}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white font-medium">
            {name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-black text-center">{name}</p>
        <p className="text-[12px] text-[#0A0A0A] text-center">{role}</p>
      </div>
    </div>
  );
}
