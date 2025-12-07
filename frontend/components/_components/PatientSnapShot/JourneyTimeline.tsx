"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Stethoscope, Calendar, User, FileText, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Types specific to this component
interface SoapNote {
  subjective: string; objective: string; assessment: string; plan: string;
}
interface JourneyItem {
  appointment_id: number; date: string; doctor_name: string; reason_for_visit: string; soap_note: SoapNote | null;
}

export const JourneyTimeline = ({ journey }: { journey: JourneyItem[] }) => (
  <Card className="shadow-sm">
    <CardHeader className="bg-gradient-to-r from-[#388fe5]/10 to-transparent">
      <div className="flex items-center gap-2">
        <div className="p-2 bg-[#388fe5] rounded-lg">
          <ClipboardList className="h-5 w-5 text-white" />
        </div>
        <div>
          <CardTitle className="text-xl">Patient Journey</CardTitle>
          <CardDescription>Complete timeline of appointments and clinical notes</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="pt-6">
      {journey.length > 0 ? (
        <div className="relative border-l-2 border-[#388fe5]/30 pl-8 space-y-6">
          {journey.map((item, index) => (
            <div key={item.appointment_id} className="relative group">
              {/* Timeline dot */}
              <div className="absolute -left-[37px] top-2 h-6 w-6 rounded-full bg-[#388fe5] border-4 border-white shadow-md flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-white" />
              </div>

              {/* Connecting line for next item */}
              {index < journey.length - 1 && (
                <div className="absolute -left-[33px] top-8 bottom-0 w-0.5 bg-gradient-to-b from-[#388fe5]/30 to-transparent" />
              )}

              {/* Content Card */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-[#388fe5]" />
                      <p className="text-sm font-medium text-gray-600">
                        {new Date(item.date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric"
                        })}
                      </p>
                    </div>
                    <h3 className="font-semibold text-lg text-gray-900 mb-1">
                      {item.reason_for_visit}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="h-3.5 w-3.5" />
                      <span>Dr. {item.doctor_name}</span>
                    </div>
                  </div>
                  {item.soap_note && (
                    <Badge className="bg-[#388fe5] hover:bg-[#6fb043]">
                      <FileText className="h-3 w-3 mr-1" />
                      SOAP Note
                    </Badge>
                  )}
                </div>

                {/* SOAP Note Accordion */}
                {item.soap_note && (
                  <Accordion type="single" collapsible className="w-full mt-3">
                    <AccordionItem value={`item-${index}`} className="border-none">
                      <AccordionTrigger className="text-sm font-medium hover:no-underline py-2 px-3 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors">
                        <div className="flex items-center gap-2">
                          <Stethoscope className="h-4 w-4 text-[#388fe5]" />
                          <span>View Clinical Notes</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-3">
                        <div className="space-y-3 bg-gradient-to-br from-gray-50 to-white p-4 rounded-lg border border-gray-200">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="h-1.5 w-1.5 rounded-full bg-[#388fe5]" />
                              <strong className="font-semibold text-sm text-gray-700">Subjective</strong>
                            </div>
                            <p className="text-sm text-gray-600 pl-4">{item.soap_note.subjective}</p>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="h-1.5 w-1.5 rounded-full bg-[#388fe5]" />
                              <strong className="font-semibold text-sm text-gray-700">Objective</strong>
                            </div>
                            <p className="text-sm text-gray-600 pl-4">{item.soap_note.objective}</p>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="h-1.5 w-1.5 rounded-full bg-[#388fe5]" />
                              <strong className="font-semibold text-sm text-gray-700">Assessment</strong>
                            </div>
                            <p className="text-sm text-gray-600 pl-4">{item.soap_note.assessment}</p>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="h-1.5 w-1.5 rounded-full bg-[#388fe5]" />
                              <strong className="font-semibold text-sm text-gray-700">Plan</strong>
                            </div>
                            <p className="text-sm text-gray-600 pl-4">{item.soap_note.plan}</p>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No journey items found</p>
          <p className="text-xs text-gray-400 mt-1">Appointments will appear here</p>
        </div>
      )}
    </CardContent>
  </Card>
);