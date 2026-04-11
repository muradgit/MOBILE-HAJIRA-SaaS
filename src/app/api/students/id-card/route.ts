import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase-admin";
import { authenticate, errorResponse } from "@/src/lib/api-utils";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";

export async function POST(req: NextRequest) {
  const user = await authenticate(req);
  if (!user) return errorResponse("Unauthorized", 401);

  const body = await req.json();
  const { student_id, tenant_id } = body;
  if (!student_id || !tenant_id) return errorResponse("Missing fields");

  try {
    const studentDoc = await adminDb.collection("tenants").doc(tenant_id).collection("students").doc(student_id).get();
    if (!studentDoc.exists) throw new Error("Student not found");
    const student = studentDoc.data();

    const tenantDoc = await adminDb.collection("tenants").doc(tenant_id).get();
    const tenant = tenantDoc.data();

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([215, 325]);
    const { width, height } = page.getSize();

    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: rgb(1, 1, 1),
      borderColor: rgb(0.43, 0.26, 0.75),
      borderWidth: 5,
    });

    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    page.drawText(tenant?.name || "Institution Name", {
      x: 20,
      y: height - 40,
      size: 12,
      font,
      color: rgb(0.17, 0.24, 0.31),
    });

    page.drawText(`Name: ${student?.name}`, { x: 20, y: height - 80, size: 10, font });
    page.drawText(`Roll: ${student?.roll}`, { x: 20, y: height - 100, size: 10, font });
    page.drawText(`Dept: ${student?.dept}`, { x: 20, y: height - 120, size: 10, font });

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
    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
      },
    });
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
