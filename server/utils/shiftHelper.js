/**
 * Computes shift schedules and operational windows strictly in Indian Standard Time (UTC+5:30).
 * - Payyambalam Beach (05:00 - 22:00 IST):
 *     Shift 1: 05:00 – 13:30 IST
 *     Shift 2: 13:30 – 22:00 IST
 * - 24/7 Standard Transit Hubs (Kannur Railway Station, Central Bus Terminal, Ayikkara Harbor):
 *     Shift 1: 06:00 – 18:00 IST
 *     Shift 2: 18:00 – 06:00 IST
 */

const getFacilityShiftRoster = (facilityName = '') => {
  const isPayyambalam = (facilityName || '').toLowerCase().includes('payyambalam');

  if (isPayyambalam) {
    return {
      shift_1: 'Shift 1: 05:00 – 13:30 IST',
      shift_2: 'Shift 2: 13:30 – 22:00 IST',
    };
  }

  return {
    shift_1: 'Shift 1: 06:00 – 18:00 IST',
    shift_2: 'Shift 2: 18:00 – 06:00 IST',
  };
};

const getActiveShiftDetails = (facilityName = '') => {
  const isPayyambalam = (facilityName || '').toLowerCase().includes('payyambalam');

  // Convert current UTC time into IST minutes (0 - 1439)
  const now = new Date();
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const istMinutes = (utcMinutes + 330) % 1440; // UTC + 5:30
  const currentHour = istMinutes / 60;
  const roster = getFacilityShiftRoster(facilityName);

  if (isPayyambalam) {
    if (currentHour >= 5 && currentHour < 13.5) {
      return {
        activeSlot: 'shift_1',
        label: roster.shift_1,
        isOpen: true,
        roster,
      };
    } else if (currentHour >= 13.5 && currentHour < 22) {
      return {
        activeSlot: 'shift_2',
        label: roster.shift_2,
        isOpen: true,
        roster,
      };
    }
    return {
      activeSlot: null,
      label: 'Facility Closed (22:00 – 05:00 IST)',
      isOpen: false,
      roster,
    };
  } else {
    // 24/7 Standard Transit Stations
    if (currentHour >= 6 && currentHour < 18) {
      return {
        activeSlot: 'shift_1',
        label: roster.shift_1,
        isOpen: true,
        roster,
      };
    } else {
      return {
        activeSlot: 'shift_2',
        label: roster.shift_2,
        isOpen: true,
        roster,
      };
    }
  }
};

module.exports = { getActiveShiftDetails, getFacilityShiftRoster };