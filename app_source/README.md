# Gas Wallet — Bharat Gas Niwali

Secure, lightweight mobile web application and real-time ledger for Bharat Gas Niwali.

## User Roles & Passwords

| User | Mobile Number | Password | Role & Permissions |
| :--- | :--- | :--- | :--- |
| **Ajay** | `9399968109` | `NANDU#01` | **Admin**: Full control. Add, edit, and delete customer bookings, cash transactions, godown cylinder settlements, and cylinder availability/stock counts. |
| **Anil Bharat Gas Niwali** | `9301031375` | `ANIL#01` | **Viewer**: **View Live Data Only.** Cannot modify data, cannot edit cylinder availability, and cannot record transactions. Can view live customer cards, view and copy delivery codes (DAC/OTP), use 1-tap Call and WhatsApp, view the 25-day refill eligibility sheet, view history, and view receipts. |

*(Note: Passwords are no longer displayed on the login screen for security).*

---

## Key Features

1. **Live Customer Cards & Delivery Code (DAC/OTP)**: High-visibility code box with 1-tap copy, 1-tap call, 1-tap WhatsApp, and real-time status.
2. **25-Day Mandatory Refill Data Sheet**: Automatically tracks customer refill cycles (25-day mandatory gap rule), highlights eligible customers, and supports WhatsApp alerts.
3. **Cylinder Payment Tracking ("Payment our cylinder")**: Godown payments to distributor, dues calculation, agency margin tracking (₹55/cylinder), and Cash vs UPI breakdown.
4. **Unified History**: Completed deliveries, verified delivery codes, and distributor payments.
5. **Clean & Lightweight**: Zero demo data, pure slate design, fast mobile loading, and offline PWA capability.

---

## Running the App

### Option A: Standalone PWA (Mobile Browser)
Open `index.html` in any browser or mobile device. Works 100% offline with LocalStorage and Service Worker.

### Option B: Python Server with SQLite Persistence
Run:
```bash
python3 server.py
```
Open `http://localhost:8080` in your browser.
