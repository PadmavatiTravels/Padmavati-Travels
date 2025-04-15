import type { NextApiRequest, NextApiResponse } from "next";
import { google } from "googleapis";

const API_KEY = "AIzaSyBq6q6q6q6q6q6q6q6q6q6q6q6q6q6q6q6"; // Replace with actual API key or use env variable

const drive = google.drive({
  version: "v3",
  auth: API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { fileBufferBase64, fileName, mimeType, metadata } = req.body;

    if (!fileBufferBase64 || !fileName || !mimeType) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const fileBuffer = Buffer.from(fileBufferBase64, "base64");

    const fileMetadata = {
      name: fileName,
      description: JSON.stringify(metadata || {}),
    };

    const media = {
      mimeType,
      body: fileBuffer,
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: "id, webViewLink",
    });

    const fileId = response.data.id;
    if (!fileId) {
      throw new Error("Failed to upload file to Google Drive: No file ID returned");
    }

    // Make the file publicly accessible
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    // Get the webViewLink for the file
    const file = await drive.files.get({
      fileId,
      fields: "webViewLink",
    });

    return res.status(200).json({ webViewLink: file.data.webViewLink || "" });
  } catch (error) {
    console.error("Error uploading file to Google Drive:", error);
    return res.status(500).json({ error: "Failed to upload file to Google Drive" });
  }
}
