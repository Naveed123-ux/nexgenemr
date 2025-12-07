import { Badge } from "./ui/badge";
import { Progress } from "@/components/ui/progress";

export function NotificationsPanel() {
  return (
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
    </div>
  );
}
