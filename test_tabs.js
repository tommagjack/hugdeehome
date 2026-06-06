import React from 'react';
import ReactDOMServer from 'react-dom/server';
import App from './src/App.jsx';
import { db, initDatabase } from './src/utils/db.js';

// 1. Mock browser environments
global.window = {
  location: {
    hash: ''
  },
  addEventListener: () => {},
  removeEventListener: () => {},
  printReceiptById: () => {}
};

// Simple localStorage mock
const store = {};
global.localStorage = {
  getItem: (key) => {
    if (key === 'hdh_logged_in_user') {
      return JSON.stringify({
        username: 'admin',
        fullname: 'ผู้ดูแลระบบหลัก',
        role: 'Admin',
        employeeId: 'HDH001',
        status: 'Active',
        avatarUrl: ''
      });
    }
    return store[key] || null;
  },
  setItem: (key, value) => {
    store[key] = String(value);
  },
  removeItem: (key) => {
    delete store[key];
  },
  clear: () => {
    for (const k in store) delete store[k];
  }
};

if (!global.navigator) {
  global.navigator = {};
}
Object.defineProperty(global.navigator, 'clipboard', {
  value: {
    writeText: () => Promise.resolve()
  },
  configurable: true,
  writable: true
});

global.document = {
  createElement: () => ({
    style: {},
    setAttribute: () => {},
    appendChild: () => {},
    getElementsByTagName: () => []
  }),
  getElementsByTagName: () => [],
  querySelector: () => null,
  querySelectorAll: () => [],
  head: {
    appendChild: () => {}
  },
  body: {
    appendChild: () => {},
    removeChild: () => {}
  },
  documentElement: {
    style: {}
  }
};

// Initialize mock DB in localStorage
initDatabase();

// Load actual data from db
const clinicInfo = db.getClinicInfo();
const users = db.getUsers();
const therapists = db.getTherapists();
const services = db.getServices();
const promotions = db.getPromotions();
const bankAccounts = db.getBankAccounts();
const holidays = db.getHolidays();
const patients = db.getPatients();
const appointments = db.getAppointments();
const receipts = db.getReceipts();
const assessments = db.getAssessments();
const salaryRules = db.getSalaryRules();
const payrolls = db.getPayrolls();
const transactions = db.getTransactions();
const opdRecords = db.getOpdRecords();

const componentsToTest = [
  { name: 'Dashboard', path: './src/components/Dashboard.jsx', props: { patients, appointments, receipts, therapists } },
  { name: 'PatientRegister', path: './src/components/PatientRegister.jsx', props: { patients, currentUser: { role: 'Admin' } } },
  { name: 'Appointments', path: './src/components/Appointments.jsx', props: { patients, appointments, therapists, holidays, currentUser: { role: 'Admin' } } },
  { name: 'DevelopmentalAssessment', path: './src/components/DevelopmentalAssessment.jsx', props: { patients, assessments, therapists, currentUser: { role: 'Admin' } } },
  { name: 'OPD', path: './src/components/OPD.jsx', props: { patients, therapists, opdRecords, currentUser: { role: 'Admin' } } },
  { name: 'CourseBalance', path: './src/components/CourseBalance.jsx', props: { patients, appointments, receipts } },
  { name: 'ReceiptPOS', path: './src/components/ReceiptPOS.jsx', props: { patients, services, promotions, bankAccounts, receipts, cart: [], currentUser: { role: 'Admin' } } },
  { name: 'ReceiptHistory', path: './src/components/ReceiptHistory.jsx', props: { patients, receipts, services } },
  { name: 'ServiceSummary', path: './src/components/ServiceSummary.jsx', props: { patients, appointments, therapists } },
  { name: 'Transactions', path: './src/components/Transactions.jsx', props: { transactions, receipts, payrolls, patients } },
  { name: 'Users', path: './src/components/Users.jsx', props: { users } },
  { name: 'Salary', path: './src/components/Salary.jsx', props: { currentUser: { role: 'Admin', username: 'admin' }, users, salaryRules, payrolls, clinicInfo } },
  { name: 'SalarySettings', path: './src/components/SalarySettings.jsx', props: { salaryRules } },
  { name: 'Settings', path: './src/components/Settings.jsx', props: { clinicInfo, services, promotions, bankAccounts, therapists, holidays } },
  { name: 'UserProfile', path: './src/components/UserProfile.jsx', props: { currentUser: { role: 'Admin', username: 'admin' }, users } }
];

async function testAllComponentsWithData() {
  console.log('--- Testing individual components rendering with DB data ---');
  let passCount = 0;
  let failCount = 0;
  
  for (const comp of componentsToTest) {
    try {
      const Mod = await import(comp.path);
      const Component = Mod.default;
      
      const html = ReactDOMServer.renderToString(React.createElement(Component, comp.props));
      console.log(`✅ [PASS] Component "${comp.name}" rendered successfully (${html.length} bytes)`);
      passCount++;
    } catch (err) {
      console.error(`❌ [FAIL] Component "${comp.name}" crashed during render:`);
      console.error(err);
      failCount++;
    }
  }
  
  console.log(`\nResults: ${passCount} passed, ${failCount} failed.`);
}

testAllComponentsWithData();
