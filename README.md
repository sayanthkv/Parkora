# 🅿️ Parkora — Smart Parking Reservation & Gate Operations Engine

> A high-concurrency, ACID-compliant mobility platform designed to optimize urban parking nodes across Kannur, Kerala. Built on a decoupled MERN architecture with atomic document write-locks, cryptographic pass verification, and dual online/gate reconciliation.

---

## 📌 Executive Summary

Urban parking hubs—especially multimodal transit centers like railway stations and central bus terminals—suffer from severe circular congestion caused by drivers hunting for unreserved slots. Most booking systems rely on basic CRUD operations, which fail under simultaneous requests (TOCTOU race conditions), allowing double bookings.

**Parkora** solves this by treating physical parking spots as critical shared resources:
- **Pessimistic Concurrency Barrier:** Guarantees non-overlapping time-interval reservations using MongoDB ACID transactions and document version write-locks (`$inc: { __v: 1 }`).
- **Cryptographic Gate Authentication:** Issues non-guessable, high-entropy 32-byte QR tokens verified against salted SHA-256 digests via timing-safe byte equality.
- **Automated Lifecycle Worker:** Reclaims abandoned reservations after a 30-minute grace window and flags overstays.
- **Paise-Strict Accounting:** Formulates all rates, base tariffs, and gateway payments in integer Indian Paise ($1\text{ INR} = 100\text{ Paise}$) to prevent floating-point rounding errors.

---

## 🛠️ Tech Stack & System Architecture

| Layer | Technologies / Packages | Responsibility |
| :--- | :--- | :--- |
| **Client** | React 18, Vite, Tailwind CSS, Lucide Icons, Recharts, Axios | Responsive Single Page App (SPA), dynamic floor bay matrix, QR rendering, client-side interval calculations. |
| **Server** | Node.js, Express.js (Express 5 safe), `node-cron`, Razorpay SDK | REST API, ACID session orchestration, pessimistic lock execution, signature verification, background worker. |
| **Database** | MongoDB Atlas, Mongoose ODM | Relational hierarchy, compound indexing, multi-document transactions, write-conflict serialization. |
| **Security** | Helmet, `express-rate-limit`, JWT, Node `crypto` (`timingSafeEqual`) | OWASP header hardening, brute-force mitigation, tamper-proof pass verification, stateless auth. |

---

## 🏛️ Relational Hierarchy & Data Model

The physical space is structured as a strict 3-tier parent-child hierarchy:

[ParkingLocation] (Kannur Rly Stn, Central Bus Terminal, Payyambalam Beach)
│ 1:N
▼
[Floor] (Level 0 / Ground, Level 1)
│ 1:N
▼
[ParkingBay] (Bay G-01 to G-20) ◄── [Document Write-Lock: __v]
│ 1:N
▼
[Booking] ──► Associated with [User] & [ParkingEvent] Audit Trail


- **Compound Unique Index:** `{ floor: 1, bayNumber: 1 }` guarantees that duplicate bay identifiers can never be created on the same floor level, even under concurrent admin operations.
- **Fast Lookup Index:** `{ bay: 1, status: 1, startTime: 1, endTime: 1 }` accelerates non-overlapping interval lookups.

---

## ⚡ Concurrency Engineering: Eliminating TOCTOU Double-Bookings

### The Vulnerability: Time-of-Check to Time-of-Use (TOCTOU)
When two drivers attempt to book Bay `G-01` for overlapping time slots at the exact same millisecond:
1. **Req 1** queries MongoDB: *"Is Bay G-01 booked between 14:00 and 16:00?"* $\rightarrow$ Returns empty.
2. **Req 2** queries MongoDB simultaneously: *"Is Bay G-01 booked?"* $\rightarrow$ Returns empty.
3. Both requests run `Booking.create()`, resulting in two active bookings for the same physical slot.

### The Interval Overlap Condition
Two intervals $[A_{start}, A_{end}]$ and $[B_{start}, B_{end}]$ conflict if and only if:
$$\text{ReqStart} < \text{BookEnd} \quad \land \quad \text{ReqEnd} > \text{BookStart}$$

### The ACID Solution: Pessimistic Bay Write-Locking
Inserting two independent documents into the `bookings` collection does not create an automatic write conflict in MongoDB. Parkora forces contention onto the shared `ParkingBay` document inside a MongoDB Session Transaction:

// 1. Acquire atomic write-lock on the specific bay document
const bay = await ParkingBay.findOneAndUpdate(
  { _id: bayId, status: { $ne: 'maintenance' }, isEnabled: {$ne: false } },
  { $inc: { __v: 1 } }, // Forces MongoDB to serialize transactions targeting this bay
  { session, new: true }
);

// 2. Perform interval conflict query within the isolated transaction
const existingConflict = await Booking.findOne({
  bay: bayId,
  status: { $in: ['confirmed', 'active', 'pending'] },$and: [
    { startTime: { $lt: reqEnd } },
    { endTime: { $gt: reqStart } }
  ]
}).session(session);

if (existingConflict) {
  await session.abortTransaction();
  return res.status(409).json({ success: false, message: 'Bay conflict: slot already reserved.' });
}



Result: The second competing request is serialized behind the first. Once executed, it detects the newly committed booking and is cleanly aborted with an HTTP 409 Conflict.

🛡️ Production Hardening & Operational Policies

Gate Pass Security: Digital passes do not embed plaintext IDs. The server generates a high-entropy 32-byte secret (crypto.randomBytes(32)). Only its SHA-256 hash is saved (select: false). The gate scans bookingRef:rawSecret and validates it using crypto.timingSafeEqual().

Automated Lifecycle Engine: A node-cron worker runs every 5 minutes. Bookings unattended 30 minutes past startTime are marked no_show, freeing the bay for walk-ins. Active reservations exceeding endTime are flagged with isOverstay: true.

Location-Specific Constraints: Payyambalam Beach strictly enforces operating hours between 05:00 and 22:00 IST on both frontend date-pickers and backend controllers.

Anti-Hoarding Quotas: Users are capped at 2 active/upcoming reservations concurrently, a maximum 48-hour advance booking window, and a 24-hour duration limit per reservation.

Session Revocation: JWT checks look up isActive !== false on every request. Deactivating staff immediately blocks gate access without waiting for token expiry.

🚦 Dual Payment Workflow

Online (Razorpay Test Mode):

POST /api/bookings/order-razorpay generates an order in integer paise.

Razorpay Modal opens on the client for mock UPI/Card payment.

POST /api/bookings/verify-razorpay verifies the HMAC SHA-256 signature and atomically secures the bay.

Pay at Facility Gate: Drivers receive an instant QR ticket and pay the gate attendant via cash or UPI upon exit. Attendants record amountCollectedPaise during check-out for audit reconciliation.

🚀 Local Development Setup

1. Clone & Install
git clone [https://github.com/your-username/parkora.git](https://github.com/your-username/parkora.git)
cd parkora

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install


2. Configure Environment Variables

server/.env:
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/parkora?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key
RAZORPAY_KEY_ID=rzp_test_yourKeyId
RAZORPAY_KEY_SECRET=yourKeySecret
CLIENT_URL=http://localhost:5173


client/.env:
VITE_API_BASE_URL=http://localhost:5000/api
VITE_RAZORPAY_KEY_ID=rzp_test_yourKeyId



3. Run Application
# In server directory
npm run dev
# In client directory
npm run dev
