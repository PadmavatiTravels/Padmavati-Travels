import { generateReportPDF } from "./pdfGenerator"

interface ReportOptions {
  title: string
  subtitle?: string
  data: any[]
  columns: string[]
  reportType: string
}

// Generate and download PDF report
export const generatePDFReport = async (options: ReportOptions): Promise<void> => {
  try {
    const { title, data, columns, reportType } = options

    // Format column headers for PDF
    const pdfColumns = columns.map((col) => ({
      header: col,
      dataKey: col.toLowerCase().replace(/\s+/g, ""),
    }))

    // Format data for PDF
    const pdfData = data.map((item) => {
      const row: Record<string, any> = {}
      columns.forEach((col) => {
        const key = col.toLowerCase().replace(/\s+/g, "")
        switch (col) {
          case "LR No.":
            row[key] = item.id
            break
          case "Date":
          case "Booking Date":
            row[key] = item.date || item.bookingDate
            break
          case "Branch":
            row[key] = item.branch || "Bangalore"
            break
          case "From":
            row[key] = item.from || item.consignorName
            break
          case "Destination":
          case "To":
            row[key] = item.destination || item.to || item.deliveryDestination
            break
          case "Type":
            row[key] = item.type || item.bookingType
            break
          case "Status":
            row[key] = item.status || "N/A"
            break
          case "Amount":
            row[key] = item.amount ? `₹${item.amount.toFixed(2)}` : "N/A"
            break
          case "Dispatch Date":
            row[key] = item.dispatchDate || "N/A"
            break
          case "Delivery Date":
            row[key] = item.deliveryDate || "N/A"
            break
          default:
            row[key] = item[key] || "N/A"
        }
      })
      return row
    })

    await generateReportPDF(title, columns, pdfData)
  } catch (error) {
    console.error("Error generating PDF report:", error)
    throw error
  }
}

// Note: Excel report generation function has been removed
