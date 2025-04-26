import React from "react";
import BookingForm from "@/components/BookingForm";
import { BookingType } from "@/models/booking";

const PaidBooking = () => {
  return (
    <>
      <span className="text-lg font-semibold px-3 py-1 border border-blue-700 rounded bg-blue-700 text-white mb-4 inline-block">
        PAID
      </span>
      <BookingForm formType={BookingType.PAID} />
    </>
  );
};

export default PaidBooking;