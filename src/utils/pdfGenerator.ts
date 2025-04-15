import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import type { Booking } from "../models/booking"
import { store } from "../store/store"
import { db } from "@/lib/firebase"
import { doc, updateDoc } from "firebase/firestore"
import { uploadFileToDrive } from "./googleDrive"

// Generate PDF for a booking
export const generateInvoicePDF = async (booking: Booking, options?: { skipUpload?: boolean }): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    try {
      // Get company settings from Redux store
      const { companyName, companyAddress, companyPhone, companyEmail, companyLogo, invoiceHeader } =
        store.getState().settings

      // Create a new PDF document
      const doc = new jsPDF()

      // Add company logo
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
        // Add invoice header
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

        // Add booking details
        doc.setFontSize(16)
        doc.text(`${booking.bookingType} BOOKING INVOICE`, 105, 48, { align: "center" })

        // Add LR number and date
        doc.setFontSize(12)
        doc.text(`LR No: ${booking.id}`, 14, 58)
        doc.text(`Date: ${booking.bookingDate}`, 150, 58)

        // Consignor and Consignee details
        doc.setFontSize(11)
        doc.setFont(undefined, "bold")
        doc.text("Consignor (From):", 14, 68)
        doc.text("Consignee (To):", 110, 68)

        doc.setFont(undefined, "normal")
        doc.setFontSize(10)
        doc.text(booking.consignorName, 14, 75)
        doc.text(`Mobile: ${booking.consignorMobile}`, 14, 81)
        doc.text(booking.consignorAddress || "", 14, 87, { maxWidth: 80 })

        doc.text(booking.consigneeName, 110, 75)
        doc.text(`Mobile: ${booking.consigneeMobile}`, 110, 81)
        doc.text(booking.consigneeAddress || "", 110, 87, { maxWidth: 80 })

        // Destination and Invoice details
        doc.setFontSize(10)
        doc.text(`Destination: ${booking.deliveryDestination}`, 14, 100)
        doc.text(`Invoice No: ${booking.invoiceNo || booking.id}`, 110, 100)
        doc.text(`Declared Value: ₹${booking.declaredValue.toFixed(2)}`, 14, 106)
        doc.text(`Form Type: ${booking.formType}`, 110, 106)

        // Add articles table
        const articleTableData = booking.articles.map((article) => [
          article.articleName,
          article.artType,
          `${article.actualWeight} kg`,
          `₹${article.weightRate.toFixed(2)}`,
          `₹${article.weightAmount.toFixed(2)}`,
        ])

        autoTable(doc, {
          startY: 115,
          head: [["Article", "Art Type", "Weight", "Rate", "Amount"]],
          body: articleTableData,
          theme: "grid",
          headStyles: {
            fillColor: [66, 89, 165],
            textColor: [255, 255, 255],
            fontStyle: "bold",
          },
          footStyles: {
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            fontStyle: "bold",
          },
          foot: [
            [
              {
                content: "Total Amount:",
                colSpan: 4,
                styles: { halign: "right" },
              },
              `₹${booking.totalAmount.toFixed(2)}`,
            ],
          ],
        })

        // Get the final Y position after the table
        const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY + 10 || 135

        // Add additional information below the table
        doc.text(`Said to Contain: ${booking.saidToContain || ""}`, 14, finalY)
        doc.text(`Remarks: ${booking.remarks || ""}`, 14, finalY + 6)

        // Add status information
        doc.text(`Status: ${booking.status}`, 14, finalY + 12)
        if (booking.dispatchDate) {
          doc.text(`Dispatch Date: ${booking.dispatchDate}`, 14, finalY + 18)
        }
        if (booking.receiveDate) {
          doc.text(`Receive Date: ${booking.receiveDate}`, 14, finalY + 24)
        }
        if (booking.deliveryDate) {
          doc.text(`Delivery Date: ${booking.deliveryDate}`, 14, finalY + 30)
        }

        // Add company details
        doc.text(`${companyName}`, 14, finalY + 40)
        doc.text(`${companyAddress}`, 14, finalY + 46)
        doc.text(`Phone: ${companyPhone}`, 14, finalY + 52)

        // Add signatures section
        doc.text("For Padmavati Travels", 14, finalY + 65)
        doc.text("Receiver's Signature", 140, finalY + 65)

        // Footer with terms and conditions
        const footerY = finalY + 80
        doc.setFontSize(8)
        doc.text("Terms & Conditions:", 14, footerY)
        doc.text("1. Goods are carried subject to the terms and conditions of Padmavati Travels.", 14, footerY + 4)
        doc.text(
          "2. Claims if any should be submitted in writing within 7 days from the date of delivery.",
          14,
          footerY + 8,
        )
        doc.text("3. Company is not responsible for any damage due to improper packaging.", 14, footerY + 12)

        // Create a Blob from the PDF
        const pdfBlob = doc.output("blob")
        resolve(pdfBlob)
      }
    } catch (error) {
      console.error("Error generating PDF content:", error)
      // Create a simple fallback PDF
      try {
        const doc = new jsPDF()
        doc.setFontSize(14)
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
export const uploadInvoicePDF = async (booking: Booking, pdfBlob: Blob, options?: { skipUpload?: boolean }): Promise<string | null> => {
  if (options?.skipUpload) {
    // Skip upload and return null
    return null
  }
  try {
    // Upload the PDF blob to Google Drive
    const downloadURL = await uploadFileToDrive(pdfBlob, `${booking.id}_invoice.pdf`)

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
export const downloadInvoicePDF = async (booking: Booking, filename?: string, options?: { skipUpload?: boolean }): Promise<void> => {
  try {
    // Check if the booking already has a PDF URL
    if ((booking.pdfUrl || booking.invoiceUrl) && !options?.skipUpload) {
      // Use the existing PDF URL
      const pdfUrl = booking.pdfUrl || booking.invoiceUrl
      const link = document.createElement("a")
      link.href = pdfUrl
      link.download = filename || `${booking.id}_invoice.pdf`
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
      link.download = filename || `${booking.id}_invoice.pdf`
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
