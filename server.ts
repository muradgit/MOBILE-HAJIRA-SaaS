import express from "express";
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";
import admin from "firebase-admin";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import fs from "fs";

console.log("Starting server script...");

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load firebase config
let firebaseConfig: any = {};
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    console.log("Firebase config loaded for project:", firebaseConfig.projectId);
  } else {
    console.warn("WARNING: firebase-applet-config.json not found at", configPath);
  }
} catch (error) {
  console.error("Failed to load firebase-applet-config.json:", error);
}

// Initialize Firebase Admin
try {
  if (!admin.apps || admin.apps.length === 0) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    const projectId = firebaseConfig.projectId || process.env.GOOGLE_CLOUD_PROJECT;

    if (serviceAccount) {
      console.log("Initializing Firebase Admin with service account...");
      let parsedServiceAccount;
      try {
        parsedServiceAccount = JSON.parse(serviceAccount);
        admin.initializeApp({
          credential: admin.credential.cert(parsedServiceAccount),
          databaseURL: projectId ? `https://${projectId}.firebaseio.com` : undefined
        });
      } catch (e) {
        console.warn("Service account is not valid JSON. Falling back to default credentials...");
        admin.initializeApp({
          projectId: projectId
        });
      }
    } else {
      console.log("Initializing Firebase Admin with default credentials...");
      admin.initializeApp({
        projectId: projectId
      });
    }
  }
} catch (error) {
  console.error("Failed to initialize Firebase Admin:", error);
}

async function startServer() {
  console.log("Initializing Firestore...");
  let db: any;
  try {
    const defaultApp = admin.app();
    db = firebaseConfig.firestoreDatabaseId 
      ? getFirestore(defaultApp, firebaseConfig.firestoreDatabaseId)
      : getFirestore(defaultApp);
    console.log("Firestore initialized.");
  } catch (error) {
    console.error("CRITICAL: Failed to initialize Firestore:", error);
  }
  
  const app = express();
  const PORT = 3000;

  console.log("Setting up middleware...");
  app.use(cors());
  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Auth Middleware
  const authenticate = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const token = authHeader.split(" ")[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = decodedToken;
      next();
    } catch (error) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // --- 1. Attendance Controller (Batch Save) ---
  app.post("/api/attendance/batch", authenticate, async (req: any, res: any) => {
    const { tenant_id, student_ids, teacher_id, subject } = req.body;
    if (!tenant_id || !student_ids || !Array.isArray(student_ids) || !teacher_id || !subject) {
      return res.status(400).json({ error: "Missing or invalid required fields" });
    }

    try {
      const tenantRef = db.collection("tenants").doc(tenant_id);
      
      await db.runTransaction(async (transaction) => {
        const tenantDoc = await transaction.get(tenantRef);
        if (!tenantDoc.exists) throw new Error("Tenant not found");
        
        const tenantData = tenantDoc.data();
        if (!tenantData || tenantData.credits_left < 2) {
          throw new Error("Insufficient credits");
        }

        const now = Timestamp.now();
        const fortyFiveMinsAgo = Timestamp.fromMillis(now.toMillis() - 45 * 60 * 1000);

        for (const studentId of student_ids) {
          // Duplicate Check: Same student + subject in last 45 mins
          const recentAttendance = await db.collection("tenants").doc(tenant_id)
            .collection("attendance")
            .where("student_id", "==", studentId)
            .where("subject", "==", subject)
            .where("timestamp", ">=", fortyFiveMinsAgo)
            .limit(1)
            .get();

          if (recentAttendance.empty) {
            const attendanceRef = db.collection("tenants").doc(tenant_id).collection("attendance").doc();
            transaction.set(attendanceRef, {
              timestamp: now,
              tenant_id,
              student_id: studentId,
              teacher_id,
              subject,
              status: "present"
            });
          }
        }

        // Atomic Credit Deduction
        transaction.update(tenantRef, {
          credits_left: FieldValue.increment(-2)
        });
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- 2. SMS Webhook (MacroDroid) ---
  app.post("/api/webhooks/sms", async (req, res) => {
    const secret = req.headers["x-webhook-secret"];
    if (secret !== process.env.WEBHOOK_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { sms } = req.body;
    if (!sms) return res.status(400).json({ error: "No SMS content" });

    // Regex for TrxID and Amount (bKash/Nagad)
    const trxRegex = /TrxID\s?([A-Z0-9]+)/i;
    const amountRegex = /Tk\s?([0-9,.]+)/i;

    const trxMatch = sms.match(trxRegex);
    const amountMatch = sms.match(amountRegex);

    if (trxMatch && amountMatch) {
      const trx_id = trxMatch[1].toUpperCase();
      const amount = parseFloat(amountMatch[1].replace(/,/g, ""));

      try {
        await db.collection("transactions").doc(trx_id).set({
          trx_id,
          amount,
          status: "unused",
          timestamp: admin.firestore.Timestamp.now()
        }, { merge: true });
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Failed to save transaction" });
      }
    } else {
      res.status(400).json({ error: "Could not parse SMS" });
    }
  });

  // --- 3. Payment Claim ---
  app.post("/api/payments/claim", authenticate, async (req: any, res: any) => {
    const { trx_id, tenant_id } = req.body;
    if (!trx_id || !tenant_id) return res.status(400).json({ error: "Missing fields" });

    try {
      const trxRef = db.collection("transactions").doc(trx_id);
      const tenantRef = db.collection("tenants").doc(tenant_id);

      const result = await db.runTransaction(async (transaction) => {
        const trxDoc = await transaction.get(trxRef);
        if (!trxDoc.exists || trxDoc.data()?.status !== "unused") {
          throw new Error("Invalid or already used TrxID");
        }

        const amount = trxDoc.data()?.amount || 0;
        let credits = amount;
        if (amount >= 500) credits += amount * 0.1; // 10% bonus

        transaction.update(trxRef, { status: "used", claimed_by_tenant: tenant_id });
        transaction.update(tenantRef, {
          credits_left: admin.firestore.FieldValue.increment(credits)
        });

        return { credits };
      });

      res.json({ success: true, creditsAdded: result.credits });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // --- 4. Promo Code System ---
  app.post("/api/promo/apply", authenticate, async (req: any, res: any) => {
    const { promo_code, tenant_id } = req.body;
    
    try {
      await db.runTransaction(async (transaction) => {
        const tenantRef = db.collection("tenants").doc(tenant_id);
        const tenantDoc = await transaction.get(tenantRef);
        const tenantData = tenantDoc.data();

        if (tenantData?.promo_code === promo_code) throw new Error("Cannot use own code");

        const referrerQuery = await db.collection("tenants").where("promo_code", "==", promo_code).limit(1).get();
        if (referrerQuery.empty) throw new Error("Invalid promo code");

        const referrerDoc = referrerQuery.docs[0];
        const referrerData = referrerDoc.data();

        if (referrerData.referral_count >= 5) throw new Error("Promo code limit reached");

        // Add 20 credits to both
        transaction.update(tenantRef, { credits_left: admin.firestore.FieldValue.increment(20) });
        transaction.update(referrerDoc.ref, { 
          credits_left: admin.firestore.FieldValue.increment(20),
          referral_count: admin.firestore.FieldValue.increment(1)
        });
      });
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // --- 5. Daily Share Reward ---
  app.post("/api/rewards/share", authenticate, async (req: any, res: any) => {
    const { tenant_id } = req.body;
    // Use Asia/Dhaka timezone
    const nowDhaka = new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" });
    const dateStr = new Date(nowDhaka).toISOString().split("T")[0];

    try {
      const rewardRef = db.collection("tenants").doc(tenant_id).collection("rewards").doc(dateStr);
      const tenantRef = db.collection("tenants").doc(tenant_id);

      await db.runTransaction(async (transaction) => {
        const rewardDoc = await transaction.get(rewardRef);
        if (rewardDoc.exists && rewardDoc.data()?.claimed) {
          throw new Error("Already claimed for today");
        }

        transaction.set(rewardRef, { tenant_id, date: dateStr, claimed: true });
        transaction.update(tenantRef, { credits_left: admin.firestore.FieldValue.increment(1) });
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // --- 6. ID Card Generation ---
  app.post("/api/students/id-card", authenticate, async (req: any, res: any) => {
    const { student_id, tenant_id } = req.body;
    if (!student_id || !tenant_id) return res.status(400).json({ error: "Missing fields" });

    try {
      const studentDoc = await db.collection("tenants").doc(tenant_id).collection("students").doc(student_id).get();
      if (!studentDoc.exists) throw new Error("Student not found");
      const student = studentDoc.data();

      const tenantDoc = await db.collection("tenants").doc(tenant_id).get();
      const tenant = tenantDoc.data();

      const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
      const QRCode = await import("qrcode");

      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([215, 325]); // ID Card size
      const { width, height } = page.getSize();

      // Draw background
      page.drawRectangle({
        x: 0,
        y: 0,
        width,
        height,
        color: rgb(1, 1, 1),
        borderColor: rgb(0.43, 0.26, 0.75), // Purple
        borderWidth: 5,
      });

      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // Header
      page.drawText(tenant?.name || "Institution Name", {
        x: 20,
        y: height - 40,
        size: 12,
        font,
        color: rgb(0.17, 0.24, 0.31),
      });

      // Student Info
      page.drawText(`Name: ${student?.name}`, { x: 20, y: height - 80, size: 10, font });
      page.drawText(`Roll: ${student?.roll}`, { x: 20, y: height - 100, size: 10, font });
      page.drawText(`Dept: ${student?.dept}`, { x: 20, y: height - 120, size: 10, font });

      // QR Code
      const qrDataUrl = await QRCode.toDataURL(student?.unique_id);
      const qrImage = await pdfDoc.embedPng(qrDataUrl);
      page.drawImage(qrImage, {
        x: (width - 100) / 2,
        y: 40,
        width: 100,
        height: 100,
      });

      page.drawText(student?.unique_id, {
        x: 20,
        y: 20,
        size: 8,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });

      const pdfBytes = await pdfDoc.save();
      res.setHeader("Content-Type", "application/pdf");
      res.send(Buffer.from(pdfBytes));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is listening on port ${PORT}`);
    console.log(`Vite dev server is integrated in middleware mode.`);
  });
}

startServer().catch(err => {
  console.error("CRITICAL: Failed to start server:", err);
  process.exit(1);
});
