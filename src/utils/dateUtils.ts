import { format, parse, isValid, subDays } from "date-fns"

// Format a date string to display format
export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    if (!isValid(date)) return "Invalid date"
    return format(date, "dd/MM/yyyy")
  } catch (error) {
    console.error("Error formatting date:", error)
    return "Invalid date"
  }
}

// Parse a display format date to ISO string
export const parseDate = (displayDate: string): string => {
  try {
    const date = parse(displayDate, "dd/MM/yyyy", new Date())
    if (!isValid(date)) return ""
    return date.toISOString().split("T")[0]
  } catch (error) {
    console.error("Error parsing date:", error)
    return ""
  }
}

// Get today's date in ISO format
export const getTodayISO = (): string => {
  return new Date().toISOString().split("T")[0]
}

// Get date range for reports
export const getDateRange = (range: string): { from: Date; to: Date } => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const to = new Date(today)
  let from = new Date(today)

  switch (range) {
    case "today":
      // from and to are both today
      break
    case "yesterday":
      from = subDays(today, 1)
      let to = subDays(today, 1)
      break
    case "thisWeek":
      // Start of the week (Sunday)
      const day = today.getDay()
      from = subDays(today, day)
      break
    case "lastWeek":
      // Last week (Sunday to Saturday)
      const currentDay = today.getDay()
      from = subDays(today, currentDay + 7)
      to = subDays(today, currentDay + 1)
      break
    case "thisMonth":
      // Start of the month
      from = new Date(today.getFullYear(), today.getMonth(), 1)
      break
    case "lastMonth":
      // Last month
      from = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      to = new Date(today.getFullYear(), today.getMonth(), 0)
      break
    case "last30Days":
      from = subDays(today, 30)
      break
    case "last90Days":
      from = subDays(today, 90)
      break
    default:
      // Default to last 7 days
      from = subDays(today, 7)
  }

  return { from, to }
}
    