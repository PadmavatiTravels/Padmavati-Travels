import { createSlice, type PayloadAction, createAsyncThunk } from "@reduxjs/toolkit"
import type { Booking } from "@/models/booking"
import { doc, getDoc, setDoc, updateDoc, arrayUnion, getFirestore } from "firebase/firestore"
import { getAuth } from "firebase/auth"

interface BookingState {
  currentBooking: Partial<Booking> | null
  destinations: string[]
  articleTypes: string[]
  recentBookings: Booking[]
  loadingDropdowns: boolean
  errorDropdowns: string | null
}

const initialState: BookingState = {
  currentBooking: null,
  destinations: [],
  articleTypes: [],
  recentBookings: [],
  loadingDropdowns: false,
  errorDropdowns: null,
}

// Async thunk to fetch dropdown options from Firestore
export const fetchDropdownOptions = createAsyncThunk("booking/fetchDropdownOptions", async (_, { rejectWithValue }) => {
  try {
    // Fix: Get current user directly from Firebase Auth instead of relying on Redux state
    const auth = getAuth()
    const currentUser = auth.currentUser

    if (!currentUser) {
      console.log("User not authenticated, returning default options")
      return {
        destinations: [],
        articleTypes: [],
      }
    }

    const db = getFirestore()
    const userDocRef = doc(db, "users", currentUser.uid)
    const docSnap = await getDoc(userDocRef)

    if (docSnap.exists()) {
      const userData = docSnap.data()
      return {
        destinations: userData.bookingData?.destinations || [],
        articleTypes: userData.bookingData?.articleTypes || [],
      }
    } else {
      // Initialize with empty arrays if document doesn't exist
      await setDoc(userDocRef, {
        bookingData: {
          destinations: [],
          articleTypes: [],
        },
      })
      return { destinations: [], articleTypes: [] }
    }
  } catch (error: unknown) {
    console.error("Error in fetchDropdownOptions:", error)
    if (error instanceof Error) {
      return rejectWithValue(error.message)
    }
    return rejectWithValue("Unknown error")
  }
})

// Async thunk to add a new destination to Firestore and store
export const addDestinationAsync = createAsyncThunk(
  "booking/addDestinationAsync",
  async ({ 
    destination, 
    userId, 
    consigneeCompanyName, 
    deliveryContact 
  }: { 
    destination: string; 
    userId: string; 
    consigneeCompanyName?: string; 
    deliveryContact?: string; 
  }, { rejectWithValue }) => {
    try {
      if (!userId) {
        throw new Error("User not authenticated")
      }

      const db = getFirestore()
      const userDocRef = doc(db, "users", userId)

      // First check if the document exists
      const docSnap = await getDoc(userDocRef)

      // Create destination data object with additional fields
      const destinationData = {
        name: destination,
        consigneeCompanyName: consigneeCompanyName || "",
        deliveryContact: deliveryContact || "",
      };

      if (docSnap.exists()) {
        // Document exists, update it
        await updateDoc(userDocRef, {
          "bookingData.destinations": arrayUnion(destination),
          "bookingData.destinationDetails": arrayUnion(destinationData),
        })
      } else {
        // Document doesn't exist, create it
        await setDoc(userDocRef, {
          bookingData: {
            destinations: [destination],
            destinationDetails: [destinationData],
            articleTypes: [],
          },
        })
      }

      return destination
    } catch (error: unknown) {
      console.error("Error in addDestinationAsync:", error)
      if (error instanceof Error) {
        return rejectWithValue(error.message)
      }
      return rejectWithValue("Unknown error")
    }
  }
)

// Async thunk to add a new article type to Firestore and store
export const addArticleTypeAsync = createAsyncThunk(
  "booking/addArticleTypeAsync",
  async ({ articleType, userId }: { articleType: string; userId: string }, { rejectWithValue }) => {
    try {
      if (!userId) {
        throw new Error("User not authenticated")
      }

      const db = getFirestore()
      const userDocRef = doc(db, "users", userId)

      // First check if the document exists
      const docSnap = await getDoc(userDocRef)

      if (docSnap.exists()) {
        // Document exists, update it
        await updateDoc(userDocRef, {
          "bookingData.articleTypes": arrayUnion(articleType),
        })
      } else {
        // Document doesn't exist, create it
        await setDoc(userDocRef, {
          bookingData: {
            destinations: [],
            articleTypes: [articleType],
          },
        })
      }

      return articleType
    } catch (error: unknown) {
      console.error("Error in addArticleTypeAsync:", error)
      if (error instanceof Error) {
        return rejectWithValue(error.message)
      }
      return rejectWithValue("Unknown error")
    }
  },
)

const bookingSlice = createSlice({
  name: "booking",
  initialState,
  reducers: {
    setCurrentBooking: (state, action: PayloadAction<Partial<Booking> | null>) => {
      state.currentBooking = action.payload
    },
    updateCurrentBooking: (state, action: PayloadAction<Partial<Booking>>) => {
      if (state.currentBooking) {
        state.currentBooking = { ...state.currentBooking, ...action.payload }
      } else {
        state.currentBooking = action.payload
      }
    },
    clearCurrentBooking: (state) => {
      state.currentBooking = null
    },
    setRecentBookings: (state, action: PayloadAction<Booking[]>) => {
      state.recentBookings = action.payload
    },
    addRecentBooking: (state, action: PayloadAction<Booking>) => {
      state.recentBookings = [action.payload, ...state.recentBookings].slice(0, 10)
    },
    // Add this new reducer
    addDestination: (state, action: PayloadAction<string>) => {
      if (!state.destinations.includes(action.payload)) {
        state.destinations.push(action.payload)
      }
    },
    // Add this new reducer
    addArticleType: (state, action: PayloadAction<string>) => {
      if (!state.articleTypes.includes(action.payload)) {
        state.articleTypes.push(action.payload)
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDropdownOptions.pending, (state) => {
        state.loadingDropdowns = true
        state.errorDropdowns = null
      })
      .addCase(fetchDropdownOptions.fulfilled, (state, action) => {
        state.loadingDropdowns = false
        state.destinations = action.payload.destinations
        state.articleTypes = action.payload.articleTypes
      })
      .addCase(fetchDropdownOptions.rejected, (state, action) => {
        state.loadingDropdowns = false
        state.errorDropdowns = action.payload as string
      })
      .addCase(addDestinationAsync.fulfilled, (state, action) => {
        if (!state.destinations.includes(action.payload)) {
          state.destinations.push(action.payload)
        }
      })
      .addCase(addArticleTypeAsync.fulfilled, (state, action) => {
        if (!state.articleTypes.includes(action.payload)) {
          state.articleTypes.push(action.payload)
        }
      })
  },
})

export const {
  setCurrentBooking,
  updateCurrentBooking,
  clearCurrentBooking,
  setRecentBookings,
  addRecentBooking,
  addDestination,
  addArticleType,
} = bookingSlice.actions

export default bookingSlice.reducer
