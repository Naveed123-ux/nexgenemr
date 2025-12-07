import { MessageCircle } from "lucide-react";
import { Badge } from "./ui/badge";
import { Chat } from "./svgs/svg";

const contacts = [
  { name: "John Doe", role: "SPINE SURGEON", status: "online" },
  { name: "Rajesh", role: "DR", status: "online" },
  { name: "Jacob Ryan", role: "NEURO SURGEON", status: "online" },
  { name: "Kehn Anderson", role: "PHARMACY", status: "offline" },
  { name: "Sarah Smith", role: "", status: "offline" },
];

export function ChatPanel() {
  return (
    <div className="  w-full bg-card shadow-sm py-6 border-l max-h-[400px] overflow-y-auto rounded-2xl">
      <div className="flex items-center justify-center mb-6 ">
        <Chat />
        <h3 className="font-medium text-gray-500 relative">
          Chat
          <Badge className="h-5 min-w-5 bg-mix-pink rounded-full px-1 font-mono tabular-nums absolute -top-[10px] -right-[10px]">
            8
          </Badge>
        </h3>
      </div>

      <div className="text-sm font-bold bg-gray-100 text-gray-600 mb-4 py-2  w-full text-center">
        ONLINE
      </div>

      <div className="space-y-3 ">
        {contacts.map((contact, index) => (
          <>
            <div
              key={index}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              <div className="relative">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-xs font-semibold text-gray-600">
                    {contact.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </span>
                </div>
                {contact.status === "online" && (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {contact.name}
                </p>
                {contact.role && (
                  <p className="text-xs text-gray-500 truncate">
                    {contact.role}
                  </p>
                )}
              </div>
              {contact.name === "Kehn Anderson" && (
                <Badge className="h-5 min-w-5 bg-mix-pink rounded-full px-1 font-mono tabular-nums ">
                  8
                </Badge>
              )}
            </div>
            <hr className="border-t border-gray-200" />
          </>
        ))}
      </div>
    </div>
  );
}
<div className="w-full bg-card shadow-sm p-6 border-l max-h-[400px] overflow-y-auto rounded-2xl">
  <div className="flex items-center justify-center mb-6 ">
    <h3 className="font-medium text-gray-500 relative">
      NOTIFICATIONS
      <Badge className="h-5 min-w-5 bg-mix-pink rounded-full px-1 font-mono tabular-nums absolute -top-[10px] -right-[10px]">
        8
      </Badge>
    </h3>
  </div>
  <div className="w-full bg-gray-200 rounded-full h-1 mt-4 mb-2">
    <div
      className="bg-[#060BBB] h-1 rounded-full"
      style={{ width: "75%" }}
    ></div>
  </div>

  <div className="space-y-4">
    {[1, 2, 3, 4, 5].map((num) => (
      <div key={num} className="border-b pb-2">
        <p className="font-medium text-gray-500 mb-1">Notification {num}</p>
        <p className="text-[12px]  text-gray-500 mb-2">DETAILS...</p>
      </div>
    ))}
  </div>
</div>;
