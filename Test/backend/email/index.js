import nodemailer from "nodemailer";
import express from "express";
import "dotenv/config";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";


const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Allow all origins
app.use(
  cors()
);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "uploads/";
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const fileFilter = (req, file, cb) => {
  // Check file type
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only PDF, DOC, and DOCX files are allowed."
      ),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter,
});

// Create transporter using your existing configuration
const createTransporter = () => {
  return nodemailer.createTransport({
    host: "smtp.hostinger.com",
    port: 465,
    secure: true,
    auth: {
      user: "info@curealog.com",
      pass: process.env.EMAIL_PASS || "2g:l1UJU", // Better to use environment variable
    },
  });
};

// Helper function to generate job application email content
const generateJobApplicationEmail = (formData) => {
  const skillLevels = {
    1: "I do not have experience with this (1)",
    2: "I know basic concepts only (2)",
    3: "I have good knowledge to get the job done (3)",
    4: "I have solid experience (4)",
    5: "I can do anything anyone asks! (5)",
  };

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
        New Job Application - WOLTRIO
      </h2>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #007bff; margin-top: 0;">Personal Information</h3>
        <p><strong>Name:</strong> ${formData.firstName} ${formData.lastName}</p>
        <p><strong>Email:</strong> ${formData.email}</p>
        <p><strong>Experience:</strong> ${formData.experience}</p>
      </div>
      
      <div style="background-color: #fff; padding: 20px; border: 1px solid #dee2e6; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #007bff; margin-top: 0;">Skills Assessment</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #dee2e6;">
            <td style="padding: 8px; font-weight: bold;">CSS:</td>
            <td style="padding: 8px;">${skillLevels[formData.cssLevel]}</td>
          </tr>
          <tr style="border-bottom: 1px solid #dee2e6;">
            <td style="padding: 8px; font-weight: bold;">JavaScript:</td>
            <td style="padding: 8px;">${
              skillLevels[formData.javascriptLevel]
            }</td>
          </tr>
          <tr style="border-bottom: 1px solid #dee2e6;">
            <td style="padding: 8px; font-weight: bold;">Node.js:</td>
            <td style="padding: 8px;">${skillLevels[formData.nodeLevel]}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">React:</td>
            <td style="padding: 8px;">${skillLevels[formData.reactLevel]}</td>
          </tr>
        </table>
      </div>
      
      <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Application Date:</strong> ${new Date().toLocaleString()}</p>
      </div>
      
      <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
        This application was submitted through the WOLTRIO careers page.
      </p>
    </div>
  `;
};

// Your existing send-mail endpoint
app.post("/send-mail", async (req, res) => {
  const { subject, html, to } = req.body;
  try {
    const mailOptions = {
      from: "info@curealog.com",
      to,
      subject,
      html,
    };

    const transporter = createTransporter();
    const result = await transporter.sendMail(mailOptions);
    console.log(result);
    res.status(200).json({ status: "success", success: true });
  } catch (error) {
    console.log(error);
    res.status(400).json({ status: "failed", success: false });
  }
});

// New job application endpoint
app.post(
  "/api/submit-job-application",
  upload.single("cv"),
  async (req, res) => {
    try {
      // Validate required fields
      const requiredFields = [
        "firstName",
        "lastName",
        "email",
        "experience",
        "cssLevel",
        "javascriptLevel",
        "nodeLevel",
        "reactLevel",
      ];
      const missingFields = requiredFields.filter((field) => !req.body[field]);

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing required fields: ${missingFields.join(", ")}`,
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "CV file is required",
        });
      }

      const formData = req.body;
      const cvFile = req.file;

      // Create transporter
      const transporter = createTransporter();

      // Verify transporter configuration
      await transporter.verify();

      // Email to HR/Admin
      const hrMailOptions = {
        from: "info@curealog.com",
        to: "info@curealog.com", // or process.env.HR_EMAIL
        subject: `New Job Application - ${formData.firstName} ${formData.lastName}`,
        html: generateJobApplicationEmail(formData),
        attachments: [
          {
            filename: cvFile.originalname,
            path: cvFile.path,
          },
        ],
      };

      // Send email to HR
      const hrEmailResult = await transporter.sendMail(hrMailOptions);
      console.log("HR Email sent: ", hrEmailResult.messageId);

      // Confirmation email to applicant
      const confirmationMailOptions = {
        from: "info@curealog.com",
        to: formData.email,
        subject: "Application Received - WOLTRIO",
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #007bff;">Thank you for your application!</h2>
          <p>Dear ${formData.firstName},</p>
          <p>We have received your job application and will review it shortly.</p>
          <p>Here's a summary of your application:</p>
          <ul>
            <li><strong>Position:</strong> Web Developer</li>
            <li><strong>Experience:</strong> ${formData.experience}</li>
            <li><strong>Application Date:</strong> ${new Date().toLocaleDateString()}</li>
          </ul>
          <p>We will contact you if your profile matches our requirements.</p>
          <p>Best regards,<br><strong>WOLTRIO Team</strong></p>
        </div>
      `,
      };

      await transporter.sendMail(confirmationMailOptions);

      // Optional: Clean up uploaded file after sending email
      // Uncomment the line below if you don't want to keep the files
      // fs.unlinkSync(cvFile.path);

      res.status(200).json({
        success: true,
        message: "Application submitted successfully!",
        data: {
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          submittedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Error submitting application:", error);

      // Clean up uploaded file in case of error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        success: false,
        message: "Failed to submit application. Please try again.",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File size too large. Maximum size is 5MB.",
      });
    }
  }

  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? error.message : undefined,
  });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Server running on port ${port}`));