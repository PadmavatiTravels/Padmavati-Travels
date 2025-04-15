
import { configureStore } from '@reduxjs/toolkit';
import bookingReducer from './bookingSlice';
import settingsReducer from './settingsSlice';

export const store = configureStore({
  reducer: {
    booking: bookingReducer,
    settings: settingsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
