/**
 * Computes current active shift window in IST.
 * - Payyambalam Beach (05:00 - 22:00): Shift 1 (05:00-13:30), Shift 2 (13:30-22:00)
 * - Standard Facilities (24/7): Shift 1 (06:00-18:00), Shift 2 (18:00-06:00)
 */
const getActiveShiftDetails = (facilityName = '') => {
  const isPayyambalam = (facilityName || '').toLowerCase().includes('payyambalam');

  const now = new Date();
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const istMinutes = (utcMinutes + 330) % 1440; // UTC + 5:30
  const currentHour = istMinutes / 60;

  if (isPayyambalam) {
    if (currentHour >= 5 && currentHour < 13.5) {
      return {
        activeSlot: 'shift_1',
        label: 'Shift 1: 05:00 – 13:30 IST',
        isOpen: true,
      };
    } else if (currentHour >= 13.5 && currentHour < 22) {
      return {
        activeSlot: 'shift_2',
        label: 'Shift 2: 13:30 – 22:00 IST',
        isOpen: true,
      };
    }
    return {
      activeSlot: null,
      label: 'Facility Closed (22:00 – 05:00 IST)',
      isOpen: false,
    };
  } else {
    if (currentHour >= 6 && currentHour < 18) {
      return {
        activeSlot: 'shift_1',
        label: 'Shift 1: 06:00 – 18:00 IST',
        isOpen: true,
      };
    } else {
      return {
        activeSlot: 'shift_2',
        label: 'Shift 2: 18:00 – 06:00 IST',
        isOpen: true,
      };
    }
  }
};

module.exports = { getActiveShiftDetails };