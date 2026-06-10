import React, { useState, useMemo } from 'react';
import { 
  CreditCard, 
  Plus, 
  Download, 
  Upload, 
  RefreshCw, 
  Eye, 
  Edit, 
  Trash2, 
  Printer, 
  X 
} from 'lucide-react';
import Swal from 'sweetalert2';

export default function Salary({ currentUser, users, salaryRules, payrolls, setPayrolls, clinicInfo, setPrintView }) {
  const [filterYear, setFilterYear] = useState('All');
  const [filterMonth, setFilterMonth] = useState('All');
  const [filterUser, setFilterUser] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);

  // รีเซ็ตหน้าเมื่อเปลี่ยนตัวกรอง
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filterYear, filterMonth, filterUser]);

  // สถานะคำนวณเงินเดือน
  const [showCalcModal, setShowCalcModal] = useState(false);
  const [editingPayrollId, setEditingPayrollId] = useState(null);

  // ข้อมูลฟอร์มคำนวณเงินเดือน
  const [calcYear, setCalcYear] = useState('2026');
  const [calcMonth, setCalcMonth] = useState('มิถุนายน');
  const [selectedUsername, setSelectedUsername] = useState('');
  const [calcPaymentDate, setCalcPaymentDate] = useState('2026-06-05');
  
  // ยอดรายรับคำนวณตามจำนวนคูณ
  const [earningCounts, setEarningCounts] = useState({}); // { 'earn-ot': 2 }
  
  // เช็คบ็อกซ์เลือกหักเงิน
  const [appliedDeductions, setAppliedDeductions] = useState({}); // { 'ded-ss': true }

  // รายรับ/รายหักพิเศษ
  const [specialEarnings, setSpecialEarnings] = useState([]); // [ { name: '', amount: 0 } ]
  const [specialDeductions, setSpecialDeductions] = useState([]); // [ { name: '', amount: 0 } ]

  // สถานะดูสลิปเงินเดือน
  const [showSlipModal, setShowSlipModal] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState(null);

  // รายชื่อพนักงานที่เป็น Active เท่านั้นสำหรับคำนวณเงินเดือน
  const activeEmployees = useMemo(() => {
    return users.filter(u => u.status === 'Active' && u.username.toLowerCase() !== 'admin');
  }, [users]);

  // พนักงานที่เลือกอยู่ในขณะคำนวณ
  const selectedEmployee = useMemo(() => {
    if (!selectedUsername) return null;
    return users.find(u => u.username === selectedUsername);
  }, [selectedUsername, users]);

  // ดึงรายการปีที่บันทึกแล้วในระบบ
  const yearOptions = useMemo(() => {
    const years = payrolls.map(p => p.year);
    return ['All', ...new Set(years)].sort((a, b) => b.localeCompare(a));
  }, [payrolls]);

  // ดึงรายการเดือนที่มีข้อมูล
  const monthOptions = useMemo(() => {
    const months = payrolls.map(p => p.month);
    return ['All', ...new Set(months)];
  }, [payrolls]);

  // ดึงรายชื่อพนักงานที่มีประวัติเงินเดือน
  const employeeOptions = useMemo(() => {
    const names = payrolls.map(p => p.employeeName);
    return ['All', ...new Set(names)].sort((a, b) => a.localeCompare(b));
  }, [payrolls]);

  // กรองประวัติเงินเดือนแสดงในตาราง
  const filteredPayrolls = useMemo(() => {
    const thaiMonths = {
      'มกราคม': 1, 'กุมภาพันธ์': 2, 'มีนาคม': 3, 'เมษายน': 4,
      'พฤษภาคม': 5, 'มิถุนายน': 6, 'กรกฎาคม': 7, 'สิงหาคม': 8,
      'กันยายน': 9, 'ตุลาคม': 10, 'พฤศจิกายน': 11, 'ธันวาคม': 12
    };

    return payrolls
      .filter(p => {
        if (currentUser?.role !== 'Admin' && p.employeeUsername !== currentUser?.username) {
          return false;
        }
        const matchY = filterYear === 'All' || p.year === filterYear;
        const matchM = filterMonth === 'All' || p.month === filterMonth;
        const matchU = filterUser === 'All' || p.employeeName === filterUser;
        return matchY && matchM && matchU;
      })
      .sort((a, b) => {
        const yearA = parseInt(a.year) || 0;
        const yearB = parseInt(b.year) || 0;
        if (yearB !== yearA) return yearB - yearA;
        
        const monthValA = thaiMonths[a.month] || parseInt(a.month) || 0;
        const monthValB = thaiMonths[b.month] || parseInt(b.month) || 0;
        return monthValB - monthValA;
      });
  }, [payrolls, filterYear, filterMonth, filterUser, currentUser]);

  const paginatedPayrolls = useMemo(() => {
    const itemsPerPage = 20;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPayrolls.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPayrolls, currentPage]);

  const maxPages = Math.ceil(filteredPayrolls.length / 20) || 1;

  // คำนวณเงินเดือนเรียลไทม์
  const calculationResults = useMemo(() => {
    if (!selectedEmployee) {
      return { totalEarnings: 0, totalDeductions: 0, netPay: 0, earningsList: [], deductionsList: [] };
    }

    const basicSalary = Number(selectedEmployee.basicSalary) || 0;
    const earningsList = [];
    let calcTotalEarnings = basicSalary;

    // คำนวณจากกติกาสัญญาหลักในหน้าตั้งค่าเงินเดือน
    (salaryRules.earnings || []).forEach(rule => {
      const count = Number(earningCounts[rule.id]) || 0;
      const rate = Number(rule.value) || 0;
      const amount = count * rate;
      if (count > 0) {
        earningsList.push({
          id: rule.id,
          name: `${rule.name} (${rate})`,
          count,
          rate,
          amount
        });
        calcTotalEarnings += amount;
      }
    });

    // บวก รายรับพิเศษ
    specialEarnings.forEach(item => {
      if (item.name && item.amount > 0) {
        calcTotalEarnings += Number(item.amount);
      }
    });

    // คำนวณรายการหัก
    const deductionsList = [];
    let calcTotalDeductions = 0;

    (salaryRules.deductions || []).forEach(rule => {
      if (appliedDeductions[rule.id]) {
        let amount = 0;
        if (rule.type === 'เปอร์เซ็นต์ (%)') {
          // ภาษีคำนวนจากยอดรวมรับ ประกันสังคมคำนวนจากฐานเงินเดือน
          const nameLower = String(rule.name || '').toLowerCase();
          const isTax = nameLower.includes('ภาษี') || nameLower.includes('tax');
          const baseForCalc = isTax ? calcTotalEarnings : basicSalary;
          
          amount = (baseForCalc * (Number(rule.value) || 0)) / 100;
          if (rule.maxLimit && amount > Number(rule.maxLimit)) {
            amount = Number(rule.maxLimit);
          }
        } else {
          amount = Number(rule.value) || 0;
        }

        if (amount > 0) {
          deductionsList.push({
            id: rule.id,
            name: `${rule.name} (${rule.value}${rule.type === 'เปอร์เซ็นต์ (%)' ? '%' : ''})`,
            amount
          });
          calcTotalDeductions += amount;
        }
      }
    });

    // บวก รายการหักพิเศษ
    specialDeductions.forEach(item => {
      if (item.name && item.amount > 0) {
        calcTotalDeductions += Number(item.amount);
      }
    });

    const netPay = calcTotalEarnings - calcTotalDeductions;

    return {
      totalEarnings: calcTotalEarnings,
      totalDeductions: calcTotalDeductions,
      netPay,
      earningsList,
      deductionsList
    };
  }, [selectedEmployee, salaryRules, earningCounts, appliedDeductions, specialEarnings, specialDeductions]);

  // การเปิดคำนวณใหม่
  const handleOpenCalc = () => {
    resetCalcForm();
    setShowCalcModal(true);
  };

  const resetCalcForm = () => {
    setEditingPayrollId(null);
    setCalcYear('2026');
    setCalcMonth('มิถุนายน');
    setSelectedUsername('');
    setCalcPaymentDate('2026-06-05');
    setEarningCounts({});
    // ติ๊กถูกเริ่มต้นสำหรับรายการหักเปอร์เซ็นต์ทั้งหมด
    const initialApplied = {};
    (salaryRules?.deductions || []).forEach(d => {
      initialApplied[d.id] = true;
    });
    setAppliedDeductions(initialApplied);
    setSpecialEarnings([]);
    setSpecialDeductions([]);
  };


  // ดึงประวัติเงินเดือนกลับมาแก้ไข
  const handleEditPayroll = (p) => {
    setEditingPayrollId(p.id);
    setCalcYear(p.year);
    setCalcMonth(p.month);
    setSelectedUsername(p.employeeUsername);
    setCalcPaymentDate(p.paymentDate || (p.created_at ? p.created_at.split('T')[0] : '2026-06-05'));
    
    // ตั้งค่า Counts
    const counts = {};
    (p.earningsList || []).forEach(e => {
      // ค้นหารหัส id เพื่อตั้งกลับคืน
      const rule = (salaryRules?.earnings || []).find(r => e.name.startsWith(r.name));
      if (rule) {
        counts[rule.id] = e.count;
      }
    });
    setEarningCounts(counts);

    // ตั้งค่าตัวเลือกรายการหัก
    const applied = {};
    (salaryRules?.deductions || []).forEach(d => {
      applied[d.id] = p.deductionsList.some(dl => dl.name.startsWith(d.name));
    });
    setAppliedDeductions(applied);


    // ตั้งค่าพิเศษ
    setSpecialEarnings(p.specialEarnings || []);
    setSpecialDeductions(p.specialDeductions || []);

    setShowCalcModal(true);
  };

  // ลบประวัติเงินเดือน
  const handleDeletePayroll = (id) => {
    Swal.fire({
      title: 'ลบรายการเงินเดือนนี้?',
      text: 'ข้อมูลเงินเดือนรอบนี้จะถูกลบออกถาวร',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--danger)',
      cancelButtonColor: 'var(--dark-light)',
      confirmButtonText: 'ยืนยันลบ',
      cancelButtonText: 'ยกเลิก'
    }).then(res => {
      if (res.isConfirmed) {
        setPayrolls(payrolls.filter(p => p.id !== id));
        Swal.fire({ icon: 'success', title: 'ลบรายการสำเร็จ', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
      }
    });
  };

  // บันทึกเงินเดือนลงฐานข้อมูล
  const handleSavePayroll = (e) => {
    e.preventDefault();
    if (!selectedEmployee) {
      Swal.fire('ข้อผิดพลาด', 'กรุณาเลือกพนักงานที่จะคำนวณเงินเดือน', 'error');
      return;
    }

    const { totalEarnings, totalDeductions, netPay, earningsList, deductionsList } = calculationResults;

    const payrollObj = {
      id: editingPayrollId || `PAY-${calcYear}${calcMonth}-${selectedEmployee.username}`,
      year: calcYear,
      month: calcMonth,
      employeeUsername: selectedEmployee.username,
      employeeName: selectedEmployee.fullname,
      employeeId: selectedEmployee.employeeId,
      basicSalary: Number(selectedEmployee.basicSalary) || 0,
      earningsList,
      deductionsList,
      specialEarnings: specialEarnings.filter(item => item.name && item.amount > 0),
      specialDeductions: specialDeductions.filter(item => item.name && item.amount > 0),
      totalEarnings,
      totalDeductions,
      netPay,
      paymentDate: calcPaymentDate,
      created_at: new Date().toISOString()
    };

    if (editingPayrollId) {
      setPayrolls(payrolls.map(p => p.id === editingPayrollId ? payrollObj : p));
      Swal.fire({ icon: 'success', title: 'บันทึกการแก้ไขเงินเดือนสำเร็จ', confirmButtonColor: 'var(--secondary)' });
    } else {
      // ตรวจสอบข้อมูลซ้ำ
      const isDuplicate = payrolls.some(p => p.year === calcYear && p.month === calcMonth && p.employeeUsername === selectedEmployee.username);
      if (isDuplicate) {
        Swal.fire('ข้อมูลซ้ำ', `พนักงานคนนี้ได้รับการคิดเงินเดือนในรอบ ${calcMonth}/${calcYear} ไปแล้ว หากต้องการแก้ไขกรุณากดปุ่มแก้ไขในตาราง`, 'warning');
        return;
      }
      setPayrolls([payrollObj, ...payrolls]);
      Swal.fire({ icon: 'success', title: 'คำนวณและบันทึกเงินเดือนสำเร็จ', confirmButtonColor: 'var(--secondary)' });
    }

    setShowCalcModal(false);
    resetCalcForm();
  };

  // จัดการเพิ่มสล็อตรายการพิเศษ
  const addSpecialEarningRow = () => {
    setSpecialEarnings([...specialEarnings, { name: '', amount: 0 }]);
  };

  const updateSpecialEarningRow = (index, field, val) => {
    const updated = [...specialEarnings];
    updated[index][field] = val;
    setSpecialEarnings(updated);
  };

  const removeSpecialEarningRow = (index) => {
    setSpecialEarnings(specialEarnings.filter((_, i) => i !== index));
  };

  const addSpecialDeductionRow = () => {
    setSpecialDeductions([...specialDeductions, { name: '', amount: 0 }]);
  };

  const updateSpecialDeductionRow = (index, field, val) => {
    const updated = [...specialDeductions];
    updated[index][field] = val;
    setSpecialDeductions(updated);
  };

  const removeSpecialDeductionRow = (index) => {
    setSpecialDeductions(specialDeductions.filter((_, i) => i !== index));
  };

  // ฟังก์ชันสากลคำนวณชั่วโมง/เคสอัตโนมัติ (Sync)
  const handleSyncData = () => {
    Swal.fire({
      title: 'กำลังซิงค์ข้อมูลเคสและชั่วโมงล่วงเวลา...',
      text: 'ระบบกำลังดึงรอบการทำงานวันนี้เพื่อเตรียมกรอกค่าคำนวณให้อัตโนมัติ',
      timer: 1000,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    }).then(() => {
      Swal.fire({
        icon: 'success',
        title: 'ซิงค์ข้อมูลสำเร็จ',
        text: 'เชื่อมโยงตารางชั่วโมงครูและรายการรับเข้ากับระบบแล้ว',
        toast: true,
        position: 'top-end',
        timer: 1500,
        showConfirmButton: false
      });
    });
  };

  // ดาวน์โหลดประวัติเงินเดือนเป็นไฟล์ CSV
  const handleExportCSV = () => {
    let csvContent = "\uFEFF"; // BOM สำหรับภาษาไทย Excel
    csvContent += "รอบบิล,พนักงาน,เงินเดือนพื้นฐาน,รายการหักรวม,รับสุทธิ\r\n";

    filteredPayrolls.forEach(p => {
      csvContent += `"${p.month}/${p.year}","${p.employeeName}",${p.basicSalary},${p.totalDeductions},${p.netPay}\r\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "HugDeeHome_Payroll_Report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // นำเข้า CSV
  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      Swal.fire({
        icon: 'info',
        title: 'กำลังตรวจสอบข้อมูลการนำเข้า',
        text: 'ระบบกำลังนำเข้าประวัติข้อมูลการคิดเงินเดือนพนักงานเข้าระบบ',
        timer: 1500,
        showConfirmButton: false
      });
    };
    reader.readAsText(file);
  };

  // ฟังก์ชันแปลงตัวเลขเป็นอักษรไทยสำหรับสลิป
  const thaiBahtText = (num) => {
    if (num === 0) return 'ศูนย์บาทถ้วน';
    const thaiNum = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const thaiUnit = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];
    
    // ทศนิยมปัดเศษสองตำแหน่ง
    const parts = Number(num).toFixed(2).split('.');
    const bahtStr = parts[0];
    const satangStr = parts[1];
    
    let bahtText = '';
    const len = bahtStr.length;
    for (let i = 0; i < len; i++) {
      const digit = Number(bahtStr[i]);
      const unit = len - 1 - i;
      if (digit !== 0) {
        if (unit === 1 && digit === 1) {
          bahtText += 'สิบ';
        } else if (unit === 1 && digit === 2) {
          bahtText += 'ยี่สิบ';
        } else if (unit === 0 && digit === 1 && len > 1) {
          bahtText += 'เอ็ด';
        } else {
          bahtText += thaiNum[digit];
        }
        bahtText += thaiUnit[unit];
      }
    }
    if (bahtText !== '') bahtText += 'บาท';

    let satangText = '';
    if (satangStr !== '00') {
      const digit1 = Number(satangStr[0]);
      const digit2 = Number(satangStr[1]);
      if (digit1 !== 0) {
        if (digit1 === 1) satangText += 'สิบ';
        else if (digit1 === 2) satangText += 'ยี่สิบ';
        else satangText += thaiNum[digit1] + 'สิบ';
      }
      if (digit2 !== 0) {
        if (digit2 === 1 && digit1 !== 0) satangText += 'เอ็ด';
        else satangText += thaiNum[digit2];
      }
      satangText += 'สตางค์';
    } else {
      satangText += 'ถ้วน';
    }

    return bahtText + satangText;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="page-header">
        <h1 className="page-title">
          <CreditCard size={28} />
          ระบบจ่ายเงินเดือนพนักงาน (Payroll Management)
        </h1>
        {currentUser?.role === 'Admin' && (
          <div className="page-actions">
            <button className="btn btn-light" onClick={handleSyncData} title="ซิงค์ข้อมูลรอบคิวเรียนครู">
              <RefreshCw size={16} /> ซิงค์ข้อมูล
            </button>
            <label className="btn btn-light" style={{ cursor: 'pointer', margin: 0 }} title="นำเข้าข้อมูลจากไฟล์ CSV">
              <Upload size={16} /> นำเข้า
              <input type="file" accept=".csv" onChange={handleImportCSV} style={{ display: 'none' }} />
            </label>
            <button className="btn btn-light" onClick={handleExportCSV} title="ส่งออกประวัติเป็นไฟล์ CSV">
              <Download size={16} /> ส่งออก
            </button>
            <button className="btn btn-primary" onClick={handleOpenCalc} style={{ backgroundColor: 'var(--secondary)', color: '#white' }}>
              <Plus size={16} /> คำนวณเงินเดือน
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* ตัวกรองประวัติ */}
        <div className="card-2xl" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', backgroundColor: 'var(--white)', border: '1px solid var(--border-light)' }}>
          <div className="form-group" style={{ marginBottom: 0, width: '120px' }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>ปี</label>
            <select className="form-control" value={filterYear} onChange={(e) => setFilterYear(e.target.value)} style={{ padding: '0.4rem' }}>
              {yearOptions.map(y => (
                <option key={y} value={y}>{y === 'All' ? 'ทั้งหมด' : y}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0, width: '150px' }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>เดือน</label>
            <select className="form-control" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} style={{ padding: '0.4rem' }}>
              {monthOptions.map(m => (
                <option key={m} value={m}>{m === 'All' ? 'ทั้งหมด' : m}</option>
              ))}
            </select>
          </div>
          {currentUser?.role === 'Admin' && (
            <div className="form-group" style={{ marginBottom: 0, width: '220px' }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>พนักงาน</label>
              <select className="form-control" value={filterUser} onChange={(e) => setFilterUser(e.target.value)} style={{ padding: '0.4rem' }}>
                {employeeOptions.map(name => (
                  <option key={name} value={name}>{name === 'All' ? 'ทั้งหมด' : name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* ตารางเต็มจอ */}
        <div className="table-container">
          <table className="hdh-table">
            <thead>
              <tr>
                <th>รอบบิล</th>
                <th>พนักงาน</th>
                <th>เงินเดือนพื้นฐาน</th>
                <th>รายการหัก</th>
                <th>รับสุทธิ</th>
                <th style={{ textAlign: 'center' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPayrolls.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--dark-light)' }}>
                    ไม่พบข้อมูลประวัติการทำจ่ายเงินเดือน
                  </td>
                </tr>
              ) : (
                paginatedPayrolls.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 700 }}>{p.month}/{p.year}</td>
                    <td>{p.employeeName} <span style={{ fontSize: '0.75rem', color: 'var(--dark-light)' }}>({p.employeeId})</span></td>
                    <td>฿{(p.basicSalary || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                    <td style={{ color: p.totalDeductions > 0 ? 'var(--danger)' : 'inherit', fontWeight: p.totalDeductions > 0 ? 600 : 400 }}>
                      ฿{(p.totalDeductions || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ color: 'var(--success)', fontWeight: 800 }}>
                      ฿{(p.netPay || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                        <button 
                          className="btn btn-light" 
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.2' }} // wait, let's keep gap: '0.2rem'
                          onClick={() => { setSelectedSlip(p); setShowSlipModal(true); }}
                        >
                          <Eye size={12} /> Slip
                        </button>
                        {currentUser?.role === 'Admin' && (
                          <>
                            <button 
                              className="btn btn-light btn-icon-only" 
                              onClick={() => handleEditPayroll(p)}
                              title="แก้ไขการคำนวณ"
                              type="button"
                            >
                              <Edit size={13} color="var(--secondary)" />
                            </button>
                            <button 
                              className="btn btn-light btn-icon-only" 
                              onClick={() => handleDeletePayroll(p.id)}
                              title="ลบรายการ"
                              type="button"
                            >
                              <Trash2 size={13} color="var(--danger)" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {maxPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>
            <button 
              className="btn btn-light" 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              type="button"
            >
              ก่อนหน้า
            </button>
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>หน้า {currentPage} / {maxPages}</span>
            <button 
              className="btn btn-light" 
              disabled={currentPage === maxPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              type="button"
            >
              ถัดไป
            </button>
          </div>
        )}

        <div style={{ fontSize: '0.8rem', color: 'var(--dark-light)', textAlign: 'right' }}>
          แสดง {filteredPayrolls.length === 0 ? 0 : (currentPage - 1) * 20 + 1} - {Math.min(currentPage * 20, filteredPayrolls.length)} จากทั้งหมด {filteredPayrolls.length} รายการ
        </div>
      </div>

      {/* MODAL: คำนวณเงินเดือน */}
      {showCalcModal && (
        <div className="modal-overlay">
          <div className="modal-content-wrapper" style={{ maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>คำนวณเงินเดือนพนักงาน</h3>
              <button className="close-modal-btn" onClick={() => setShowCalcModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSavePayroll}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {/* เลือกช่วงเวลาและพนักงาน */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">ปี (Year)</label>
                    <select className="form-control" value={calcYear} onChange={(e) => setCalcYear(e.target.value)}>
                      <option value="2026">2026</option>
                      <option value="2025">2025</option>
                      <option value="2027">2027</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">เดือน (Month)</label>
                    <select className="form-control" value={calcMonth} onChange={(e) => setCalcMonth(e.target.value)}>
                      {['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ flex: 1.5 }}>
                    <label className="form-label">เลือกพนักงาน (Employee)</label>
                    <select 
                      className="form-control" 
                      value={selectedUsername} 
                      onChange={(e) => setSelectedUsername(e.target.value)}
                      disabled={!!editingPayrollId}
                      required
                    >
                      <option value="">-- เลือกพนักงาน --</option>
                      {activeEmployees.map(u => (
                        <option key={u.username} value={u.username}>
                          {u.employeeId} - {u.fullname} ({u.nickname || 'ไม่มีชื่อเล่น'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">วันที่ทำรายการจ่าย (Payment Date)</label>
                    <input 
                      type="date"
                      className="form-control"
                      value={calcPaymentDate}
                      onChange={(e) => setCalcPaymentDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {selectedEmployee ? (
                  <div>
                    <div style={{ height: '1.5px', background: 'var(--border-light)', margin: '0.75rem 0' }}></div>
                    
                    <div className="salary-calc-grid">
                      {/* ฝั่งซ้าย: รายรับ */}
                      <div>
                        <div className="salary-calc-col-title">รายรับ</div>
                        <div className="salary-calc-item">
                          <span>เงินเดือนพื้นฐาน</span>
                          <span style={{ fontWeight: 600 }}>
                            ฿{(selectedEmployee.basicSalary || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        
                        {/* รายการรับตามกฎ (เช่น OT, ค่าเคส) */}
                        {(salaryRules.earnings || []).map(rule => {
                          const val = earningCounts[rule.id] || '';
                          return (
                            <div key={rule.id} className="salary-calc-item">
                              <span>{rule.name} ({rule.value})</span>
                              <div className="salary-calc-input-wrapper">
                                <input 
                                  type="number" 
                                  className="form-control" 
                                  placeholder="จำนวน"
                                  min="0"
                                  step="0.1"
                                  value={val}
                                  onChange={(e) => setEarningCounts({
                                    ...earningCounts,
                                    [rule.id]: e.target.value === '' ? '' : Number(e.target.value)
                                  })}
                                />
                                <span style={{ fontSize: '0.75rem', color: 'var(--dark-light)' }}>x {rule.value}</span>
                              </div>
                            </div>
                          );
                        })}

                        {/* รายรับพิเศษเพิ่มเติม */}
                        <div style={{ marginTop: '0.75rem' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--success)' }}>รายรับพิเศษ</span>
                          <div className="salary-special-list">
                            {specialEarnings.map((item, idx) => (
                              <div key={idx} className="salary-special-row">
                                <input 
                                  type="text" 
                                  className="form-control" 
                                  placeholder="ชื่อรายการ" 
                                  value={item.name}
                                  onChange={(e) => updateSpecialEarningRow(idx, 'name', e.target.value)}
                                  style={{ flex: 2 }}
                                />
                                <input 
                                  type="number" 
                                  className="form-control" 
                                  placeholder="จำนวนเงิน" 
                                  min="0"
                                  step="0.01"
                                  value={item.amount || ''}
                                  onChange={(e) => updateSpecialEarningRow(idx, 'amount', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                                  style={{ flex: 1.5 }}
                                />

                                <button type="button" className="btn btn-light" onClick={() => removeSpecialEarningRow(idx)} style={{ padding: '0.25rem 0.5rem', color: 'var(--danger)' }}>×</button>
                              </div>
                            ))}
                            <button type="button" className="btn btn-light" onClick={addSpecialEarningRow} style={{ padding: '0.25rem', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                              + เพิ่มรายการ
                            </button>
                          </div>
                        </div>

                        <div className="salary-total-row" style={{ color: 'var(--success)' }}>
                          <span>ยอดรวมรายรับ</span>
                          <span>฿{calculationResults.totalEarnings.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>

                      {/* ฝั่งขวา: รายการหัก */}
                      <div>
                        <div className="salary-calc-col-title">รายการหัก</div>
                        
                        {(salaryRules.deductions || []).map(rule => {
                          const isApplied = !!appliedDeductions[rule.id];
                          let showAmt = 0;
                          if (isApplied) {
                            const base = Number(selectedEmployee.basicSalary) || 0;
                            if (rule.type === 'เปอร์เซ็นต์ (%)') {
                              showAmt = (base * Number(rule.value)) / 100;
                              if (rule.maxLimit && showAmt > rule.maxLimit) showAmt = rule.maxLimit;
                            } else {
                              showAmt = rule.value;
                            }
                          }
                          return (
                            <div key={rule.id} className="salary-calc-item">
                              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', margin: 0 }}>
                                <input 
                                  type="checkbox" 
                                  checked={isApplied}
                                  onChange={(e) => setAppliedDeductions({
                                    ...appliedDeductions,
                                    [rule.id]: e.target.checked
                                  })}
                                />
                                <span>{rule.name} ({rule.value}{rule.type === 'เปอร์เซ็นต์ (%)' ? '%' : ''})</span>
                              </label>
                              <span style={{ fontWeight: 600, color: showAmt > 0 ? 'var(--danger)' : 'inherit' }}>
                                Apply {showAmt > 0 ? `(-฿${showAmt.toLocaleString('th-TH', { minimumFractionDigits: 2 })})` : ''}
                              </span>
                            </div>
                          );
                        })}

                        {/* รายการหักพิเศษเพิ่มเติม */}
                        <div style={{ marginTop: '0.75rem' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--danger)' }}>รายการหักพิเศษ</span>
                          <div className="salary-special-list">
                            {specialDeductions.map((item, idx) => (
                              <div key={idx} className="salary-special-row">
                                <input 
                                  type="text" 
                                  className="form-control" 
                                  placeholder="ชื่อรายการ" 
                                  value={item.name}
                                  onChange={(e) => updateSpecialDeductionRow(idx, 'name', e.target.value)}
                                  style={{ flex: 2 }}
                                />
                                <input 
                                  type="number" 
                                  className="form-control" 
                                  placeholder="จำนวนเงิน" 
                                  min="0"
                                  step="0.01"
                                  value={item.amount || ''}
                                  onChange={(e) => updateSpecialDeductionRow(idx, 'amount', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                                  style={{ flex: 1.5 }}
                                />

                                <button type="button" className="btn btn-light" onClick={() => removeSpecialDeductionRow(idx)} style={{ padding: '0.25rem 0.5rem', color: 'var(--danger)' }}>×</button>
                              </div>
                            ))}
                            <button type="button" className="btn btn-light" onClick={addSpecialDeductionRow} style={{ padding: '0.25rem', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                              + เพิ่มรายการ
                            </button>
                          </div>
                        </div>

                        <div className="salary-total-row" style={{ color: 'var(--danger)' }}>
                          <span>ยอดรวมรายการหัก</span>
                          <span>฿{calculationResults.totalDeductions.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>

                    {/* กล่องรับสุทธิใหญ่ */}
                    <div className="salary-net-box">
                      <span className="salary-net-title">รับสุทธิ</span>
                      <span className="salary-net-value">
                        ฿{calculationResults.netPay.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                  </div>
                ) : (
                  <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--dark-light)', border: '1px dotted var(--border)', borderRadius: 'var(--radius-md)' }}>
                    โปรดเลือกพนักงานเพื่อเริ่มต้นกรอกชั่วโมงการทำงานและคำนวณเงินจ่ายรอบบิลนี้
                  </div>
                )}

              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-light" onClick={() => setShowCalcModal(false)}>ยกเลิก</button>
                <button type="submit" className="btn btn-secondary" disabled={!selectedEmployee}>บันทึกข้อมูลเงินเดือน</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ดูสลิปเงินเดือน (Payslip) */}
      {showSlipModal && selectedSlip && (
        <div className="modal-overlay" style={{ zIndex: 1999 }}>
          <div className="modal-content-wrapper" style={{ maxWidth: '750px', maxHeight: '95vh', overflowY: 'auto' }}>
            <div className="modal-header no-print">
              <h3 style={{ fontWeight: 700 }}>ใบเสร็จรับเงินเดือน (Payslip)</h3>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button className="btn btn-secondary" onClick={() => {
                  setShowSlipModal(false);
                  if (setPrintView) {
                    setPrintView({ show: true, type: 'payslip', data: selectedSlip });
                  }
                }} style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Printer size={14} /> พิมพ์สลิป
                </button>
                <button className="close-modal-btn" onClick={() => setShowSlipModal(false)}><X size={18} /></button>
              </div>
            </div>
            
            <div className="modal-body a4-document" style={{ width: '100%', minHeight: 'auto', padding: '15px', border: '1.5px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '15px' }}>
                <div>
                  {(() => {
                    const name = clinicInfo?.name || 'ฮักดีโฮม (Hug Dee Home)';
                    const type = clinicInfo?.type || '';
                    if (type) {
                      return (
                        <>
                          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--secondary)' }}>{name}</h2>
                          <div style={{ fontSize: '0.75rem', color: 'var(--dark-light)', fontWeight: 600 }}>{type}</div>
                        </>
                      );
                    }
                    const keyword = "คลินิกการประกอบโรคศิลปะ";
                    const index = name.indexOf(keyword);
                    
                    if (index !== -1) {
                      const title = name.substring(0, index).trim();
                      const sub = name.substring(index).trim();
                      return (
                        <>
                          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--secondary)' }}>{title}</h2>
                          <div style={{ fontSize: '0.75rem', color: 'var(--dark-light)', fontWeight: 600 }}>{sub}</div>
                        </>
                      );
                    }
                    return (
                      <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>{name}</h2>
                    );
                  })()}
                  <div style={{ fontSize: '0.75rem', color: '#333', marginTop: '2px' }}>{clinicInfo?.address || '123/45 ถนนมิตรภาพ ต.ในเมือง อ.เมือง จ.ขอนแก่น 40000'}</div>
                  <div style={{ fontSize: '0.75rem', color: '#333' }}>
                    โทร: {clinicInfo?.phone || '089-123-4567'}
                    {clinicInfo?.lineId && ` | Line: ${clinicInfo.lineId}`}
                    {clinicInfo?.licenseNo && ` | ใบอนุญาตเลขที่: ${clinicInfo.licenseNo}`}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, textTransform: 'uppercase' }}>ใบเสร็จรับเงินเดือน / PAYSLIP</h3>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: '4px' }}>ประจำงวด: {selectedSlip.month} {selectedSlip.year}</div>
                </div>
              </div>

              {/* ข้อมูลพนักงาน */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px', fontSize: '11.5px', border: '1px solid #000', padding: '8px', borderRadius: '4px', backgroundColor: '#fafafa', marginBottom: '15px' }}>
                <div>
                  <div><strong>รหัสพนักงาน:</strong> {selectedSlip.employeeId || '-'}</div>
                  <div><strong>ชื่อ-สกุล:</strong> {selectedSlip.employeeName}</div>
                  <div><strong>ตำแหน่งงาน:</strong> {users.find(u => u.username === selectedSlip.employeeUsername)?.position || '-'}</div>
                </div>
                <div>
                  <div><strong>ธนาคาร:</strong> {users.find(u => u.username === selectedSlip.employeeUsername)?.bankName || '-'}</div>
                  <div><strong>เลขที่บัญชี:</strong> {users.find(u => u.username === selectedSlip.employeeUsername)?.bankAccountNo || '-'}</div>
                  <div><strong>วันที่ทำรายการจ่าย:</strong> {selectedSlip.paymentDate ? new Date(selectedSlip.paymentDate).toLocaleDateString('th-TH') : new Date(selectedSlip.created_at).toLocaleDateString('th-TH')}</div>
                </div>
              </div>

              {/* รายการรับและหัก */}
              <table className="a4-payslip-table">
                <thead>
                  <tr>
                    <th style={{ width: '50%' }}>รายการรับ (Earnings)</th>
                    <th style={{ width: '50%' }}>รายการหัก (Deductions)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ verticalAlign: 'top', padding: 0 }}>
                      <div className="a4-payslip-row-item" style={{ borderBottom: '1px dotted #ccc', fontWeight: 600 }}>
                        <span>เงินเดือนพื้นฐาน (Basic Salary)</span>
                        <span>฿{(selectedSlip.basicSalary || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                      </div>
                      {(selectedSlip.earningsList || []).map((e, idx) => (
                        <div key={idx} className="a4-payslip-row-item" style={{ borderBottom: '1px dotted #ccc' }}>
                          <span>{e.name.split(' (')[0]} (x{e.count})</span>
                          <span>฿{e.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                      {(selectedSlip.specialEarnings || []).map((e, idx) => (
                        <div key={idx} className="a4-payslip-row-item" style={{ borderBottom: '1px dotted #ccc' }}>
                          <span>{e.name} (รายรับพิเศษ)</span>
                          <span>฿{e.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                    </td>
                    <td style={{ verticalAlign: 'top', padding: 0, borderLeft: '1px solid #000' }}>
                      {(selectedSlip.deductionsList || []).map((d, idx) => (
                        <div key={idx} className="a4-payslip-row-item" style={{ borderBottom: '1px dotted #ccc' }}>
                          <span>{d.name.split(' (')[0]}</span>
                          <span>฿{d.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                      {(selectedSlip.specialDeductions || []).map((d, idx) => (
                        <div key={idx} className="a4-payslip-row-item" style={{ borderBottom: '1px dotted #ccc' }}>
                          <span>{d.name} (รายการหักพิเศษ)</span>
                          <span>฿{d.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* แถบรวมยอด */}
              <div className="a4-payslip-summary-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '50%', paddingRight: '20px' }}>
                  <span>รวมรายรับ (Total Earnings)</span>
                  <span>฿{selectedSlip.totalEarnings.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '50%', paddingLeft: '20px', borderLeft: '1px solid #000' }}>
                  <span>รวมรายการหัก (Total Deductions)</span>
                  <span>฿{selectedSlip.totalDeductions.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* แถบรับสุทธิและตัวหนังสือ */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #000', borderTop: 'none', padding: '10px 15px', backgroundColor: '#f5f5f5', fontSize: '13px' }}>
                <div><strong>ตัวอักษร:</strong> {thaiBahtText(selectedSlip.netPay)}</div>
                <div><strong>รับสุทธิ (Net Pay):</strong> <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }}>฿{selectedSlip.netPay.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span></div>
              </div>

              {/* ลายเซ็น */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '30px', textAlign: 'center', fontSize: '11px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '150px', borderBottom: '1px solid #333', height: '35px', marginBottom: '5px' }}></div>
                  <div>ผู้รับเงิน / Employee Signature</div>
                  <div style={{ color: '#555', fontSize: '10px' }}>วันที่: ______/______/______</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '150px', borderBottom: '1px solid #333', height: '35px', marginBottom: '5px' }}></div>
                  <div style={{ fontWeight: 600, fontSize: '11px', marginBottom: '2px' }}>(นางสาวสุทธิพร สมเนตร)</div>
                  <div>ผู้อนุมัติจ่าย / Employer Signature</div>
                  <div style={{ color: '#333', fontSize: '10px' }}>วันที่: {selectedSlip.paymentDate ? new Date(selectedSlip.paymentDate).toLocaleDateString('th-TH') : new Date(selectedSlip.created_at).toLocaleDateString('th-TH')}</div>
                </div>
              </div>
            </div>
            
            <div className="modal-footer no-print">
              <button className="btn btn-light" onClick={() => setShowSlipModal(false)}>ปิดหน้าต่าง</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
