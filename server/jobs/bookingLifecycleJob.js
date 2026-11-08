const cron = require('node-cron');
const Booking = require('../models/Booking');
const ParkingEvent = require('../models/ParkingEvent');

const initBookingLifecycleJob = () => {
  // Scans every minute for automatic lifecycle events
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();

      // 1. Clean up Unarrived Bookings (15 minutes past scheduled startTime)
      const NO_SHOW_GRACE_MINUTES = 15;
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
              status: 'cancelled',
              cancelledAt: now,
              cancellationReason: `Automated cleanup: Customer failed to check in within the ${NO_SHOW_GRACE_MINUTES}-minute grace window.`,
            },
          }
        );

        if (ParkingEvent) {
          await ParkingEvent.create({
            booking: b._id,
            location: b.location,
            eventType: 'CANCELLATION',
            notes: `Auto-cancelled after exceeding ${NO_SHOW_GRACE_MINUTES}-minute arrival threshold. Scheduled start was ${b.startTime.toISOString()}.`,
            staff: b.user,
          });
        }
      }

      if (expiredBookings.length > 0) {
        console.log(`[Lifecycle Job] Auto-cancelled ${expiredBookings.length} booking(s) exceeding 15-minute arrival window.`);
      }

      // 2. Track & Flag Overstayed Active Vehicles
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

        if (ParkingEvent) {
          await ParkingEvent.create({
            booking: b._id,
            location: b.location,
            eventType: 'OVERSTAY_FLAGGED',
            notes: `Vehicle ${b.vehicle?.regNumber || 'N/A'} exceeded scheduled end time (${b.endTime.toISOString()}).`,
            staff: b.user,
          });
        }
      }

      if (overstayBookings.length > 0) {
        console.log(`[Lifecycle Job] Flagged ${overstayBookings.length} active session(s) as overstay.`);
      }

      // 3. Testing Auto-Complete: Auto-discharge vehicles when reserved time ends
      if (global.autoCompleteOverstays) {
        const expiredActiveSessions = await Booking.find({
          status: 'active',
          endTime: { $lte: now },
        });

        for (const session of expiredActiveSessions) {
          await Booking.updateOne(
            { _id: session._id },
            {
              $set: {
                status: 'completed',
                actualCheckOutTime: session.endTime,
                amountCollectedPaise: session.amountCollectedPaise || session.pricingSnapshot?.totalAmountPaise || 0,
              },
            }
          );

          if (ParkingEvent) {
            await ParkingEvent.create({
              booking: session._id,
              location: session.location,
              eventType: 'DEPARTURE',
              notes: `Auto-completed via simulation toggle. Vehicle ${session.vehicle?.regNumber || 'N/A'} vacated bay upon slot expiry.`,
              staff: session.user,
            });
          }
        }

        if (expiredActiveSessions.length > 0) {
          console.log(`[Lifecycle Test Simulation] Auto-discharged ${expiredActiveSessions.length} vehicle(s) whose slot ended.`);
        }
      }
    } catch (error) {
      console.error('[Lifecycle Job Error]:', error.message);
    }
  });

  console.log('✓ Booking lifecycle worker initialized (runs every 1 minute with 15-min auto-cancellation & simulation toggle support).');
};

module.exports = initBookingLifecycleJob;