import React from "react";
import BookingForm from "@/components/BookingForm";
import { BookingType } from "@/models/booking";

const ToPayBooking = () => {
  return (
    <>
      <span className="text-lg font-semibold px-3 py-1 border border-purple-700 rounded bg-purple-700 text-white mb-4 inline-block">
        TO PAY
      </span>
      <BookingForm formType={BookingType.TO_PAY} />
    </>
  );
};

export default ToPayBooking;