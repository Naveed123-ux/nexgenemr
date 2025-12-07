"use client";

import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import {
  createSessionPattern,
  fetchSessionPatterns,
  deleteSessionPattern,
  clearCreateStatus,
  SimpleSession,
  AdvancedSession,
  RecurrenceConfig,
} from "@/store/slices/sessionsSlice";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Clock,
  Trash2,
  Loader2,
  MapPin,
  Video,
  CheckCircle2,
  AlertCircle,
  Info
} from "lucide-react";
import toast from "react-hot-toast";
import { InfinitySpin } from "react-loader-spinner";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const daysOfWeek = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const shortDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const weekOptions = ["first", "second", "third", "fourth", "last"] as const;

// Recurrence type for UI
type RecurrenceType = "daily" | "weekly" | "monthly-date" | "monthly-weekday";

export default function ManageAvailability() {
  const dispatch = useDispatch<AppDispatch>();
  const { patterns, status, createStatus, deleteStatus, error } = useSelector(
    (state: RootState) => state.sessions
  );

  // Simple Mode State
  const [simpleSession, setSimpleSession] = useState<Partial<SimpleSession>>({
    name: "",
    day_of_week: "Monday",
    start_time: "09:00",
    end_time: "17:00",
    session_type: "on_site",
    duration_weeks: 8,
  });

  // Advanced Mode State
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>("weekly");
  const [advancedName, setAdvancedName] = useState("");
  const [advancedSessionType, setAdvancedSessionType] = useState<"on_site" | "off_site">("on_site");
  const [advancedStartTime, setAdvancedStartTime] = useState("09:00");
  const [advancedEndTime, setAdvancedEndTime] = useState("17:00");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");

  // Weekly specific
  const [selectedDays, setSelectedDays] = useState<string[]>(["Mon"]);

  // Monthly date specific
  const [monthDays, setMonthDays] = useState<number[]>([1]);
  const [monthDaysInput, setMonthDaysInput] = useState("1");

  // Monthly week/day specific
  const [week, setWeek] = useState<"first" | "second" | "third" | "fourth" | "last">("first");
  const [weekDay, setWeekDay] = useState("Mon");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [patternToDelete, setPatternToDelete] = useState<string | null>(null);

  // Fetch patterns on mount
  useEffect(() => {
    dispatch(fetchSessionPatterns());
  }, [dispatch]);

  // Handle create success
  useEffect(() => {
    if (createStatus === "succeeded") {
      toast.success("Session pattern created successfully!");
      dispatch(clearCreateStatus());
      // Reset forms
      resetAdvancedForm();
      setSimpleSession({
        name: "",
        day_of_week: "Monday",
        start_time: "09:00",
        end_time: "17:00",
        session_type: "on_site",
        duration_weeks: 8,
      });
    } else if (createStatus === "failed") {
      toast.error(error || "Failed to create session pattern");
    }
  }, [createStatus, error, dispatch]);

  const resetAdvancedForm = () => {
    setAdvancedName("");
    setAdvancedSessionType("on_site");
    setAdvancedStartTime("09:00");
    setAdvancedEndTime("17:00");
    setStartDate(new Date().toISOString().split("T")[0]);
    setEndDate("");
    setSelectedDays(["Mon"]);
    setMonthDays([1]);
    setMonthDaysInput("1");
    setWeek("first");
    setWeekDay("Mon");
  };

  const buildRecurrenceConfig = (): RecurrenceConfig => {
    const baseConfig = {
      start_date: startDate,
      end_date: endDate || null,
    };

    switch (recurrenceType) {
      case "daily":
        return {
          ...baseConfig,
          duration: "daily",
          selected_option: "on_day",
          selected_days: null,
          month_days: null,
          week: null,
          week_day: null,
        };

      case "weekly":
        return {
          ...baseConfig,
          duration: "weekly",
          selected_option: "on_day",
          selected_days: selectedDays,
          month_days: null,
          week: null,
          week_day: null,
        };

      case "monthly-date":
        return {
          ...baseConfig,
          duration: "monthly",
          selected_option: "on_date",
          selected_days: null,
          month_days: monthDays,
          week: null,
          week_day: null,
        };

      case "monthly-weekday":
        return {
          ...baseConfig,
          duration: "monthly",
          selected_option: "on_day",
          selected_days: null,
          month_days: null,
          week: week,
          week_day: weekDay,
        };

      default:
        throw new Error("Invalid recurrence type");
    }
  };

  const handleCreateSimpleSession = () => {
    if (!simpleSession.name || !simpleSession.day_of_week || !simpleSession.start_time || !simpleSession.end_time) {
      toast.error("Please fill all required fields");
      return;
    }

    if (simpleSession.start_time! >= simpleSession.end_time!) {
      toast.error("End time must be after start time");
      return;
    }

    dispatch(
      createSessionPattern({
        is_recurring: false,
        simple_session: simpleSession as SimpleSession,
      })
    );
  };

  const handleCreateAdvancedSession = () => {
    if (!advancedName || !advancedStartTime || !advancedEndTime) {
      toast.error("Please fill all required fields");
      return;
    }

    if (advancedStartTime >= advancedEndTime) {
      toast.error("End time must be after start time");
      return;
    }

    if (!startDate) {
      toast.error("Please select a start date");
      return;
    }

    // Validate based on recurrence type
    if (recurrenceType === "weekly" && selectedDays.length === 0) {
      toast.error("Please select at least one day for weekly recurrence");
      return;
    }

    if (recurrenceType === "monthly-date" && monthDays.length === 0) {
      toast.error("Please select at least one date for monthly recurrence");
      return;
    }

    const recurrenceConfig = buildRecurrenceConfig();

    dispatch(
      createSessionPattern({
        is_recurring: true,
        advanced_session: {
          name: advancedName,
          session_type: advancedSessionType,
          start_time_of_day: advancedStartTime,
          end_time_of_day: advancedEndTime,
          recurrence_config: recurrenceConfig,
        } as AdvancedSession,
      })
    );
  };

  const handleDeletePattern = (recurrenceGroupId: string) => {
    setPatternToDelete(recurrenceGroupId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (patternToDelete) {
      toast.promise(
        dispatch(deleteSessionPattern(patternToDelete)).unwrap(),
        {
          loading: "Deleting pattern...",
          success: "Pattern deleted successfully!",
          error: "Failed to delete pattern",
        }
      );
    }
    setDeleteDialogOpen(false);
    setPatternToDelete(null);
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleMonthDaysChange = (value: string) => {
    setMonthDaysInput(value);
    const days = value
      .split(",")
      .map((d) => parseInt(d.trim(), 10))
      .filter((d) => !isNaN(d) && d >= 1 && d <= 31);
    setMonthDays(days);
  };

  if (status === "loading" && patterns.length === 0) {
    return (
      <div className="flex justify-center p-10">
        <InfinitySpin color="#388fe5" />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {/* Create Session Pattern Card */}
      <Card className="shadow-sm">
        <CardHeader className="bg-gradient-to-r from-[#388fe5]/10 to-transparent">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#388fe5] rounded-lg">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <CardTitle>Create Availability Pattern</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs defaultValue="simple" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="simple">Simple Weekly</TabsTrigger>
              <TabsTrigger value="advanced">Advanced Pattern</TabsTrigger>
            </TabsList>

            {/* Simple Weekly Tab */}
            <TabsContent value="simple" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="simple-name">Pattern Name</Label>
                  <Input
                    id="simple-name"
                    placeholder="e.g., Monday Morning Clinic"
                    value={simpleSession.name}
                    onChange={(e) =>
                      setSimpleSession({ ...simpleSession, name: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="simple-day">Day of Week</Label>
                  <Select
                    value={simpleSession.day_of_week}
                    onValueChange={(value) =>
                      setSimpleSession({ ...simpleSession, day_of_week: value })
                    }
                  >
                    <SelectTrigger id="simple-day">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {daysOfWeek.map((day) => (
                        <SelectItem key={day} value={day}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="simple-type">Session Type</Label>
                  <Select
                    value={simpleSession.session_type}
                    onValueChange={(value: "on_site" | "off_site") =>
                      setSimpleSession({ ...simpleSession, session_type: value })
                    }
                  >
                    <SelectTrigger id="simple-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="on_site">On-Site</SelectItem>
                      <SelectItem value="off_site">Off-Site (Telemedicine)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="simple-start">Start Time</Label>
                  <Input
                    id="simple-start"
                    type="time"
                    value={simpleSession.start_time}
                    onChange={(e) =>
                      setSimpleSession({ ...simpleSession, start_time: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="simple-end">End Time</Label>
                  <Input
                    id="simple-end"
                    type="time"
                    value={simpleSession.end_time}
                    onChange={(e) =>
                      setSimpleSession({ ...simpleSession, end_time: e.target.value })
                    }
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="simple-weeks">Duration (weeks)</Label>
                  <Input
                    id="simple-weeks"
                    type="number"
                    min="1"
                    max="52"
                    value={simpleSession.duration_weeks}
                    onChange={(e) =>
                      setSimpleSession({
                        ...simpleSession,
                        duration_weeks: parseInt(e.target.value, 10),
                      })
                    }
                  />
                </div>
              </div>

              <Button
                onClick={handleCreateSimpleSession}
                disabled={createStatus === "loading"}
                className="w-full bg-[#388fe5] hover:bg-[#6fb043] text-white"
              >
                {createStatus === "loading" ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Simple Pattern"
                )}
              </Button>
            </TabsContent>

            {/* Advanced Pattern Tab */}
            <TabsContent value="advanced" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="adv-name">Pattern Name</Label>
                  <Input
                    id="adv-name"
                    placeholder="e.g., MWF Clinic Hours"
                    value={advancedName}
                    onChange={(e) => setAdvancedName(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="adv-type">Session Type</Label>
                  <Select
                    value={advancedSessionType}
                    onValueChange={(value: "on_site" | "off_site") =>
                      setAdvancedSessionType(value)
                    }
                  >
                    <SelectTrigger id="adv-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="on_site">On-Site</SelectItem>
                      <SelectItem value="off_site">Off-Site (Telemedicine)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="recurrence-type">Recurrence Type</Label>
                  <Select
                    value={recurrenceType}
                    onValueChange={(value: RecurrenceType) => setRecurrenceType(value)}
                  >
                    <SelectTrigger id="recurrence-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Every Day</SelectItem>
                      <SelectItem value="weekly">Specific Days of Week</SelectItem>
                      <SelectItem value="monthly-date">Specific Dates of Month</SelectItem>
                      <SelectItem value="monthly-weekday">Specific Week/Day of Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="adv-start-time">Start Time</Label>
                  <Input
                    id="adv-start-time"
                    type="time"
                    value={advancedStartTime}
                    onChange={(e) => setAdvancedStartTime(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="adv-end-time">End Time</Label>
                  <Input
                    id="adv-end-time"
                    type="time"
                    value={advancedEndTime}
                    onChange={(e) => setAdvancedEndTime(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="adv-start-date">Start Date</Label>
                  <Input
                    id="adv-start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="adv-end-date">End Date (Optional)</Label>
                  <Input
                    id="adv-end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>

                {/* Conditional Fields Based on Recurrence Type */}
                {recurrenceType === "daily" && (
                  <div className="md:col-span-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start gap-2">
                      <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Daily Recurrence</p>
                        <p className="text-sm text-blue-700">
                          Sessions will be created for every day between the start and end dates.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {recurrenceType === "weekly" && (
                  <div className="md:col-span-2">
                    <Label>Select Days of Week</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {shortDays.map((day) => (
                        <Button
                          key={day}
                          type="button"
                          variant={selectedDays.includes(day) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleDay(day)}
                          className={
                            selectedDays.includes(day)
                              ? "bg-[#388fe5] hover:bg-[#6fb043]"
                              : ""
                          }
                        >
                          {day}
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Selected: {selectedDays.length > 0 ? selectedDays.join(", ") : "None"}
                    </p>
                  </div>
                )}

                {recurrenceType === "monthly-date" && (
                  <div className="md:col-span-2">
                    <Label htmlFor="month-days">Dates of Month (comma-separated)</Label>
                    <Input
                      id="month-days"
                      placeholder="e.g., 1, 15, 30"
                      value={monthDaysInput}
                      onChange={(e) => handleMonthDaysChange(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter dates between 1-31, separated by commas. Example: 1, 15
                    </p>
                    {monthDays.length > 0 && (
                      <p className="text-xs text-[#388fe5] mt-1">
                        ✓ Selected dates: {monthDays.join(", ")}
                      </p>
                    )}
                  </div>
                )}

                {recurrenceType === "monthly-weekday" && (
                  <>
                    <div>
                      <Label htmlFor="week-select">Week of Month</Label>
                      <Select
                        value={week}
                        onValueChange={(value: typeof week) => setWeek(value)}
                      >
                        <SelectTrigger id="week-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="first">First</SelectItem>
                          <SelectItem value="second">Second</SelectItem>
                          <SelectItem value="third">Third</SelectItem>
                          <SelectItem value="fourth">Fourth</SelectItem>
                          <SelectItem value="last">Last</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="weekday-select">Day of Week</Label>
                      <Select
                        value={weekDay}
                        onValueChange={(value) => setWeekDay(value)}
                      >
                        <SelectTrigger id="weekday-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {shortDays.map((day) => (
                            <SelectItem key={day} value={day}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="md:col-span-2 p-3 bg-blue-50 rounded border border-blue-200">
                      <p className="text-sm text-blue-900">
                        <strong>Pattern:</strong> {week.charAt(0).toUpperCase() + week.slice(1)} {weekDay} of every month
                      </p>
                    </div>
                  </>
                )}
              </div>

              <Button
                onClick={handleCreateAdvancedSession}
                disabled={createStatus === "loading"}
                className="w-full bg-[#388fe5] hover:bg-[#6fb043] text-white"
              >
                {createStatus === "loading" ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Advanced Pattern"
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Your Patterns Card */}
      <Card className="shadow-sm">
        <CardHeader className="bg-gradient-to-r from-[#388fe5]/10 to-transparent">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#388fe5] rounded-lg">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <CardTitle>Your Availability Patterns</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {patterns.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>No availability patterns created yet.</p>
              <p className="text-sm">Create your first pattern above to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {patterns.map((pattern) => (
                <div
                  key={pattern.recurrence_group_id}
                  className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-[#388fe5] hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-2 bg-[#388fe5]/10 rounded-lg">
                      {pattern.session_type === "on_site" ? (
                        <MapPin className="h-5 w-5 text-[#388fe5]" />
                      ) : (
                        <Video className="h-5 w-5 text-[#388fe5]" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{pattern.name}</h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {pattern.start_time_of_day} - {pattern.end_time_of_day}
                        </span>
                        <Badge
                          variant="secondary"
                          className={
                            pattern.session_type === "on_site"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-purple-100 text-purple-700"
                          }
                        >
                          {pattern.session_type === "on_site" ? "On-Site" : "Telemedicine"}
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          {pattern.sessions_generated_count} sessions
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeletePattern(pattern.recurrence_group_id)}
                    disabled={deleteStatus === "loading"}
                    className="hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Availability Pattern?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this pattern and all associated sessions.
              Patients will no longer be able to book appointments for these times.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete Pattern
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
