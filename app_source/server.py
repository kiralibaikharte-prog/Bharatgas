#!/usr/bin/env python3
import http.server
import socketserver
import json
import sqlite3
import os
import mimetypes
from urllib.parse import urlparse

PORT = int(os.environ.get('PORT', 8080))
DB_FILE = 'gaswallet.db'

def get_db():
    conn = sqlite3.connect('file:' + DB_FILE + '?nolock=1', uri=True)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    if not os.path.exists(DB_FILE):
        import shutil
        tmp_db = '/tmp/init_gaswallet_clean.db'
        if os.path.exists(tmp_db): os.remove(tmp_db)
        c = sqlite3.connect(tmp_db)
        with open('schema.sql', 'r', encoding='utf-8') as f:
            c.executescript(f.read())
        c.commit()
        c.close()
        shutil.copy(tmp_db, DB_FILE)

class GasWalletHandler(http.server.BaseHTTPRequestHandler):
    def _send_json(self, data, status=200):
        body = json.dumps(data).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == '/api/state':
            with get_db() as conn:
                cur = conn.cursor()
                cur.execute("SELECT total, empty, delivered FROM units WHERE id = 1")
                row = cur.fetchone() or (0, 0, 0)
                units = {'total': row[0], 'empty': row[1], 'delivered': row[2]}

                cur.execute("SELECT * FROM bookings ORDER BY date DESC, created_at DESC")
                bookings = []
                for r in cur.fetchall():
                    bookings.append({
                        'id': r['id'],
                        'name': r['name'],
                        'address': r['address'],
                        'consumerNo': r['consumer_no'],
                        'mobile': r['mobile'],
                        'bookingRef': r['booking_ref'],
                        'deliveryCode': r['delivery_code'],
                        'date': r['date'],
                        'refill': r['refill'],
                        'status': r['status'],
                        'deliveryDate': r['delivery_date'],
                        'paymentMode': r['payment_mode'],
                        'amount': str(r['amount']),
                        'received': str(r['received']),
                        'paidToDistributor': str(r['paid_to_distributor']),
                        'emptyReceived': bool(r['empty_received']),
                        'delivAdj': (r['status'] == 'Delivered')
                    })

                cur.execute("SELECT * FROM cylinder_payments ORDER BY date DESC, created_at DESC")
                distributorPayments = []
                for r in cur.fetchall():
                    distributorPayments.append({
                        'id': r['id'],
                        'date': r['date'],
                        'amount': float(r['amount']),
                        'cylCount': r['cyl_count'],
                        'mode': r['mode'],
                        'receiptRef': r['receipt_ref'],
                        'notes': r['notes']
                    })

                cur.execute("SELECT * FROM transactions ORDER BY date DESC, created_at DESC")
                transactions = []
                for r in cur.fetchall():
                    transactions.append({
                        'id': r['id'],
                        'type': r['type'],
                        'amount': str(r['amount']),
                        'date': r['date'],
                        'note': r['note']
                    })

                state = {
                    'units': units,
                    'bookings': bookings,
                    'distributorPayments': distributorPayments,
                    'transactions': transactions,
                    'syncRoom': 'niwali-bharat-gas'
                }
                return self._send_json(state)

        filepath = path.lstrip('/')
        if not filepath:
            filepath = 'index.html'

        if os.path.exists(filepath) and os.path.isfile(filepath):
            ctype, _ = mimetypes.guess_type(filepath)
            with open(filepath, 'rb') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-Type', ctype or 'application/octet-stream')
            self.send_header('Content-Length', str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"404 Not Found")

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(length)
        data = json.loads(post_data.decode('utf-8')) if post_data else {}

        if path == '/api/login':
            mobile = data.get('mobile', '').strip()
            password = data.get('password', '').strip()
            with get_db() as conn:
                cur = conn.cursor()
                cur.execute("SELECT * FROM users WHERE mobile = ? AND password = ?", (mobile, password))
                u = cur.fetchone()
                if u:
                    return self._send_json({
                        'success': True,
                        'user': {
                            'mobile': u['mobile'],
                            'name': u['name'],
                            'role': u['role'],
                            'title': u['title']
                        }
                    })
                return self._send_json({'success': False, 'message': 'Invalid Mobile or Password'}, status=401)

        elif path == '/api/bookings':
            b = data
            with get_db() as conn:
                cur = conn.cursor()
                cur.execute("""
                    INSERT OR REPLACE INTO bookings (
                        id, name, address, consumer_no, mobile, booking_ref, delivery_code,
                        date, refill, status, delivery_date, payment_mode, amount, received,
                        paid_to_distributor, empty_received, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                """, (
                    b.get('id'), b.get('name'), b.get('address'), b.get('consumerNo'),
                    b.get('mobile'), b.get('bookingRef'), b.get('deliveryCode'),
                    b.get('date'), b.get('refill', '14.2 kg'), b.get('status', 'Requested'),
                    b.get('deliveryDate'), b.get('paymentMode', 'Cash'),
                    float(b.get('amount') or 905), float(b.get('received') or 0),
                    float(b.get('paidToDistributor') or 850), 1 if b.get('emptyReceived') else 0
                ))
                conn.commit()
            return self._send_json({'success': True, 'booking': b})

        elif path == '/api/cylinder-payments':
            cp = data
            with get_db() as conn:
                cur = conn.cursor()
                cur.execute("""
                    INSERT INTO cylinder_payments (id, date, amount, cyl_count, mode, receipt_ref, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    cp.get('id'), cp.get('date'), float(cp.get('amount') or 0),
                    int(cp.get('cylCount') or 0), cp.get('mode', 'Bank Transfer'),
                    cp.get('receiptRef'), cp.get('notes')
                ))
                conn.commit()
            return self._send_json({'success': True, 'cylinderPayment': cp})

        elif path == '/api/units':
            u = data
            with get_db() as conn:
                cur = conn.cursor()
                cur.execute("UPDATE units SET total = ?, empty = ?, delivered = ? WHERE id = 1",
                            (int(u.get('total', 0)), int(u.get('empty', 0)), int(u.get('delivered', 0))))
                conn.commit()
            return self._send_json({'success': True, 'units': u})

        elif path == '/api/sync':
            with get_db() as conn:
                cur = conn.cursor()
                if 'units' in data:
                    u = data['units']
                    cur.execute("UPDATE units SET total = ?, empty = ?, delivered = ? WHERE id = 1",
                                (int(u.get('total', 0)), int(u.get('empty', 0)), int(u.get('delivered', 0))))
                conn.commit()
            return self._send_json({'success': True, 'synced': True})

        self.send_response(404)
        self.end_headers()

if __name__ == '__main__':
    init_db()
    print(f"Gas Wallet Server running at http://localhost:{PORT}")
    with socketserver.TCPServer(("", PORT), GasWalletHandler) as httpd:
        httpd.serve_forever()
