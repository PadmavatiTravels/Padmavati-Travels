import type { Article, BookingType, Booking } from "@/models/booking";
import { db } from "@/lib/firebase";
import {
  collection,
  setDoc,
  doc,
  getDocs,
  query,
  where,
  updateDoc,
  getDoc,
  orderBy,
  limit,
  arrayUnion,
} from "firebase/firestore";

// Function to calculate weight amount based on weight and rate
export const calculateWeightAmount = (article: Article): number => {
  if (!article.actualWeight || !article.weightRate) return 0;
  return article.actualWeight * article.weightRate;
};

// Function to calculate total article amount
export const calculateTotalArticleAmount = (articles: Article[]): number => {
  return articles.reduce((total, article) => total + (article.weightAmount || 0), 0);
};


export const generateBookingId = async (): Promise<string> => {
  try {
    // Try two different queries to ensure we get the latest booking
    
    // First, try querying by the 'id' field in the document
    const bookingsRef = collection(db, "bookings");
    const q1 = query(bookingsRef, orderBy("id", "desc"), limit(1));
    const querySnapshot1 = await getDocs(q1);
    
    let latestBooking = null;
    let latestId = "";
    
    if (!querySnapshot1.empty) {
      latestBooking = querySnapshot1.docs[0].data();
      latestId = latestBooking.id as string;
      console.log("Found booking by 'id' field:", latestId);
    } else {
      console.log("No bookings found by 'id' field, checking document IDs");
      
      // If no results, try getting all documents and sort them manually
      const allBookingsSnapshot = await getDocs(collection(db, "bookings"));
      
      if (!allBookingsSnapshot.empty) {
        // Convert to array and sort by document ID
        const bookings = allBookingsSnapshot.docs.map(doc => ({
          docId: doc.id,
          ...doc.data()
        }));
        
        // Filter for IDs that start with PT and sort them
        const ptBookings = bookings
          .filter(b => b.docId.startsWith("PT"))
          .sort((a, b) => {
            const numA = parseInt(a.docId.substring(2), 10);
            const numB = parseInt(b.docId.substring(2), 10);
            return numB - numA; // Descending order
          });
        
        if (ptBookings.length > 0) {
          latestBooking = ptBookings[0];
          latestId = ptBookings[0].docId;
          console.log("Found booking by document ID:", latestId);
        }
      }
    }
    
    let nextNumber = 100; // Start with PT100 if no bookings exist
    
    if (latestId && latestId.startsWith("PT")) {
      const numberPart = latestId.substring(2);
      const currentNumber = parseInt(numberPart, 10);
      
      if (!isNaN(currentNumber)) {
        nextNumber = currentNumber + 1;
        console.log(`Found latest booking ID: ${latestId}, next number will be: PT${nextNumber}`);
      }
    } else {
      console.log("No valid PT bookings found, starting with PT100");
    }
    
    return `PT${nextNumber}`;
  } catch (error) {
    console.error("Error generating booking ID:", error);
    return `PT100`; // Default to PT100 in case of error
  }
};

// Function to create a new booking
export const createBooking = async (bookingData: Partial<Booking>): Promise<string> => {
  try {
    const bookingId = await generateBookingId();
    let invoiceNo = bookingData.invoiceNo;
    
    // If no invoice number is provided, generate one
    if (!invoiceNo) {
      invoiceNo = await generateInvoiceNumber();
    }
    
    // Create a complete booking object with all required fields
    const newBooking: Booking = {
      id: bookingId, // This is important - the ID field in the document should match the document ID
      bookingType: bookingData.bookingType || BookingType.PAID,
      bookingDate: bookingData.bookingDate || new Date().toISOString().split("T")[0],
      deliveryDestination: bookingData.deliveryDestination || "",
      
      // Consignor details
      consignorName: bookingData.consignorName || "",
      consignorMobile: bookingData.consignorMobile || "",
      consignorAddress: bookingData.consignorAddress || "",
      
      // Consignee details
      consigneeName: bookingData.consigneeName || "",
      consigneeMobile: bookingData.consigneeMobile || "",
      consigneeAddress: bookingData.consigneeAddress || "",
      
      articles: bookingData.articles || [],
      totalArticles: bookingData.totalArticles || 0,
      
      formType: bookingData.formType || "Eway Bill",
      invoiceNo: invoiceNo,
      declaredValue: bookingData.declaredValue || 0,
      saidToContain: bookingData.saidToContain || "",
      remarks: bookingData.remarks || "",
      
      fixAmount: bookingData.fixAmount || 0,
      articleAmount: bookingData.articleAmount || 0,
      totalAmount: bookingData.totalAmount || 0,
      
      status: bookingData.status || "Booked",
      
      bookedBy: bookingData.bookedBy || "ADMIN",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to Firestore with the custom ID as the document ID
    const bookingRef = doc(db, "bookings", bookingId);
    await setDoc(bookingRef, newBooking);
    
    return bookingId;
  } catch (error) {
    console.error("Error creating booking:", error);
    throw error;
  }
};

// Function to add a new dropdown option to Firestore
export const addDropdownOption = async (type: "destinations" | "articleTypes", value: string) => {
  try {
    const docRef = doc(db, "dropdownOptions", "options");

    // First check if the document exists
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      // Document exists, update it
      await updateDoc(docRef, {
        [type]: arrayUnion(value),
      });
    } else {
      // Document doesn't exist, create it
      await setDoc(docRef, {
        [type]: [value],
      });
    }

    return true;
  } catch (error) {
    console.error("Error adding dropdown option:", error);
    throw error;
  }
};

// Function to get previous field values from Firestore
export const getPreviousValues = async (): Promise<{ [fieldName: string]: string[] }> => {
  try {
    const docRef = doc(db, "fieldHistory", "values");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as { [fieldName: string]: string[] };
    } else {
      // If document does not exist, create with empty object
      await setDoc(docRef, {});
      return {};
    }
  } catch (error) {
    console.error("Error getting previous values:", error);
    return {};
  }
};

// Function to save field values to Firestore
export const savePreviousValues = async (values: { [fieldName: string]: string[] }): Promise<boolean> => {
  try {
    const docRef = doc(db, "fieldHistory", "values");
    await setDoc(docRef, values);
    return true;
  } catch (error) {
    console.error("Error saving previous values:", error);
    return false;
  }
};

// Function to get bookings by type
export const getBookingsByType = async (bookingType: BookingType) => {
  try {
    const bookingDocs = await getDocs(query(collection(db, "bookings"), where("type", "==", bookingType)));
    return bookingDocs.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error getting bookings:", error);
    throw error;
  }
};

// Function to get a booking by ID
export const getBookingById = async (bookingId: string) => {
  try {
    const docRef = doc(db, "bookings", bookingId)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() }
    } else {
      return null // Changed from throwing an error to returning null for better error handling
    }
  } catch (error) {
    console.error("Error getting booking:", error)
    throw error
  }
};

// Function to get recent bookings
export const getRecentBookings = async (limitCount = 10) => {
  try {
    const bookingDocs = await getDocs(query(collection(db, "bookings"), orderBy("createdAt", "desc"), limit(limitCount)));
    return bookingDocs.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error getting bookings:", error);
    throw error;
  }
};

// Add any other missing exports here
export const updateBookingStatus = async (bookingId: string, status: string, dateField?: string) => {
  try {
    const docRef = doc(db, "bookings", bookingId);
    const updateData: any = { 
      status, 
      updatedAt: new Date().toISOString() 
    };
    
    if (dateField) {
      updateData[dateField] = new Date().toISOString().split("T")[0];
    }
    
    await updateDoc(docRef, updateData);
    return true;
  } catch (error) {
    console.error("Error updating booking status:", error);
    throw error;
  }
};

// Function to fetch related address data for a given destination
export const fetchDestinationAddress = async (destination: string): Promise<{ consignorAddress: string; consigneeAddress: string } | null> => {
  try {
    const docRef = doc(db, "destinationAddresses", destination);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as { consignorAddress: string; consigneeAddress: string };
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching destination address:", error);
    return null;
  }
};

// Function to save destination-address mapping
export const saveDestinationAddress = async (
  destination: string,
  addressData: { consignorAddress: string; consigneeAddress: string }
): Promise<boolean> => {
  try {
    const docRef = doc(db, "destinationAddresses", destination);
    await setDoc(docRef, addressData);
    return true;
  } catch (error) {
    console.error("Error saving destination address:", error);
    return false;
  }
};

// Helper function to generate invoice numbers starting with 100
export const generateInvoiceNumber = async (): Promise<string> => {
  try {
    const bookingsRef = collection(db, "bookings");
    // Query bookings with non-empty invoiceNo, ordered by invoiceNo in descending order
    const q = query(
      bookingsRef, 
      orderBy("invoiceNo", "desc"), 
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    
    let nextNumber = 100; // Start with 100 if no invoices exist
    
    if (!querySnapshot.empty) {
      const latestBooking = querySnapshot.docs[0].data();
      if (latestBooking.invoiceNo) {
        // Parse the invoice number, assuming it's a string containing a number
        const currentNumber = parseInt(latestBooking.invoiceNo, 10);
        
        if (!isNaN(currentNumber)) {
          nextNumber = currentNumber + 1;
        }
      }
    }
    
    return nextNumber.toString();
  } catch (error) {
    console.error("Error generating invoice number:", error);
    // Fallback to a static number if there's an error
    return "100"; // Default to 100 in case of error
  }
};
