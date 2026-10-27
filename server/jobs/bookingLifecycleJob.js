const cron = require('node-cron');
const Booking = require('../models/Booking');
const ParkingEvent = require('../models/ParkingEvent');

const initBookingLifecycleJob = () => {
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = new Date();

      // 1. Clean up No-Shows (30 mins past startTime)
      const NO_SHOW_GRACE_MINUTES = 30;
      const noShowThreshold = new Date(now.getTime() - NO_SHOW_GRACE_MINUTES * 60 * 1000);

      const expiredBookings = await Booking.find({
        status: 'confirmed',
        startTime: { $lt: noShowThreshold },
      }).select('_id location user startTime vehicle');

      for (const b of expiredBookings) {
        await Booking.updateOne(
          { _id: b._id },
          {
            $set: {
              status: 'no_show',
              cancelledAt: now,
              cancellationReason: `Automated cleanup: Customer failed to check in within the ${NO_SHOW_GRACE_MINUTES}-minute grace window.`,
            },
          }
        );

        await ParkingEvent.create({
          booking: b._id,
          location: b.location,
          eventType: 'OVERSTAY_FLAGGED',
          notes: `Marked as NO_SHOW by automated lifecycle job. Scheduled start was ${b.startTime.toISOString()}.`,
          staff: b.user,
        });
      }

      if (expiredBookings.length > 0) {
        console.log(`[Lifecycle Job] Marked ${expiredBookings.length} booking(s) as no_show.`);
      }

      // 2. Track & Flag Overstays
      const overstayBookings = await Booking.find({
        status: 'active',
        endTime: { $lt: now },
        isOverstay: { $ne: true },
      }).select('_id location user endTime vehicle');

      for (const b of overstayBookings) {
        await Booking.updateOne(
          { _id: b._id },
          { $set: { isOverstay: true } }
        );

        await ParkingEvent.create({
          booking: b._id,
          location: b.location,
          eventType: 'OVERSTAY_FLAGGED',
          notes: `Vehicle ${b.vehicle?.regNumber || 'N/A'} exceeded scheduled end time (${b.endTime.toISOString()}). Flagged for staff overstay charge.`,
          staff: b.user,
        });
      }

      if (overstayBookings.length > 0) {
        console.log(`[Lifecycle Job] Flagged ${overstayBookings.length} active session(s) as overstay.`);
      }
    } catch (error) {
      console.error('[Lifecycle Job Error]:', error.message);
    }
  });

  console.log(' Booking lifecycle worker initialized (runs every 5 minutes).');
};

module.exports = initBookingLifecycleJob;