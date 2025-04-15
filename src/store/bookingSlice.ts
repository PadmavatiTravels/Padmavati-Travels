
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Booking, Article } from '@/models/booking';

interface BookingState {
  currentBooking: Partial<Booking> | null;
  destinations: string[];
  articleTypes: string[];
  recentBookings: Booking[];
}

const initialState: BookingState = {
  currentBooking: null,
  destinations: ['Kundapur', 'Shivamogga', 'Bijapur', 'Mangalore', 'Bangalore'],
  articleTypes: ['Box', 'Bag', 'Carton', 'Parcel', 'Document'],
  recentBookings: [],
};

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
    addDestination: (state, action: PayloadAction<string>) => {
      if (!state.destinations.includes(action.payload)) {
        state.destinations.push(action.payload);
      }
    },
    addArticleType: (state, action: PayloadAction<string>) => {
      if (!state.articleTypes.includes(action.payload)) {
        state.articleTypes.push(action.payload);
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
});

export const { 
  setCurrentBooking, 
  updateCurrentBooking, 
  addDestination, 
  addArticleType, 
  clearCurrentBooking,
  setRecentBookings,
  addRecentBooking
} = bookingSlice.actions;

export default bookingSlice.reducer;
