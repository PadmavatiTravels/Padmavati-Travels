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
      const { companyName, companyAddress, companyPhone, companyEmail, companyLogo } =
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
              // Add logo to both copies
              doc.addImage(img, "JPEG", 14, 10, 20, 20) // Branch copy logo
              doc.addImage(img, "JPEG", 110, 10, 20, 20) // Customer copy logo
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

        // Add company name for both copies
        doc.setFontSize(12)
        doc.setFont(undefined, 'bold')
        doc.text("MUMBAI - BORIVALI", leftColumnX + 25, currentY + 5)
        doc.text("MUMBAI - BORIVALI", rightColumnX + 25, currentY + 5)
        
        doc.setFontSize(12)
        doc.text("PADMAVATI", leftColumnX + 25, currentY + 10)
        doc.text("PADMAVATI", rightColumnX + 25, currentY + 10)
        
        doc.text("CARGO SERV", leftColumnX + 25, currentY + 15)
        doc.text("CARGO SERV", rightColumnX + 25, currentY + 15)
        
        // Add location details
        currentY += 20
        doc.setFontSize(8)
        doc.setFont(undefined, 'normal')
        doc.text("NEAR AXIS BANK BRIDGE ENDING,", leftColumnX + 25, currentY)
        doc.text("NEAR AXIS BANK BRIDGE ENDING,", rightColumnX + 25, currentY)
        
        currentY += 5
        doc.text("KULUPWADI, BORIVALI EAST.", leftColumnX + 25, currentY)
        doc.text("KULUPWADI, BORIVALI EAST.", rightColumnX + 25, currentY)
        
        currentY += 5
        doc.text(`Ph.No : ${companyPhone}, --`, leftColumnX + 25, currentY)
        doc.text(`Ph.No : ${companyPhone}, --`, rightColumnX + 25, currentY)
        
        // Add copy type headers
        currentY += 10
        doc.setFontSize(10)
        doc.setFont(undefined, 'bold')
        doc.text("Branch Copy", leftColumnX + 10, currentY)
        doc.text("Booking Receipt", leftColumnX + 60, currentY)
        doc.text("Customer Copy", rightColumnX + 10, currentY)
        doc.text("Booking Receipt", rightColumnX + 60, currentY)
        
        // Add booking queries contact
        currentY += 8
        doc.setFontSize(8)
        doc.setFont(undefined, 'normal')
        doc.text(`For Booking Queries Contact : ${companyPhone}/--`, leftColumnX, currentY)
        doc.text(`For Booking Queries Contact : ${companyPhone}/--`, rightColumnX, currentY)
        
        // Add LR Number and booking details
        currentY += 6
        doc.text(`Lr Number : ${booking.id}`, leftColumnX, currentY)
        doc.text(`Lr Number : ${booking.id}`, rightColumnX, currentY)
        
        currentY += 6
        doc.text(`Booking Time : ${booking.bookingDate} ${new Date().toLocaleTimeString()}`, leftColumnX, currentY)
        doc.text(`Booking Time : ${booking.bookingDate} ${new Date().toLocaleTimeString()}`, rightColumnX, currentY)
        
        currentY += 6
        doc.text(`Lr Type : ${booking.bookingType}`, leftColumnX, currentY)
        doc.text(`Invoice No.: ${booking.invoiceNo || ''}`, leftColumnX + 50, currentY)
        doc.text(`Lr Type : ${booking.bookingType}`, rightColumnX, currentY)
        doc.text(`Invoice No.: ${booking.invoiceNo || ''}`, rightColumnX + 50, currentY)
        
        // Add From and To details
        currentY += 6
        doc.text(`From : ${booking.consignorName}`, leftColumnX, currentY)
        doc.text(`To : ${booking.consigneeName}`, leftColumnX + 50, currentY)
        doc.text(`From : ${booking.consignorName}`, rightColumnX, currentY)
        doc.text(`To : ${booking.consigneeName}`, rightColumnX + 50, currentY)
        
        // Add receiver contact
        currentY += 6
        doc.text(`Receiver Contact Number : ${booking.consigneeMobile}`, leftColumnX, currentY)
        doc.text(`Receiver Contact Number : ${booking.consigneeMobile}`, rightColumnX, currentY)
        
        // Add organization and destination
        currentY += 6
        doc.text(`Org : BORIVALI PADMAVATI`, leftColumnX, currentY)
        doc.text(`Dest : ${booking.deliveryDestination}`, leftColumnX + 50, currentY)
        doc.text(`Org : BORIVALI`, rightColumnX, currentY)
        doc.text(`Dest : ${booking.deliveryDestination}`, rightColumnX + 50, currentY)
        
        doc.text(`CARGO SERV (Mumbai)`, leftColumnX, currentY + 6)
        doc.text(`PADMAVATI CARGO SERV`, rightColumnX, currentY + 6)
        
        // Add article details
        currentY += 12
        doc.text(`No. Of Pkgs : ${booking.articles.length}`, leftColumnX, currentY)
        doc.text(`Art Type : ${booking.articles[0]?.artType || 'BOX'}`, leftColumnX + 50, currentY)
        doc.text(`No. Of Pkgs : ${booking.articles.length}`, rightColumnX, currentY)
        doc.text(`Art Type : ${booking.articles[0]?.artType || 'BOX'}`, rightColumnX + 50, currentY)
        
        // Add total amount
        currentY += 6
        doc.text(`Total : ${booking.totalAmount.toFixed(2)}`, leftColumnX, currentY)
        doc.text(`Total : ${booking.totalAmount.toFixed(2)}`, rightColumnX, currentY)
        
        // Add booking and printing details
        currentY += 6
        doc.text(`Booking By : ${booking.bookedBy || 'ADMIN'}`, leftColumnX, currentY)
        doc.text(`Printed By : ${booking.bookedBy || 'ADMIN'}`, leftColumnX + 50, currentY)
        doc.text(`Booking By : ${booking.bookedBy || 'ADMIN'}`, rightColumnX, currentY)
        doc.text(`Printed By : ${booking.bookedBy || 'ADMIN'}`, rightColumnX + 50, currentY)
        
        // Add print time
        currentY += 6
        const printTime = new Date().toLocaleTimeString()
        doc.text(`Print Time : ${printTime}`, leftColumnX, currentY)
        doc.text(`Print Time : ${printTime}`, rightColumnX, currentY)
        
        // Add delivery address
        currentY += 6
        const deliveryAddress = booking.consigneeAddress || ''
        doc.text(`Delivery Address : ${deliveryAddress}`, leftColumnX, currentY)
        doc.text(`Delivery Address : ${deliveryAddress}`, rightColumnX, currentY)
        
        // Add delivery contact
        currentY += 6
        doc.text(`Delivery Contact : ${booking.consigneeMobile}`, leftColumnX, currentY)
        doc.text(`Delivery Contact : ${booking.consigneeMobile}`, rightColumnX, currentY)
        
        // Add a dividing line between the two copies
        doc.setDrawColor(0)
        doc.setLineWidth(0.5)
        doc.line(105, 10, 105, currentY + 10)

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
