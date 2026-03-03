// app/lab-technician/upload/page.tsx

import { Suspense } from "react";
import UploadReportClient from "./UploadReportClient";

export default function Page() {
    return (
        <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
            <UploadReportClient />
        </Suspense>
    );
}