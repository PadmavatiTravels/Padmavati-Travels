export async function uploadFileToDrive(fileBuffer: Buffer, fileName: string, mimeType: string, metadata: Record<string, unknown> = {}): Promise<string> {
  try {
    // Convert Buffer to base64 string for sending in JSON
    const fileBufferBase64 = fileBuffer.toString("base64");

    const response = await fetch("/api/uploadToDrive", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileBufferBase64,
        fileName,
        mimeType,
        metadata,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to upload file to Google Drive");
    }

    const data = await response.json();
    return data.webViewLink || "";
  } catch (error) {
    console.error("Error uploading file to Google Drive:", error);
    throw error;
  }
}
