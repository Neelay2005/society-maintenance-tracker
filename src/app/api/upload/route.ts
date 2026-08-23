import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import fs from "fs";
import path from "path";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Server-Side File Type Validation
    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      return NextResponse.json(
        {
          error: "Invalid file type. Only image files (JPEG, PNG, WEBP, GIF) are allowed.",
        },
        { status: 400 }
      );
    }

    // Server-Side File Size Validation
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File size exceeds the 5MB limit. Uploaded file is ${(
            file.size /
            (1024 * 1024)
          ).toFixed(2)}MB.`,
        },
        { status: 400 }
      );
    }

    // Check Cloudinary production upload credentials
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (cloudName && apiKey && apiSecret) {
      // Production Cloudinary Upload via FormData
      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
      const cloudFormData = new FormData();
      cloudFormData.append("file", file);
      cloudFormData.append("upload_preset", "society_complaints");

      const cloudRes = await fetch(cloudinaryUrl, {
        method: "POST",
        body: cloudFormData,
      });

      if (cloudRes.ok) {
        const cloudData = await cloudRes.json();
        return NextResponse.json({ photoUrl: cloudData.secure_url });
      }
    }

    // Development Local Storage Fallback
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadsDir = path.join(process.cwd(), "public", "uploads");

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const ext = path.extname(file.name) || ".jpg";
    const filename = `complaint_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    const filePath = path.join(uploadsDir, filename);

    await fs.promises.writeFile(filePath, buffer);

    const localPhotoUrl = `/uploads/${filename}`;
    return NextResponse.json({ photoUrl: localPhotoUrl }, { status: 201 });
  } catch (error) {
    console.error("Upload handler error:", error);
    return NextResponse.json(
      { error: "Internal server error during photo upload" },
      { status: 500 }
    );
  }
}
