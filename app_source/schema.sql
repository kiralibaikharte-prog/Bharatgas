-- Gas Wallet / Bharat Gas Niwali Production Database Schema
-- Roles:
--   Ajay (Admin): Full Access to Transactions, Cylinder Stock, Data Entry & Settings (Password: NANDU#01)
--   Anil (Viewer): View Live Data Only - Cannot Modify Data (Password: ANIL#01)

CREATE TABLE IF NOT EXISTS users (
    mobile TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    title TEXT NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS units (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    total INTEGER DEFAULT 0,
    empty INTEGER DEFAULT 0,
    delivered INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    consumer_no TEXT NOT NULL,
    mobile TEXT,
    booking_ref TEXT,
    delivery_code TEXT,
    date TEXT NOT NULL,
    refill TEXT DEFAULT '14.2 kg',
    status TEXT NOT NULL DEFAULT 'Requested',
    delivery_date TEXT,
    payment_mode TEXT DEFAULT 'Cash',
    amount NUMERIC DEFAULT 905,
    received NUMERIC DEFAULT 0,
    paid_to_distributor NUMERIC DEFAULT 850,
    empty_received INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cylinder_payments (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    cyl_count INTEGER DEFAULT 0,
    mode TEXT NOT NULL DEFAULT 'Bank Transfer',
    receipt_ref TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('in', 'out')),
    amount NUMERIC NOT NULL,
    date TEXT NOT NULL,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed Registered Team Members: Ajay (Admin) and Anil (Viewer)
INSERT OR REPLACE INTO users (mobile, name, role, title, password) VALUES
('9399968109', 'Ajay', 'admin', 'Administrator', 'NANDU#01'),
('9301031375', 'Anil Bharat Gas Niwali', 'viewer', 'Viewer (Live Data Only)', 'ANIL#01');

-- Clean Initial Inventory (Zero demo data)
INSERT OR REPLACE INTO units (id, total, empty, delivered) VALUES (1, 0, 0, 0);
