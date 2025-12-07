import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MoreHorizontal } from "lucide-react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PatientRecords() {
  const staffData = [
    {
      name: "Jane Doe",
      intubated: "No",
      mobility: "IPA",
      incontinent: "Yes",
      alertOriented: "x 4",
      surgery: "Yes",
      isolation: "Droplet",
    },
    {
      name: "Jane Doe",
      intubated: "No",
      mobility: "IPA",
      incontinent: "Yes",
      alertOriented: "x 4",
      surgery: "Yes",
      isolation: "Droplet",
    },
    {
      name: "Jane Doe",
      intubated: "No",
      mobility: "IPA",
      incontinent: "Yes",
      alertOriented: "x 4",
      surgery: "Yes",
      isolation: "Droplet",
    },
    {
      name: "Jane Doe",
      intubated: "No",
      mobility: "IPA",
      incontinent: "Yes",
      alertOriented: "x 4",
      surgery: "Yes",
      isolation: "Droplet",
    },
    {
      name: "Jane Doe",
      intubated: "No",
      mobility: "IPA",
      incontinent: "Yes",
      alertOriented: "x 4",
      surgery: "Yes",
      isolation: "Droplet",
    },
    {
      name: "Jane Doe",
      intubated: "No",
      mobility: "IPA",
      incontinent: "Yes",
      alertOriented: "x 4",
      surgery: "Yes",
      isolation: "Droplet",
    },
    {
      name: "Jane Doe",
      intubated: "No",
      mobility: "IPA",
      incontinent: "Yes",
      alertOriented: "x 4",
      surgery: "Yes",
      isolation: "Droplet",
    },
    {
      name: "Jane Doe",
      intubated: "No",
      mobility: "IPA",
      incontinent: "Yes",
      alertOriented: "x 4",
      surgery: "Yes",
      isolation: "Droplet",
    },
  ];

  const staffSummary = [
    { title: "Nurses", count: 8 },
    { title: "Techs", count: 4 },
    { title: "Provider", count: 2 },
    { title: "Social Worker", count: 2 },
    { title: "Therapy", count: 3 },
    { title: "EVS", count: 3 },
  ];

  return (
    <div className="space-y-6">
      {/* Hospital Staff Table */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Patients List</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">
                  Name
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">
                  Intubated
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">
                  Mobility
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">
                  Incontinent
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">
                  Alert Oriented
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">
                  Surgery
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">
                  Isolation
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">
                  Score
                </th>
              </tr>
            </thead>
            <tbody>
              {staffData.map((staff, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-3 px-4 text-gray-900">{staff.name}</td>
                  <td className="py-3 px-4 text-gray-600">{staff.intubated}</td>
                  <td className="py-3 px-4 text-gray-600">{staff.mobility}</td>
                  <td className="py-3 px-4 text-gray-600">
                    {staff.incontinent}
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    {staff.alertOriented}
                  </td>
                  <td className="py-3 px-4 text-gray-600">{staff.surgery}</td>
                  <td className="py-3 px-4 text-gray-600">{staff.isolation}</td>
                  <td className="py-3 px-4">
                    <Dialog>
                      <form>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            className="w-8 h-8 rounded-full bg-green-primary hover:bg-green-700"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Edit profile</DialogTitle>
                            <DialogDescription>
                              Make changes to your profile here. Click save when
                              you&apos;re done.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4">
                            <div className="grid gap-3">
                              <Label htmlFor="name-1">Name</Label>
                              <Input
                                id="name-1"
                                name="name"
                                defaultValue="Pedro Duarte"
                              />
                            </div>
                            <div className="grid gap-3">
                              <Label htmlFor="username-1">Username</Label>
                              <Input
                                id="username-1"
                                name="username"
                                defaultValue="@peduarte"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button type="submit">Save changes</Button>
                          </DialogFooter>
                        </DialogContent>
                      </form>
                    </Dialog>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Staff Summary Cards */}
    </div>
  );
}
