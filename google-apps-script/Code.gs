/**
 * BharatGas Google Sheets backend
 * Create this script from the Google Sheet:
 * Extensions -> Apps Script
 *
 * 1) Run setup() once.
 * 2) Deploy -> New deployment -> Web app.
 * 3) Execute as: Me
 * 4) Who has access: Anyone
 * 5) Put the /exec URL into sheets-bridge.js in the GitHub repo.
 *
 * The sheet is the database. Tabs are human-readable.
 */

const SHEETS = {
  settings: 'Settings',
  bookings: 'Bookings',
  transactions: 'Transactions',
  distributorPayments: 'DistributorPayments'
};

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'health';
    if (action === 'health') return json_({ ok:true, service:'BharatGas Sheets API' });
    if (action === 'get') return json_({ ok:true, state: readState_() });
    return json_({ ok:false, error:'Unknown action' });
  } catch (err) {
    return json_({ ok:false, error:String(err) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.action !== 'save') throw new Error('Invalid action');
    writeState_(body.state || {});
    SpreadsheetApp.flush();
    return json_({ ok:true, savedAt:new Date().toISOString() });
  } catch (err) {
    return json_({ ok:false, error:String(err) });
  } finally {
    lock.releaseLock();
  }
}

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet_(ss, SHEETS.settings, ['Key','Value']);
  ensureSheet_(ss, SHEETS.bookings, [
    'id','name','address','consumerNo','mobile','bookingRef','deliveryCode','date',
    'refill','status','deliveryDate','paymentMode','amount','received',
    'paidToDistributor','emptyReceived','delivAdj'
  ]);
  ensureSheet_(ss, SHEETS.transactions, ['id','type','amount','date','note']);
  ensureSheet_(ss, SHEETS.distributorPayments, [
    'id','date','amount','cylCount','mode','receiptRef','notes'
  ]);
  const s = ss.getSheetByName(SHEETS.settings);
  if (s.getLastRow() < 2) {
    const defaults = {
      user:null,
      syncRoom:'niwali-bharat-gas',
      units:{total:0,empty:0,delivered:0},
      rates:{
        '14.2 kg':{retail:905,distributor:850,margin:55},
        '5 kg':{retail:360,distributor:330,margin:30},
        '19 kg':{retail:1850,distributor:1720,margin:130}
      }
    };
    s.getRange(2,1,1,2).setValues([['appState', JSON.stringify(defaults)]]);
  }
  return 'Setup complete';
}

function readState_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName(SHEETS.settings)) setup();

  const settings = ss.getSheetByName(SHEETS.settings);
  const rows = settings.getLastRow() >= 2
    ? settings.getRange(2,1,settings.getLastRow()-1,2).getValues()
    : [];
  let state = {};
  rows.forEach(r => {
    if (r[0] === 'appState' && r[1]) {
      try { state = JSON.parse(r[1]); } catch (_) {}
    }
  });

  state.bookings = readTable_(SHEETS.bookings);
  state.transactions = readTable_(SHEETS.transactions);
  state.distributorPayments = readTable_(SHEETS.distributorPayments);

  return state;
}

function writeState_(state) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName(SHEETS.settings)) setup();

  const settings = ss.getSheetByName(SHEETS.settings);
  const stateCore = {
    user: state.user || null,
    syncRoom: state.syncRoom || 'niwali-bharat-gas',
    units: state.units || {total:0,empty:0,delivered:0},
    rates: state.rates || {}
  };
  settings.clearContents();
  settings.getRange(1,1,1,2).setValues([['Key','Value']]);
  settings.getRange(2,1,1,2).setValues([['appState', JSON.stringify(stateCore)]]);

  writeTable_(SHEETS.bookings, state.bookings || []);
  writeTable_(SHEETS.transactions, state.transactions || []);
  writeTable_(SHEETS.distributorPayments, state.distributorPayments || []);
}

function ensureSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1,1,1,headers.length).setValues([headers]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function writeTable_(name, rows) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(name);
  const headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];

  if (sh.getLastRow() > 1) {
    sh.getRange(2,1,sh.getLastRow()-1,headers.length).clearContent();
  }
  if (!rows.length) return;

  const values = rows.map(obj => headers.map(h => {
    const v = obj[h];
    if (v === null || typeof v === 'undefined') return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return v;
  }));
  sh.getRange(2,1,values.length,headers.length).setValues(values);
}

function readTable_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  const headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  const values = sh.getRange(2,1,sh.getLastRow()-1,headers.length).getValues();
  return values.filter(row => row.some(v => v !== '')).map(row => {
    const obj = {};
    headers.forEach((h,i) => {
      let v = row[i];
      if (v === '') v = '';
      if (v === 'true') v = true;
      else if (v === 'false') v = false;
      else if (typeof v === 'string' && (v.startsWith('{') || v.startsWith('['))) {
        try { v = JSON.parse(v); } catch (_) {}
      }
      obj[h] = v;
    });
    return obj;
  });
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
