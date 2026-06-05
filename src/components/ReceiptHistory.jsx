import React, { useState, useMemo } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Edit, 
  Printer, 
  XOctagon, 
  Coins, 
  Calendar
} from 'lucide-react';
import Swal from 'sweetalert2';

export default function ReceiptHistory({ 
  patients, 
  receipts, 
  onVoidReceipt, 
  onEditDraftReceipt, 
  onPrintReceipt 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMonth, setFilterMonth] = useState('All'); // All, 01-12
  const [filterYear, setFilterYear] = useState('2026');   // All, 2026, ฯลฯ

  // ตัวเลือกเดือน
  const thaiMonths = [
    { value: '01', name: 'มกราคม' },
    { value: '02', name: 'กุมภาพันธ์' },
    { value: '03', name: 'มีนาคม' },
    { value: '04', name: 'เมษายน' },
    { value: '05', name: 'พฤษภาคม' },
    { value: '06', name: 'มิถุนายน' },
    { value: '07', name: 'กรกฎาคม' },
    { value: '08', name: 'สิงหาคม' },
    { value: '09', name: 'กันยายน' },
    { value: '10', name: 'ตุลาคม' },
    { value: '11', name: 'พฤศจิกายน' },
    { value: '12', name: 'ธันวาคม' }
  ];

  // คัดกรองใบเสร็จทั้งหมด
  const filteredReceipts = useMemo(() => {
    return receipts
      .map(r => {
        const patient = patients.find(p => p.hn === r.hn);
        return {
          ...r,
          patientName: patient ? `${patient.title}${patient.firstname} ${patient.lastname}` : 'ไม่พบชื่อผู้ป่วย',
          patientNickname: patient ? patient.nickname : ''
        };
      })
      .filter(r => {
        // ค้นหา
        const query = searchQuery.trim().toLowerCase();
        const matchesQuery = 
          r.id.toLowerCase().includes(query) ||
          r.hn.toLowerCase().includes(query) ||
          r.patientName.toLowerCase().includes(query) ||
          (r.patientNickname && r.patientNickname.toLowerCase().includes(query));

        // กรองปี
        const dateParts = r.date.split('-'); // YYYY-MM-DD
        const year = dateParts[0];
        const month = dateParts[1];
        
        const matchesYear = filterYear === 'All' || year === filterYear;
        const matchesMonth = filterMonth === 'All' || month === filterMonth;

        return matchesQuery && matchesYear && matchesMonth;
      })
      .sort((a, b) => b.id.localeCompare(a.id)); // เรียงรหัสใบเสร็จล่าสุดขึ้นก่อน (ใหม่ไปเก่า)
  }, [receipts, patients, searchQuery, filterMonth, filterYear]);

  // จัดการยกเลิกบิล (Void)
  const handleVoidClick = (id) => {
    Swal.fire({
      title: `ยกเลิกใบเสร็จนี้? [เลขที่: ${id}]`,
      text: "ยอดขายจะถูกดึงออกจาก Dashboard และจำนวนคอร์สบริการในบิลนี้จะถูกหักล้างออกคืนให้ผู้ป่วยทันที!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--danger)',
      cancelButtonColor: 'var(--dark-light)',
      confirmButtonText: 'ยืนยันการยกเลิก (Void)',
      cancelButtonText: 'ยกเลิก'
    }).then((result) => {
      if (result.isConfirmed) {
        onVoidReceipt(id);
        Swal.fire({
          title: 'ยกเลิกใบเสร็จเรียบร้อยแล้ว',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  };

  // จัดการแก้ไขบิลร่าง (Draft) ดึงกลับไปหน้า POS
  const handleEditDraft = (receipt) => {
    onEditDraftReceipt(receipt);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="page-header">
        <h1 className="page-title">
          <History size={28} />
          ประวัติใบเสร็จและใบแจ้งหนี้ (Receipt History)
        </h1>
      </div>

      <div className="card-3xl">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem' }}>ค้นหาและตรวจสอบเอกสารการเงิน</h2>
        
        {/* แถบค้นหาและตัวกรองวันเดือนปี */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
          <div className="search-input-wrapper" style={{ flex: 2, minWidth: '280px' }}>
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              className="form-control" 
              placeholder="ค้นหาตามเลขที่บิล, HN, ชื่อ หรือชื่อเล่นผู้รับบริการ..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '280px' }}>
            <div style={{ flex: 1 }}>
              <select 
                className="form-control"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
              >
                <option value="All">-- แสดงทุกเดือน --</option>
                {thaiMonths.map(m => (
                  <option key={m.value} value={m.value}>{m.name}</option>
                ))}
              </select>
            </div>
            
            <div style={{ flex: 1 }}>
              <select 
                className="form-control"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
              >
                <option value="All">-- ทุกปี --</option>
                <option value="2026">2569 (2026)</option>
                <option value="2027">2570 (2027)</option>
              </select>
            </div>
          </div>
        </div>

        {/* ตารางแสดงข้อมูลใบเสร็จ */}
        <div className="table-container">
          <table className="hdh-table">
            <thead>
              <tr>
                <th>เลขที่เอกสาร</th>
                <th>วันที่ออกบิล</th>
                <th>ข้อมูลผู้รับบริการ</th>
                <th>รายการซื้อ</th>
                <th>ชำระโดย</th>
                <th style={{ textAlign: 'right' }}>ยอดสุทธิ</th>
                <th style={{ textAlign: 'center' }}>สถานะ</th>
                <th style={{ textAlign: 'center' }}>การดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '4rem', color: 'var(--dark-light)' }}>
                    ไม่พบข้อมูลบิลการเงินตามเงื่อนไขที่ระบุ
                  </td>
                </tr>
              ) : (
                filteredReceipts.map((r) => {
                  const isVoided = r.status === 'ยกเลิก';
                  const isDraft = r.status === 'รอชำระเงิน';
                  
                  return (
                    <tr key={r.id} style={{ opacity: isVoided ? 0.6 : 1 }}>
                      <td style={{ fontWeight: 700, color: 'var(--secondary)', fontFamily: 'monospace' }}>
                        {r.id}
                      </td>
                      <td>{new Date(r.date).toLocaleDateString('th-TH')}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.patientName}</div>
                        {/* แสดงชื่อเล่นในวงเล็บต่อท้าย HN ลูกค้าเสมอตามสเปก */}
                        <div style={{ fontSize: '0.75rem', color: 'var(--dark-light)' }}>
                          HN: {r.hn} ({r.patientNickname ? `น้อง${r.patientNickname}` : 'ไม่มีชื่อเล่น'})
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem' }}>
                          {r.items.map((it, idx) => (
                            <div key={idx}>
                              • {it.name} x{it.quantity}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem' }}>
                          {r.paymentMethod}
                          {r.bankAccountId && (
                            <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--dark-light)' }}>
                              โอนเข้า: {r.bankAccountId}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ 
                        textAlign: 'right', 
                        fontWeight: 700, 
                        textDecoration: isVoided ? 'line-through' : 'none',
                        color: isVoided ? 'var(--danger)' : 'var(--dark)'
                      }}>
                        ฿{r.totalAmount.toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${
                          r.status === 'ชำระเงินแล้ว' ? 'badge-success' : 
                          r.status === 'รอชำระเงิน' ? 'badge-warning' : 'badge-danger'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                          
                          {/* บิลพิมพ์ */}
                          <button 
                            className="btn btn-light btn-icon-only" 
                            title="พิมพ์บิล (PDF)"
                            onClick={() => onPrintReceipt(r.id)}
                          >
                            <Printer size={16} color="var(--info)" />
                          </button>

                          {/* บิลดราฟท์แก้ไขได้ */}
                          {isDraft && (
                            <button 
                              className="btn btn-light btn-icon-only" 
                              title="ดึงข้อมูลกลับไปจ่ายเงินต่อที่ POS"
                              onClick={() => handleEditDraft(r)}
                            >
                              <Edit size={16} color="var(--secondary)" />
                            </button>
                          )}

                          {/* บิลชำระแล้วสั่งยกเลิก (Void) ได้ */}
                          {r.status === 'ชำระเงินแล้ว' && (
                            <button 
                              className="btn btn-light btn-icon-only" 
                              title="ยกเลิกใบเสร็จนี้ (Void)"
                              onClick={() => handleVoidClick(r.id)}
                            >
                              <XOctagon size={16} color="var(--danger)" />
                            </button>
                          )}

                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        <div style={{ fontSize: '0.8rem', color: 'var(--dark-light)', textAlign: 'right', marginTop: '1rem' }}>
          รวมเอกสารทั้งหมด {filteredReceipts.length} รายการ (เรียงจากเลขบิลล่าสุด)
        </div>
      </div>
    </div>
  );
}
