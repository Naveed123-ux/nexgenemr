'use client'
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, User, Info } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { useState } from 'react'

import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils' // Make sure you have this utility from Shadcn

function DetailItem({ label, value }: { label: string, value: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  )
}
const encountersData = [
  {
    id: 'enc-001',
    patientName: 'Sarah Johnson',
    patientId: 'PAT-12345',
    date: '2025-09-26',
    provider: 'Dr. Smith',
    diagnosis: 'Hypertension',
    status: 'Completed',
    insurance: 'Blue Cross Blue Shield',
    copay: 25,
    procedures: ['Office Visit', 'Blood Pressure Check'],
  },
  {
    id: 'enc-002',
    patientName: 'Michael Brown',
    patientId: 'PAT-67890',
    date: '2025-09-25',
    provider: 'Dr. Johnson',
    diagnosis: 'Annual Physical',
    status: 'In Progress',
    insurance: 'Aetna',
    copay: 30,
    procedures: ['Physical Exam', 'Lab Work'],
  },
]
export default function PracticeManagementWorkflow() {
  const completedSteps = 3;
  const totalSteps = 6;
  const progressPercentage = (completedSteps / totalSteps) * 100;
  const [selectedEncounterId, setSelectedEncounterId] = useState(encountersData[0].id)
  const selectedEncounter = encountersData.find((e) => e.id === selectedEncounterId)


  return (
    <div className="min-h-screen bg-gray-50 mt-12">
      {/* Header Navigation */}
      <header>
        <div className=" mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <button className="text-sm font-medium text-foreground border-b-2 border-foreground pb-4">
                Practice Management
              </button>
              <button className="text-sm font-medium text-muted-foreground pb-4">
                Dashboard
              </button>
            </div>
            <Button variant="outline" size="sm">
              Manage Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className=" mx-auto px-6 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-semibold text-foreground">
              Practice Management Workflow
            </h1>
            <span className="text-sm text-muted-foreground">
              Last edited: 20 Dec 2023
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            EMR/EHR Revenue Cycle Management - From Encounter to Payment
            Collection
          </p>
        </div>

        {/* Workflow Progress Card */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-medium text-foreground">
              Workflow Progress
            </h2>
            <span className="text-sm text-muted-foreground">
              {completedSteps} of {totalSteps} Completed
            </span>
          </div>
          <div className="space-y-2 mt-16 mb-5">
            <Progress value={progressPercentage} className="h-2" />
            <p className="text-sm text-muted-foreground">
              {progressPercentage}% Completed
            </p>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs className="mb-6" defaultValue="workflow">

          <TabsList className="flex items-center gap-0 bg-gray-200 rounded-full p-0.5 w-full mb-6">
            <TabsTrigger className="flex-1 py-1.5 rounded-full data-[state=active]:bg-[#388fe5] text-black text-sm font-medium transition-colors" value="workflow">Workflow View</TabsTrigger>
            <TabsTrigger className="flex-1 py-1.5 rounded-full data-[state=active]:bg-[#388fe5] bg-transparent text-black text-sm font-medium transition-colors hover:bg-gray-300" value="encounter">Encounters</TabsTrigger>
          </TabsList>


          {/* Workflow Content */}
          <TabsContent value="workflow">


            <div className="space-y-6">
              {/* Patient Visit Card */}
              <Card className="p-6 relative">
                <Badge className="absolute top-6 right-6 bg-[#00C951] hover:bg-green-600 text-white">
                  Completed
                </Badge>

                <div className="flex items-start gap-4 mb-6">
                  <div className="p-2 rounded-full border-2 border-gray-200">
                    <User className="w-5 h-5 text-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-foreground">
                        Patient Visit / Service Rendered
                      </h3>
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Encounter Created in EMR with clinical documentation
                    </p>
                  </div>
                </div>

                <div className="space-y-3 ml-14">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#00C950] flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">
                      Patient check-in completed
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#00C950] flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">
                      Clinical notes documented
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#00C950] flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">
                      Provider assessment recorded
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#00C950] flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">
                      Treatment plan established
                    </span>
                  </div>
                </div>
              </Card>

              {/* Claims Management Card */}
              <Card className="p-6 relative border-[#3700FF]">
                <Badge className="absolute top-6 right-6 bg-[#00C951] hover:bg-green-600 text-white">
                  Completed
                </Badge>

                <div className="flex items-start gap-4 mb-6">
                  <div className="p-2 rounded-full border-2 border-gray-200">
                    <User className="w-5 h-5 text-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-foreground">
                        Claims Management
                      </h3>
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Claim generated and submitted to clearinghouse
                    </p>
                  </div>
                </div>

                <div className="space-y-3 ml-14">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">
                      Claim generated from coded encounter
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">
                      Scrubber validation passed
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">
                      Submitted to clearinghouse
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">
                      Awaiting payer response
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="encounter">
            <div className="bg-slate-50 p-4 sm:p-6 md:p-8">
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5">
                {/* Left Column */}
                <div className="lg:col-span-2">
                  <Card className="h-full w-full">
                    <CardHeader>
                      <CardTitle>Active Encounters</CardTitle>
                      <CardDescription>Select an encounter to view workflow details</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {encountersData.map((encounter) => (
                          <div
                            key={encounter.id}
                            onClick={() => setSelectedEncounterId(encounter.id)}
                            className={cn(
                              'cursor-pointer rounded-lg border p-4 transition-all duration-200',
                              selectedEncounterId === encounter.id
                                ? 'border-green-400 bg-[#FEFFEF] shadow-sm'
                                : 'border-slate-200 bg-white hover:bg-slate-50'
                            )}
                          >
                            <div className="flex items-start justify-between">
                              <h3 className="font-semibold text-foreground">{encounter.patientName}</h3>
                              <Badge
                                variant={encounter.status === 'Completed' ? 'default' : 'secondary'}
                                className={cn(
                                  encounter.status === 'Completed' &&
                                  'border-green-600/20 bg-[#388fe5] text-white'
                                )}
                              >
                                {encounter.status}
                              </Badge>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                              ID: {encounter.id} | Date: {encounter.date}
                            </p>
                            <p className="text-sm text-muted-foreground">Provider: {encounter.provider}</p>
                            <p className="text-sm text-muted-foreground">Diagnosis: {encounter.diagnosis}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-3">
                  <Card className="h-full w-full">
                    <CardHeader>
                      <CardTitle>Encounter Details</CardTitle>
                      <CardDescription>
                        {selectedEncounter?.patientName} - {selectedEncounter?.id.toUpperCase()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                        <DetailItem label="Patient ID" value={selectedEncounter?.patientId || ""} />
                        <DetailItem label="Date of Service" value={selectedEncounter?.date || ""} />
                        <DetailItem label="Provider" value={selectedEncounter?.provider || ""} />
                        <DetailItem label="Insurance" value={selectedEncounter?.insurance || ""} />
                        <DetailItem label="Diagnosis" value={selectedEncounter?.diagnosis || ""} />
                        <DetailItem label="Copay" value={`$${selectedEncounter?.copay}`} />
                      </div>

                      <div className="mt-6">
                        <h4 className="text-sm text-muted-foreground">Procedures</h4>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selectedEncounter?.procedures.map((proc) => (
                            <Badge key={proc} variant="secondary">
                              {proc}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="mt-6">
                        <h4 className="text-sm text-muted-foreground">Quick Actions</h4>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button variant="outline">View Claim</Button>
                          <Button variant="outline">Check Eligibility</Button>
                          <Button variant="outline">Post Payment</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs >
      </main>
    </div>
  );
}
