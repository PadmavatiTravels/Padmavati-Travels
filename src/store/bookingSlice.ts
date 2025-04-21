import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { Booking, Article } from '@/models/booking';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, getFirestore } from 'firebase/firestore';

interface BookingState {
  currentBooking: Partial<Booking> | null;
  destinations: string[];
  articleTypes: string[];
  recentBookings: Booking[];
  loadingDropdowns: boolean;
  errorDropdowns: string | null;
}

const initialState: BookingState = {
  currentBooking: null,
  destinations: [],
  articleTypes: [],
  recentBookings: [],
  loadingDropdowns: false,
  errorDropdowns: null,
};

// Async thunk to fetch dropdown options from Firestore
export const fetchDropdownOptions = createAsyncThunk(
  'booking/fetchDropdownOptions',
  async (_, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState() as { auth: { currentUser: any } };
      if (!auth.currentUser) {
        throw new Error("User not authenticated");
      }
      
      const db = getFirestore();
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      const docSnap = await getDoc(userDocRef);
      
      if (docSnap.exists()) {
        const userData = docSnap.data();
        return {
          destinations: userData.bookingData?.destinations || [],
          articleTypes: userData.bookingData?.articleTypes || []
        };
      } else {
        // Initialize with empty arrays if document doesn't exist
        await setDoc(userDocRef, {
          bookingData: {
            destinations: [],
            articleTypes: []
          }
        });
        return { destinations: [], articleTypes: [] };
      }
    } catch (error: any) {
      console.error("Error in fetchDropdownOptions:", error);
      return rejectWithValue(error.message);
    }
  }
);

// Async thunk to add a new destination to Firestore and store
export const addDestinationAsync = createAsyncThunk(
  'booking/addDestinationAsync',
  async (destination: string, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState() as { auth: { currentUser: any } };
      if (!auth.currentUser) {
        throw new Error("User not authenticated");
      }
      
      const db = getFirestore();
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      
      // First check if the document exists
      const docSnap = await getDoc(userDocRef);
      
      if (docSnap.exists()) {
        // Document exists, update it
        await updateDoc(userDocRef, {
          "bookingData.destinations": arrayUnion(destination)
        });
      } else {
        // Document doesn't exist, create it
        await setDoc(userDocRef, {
          bookingData: {
            destinations: [destination],
            articleTypes: []
          }
        });
      }
      
      return destination;
    } catch (error: any) {
      console.error("Error in addDestinationAsync:", error);
      return rejectWithValue(error.message);
    }
  }
);

// Async thunk to add a new article type to Firestore and store
export const addArticleTypeAsync = createAsyncThunk(
  'booking/addArticleTypeAsync',
  async (articleType: string, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState() as { auth: { currentUser: any } };
      if (!auth.currentUser) {
        throw new Error("User not authenticated");
      }
      
      const db = getFirestore();
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      
      // First check if the document exists
      const docSnap = await getDoc(userDocRef);
      
      if (docSnap.exists()) {
        // Document exists, update it
        await updateDoc(userDocRef, {
          "bookingData.articleTypes": arrayUnion(articleType)
        });
      } else {
        // Document doesn't exist, create it
        await setDoc(userDocRef, {
          bookingData: {
            destinations: [],
            articleTypes: [articleType]
          }
        });
      }
      
      return articleType;
    } catch (error: any) {
      console.error("Error in addArticleTypeAsync:", error);
      return rejectWithValue(error.message);
    }
  }
);

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    setCurrentBooking: (state, action: PayloadAction<Partial<Booking> | null>) => {
      state.currentBooking = action.payload;
    },
    updateCurrentBooking: (state, action: PayloadAction<Partial<Booking>>) => {
      if (state.currentBooking) {
        state.currentBooking = { ...state.currentBooking, ...action.payload };
      } else {
        state.currentBooking = action.payload;
      }
    },
    clearCurrentBooking: (state) => {
      state.currentBooking = null;
    },
    setRecentBookings: (state, action: PayloadAction<Booking[]>) => {
      state.recentBookings = action.payload;
    },
    addRecentBooking: (state, action: PayloadAction<Booking>) => {
      state.recentBookings = [action.payload, ...state.recentBookings].slice(0, 10);
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDropdownOptions.pending, (state) => {
        state.loadingDropdowns = true;
        state.errorDropdowns = null;
      })
      .addCase(fetchDropdownOptions.fulfilled, (state, action) => {
        state.loadingDropdowns = false;
        state.destinations = action.payload.destinations;
        state.articleTypes = action.payload.articleTypes;
      })
      .addCase(fetchDropdownOptions.rejected, (state, action) => {
        state.loadingDropdowns = false;
        state.errorDropdowns = action.payload as string;
      })
      .addCase(addDestinationAsync.fulfilled, (state, action) => {
        if (!state.destinations.includes(action.payload)) {
          state.destinations.push(action.payload);
        }
      })
      .addCase(addArticleTypeAsync.fulfilled, (state, action) => {
        if (!state.articleTypes.includes(action.payload)) {
          state.articleTypes.push(action.payload);
        }
      });
  }
});

export const { 
  setCurrentBooking, 
  updateCurrentBooking, 
  clearCurrentBooking,
  setRecentBookings,
  addRecentBooking
} = bookingSlice.actions;

export default bookingSlice.reducer;