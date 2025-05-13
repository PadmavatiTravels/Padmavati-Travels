import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import type { Booking } from "../models/booking"
import { store } from "../store/store"
import { db } from "../lib/firebase"
import { doc, updateDoc } from "firebase/firestore"
import { uploadFileToDrive } from "./googleDrive"

// Generate PDF for a booking
export const generateInvoicePDF = async (booking: Booking, options?: { skipUpload?: boolean }): Promise<Blob> => {
  // Add this console log at the beginning of the function
  console.log("Delivery Contact in PDF generation:", booking.deliveryContact)
  console.log("Full booking object:", JSON.stringify(booking, null, 2))

  return new Promise((resolve, reject) => {
    try {
      // Get company settings from Redux store
      let { companyName, companyAddress, companyPhone, companyEmail, companyLogo } = store.getState().settings

      // Use default logo URL if companyLogo is not set
      if (!companyLogo) {
        companyLogo = "https://i.postimg.cc/W35H74zT/Blue-and-Yellow-Illustrative-Travel-Agency-Logo.png"
      }

      // Create a new PDF document
      const doc = new jsPDF()

      // Add company logo
      if (companyLogo) {
        try {
          const img = new Image()
          img.crossOrigin = "anonymous"
          img.onload = () => {
            try {
              // Add logo to both copies - adjusted position to prevent overlap
              doc.addImage(img, "JPEG", 14, 10, 18, 18) // Branch copy logo - reduced size
              doc.addImage(img, "JPEG", 110, 10, 18, 18) // Customer copy logo - reduced size
              addContent()
            } catch (imgError) {
              console.error("Error adding logo image:", imgError)
              addContent() // Continue without logo
            }
          }
          img.onerror = () => {
            console.error("Error loading logo image")
            addContent() // Continue without logo
          }
          img.src = companyLogo
        } catch (logoError) {
          console.error("Error with logo:", logoError)
          addContent() // Continue without logo
        }
      } else {
        addContent()
      }

      function addContent() {
        // Set up the two-column layout
        const leftColumnX = 14
        const rightColumnX = 110
        const columnWidth = 85
        let currentY = 10

        // Helper function to wrap text instead of truncating
        const wrapText = (text: string, maxWidth: number, doc: jsPDF): string[] => {
          if (!text) return [""]

          // Split the text into words
          const words = text.split(" ")
          const lines: string[] = []
          let currentLine = ""

          // Process each word
          for (let i = 0; i < words.length; i++) {
            const word = words[i]
            // Test if adding this word would exceed the width
            const testLine = currentLine ? `${currentLine} ${word}` : word
            const testWidth = (doc.getStringUnitWidth(testLine) * doc.getFontSize()) / doc.internal.scaleFactor

            if (testWidth > maxWidth) {
              // If the line would be too long, add the current line to lines array
              lines.push(currentLine)
              // Start a new line with the current word
              currentLine = word
            } else {
              // Otherwise, add the word to the current line
              currentLine = testLine
            }
          }

          // Add the last line
          if (currentLine) {
            lines.push(currentLine)
          }

          return lines
        }

        // Helper function to add wrapped text and update Y position
        const addWrappedText = (text: string, x: number, y: number, maxWidth: number, lineHeight = 3.5): number => {
          const lines = wrapText(text, maxWidth, doc)
          let newY = y

          for (let i = 0; i < lines.length; i++) {
            doc.text(lines[i], x, newY)
            newY += lineHeight
          }

          // Return the new Y position after all lines
          return newY
        }

        // Add company name for both copies
        doc.setFontSize(10) // Reduced from 12
        doc.setFont(undefined, "bold")
        doc.text("MUMBAI - BORIVALI", leftColumnX + 25, currentY + 4) // Reduced spacing
        doc.text("MUMBAI - BORIVALI", rightColumnX + 25, currentY + 4)

        doc.setFontSize(10) // Reduced from 12
        doc.text("PADMAVATI", leftColumnX + 25, currentY + 8) // Reduced spacing
        doc.text("PADMAVATI", rightColumnX + 25, currentY + 8)

        doc.text("CARGO SERV", leftColumnX + 25, currentY + 12) // Reduced spacing
        doc.text("CARGO SERV", rightColumnX + 25, currentY + 12)

        // Add location details
        currentY += 16 // Reduced from 20
        doc.setFontSize(7) // Reduced from 8
        doc.setFont(undefined, "normal")
        doc.text("NEAR AXIS BANK BRIDGE ENDING,", leftColumnX + 25, currentY)
        doc.text("NEAR AXIS BANK BRIDGE ENDING,", rightColumnX + 25, currentY)

        currentY += 4 // Reduced from 5
        doc.text("KULUPWADI, BORIVALI EAST.", leftColumnX + 25, currentY)
        doc.text("KULUPWADI, BORIVALI EAST.", rightColumnX + 25, currentY)

        currentY += 4 // Reduced from 5
        doc.text(`Ph.No : 98926 16165`, leftColumnX + 25, currentY)
        doc.text(`Ph.No : 98926 16165`, rightColumnX + 25, currentY)

        // Add copy type headers - increased spacing
        currentY += 6 // Reduced from 8
        doc.setFontSize(8) // Reduced from 9
        doc.setFont(undefined, "bold")
        doc.text("Branch Copy", leftColumnX + 10, currentY)
        doc.text("Booking Receipt", leftColumnX + 50, currentY)
        doc.text("Customer Copy", rightColumnX + 10, currentY)
        doc.text("Booking Receipt", rightColumnX + 50, currentY)

        // Add invoice type (TO PAY or PAID) with emphasis
        currentY += 6 // Reduced from 8
        doc.setFontSize(9) // Slightly larger for emphasis
        doc.setFont(undefined, "bold")
        // Add the invoice type text prominently - use invoiceType if available, otherwise use bookingType
        const displayInvoiceType = booking.invoiceType ? booking.invoiceType.toUpperCase() : booking.bookingType
        doc.text(`INVOICE TYPE: ${displayInvoiceType}`, leftColumnX + 10, currentY)
        doc.text(`INVOICE TYPE: ${displayInvoiceType}`, rightColumnX + 10, currentY)
        doc.setFont(undefined, "normal")
        doc.setFontSize(7) // Reset to normal size

        // Add booking queries contact
        currentY += 6 // Reduced from 8
        doc.setFontSize(7) // Reduced from 8
        doc.setFont(undefined, "normal")
        doc.text(`For Booking Queries Contact : 98926 16165`, leftColumnX, currentY)
        doc.text(`For Booking Queries Contact : 98926 16165`, rightColumnX, currentY)

        // Add LR Number and booking details - increased spacing between lines
        currentY += 4 // Reduced from 5
        doc.text(`Lr Number : ${booking.id}`, leftColumnX, currentY)
        doc.text(`Lr Number : ${booking.id}`, rightColumnX, currentY)

        currentY += 4 // Reduced from 5
        doc.text(`Booking Time : ${booking.bookingDate} ${new Date().toLocaleTimeString()}`, leftColumnX, currentY)
        doc.text(`Booking Time : ${booking.bookingDate} ${new Date().toLocaleTimeString()}`, rightColumnX, currentY)

        currentY += 4 // Reduced from 5
        doc.text(`Lr Type : ${booking.bookingType}`, leftColumnX, currentY)
        doc.text(`Lr Type : ${booking.bookingType}`, rightColumnX, currentY)

        // Add From and To details with text wrapping
        currentY += 4 // Reduced from 5

        // From field - left column
        doc.text(`From :`, leftColumnX, currentY)
        const fromTextY = addWrappedText(booking.consignorName, leftColumnX + 20, currentY, 30, 3.5) // Reduced line height

        // To field - left column (on the same line as From)
        doc.text(`To :`, leftColumnX + 50, currentY)
        const toTextY = addWrappedText(booking.consigneeName, leftColumnX + 60, currentY, 30, 3.5) // Reduced line height

        // From field - right column
        doc.text(`From :`, rightColumnX, currentY)
        const fromRightY = addWrappedText(booking.consignorName, rightColumnX + 20, currentY, 30, 3.5) // Reduced line height

        // To field - right column (on the same line as From)
        doc.text(`To :`, rightColumnX + 50, currentY)
        const toRightY = addWrappedText(booking.consigneeName, rightColumnX + 60, currentY, 30, 3.5) // Reduced line height

        // Update currentY to the maximum Y position after all text
        currentY = Math.max(fromTextY, toTextY, fromRightY, toRightY) + 5 // Reduced from 6

        // Add receiver contact
        doc.text(`Receiver Contact : ${booking.consigneeMobile}`, leftColumnX, currentY)
        doc.text(`Receiver Contact : ${booking.consigneeMobile}`, rightColumnX, currentY)

        // Add organization and destination with text wrapping
        currentY += 4 // Reduced from 5
        doc.text(`Org : BORIVALI PADMAVATI`, leftColumnX, currentY)

        // Destination with wrapping
        doc.text(`Dest :`, leftColumnX + 40, currentY)
        const destLeftY = addWrappedText(booking.deliveryDestination, leftColumnX + 50, currentY, 30, 3.5) // Reduced line height

        doc.text(`Org : BORIVALI`, rightColumnX, currentY)

        doc.text(`Dest :`, rightColumnX + 40, currentY)
        const destRightY = addWrappedText(booking.deliveryDestination, rightColumnX + 50, currentY, 30, 3.5) // Reduced line height

        // Update currentY to the maximum Y position
        currentY = Math.max(destLeftY, destRightY) + 5 // Reduced from 6

        doc.text(`CARGO SERV (Mumbai)`, leftColumnX, currentY)
        doc.text(`PADMAVATI CARGO SERV`, rightColumnX, currentY)

        // Add article details
        currentY += 5 // Reduced from 7
        const articles = Array.isArray(booking.articles) ? booking.articles : []

        // Define leftCurrentY and rightCurrentY before using them
        const leftCurrentY = currentY
        const rightCurrentY = currentY

        // Calculate total quantity
        const totalQuantity = articles.reduce((sum, article) => sum + (article.quantity || 1), 0)

        // Place No. Of Pkgs and Total side by side on the same line
        doc.text(`No. Of Pkgs: ${totalQuantity}`, leftColumnX, currentY)
        doc.text(`Total : ${(booking.totalAmount ?? 0).toFixed(2)}`, leftColumnX + 40, currentY)

        doc.text(`No. Of Pkgs: ${totalQuantity}`, rightColumnX, currentY)
        doc.text(`Total : ${(booking.totalAmount ?? 0).toFixed(2)}`, rightColumnX + 40, currentY)

        // Update the current Y position
        currentY += 4 // Reduced from 5

        // Place Booking By and Print Time side by side on the same line
        const printTime = new Date().toLocaleTimeString()
        doc.text(`Booking By : PADMA`, leftColumnX, currentY)
        doc.text(`Print Time : ${printTime}`, leftColumnX + 40, currentY)

        doc.text(`Booking By : PADMA`, rightColumnX, currentY)
        doc.text(`Print Time : ${printTime}`, rightColumnX + 40, currentY)

        // Update the current Y position
        currentY += 7 // Adjusted spacing for next section

        // Add delivery address with text wrapping - add more spacing
        doc.text(`Delivery Address :`, leftColumnX, currentY)

        // Add the address directly with more spacing
        const nameLeftY = addWrappedText(booking.consigneeCompanyName || "", leftColumnX + 30, currentY, 60, 3.5) // Reduced line height

        // Then add the address on the next line
        const addrLeftY = addWrappedText(booking.consigneeAddress || "", leftColumnX + 30, nameLeftY, 60, 3.5) // Reduced line height

        doc.text(`Delivery Address :`, rightColumnX, currentY)

        // Add the address directly with more spacing
        const nameRightY = addWrappedText(booking.consigneeCompanyName || "", rightColumnX + 30, currentY, 60, 3.5) // Reduced line height

        // Then add the address on the next line
        const addrRightY = addWrappedText(booking.consigneeAddress || "", rightColumnX + 30, nameRightY, 60, 3.5) // Reduced line height

        // Update currentY to the maximum Y position with additional spacing
        currentY = Math.max(addrLeftY, addrRightY) + 6 // Reduced from 8

        // Add delivery contact - ensure we're using the value from the booking object
        const deliveryContact = booking.deliveryContact || "N/A"
        doc.text(`Delivery Contact: ${deliveryContact}`, leftColumnX, currentY)
        doc.text(`Delivery Contact: ${deliveryContact}`, rightColumnX, currentY)

        // Add a dividing line between the two copies
        doc.setDrawColor(0)
        doc.setLineWidth(0.5)
        doc.line(103, 10, 103, currentY + 10)

        // Create a Blob from the PDF
        const pdfBlob = doc.output("blob")
        resolve(pdfBlob)
      }
    } catch (error) {
      console.error("Error generating PDF content:", error)
      // Create a simple fallback PDF
      try {
        const doc = new jsPDF()
        doc.setFontSize(12) // Reduced from 14
        doc.text(`Booking Invoice: ${booking.id}`, 14, 20)
        doc.text(`Type: ${booking.bookingType}`, 14, 30)
        doc.text(`Date: ${booking.bookingDate}`, 14, 40)
        doc.text(`Total Amount: ₹${booking.totalAmount.toFixed(2)}`, 14, 50)
        const fallbackBlob = doc.output("blob")
        resolve(fallbackBlob)
      } catch (fallbackError) {
        reject(fallbackError)
      }
    }
  })
}

// Upload PDF to Google Drive and update booking record
export const uploadInvoicePDF = async (
  booking: Booking,
  pdfBlob: Blob,
  options?: { skipUpload?: boolean },
): Promise<string | null> => {
  if (options?.skipUpload) {
    // Skip upload and return null
    return null
  }
  try {
    // Use the booking ID (LR number) for the filename
    const filename = `${booking.id}.pdf`

    // Upload the PDF blob to Google Drive
    const downloadURL = await uploadFileToDrive(pdfBlob, filename)

    // Update the booking record in Firestore with the PDF URL
    const bookingRef = doc(db, "bookings", booking.id)
    await updateDoc(bookingRef, {
      pdfUrl: downloadURL,
      invoiceUrl: downloadURL, // For backward compatibility
      updatedAt: new Date().toISOString(),
    })

    return downloadURL
  } catch (error) {
    console.error("Error uploading PDF to Google Drive:", error)
    throw error
  }
}

// Common download function
export const downloadInvoicePDF = async (
  booking: Booking,
  filename?: string,
  options?: { skipUpload?: boolean },
): Promise<void> => {
  try {
    // Use the booking ID (LR number) for the filename if not specified
    const defaultFilename = `${booking.id}.pdf`

    // Check if the booking already has a PDF URL
    if ((booking.pdfUrl || booking.invoiceUrl) && !options?.skipUpload) {
      // Use the existing PDF URL
      const pdfUrl = booking.pdfUrl || booking.invoiceUrl
      const link = document.createElement("a")
      link.href = pdfUrl
      link.download = filename || defaultFilename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
      // Generate a new PDF
      const pdfBlob = await generateInvoicePDF(booking, options)

      // Upload to Firebase and get URL if not skipped
      let pdfUrl: string | null = null
      if (!options?.skipUpload) {
        try {
          // Use the booking ID (LR number) for the uploaded file name
          pdfUrl = await uploadInvoicePDF(booking, pdfBlob, options)
        } catch (uploadError) {
          console.error("Error uploading PDF, continuing with download:", uploadError)
        }
      }

      // Use local URL if upload skipped or failed
      if (!pdfUrl) {
        pdfUrl = URL.createObjectURL(pdfBlob)
      }

      const link = document.createElement("a")
      link.href = pdfUrl
      link.download = filename || defaultFilename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 100)
    }
  } catch (error) {
    console.error("Error downloading invoice PDF:", error)
    throw error
  }
}

// Common view function
export const viewInvoicePDF = async (booking: Booking, options?: { skipUpload?: boolean }): Promise<void> => {
  try {
    // Check if the booking already has a PDF URL and skipUpload is not set
    if ((booking.pdfUrl || booking.invoiceUrl) && !options?.skipUpload) {
      // Use the existing PDF URL
      const pdfUrl = booking.pdfUrl || booking.invoiceUrl
      window.open(pdfUrl, "_blank")
    } else {
      // Generate a new PDF
      const pdfBlob = await generateInvoicePDF(booking, options)

      // Upload to Firebase and get URL if not skipped
      let pdfUrl: string | null = null
      if (!options?.skipUpload) {
        try {
          pdfUrl = await uploadInvoicePDF(booking, pdfBlob, options)
          window.open(pdfUrl, "_blank")
        } catch (uploadError) {
          console.error("Error uploading PDF, continuing with local view:", uploadError)
          // Fallback to local blob URL if upload fails
          pdfUrl = URL.createObjectURL(pdfBlob)
          window.open(pdfUrl, "_blank")
          setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000)
        }
      } else {
        // If upload skipped, open local blob URL
        pdfUrl = URL.createObjectURL(pdfBlob)
        window.open(pdfUrl, "_blank")
        setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000)
      }
    }
  } catch (error) {
    console.error("Error viewing invoice PDF:", error)
    throw error
  }
}

// Generate PDF for reports
export const generateReportPDF = async (title: string, columns: string[], data: any[]): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    try {
      // Get company settings from Redux store
      const { companyName, companyAddress, companyPhone, companyEmail, companyLogo } = store.getState().settings

      // Create a new PDF document
      const doc = new jsPDF()

      // Add company logo if available
      if (companyLogo) {
        try {
          const img = new Image()
          img.crossOrigin = "anonymous"
          img.onload = () => {
            try {
              doc.addImage(img, "JPEG", 14, 10, 40, 20)
              addContent()
            } catch (imgError) {
              console.error("Error adding logo image:", imgError)
              addContent() // Continue without logo
            }
          }
          img.onerror = () => {
            console.error("Error loading logo image")
            addContent() // Continue without logo
          }
          img.src = companyLogo
        } catch (logoError) {
          console.error("Error with logo:", logoError)
          addContent() // Continue without logo
        }
      } else {
        addContent()
      }

      function addContent() {
        // Add report header
        doc.setFontSize(20)
        doc.setTextColor(66, 89, 165) // Brand color
        doc.text(companyName, 105, 20, { align: "center" })

        doc.setFontSize(12)
        doc.setTextColor(0, 0, 0) // Reset to black
        doc.text(companyAddress, 105, 28, { align: "center" })
        doc.text(`Phone: ${companyPhone} | Email: ${companyEmail}`, 105, 34, { align: "center" })

        // Add horizontal line
        doc.setDrawColor(66, 89, 165) // Brand color
        doc.setLineWidth(0.5)
        doc.line(14, 38, 196, 38)

        // Add report title
        doc.setFontSize(16)
        doc.text(title, 105, 48, { align: "center" })

        // Add date
        doc.setFontSize(10)
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 58)

        // Prepare table data
        const tableData = data.map((item) => {
          return columns.map((col) => item[col] || "")
        })

        // Add table
        autoTable(doc, {
          startY: 65,
          head: [columns],
          body: tableData,
          theme: "grid",
          headStyles: {
            fillColor: [66, 89, 165],
            textColor: [255, 255, 255],
            fontStyle: "bold",
          },
        })

        // Get the final Y position after the table
        const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY + 10 || 135

        // Add footer
        doc.setFontSize(8)
        doc.text(`Report generated by ${companyName} ERP System`, 105, finalY + 10, { align: "center" })
        doc.text(`${new Date().toLocaleString()}`, 105, finalY + 15, { align: "center" })

        // Create a Blob from the PDF
        const pdfBlob = doc.output("blob")
        resolve(pdfBlob)
      }
    } catch (error) {
      console.error("Error generating report PDF:", error)
      reject(error)
    }
  })
}

// Download report as PDF
export const downloadReportPDF = async (title: string, columns: string[], data: any[]): Promise<void> => {
  try {
    const pdfBlob = await generateReportPDF(title, columns, data)
    const pdfUrl = URL.createObjectURL(pdfBlob)
    const link = document.createElement("a")
    link.href = pdfUrl
    link.download = `${title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(pdfUrl), 100)
  } catch (error) {
    console.error("Error downloading report PDF:", error)
    throw error
  }
}
