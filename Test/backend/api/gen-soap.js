fetch("http://127.0.0.1:8000/soap-notes/generate-from-text", {
  "headers": {
    "accept": "application/json, text/plain, */*",
    "accept-language": "en-GB,en;q=0.9,en-US;q=0.8",
    "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ6YWluYXNnaGFyMTkwQGdtYWlsLmNvbSIsInJvbGUiOiJEb2N0b3IiLCJleHAiOjE3NTk5NDAxNjR9.uExLLKs6q_tHqC1cxcfd8Keo1bXjvRmy4K8n1BI_Wec",
    "cache-control": "no-cache",
    "content-type": "application/json",
    "pragma": "no-cache",
    "sec-ch-ua": "\"Microsoft Edge\";v=\"141\", \"Not?A_Brand\";v=\"8\", \"Chromium\";v=\"141\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "cross-site",
    "Referer": "http://localhost:3000/"
  },
  "body": "{\"transcript\":\"Doctor: Good morning! What brings you in today?\\nPatient: Good morning, doctor. I’ve been having headaches for the past few days.\\n\\nDoctor: I see. Can you tell me where exactly the pain is?\\nPatient: Mostly on the right side of my head, near my temple.\\n\\nDoctor: How long do the headaches usually last?\\nPatient: Around two to three hours, sometimes longer.\\n\\nDoctor: Do you feel any nausea, blurred vision, or sensitivity to light?\\nPatient: Yes, sometimes light makes it worse.\\n\\nDoctor: Hmm. Have you been getting enough sleep or feeling stressed lately?\\nPatient: Not really, I’ve been sleeping late and working a lot.\\n\\nDoctor: That might be contributing. It could be a tension or migraine headache. I’ll prescribe some mild pain relief and recommend rest, hydration, and regular sleep.\\n\\nPatient: Okay, doctor. Should I come back if it continues?\\nDoctor: Yes, if it lasts more than a week or gets worse, come back for further tests.\\n\\nPatient: Thank you, doctor.\\nDoctor: You’re welcome. Take care and get some rest.\",\"appointment_id\":5}",
  "method": "POST"
}).then(res=>res.json()).then(console.log)