"use client";
import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Phone,
  Clock,
  Search,
  Mic,
  StopCircle,
  Trash2,
  Send,
  Upload,
  Copy,
} from "lucide-react";
import Image from "next/image";
import MicRecorder from "mic-recorder-to-mp3";

import { useSelector, useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { RootState, AppDispatch } from "@/store/store";
import { useRouter } from "next/navigation";
import {
  generateSoapNoteFromText,
  generateSoapNoteFromAudio,
  resetSoapNote,
} from "@/store/slices/soapSlice";

export default function SoapNotes() {
  const dispatch = useDispatch<AppDispatch>();
  const [recorder, setRecorder] = useState<MicRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("Inactive");
  const [mp3Blob, setMp3Blob] = useState<Blob | null>(null);
  const [view, setView] = useState<"transcript" | "structured">("structured");
  const router = useRouter();
  const [transcriptText, setTranscriptText] = useState("");

  // Redux selectors
  const appInfo = useSelector(
    (state: RootState) => state.patient.singlePatient
  );
  const { generatedSoapNote, loading } = useSelector(
    (state: RootState) => state.soap
  );

  // New state for file upload
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New state for context highlighting view
  const [currentView, setCurrentView] = useState<
    "soap" | "contextHighlighting"
  >("soap");
  const [noteViewMode, setNoteViewMode] = useState<"full" | "critical">("full");

  // Redirect if no patient
  useEffect(() => {
    if (!appInfo) {
      toast.error("Please select an Appointment first");
      router.push("/doctor/appointments");
    }
  }, [appInfo, router]);

  // Initialize recorder
  useEffect(() => {
    const newRecorder = new MicRecorder({ bitRate: 128 });
    setRecorder(newRecorder);

    // Cleanup on unmount
    return () => {
      dispatch(resetSoapNote());
    };
  }, [dispatch]);

  // Update transcript and switch to structured view when SOAP note is generated
  useEffect(() => {
    if (generatedSoapNote?.transcript) {
      setTranscriptText(generatedSoapNote.transcript);
    }
    if (generatedSoapNote?.soap_note) {
      // Automatically switch to structured view when SOAP note is available
      setView("structured");
    }
  }, [generatedSoapNote]);

  // Start recording
  const startRecording = () => {
    if (uploadedFile) {
      toast.error("Please clear the uploaded file before recording.");
      return;
    }
    if (recorder) {
      recorder
        .start()
        .then(() => {
          setIsRecording(true);
          setStatus("Recording...");
          setMp3Blob(null);
          setUploadedFile(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
        })
        .catch((e) => {
          console.error(e);
          toast.error("Microphone permission denied or an error occurred.");
        });
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (recorder) {
      recorder
        .stop()
        .getMp3()
        .then(([buffer, blob]: [Buffer, Blob]) => {
          if (blob.size === 0) {
            toast.error(
              "Recording failed or was too short. Please try recording for at least 2 seconds."
            );
            setIsRecording(false);
            setStatus("Inactive");
            return;
          }

          setMp3Blob(blob);
          setIsRecording(false);
          setStatus("Ready to send.");
        })
        .catch((e) => {
          console.error(e);
          toast.error("An error occurred while stopping the recording.");
        });
    }
  };

  const cancelRecording = () => {
    setMp3Blob(null);
    setUploadedFile(null);
    setTranscriptText("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setStatus("Inactive");
    dispatch(resetSoapNote());
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isRecording) {
      toast.error("Stop recording before uploading a file.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (
      file.type !== "audio/mpeg" &&
      !file.name.toLowerCase().endsWith(".mp3")
    ) {
      toast.error("Only MP3 files are allowed.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploadedFile(file);
    setMp3Blob(file);
    setStatus("File uploaded. Ready to send.");
    setIsRecording(false);
  };

  // Send audio to API using Redux
  const sendAudioToApi = async () => {
    const blobToSend = mp3Blob || uploadedFile;
    if (!blobToSend) {
      toast.error("No audio available to send.");
      return;
    }

    if (!appInfo?.apppointment_id) {
      toast.error("Appointment ID is missing.");
      return;
    }

    setStatus("Processing audio...");

    try {
      await dispatch(
        generateSoapNoteFromAudio({
          file: blobToSend,
          appointment_id: appInfo.apppointment_id,
        })
      ).unwrap();

      setStatus("Completed");
      // View will be set to structured by the useEffect
    } catch (error) {
      console.error("Error processing audio:", error);
      setStatus("Failed to process audio");
    }
  };

  // Generate SOAP note from text using Redux
  const handleGenerateFromText = async () => {
    if (!transcriptText.trim()) {
      toast.error("Please enter a transcript first.");
      return;
    }

    if (!appInfo?.apppointment_id) {
      toast.error("Appointment ID is missing.");
      return;
    }

    try {
      await dispatch(
        generateSoapNoteFromText({
          transcript: transcriptText,
          appointment_id: appInfo.apppointment_id,
        })
      ).unwrap();
      // View will be set to structured by the useEffect
    } catch (error) {
      console.error("Error generating SOAP note:", error);
    }
  };

  // Parser for SOAP note - Enhanced to handle both formats
  const parseSoapNote = (soapNote: any) => {
    if (!soapNote) return null;

    // Handle object format (new format from backend)
    if (typeof soapNote === "object" && !Array.isArray(soapNote)) {
      return {
        S: soapNote.subjective || "",
        O: soapNote.objective || "",
        A: soapNote.assessment || "",
        P: soapNote.plan || "",
      };
    }

    // Handle string format (old format - markdown)
    if (typeof soapNote === "string") {
      const sections: Record<string, string> = {
        S: "",
        O: "",
        A: "",
        P: "",
      };

      const lines = soapNote.split("\n");
      let currentSection = "";

      for (let line of lines) {
        if (line.includes("**Subjective:**") || line.includes("Subjective:")) {
          currentSection = "S";
          continue;
        } else if (
          line.includes("**Objective:**") ||
          line.includes("Objective:")
        ) {
          currentSection = "O";
          continue;
        } else if (
          line.includes("**Assessment:**") ||
          line.includes("Assessment:")
        ) {
          currentSection = "A";
          continue;
        } else if (line.includes("**Plan:**") || line.includes("Plan:")) {
          currentSection = "P";
          continue;
        }

        if (currentSection && line.trim() !== "") {
          sections[currentSection] += line + "\n";
        }
      }

      Object.keys(sections).forEach((key) => {
        sections[key] = sections[key].trim();
      });

      return sections;
    }

    return null;
  };

  const soapSections = generatedSoapNote?.soap_note
    ? parseSoapNote(generatedSoapNote.soap_note)
    : null;

  // Determine if actions are disabled
  const isDisabled = !!generatedSoapNote;

  // Function to go back to SOAP view
  const handleBackToSoap = () => {
    setCurrentView("soap");
  };

  // Mock clinician note with critical highlights
  const mockClinicianNote = `
Patient is a 68-year-old male with a history of hypertension and type 2 diabetes, presenting with complaints of increased fatigue and shortness of breath over the past week. He denies chest pain but reports occasional dizziness. Lab results show <span class="text-red-700 bg-red-100 px-1 rounded">K+ of 5.8 mEq/L</span> and <span class="text-red-700 bg-red-100 px-1 rounded">Hb of 9.2 g/dL</span>. Vitals are stable. ECG shows no acute ischemic changes.

Started on <span class="text-blue-700 bg-blue-100 px-1 rounded">Lisinopril 10mg daily</span> for blood pressure management. Will continue with current Metformin dosage. <span class="text-yellow-700 bg-yellow-100 px-1 rounded">Plan includes a follow-up appointment in 2 weeks to re-check labs</span>. Also, <span class="text-orange-700 bg-orange-100 px-1 rounded">cardiology consult is pending</span>.

Assessment is exacerbation of chronic conditions, possibly related to medication compliance and diet. Differential includes early signs of renal insufficiency. The patient has been educated on the importance of medication adherence and dietary modifications.
`;

  // Filter only critical parts (anything inside <span> tags)
  const getCriticalHighlightsOnly = (note: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(note, "text/html");
    const spans = Array.from(doc.querySelectorAll("span"));
    if (spans.length === 0) return "No critical highlights found.";
    return spans.map((span) => span.outerHTML).join(" ");
  };

  // Copy SOAP note to clipboard
  const copyToClipboard = () => {
    if (!soapSections) return;

    const soapText = `Subjective\n${soapSections.S.replace(
      /\*/g,
      ""
    )}\n\nObjective\n${soapSections.O.replace(
      /\*/g,
      ""
    )}\n\nAssessment/Investigations:\n${soapSections.A.replace(
      /\*/g,
      ""
    )}\n\nPlan:\n${soapSections.P.replace(/\*/g, "")}`;

    navigator.clipboard
      .writeText(soapText)
      .then(() => {
        toast.success("SOAP note copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy:", err);
        toast.error("Failed to copy to clipboard");
      });
  };

  // Helper function to render SOAP section content as bullet points
  const renderSoapSection = (content: string) => {
    if (!content || content.trim() === "") {
      return <li className="text-gray-500 italic">No data available</li>;
    }

    // Clean up the content
    const cleanContent = content.replace(/\*/g, "").trim();

    // Split into sentences - handle different separators
    const sentences = cleanContent
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim().length > 0);

    // If it's a single sentence or short text, just display it as one bullet
    if (sentences.length === 1 || cleanContent.length < 100) {
      return <li className="leading-relaxed">{cleanContent}</li>;
    }

    // Otherwise, display each sentence as a separate bullet point
    return sentences.map((sentence, i) => {
      const trimmed = sentence.trim();
      if (!trimmed) return null;

      return (
        <li key={i} className="leading-relaxed">
          {trimmed}
        </li>
      );
    });
  };

  return (
    <div className="">
      {/* Patient Header */}
      <div className="mt-8">
        <div className="bg-white rounded-lg shadow-sm p-6 text-center ">
          <div className="flex justify-between items-center">
            <div className="flex gap-2 items-center">
              <Image
                src="https://as1.ftcdn.net/jpg/00/64/67/52/1000_F_64675209_7ve2XQANuzuHjMZXP3aIYIpsDKEbF5dD.jpg"
                alt="Patient"
                width={100}
                height={100}
                className="rounded-full"
              />
              <div className="flex justify-between w-full">
                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 text-left">
                    {appInfo?.patient_name || "John Smith"}
                  </h3>
                  <div className="flex flex-wrap lg:gap-6 gap-3 items-center">
                    <div className="text-sm text-gray-600">
                      ID: {appInfo?.apppointment_id || "12345"}
                    </div>
                    <div className="text-sm text-gray-600 inline-flex gap-1 items-center">
                      <Calendar className="text-sm" />
                      <div>DOB: 04/12/1985</div>
                    </div>
                    <div className="text-sm text-gray-600 inline-flex gap-1 items-center">
                      <Phone className="text-sm" />
                      <div>(555) 123-4567</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-4 flex-col">
              <Badge className="bg-extralightgreen text-customdarkgreen py-1.5 px-2 rounded-full">
                {appInfo?.status || "Active"}
              </Badge>
              <div className="text-sm">Last Visit: 03/15/2023</div>
            </div>
          </div>
        </div>
      </div>

      {/* SOAP Notes Section */}
      {currentView === "soap" && (
        <div className="bg-white rounded-lg shadow-sm sm:mt-6 mt-4">
          <div className="py-2.5 md:px-4 sm:px-1.5 flex md:flex-row flex-col justify-between gap-2">
            <h1 className="font-extrabold text-2xl">Notes Taker</h1>
            <div className="flex-1 flex justify-center">
              <div className="max-w-[500px] w-full relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-light-gray" />
                <Input
                  className="w-full ps-10 rounded-2xl placeholder:text-light-gray"
                  placeholder="Search"
                />
              </div>
            </div>
            <div className="flex gap-1 items-center">
              <Clock className="text-custommidgray" />
              <div className="text-custommidgray text-sm">
                {generatedSoapNote ? "Saved" : "Unsaved changes"}
              </div>
            </div>
          </div>

          <div className="bg-gray-200 h-0.5 space-y-4"></div>

          <div className="sm:px-5 px-1.5 md:mt-6 mt-2.5 pb-6">
            {/* Toggle Buttons */}
            <div className="flex justify-end gap-2 mb-4 items-center">
              <div>View :</div>
              <Button
                variant={view === "transcript" ? "default" : "outline"}
                onClick={() => setView("transcript")}
                disabled={!generatedSoapNote && !transcriptText}
                className={
                  view === "transcript" ? "bg-green-primary" : "bg-white"
                }
              >
                Transcript
              </Button>
              <Button
                variant={view === "structured" ? "default" : "outline"}
                onClick={() => setView("structured")}
                disabled={!generatedSoapNote}
                className={
                  view === "structured" ? "bg-green-primary" : "bg-white"
                }
              >
                Structured
              </Button>

              {/* Context Highlighting Button */}
              <Button
                onClick={() => setCurrentView("contextHighlighting")}
                className="ml-4 bg-purple-600 hover:bg-purple-700 text-white"
              >
                Context Highlighting
              </Button>
            </div>

            {/* Recording & Upload Area */}
            <div className="flex flex-col gap-2 md:mt-6 mt-2.5">
              <div className="flex justify-between items-center">
                <div className="text-lg text-gray-700">
                  New Note
                  <span className="text-custommidgray text-sm ps-2">
                    (Patient's symptoms, complaints, history)
                  </span>
                </div>
                <div className="text-sm font-medium text-gray-500">
                  Status: {loading ? "Processing..." : status}
                </div>
              </div>

              {/* Upload Button */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isRecording || isDisabled || loading}
                  className="flex items-center gap-1"
                >
                  <Upload size={16} />
                  Upload MP3
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".mp3,audio/mpeg"
                  className="hidden"
                  disabled={isRecording || isDisabled || loading}
                />
                {uploadedFile && (
                  <span className="text-sm text-gray-600 truncate max-w-xs">
                    {uploadedFile.name}
                  </span>
                )}
              </div>

              {/* Textarea + Mic */}
              <div className="relative">
                <textarea
                  name="subjective"
                  id="subjective"
                  className="w-full px-2 pr-12 rounded-lg py-2 placeholder:text-light-gray placeholder:text-lg font-medium bg-gray-100 border-gray-300 border-2 overflow-y-auto resize-none"
                  rows={5}
                  placeholder="Start typing, record, or upload an MP3..."
                  disabled={isDisabled || loading}
                  value={transcriptText}
                  onChange={(e) => setTranscriptText(e.target.value)}
                ></textarea>
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className="absolute right-3 top-3 p-2 rounded-full bg-blue-500 text-white hover:bg-green-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={isRecording ? "Stop Recording" : "Start Recording"}
                  disabled={!!uploadedFile || isDisabled || loading}
                >
                  {isRecording ? <StopCircle size={20} /> : <Mic size={20} />}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-2">
                {/* Generate from Text Button */}
                {transcriptText && !mp3Blob && !uploadedFile && (
                  <Button
                    onClick={handleGenerateFromText}
                    className="bg-green-primary"
                    disabled={loading || isDisabled}
                  >
                    <Send size={16} className="mr-2" />
                    Generate SOAP Note
                  </Button>
                )}

                {/* Clear/Reset Button */}
                {(transcriptText || mp3Blob || uploadedFile) && !isDisabled && (
                  <Button
                    onClick={cancelRecording}
                    variant="outline"
                    className="text-red-500 hover:bg-red-50"
                    disabled={loading}
                  >
                    <Trash2 size={16} className="mr-2" />
                    Clear
                  </Button>
                )}
              </div>

              {/* Audio Preview & Actions */}
              {(mp3Blob || uploadedFile) && !isDisabled && (
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <audio
                    src={
                      mp3Blob
                        ? URL.createObjectURL(mp3Blob)
                        : uploadedFile
                        ? URL.createObjectURL(uploadedFile)
                        : ""
                    }
                    controls
                    className="flex-grow min-w-[200px]"
                  />
                  <Button
                    onClick={sendAudioToApi}
                    className="bg-green-primary"
                    disabled={loading}
                  >
                    <Send size={16} />
                  </Button>
                  <Button
                    onClick={cancelRecording}
                    variant="destructive"
                    className="bg-red-500 hover:bg-red-600 text-white"
                    title="Discard audio"
                    disabled={loading}
                  >
                    <Trash2 size={20} />
                  </Button>
                </div>
              )}
            </div>

            {/* Transcript View */}
            {view === "transcript" && (generatedSoapNote || transcriptText) && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-bold text-lg mb-2">Transcript</h3>
                <div className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
                  {generatedSoapNote?.transcript || transcriptText}
                </div>
              </div>
            )}

            {/* Structured View */}
            {view === "structured" && generatedSoapNote && soapSections && (
              <>
                {/* Copy Button - Outside Border */}
                <div className="flex justify-end mb-2 mt-6">
                  <Button
                    onClick={copyToClipboard}
                    variant="ghost"
                    size="icon"
                    className="hover:bg-gray-100"
                    title="Copy to Clipboard"
                  >
                    <Copy size={20} />
                  </Button>
                </div>

                <div className="p-6 bg-white rounded-lg border-2 border-gray-300">
                  {(["S", "O", "A", "P"] as const).map((section, index) => {
                    const labels: Record<
                      string,
                      { title: string; fullTitle: string }
                    > = {
                      S: {
                        title: "Subjective",
                        fullTitle: "Subjective",
                      },
                      O: {
                        title: "Objective",
                        fullTitle: "Objective",
                      },
                      A: {
                        title: "Assessment/Investigations:",
                        fullTitle: "Assessment/Investigations:",
                      },
                      P: {
                        title: "Plan:",
                        fullTitle: "Plan:",
                      },
                    };

                    return (
                      <div key={section} className={index > 0 ? "mt-6" : ""}>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">
                          {labels[section].fullTitle}
                        </h3>
                        <ul className="list-disc list-inside space-y-2 text-gray-800">
                          {renderSoapSection(soapSections[section])}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Context Highlighting View */}
      {currentView === "contextHighlighting" && (
        <div className="bg-white rounded-lg shadow-sm sm:mt-6 mt-4">
          <div className="py-2.5 md:px-4 sm:px-1.5 flex justify-between items-center">
            <h1 className="font-bold text-2xl">
              Clinician Notes with Context Highlighting
            </h1>
            <Button variant="outline" onClick={handleBackToSoap}>
              ← Back to SOAP
            </Button>
          </div>

          <div className="bg-gray-200 h-0.5"></div>

          <div className="sm:px-5 px-1.5 md:mt-6 mt-2.5 pb-6">
            {/* View Toggle */}
            <div className="flex justify-end gap-2 mb-4 items-center">
              <div className="text-sm text-gray-600">View:</div>
              <Button
                variant={noteViewMode === "full" ? "default" : "outline"}
                onClick={() => setNoteViewMode("full")}
                size="sm"
                className={noteViewMode === "full" ? "bg-green-primary" : ""}
              >
                Full Note
              </Button>
              <Button
                variant={noteViewMode === "critical" ? "default" : "outline"}
                onClick={() => setNoteViewMode("critical")}
                size="sm"
                className={
                  noteViewMode === "critical" ? "bg-green-primary" : ""
                }
              >
                Critical Highlights Only
              </Button>
            </div>

            <div className="mb-4">
              <p className="text-gray-600 mb-2">
                Critical values are automatically highlighted based on clinical
                context.
              </p>
              <div
                className="w-full px-3 py-3 bg-gray-50 rounded-lg border border-gray-300 whitespace-pre-wrap"
                style={{ minHeight: "200px", lineHeight: "1.6" }}
                dangerouslySetInnerHTML={{
                  __html:
                    noteViewMode === "full"
                      ? mockClinicianNote
                      : getCriticalHighlightsOnly(mockClinicianNote),
                }}
              />
            </div>

            <div className="flex gap-3 justify-end mt-4">
              <Button
                variant="outline"
                onClick={handleBackToSoap}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button className="bg-green-primary hover:bg-green-700 cursor-pointer">
                Save Note
              </Button>
              <Button className="bg-green-600 hover:bg-green-700 text-white cursor-pointer">
                Complete & Sign
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
