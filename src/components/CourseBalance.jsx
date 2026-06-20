import React, { useState, useMemo } from 'react';
import { formatPatientNickname, formatTherapistName } from '../utils/format';
import { 
  FileText, 
  Plus, 
  ArrowLeftRight, 
  History, 
  CalendarDays, 
  User, 
  ArrowUpRight, 
  ArrowDownLeft,
  CheckCircle,
  HelpCircle,
  Gift,
  Pencil,
  Trash2
} from 'lucide-react';
import Swal from 'sweetalert2';

export default function CourseBalance({ 
  patients, 
  appointments, 
  receipts, 
  therapists,
  rewards = [],
  currentUser,
  onManualAddCourse, 
  onTransferCourse,
  onManualAdjustPoints,
  onTransferPoints,
  onRedeemReward,
  onDeleteManualPoints,
  onEditManualPoints
}) {
  const [selectedHn, setSelectedHn] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [patientStatusFilter, setPatientStatusFilter] = useState('ทั้งหมด'); // 'ทั้งหมด', 'Active', 'Inactive'
  
  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';

  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedHn]);
  
  // สำหรับการค้นหาผู้ป่วยหลัก
  const [patientSearchText, setPatientSearchText] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // สำหรับการค้นหาผู้รับโอน
  const [transfereeSearchText, setTransfereeSearchText] = useState('');
  const [showTransfereeDropdown, setShowTransfereeDropdown] = useState(false);
  
  // สถานะ Modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  
  // ตัวแปรฟอร์ม Manual Add
  const [manualSessions, setManualSessions] = useState(1);
  const [manualRemark, setManualRemark] = useState('เพิ่มคอร์สอำนวยความสะดวกภายนอก');
  
  // ตัวแปรฟอร์ม Transfer
  const [transferSessions, setTransferSessions] = useState(1);
  const [transfereeHn, setTransfereeHn] = useState('');
  const [transferRemark, setTransferRemark] = useState('โอนสิทธิ์ระหว่างครอบครัว');

  // สถานะ Modal คะแนน
  const [showPointsManualModal, setShowPointsManualModal] = useState(false);
  const [showPointsTransferModal, setShowPointsTransferModal] = useState(false);
  const [showPointsRedeemModal, setShowPointsRedeemModal] = useState(false);

  // ตัวแปรฟอร์ม Manual Add Points
  const [manualPoints, setManualPoints] = useState(1);
  const [manualPointsAction, setManualPointsAction] = useState('add'); // 'add' หรือ 'deduct'
  const [manualPointsRemark, setManualPointsRemark] = useState('ปรับปรุงแต้มสะสมพิเศษ');

  // ตัวแปรฟอร์ม Transfer Points
  const [transferPoints, setTransferPoints] = useState(1);
  const [transfereePointsHn, setTransfereePointsHn] = useState('');
  const [transferPointsRemark, setTransferPointsRemark] = useState('โอนคะแนนสะสมให้เพื่อน');
  const [pointsTransfereeSearchText, setPointsTransfereeSearchText] = useState('');
  const [showPointsTransfereeDropdown, setShowPointsTransfereeDropdown] = useState(false);

  // ตัวแปรฟอร์ม Redeem Reward
  const [selectedRewardCode, setSelectedRewardCode] = useState('');

  // ตัวแปรฟอร์ม แก้ไข คะแนน (Edit Points)
  const [editingPointsDocId, setEditingPointsDocId] = useState('');
  const [editPointsVal, setEditPointsVal] = useState(1);
  const [editPointsAction, setEditPointsAction] = useState('add');
  const [editPointsRemark, setEditPointsRemark] = useState('');
  const [showPointsEditModal, setShowPointsEditModal] = useState(false);

  // ดึงผู้ป่วยที่เลือก
  const currentPatient = useMemo(() => {
    return patients.find(p => p.hn === selectedHn);
  }, [selectedHn, patients]);

  // คำนวณข้อมูลคอร์สและคะแนนสะสมของทุกคน
  const patientCourseBalances = useMemo(() => {
    return patients.map(p => {
      // 1. ยอดซื้อและคะแนนสะสมทั้งหมด (ชำระแล้วเท่านั้น)
      const patientReceipts = receipts.filter(r => r.hn === p.hn && r.status === 'ชำระเงินแล้ว');
      let purchased = 0;
      let pointsEarned = 0;
      let pointsUsed = 0;

      patientReceipts.forEach(r => {
        r.items.forEach(item => {
          if (item.type === 'บริการ') {
            if (item.code === 'TRANSFER_OUT') {
              purchased -= item.quantity; // โอนออก ลดยอด
            } else if (item.code === 'TRANSFER_IN' || item.code === 'MANUAL_ADD') {
              purchased += item.quantity; // โอนเข้า/แมนนวล เพิ่มยอด
            } else if (item.code === 'SV02' || (item.name && item.name.includes('ประเมินพัฒนาการ'))) {
              // ไม่เอา ประเมินพัฒนาการครั้งแรกมานับ
            } else {
              const sessionsPerUnit = item.sessionsPerUnit || (item.code === 'SV03' ? 10 : 1);
              const sessions = item.quantity * sessionsPerUnit;
              purchased += sessions;
              // รับคะแนนสะสม (1 ครั้ง/เซสชัน = 1 คะแนน)
              pointsEarned += sessions;
            }
          } else if (item.type === 'คะแนน') {
            if (item.code === 'POINT_ADD_MANUAL' || item.code === 'POINT_TRANSFER_IN') {
              pointsEarned += item.quantity;
            } else if (item.code === 'POINT_TRANSFER_OUT' || item.code === 'REWARD_REDEEM' || item.code === 'POINT_DEDUCT_MANUAL') {
              pointsUsed += item.quantity;
            }
          }
        });
      });

      // 2. ยอดใช้ทั้งหมด (รับบริการแล้ว)
      const used = appointments.filter(app => String(app.hn) === String(p.hn) && app.status === 'รับบริการแล้ว' && app.type === 'ฝึกกระตุ้นพัฒนาการ').length;
      
      const balance = purchased - used;
      const pointsBalance = pointsEarned - pointsUsed;

      return {
        hn: p.hn,
        name: `${p.title}${p.firstname} ${p.lastname}`,
        nickname: p.nickname,
        status: p.status,
        purchased,
        used,
        balance,
        pointsEarned,
        pointsUsed,
        pointsBalance
      };
    });
  }, [patients, receipts, appointments]);

  // ยอดสรุปของผู้ป่วยปัจจุบัน
  const currentBalanceInfo = useMemo(() => {
    if (!selectedHn) return null;
    return patientCourseBalances.find(b => b.hn === selectedHn);
  }, [selectedHn, patientCourseBalances]);

  // ซิงค์ป้อนคำค้นตาม selectedHn ของผู้ป่วยหลัก
  React.useEffect(() => {
    if (selectedHn) {
      const b = patientCourseBalances.find(item => item.hn === selectedHn);
      if (b) {
        setPatientSearchText(`HN: ${b.hn} | ${formatPatientNickname(b.nickname)} (เหลือ ${b.balance} ครั้ง)`);
      } else {
        setPatientSearchText('');
      }
    } else {
      setPatientSearchText('');
    }
  }, [selectedHn, patientCourseBalances]);

  // ซิงค์ป้อนคำค้นของตัวเลือกผู้รับโอน
  React.useEffect(() => {
    if (transfereeHn) {
      const p = patients.find(item => item.hn === transfereeHn);
      if (p) {
        setTransfereeSearchText(`HN: ${p.hn} | ${formatPatientNickname(p.nickname)} (${p.title}${p.firstname} ${p.lastname})`);
      } else {
        setTransfereeSearchText('');
      }
    } else {
      setTransfereeSearchText('');
    }
  }, [transfereeHn, patients]);

  // ค้นหารายชื่อจากยอดคงเหลือผู้รับบริการ
  const filteredSearchBalances = useMemo(() => {
    let list = patientCourseBalances;
    if (patientStatusFilter !== 'ทั้งหมด') {
      list = list.filter(b => b.status === patientStatusFilter);
    }
    
    const q = patientSearchText.trim().toLowerCase();
    if (!q || q.startsWith('hn:')) return list;
    return list.filter(b => 
      String(b.hn).toLowerCase().includes(q) || 
      String(b.nickname).toLowerCase().includes(q) || 
      String(b.name).toLowerCase().includes(q)
    );
  }, [patientCourseBalances, patientSearchText, patientStatusFilter]);

  // ค้นหารายชื่อผู้รับโอนคอร์สปลายทาง
  const filteredTransfereePatients = useMemo(() => {
    const activeCandidates = patients.filter(p => p.hn !== selectedHn && p.status === 'Active');
    const q = transfereeSearchText.trim().toLowerCase();
    if (!q || q.startsWith('hn:')) return activeCandidates;
    return activeCandidates.filter(p => 
      String(p.hn).toLowerCase().includes(q) || 
      String(p.nickname).toLowerCase().includes(q) || 
      `${p.title}${p.firstname} ${p.lastname}`.toLowerCase().includes(q)
    );
  }, [patients, selectedHn, transfereeSearchText]);

  // ค้นหารายชื่อผู้รับโอนคะแนนปลายทาง
  const filteredPointsTransfereePatients = useMemo(() => {
    const activeCandidates = patients.filter(p => p.hn !== selectedHn && p.status === 'Active');
    const q = pointsTransfereeSearchText.trim().toLowerCase();
    if (!q || q.startsWith('hn:')) return activeCandidates;
    return activeCandidates.filter(p => 
      String(p.hn).toLowerCase().includes(q) || 
      String(p.nickname).toLowerCase().includes(q) || 
      `${p.title}${p.firstname} ${p.lastname}`.toLowerCase().includes(q)
    );
  }, [patients, selectedHn, pointsTransfereeSearchText]);

  // ซิงค์ป้อนคำค้นของตัวเลือกผู้รับโอนคะแนน
  React.useEffect(() => {
    if (transfereePointsHn) {
      const p = patients.find(item => item.hn === transfereePointsHn);
      if (p) {
        setPointsTransfereeSearchText(`HN: ${p.hn} | ${formatPatientNickname(p.nickname)} (${p.title}${p.firstname} ${p.lastname})`);
      } else {
        setPointsTransfereeSearchText('');
      }
    } else {
      setPointsTransfereeSearchText('');
    }
  }, [transfereePointsHn, patients]);

  // รายการของรางวัลที่กำลังจัดกิจกรรมและยังไม่หมดสิทธิ์
  const activeRewards = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return (rewards || []).filter(r => {
      const usedCount = receipts ? receipts.filter(rec => (rec.promotionId === r.code || rec.rewardId === r.code) && rec.status !== 'ยกเลิก').length : 0;
      const remaining = Math.max(0, r.maxUses - usedCount);
      const isExpired = !(todayStr >= r.startDate && todayStr <= r.endDate);
      return !isExpired && remaining > 0;
    });
  }, [rewards, receipts]);

  // ประวัติการทำรายการแบบละเอียดของคนปัจจุบัน (เรียงตามวัน)
  const courseTransactionHistory = useMemo(() => {
    if (!selectedHn) return [];

    const list = [];

    // ดึงบิลซื้อ/ปรับปรุงคอร์ส ทั้งหมด
    const patientReceipts = receipts.filter(r => r.hn === selectedHn && r.status === 'ชำระเงินแล้ว');
    patientReceipts.forEach(r => {
      r.items.forEach(item => {
        if (item.type === 'บริการ') {
          if (item.code === 'SV02' || (item.name && item.name.includes('ประเมินพัฒนาการ'))) {
            return;
          }

          let sessions = item.quantity;
          let typeLabel = 'ซื้อคอร์สบริการ';
          let direction = 'in';

          if (item.code === 'TRANSFER_OUT') {
            typeLabel = 'โอนคอร์สออก';
            direction = 'out';
            sessions = item.quantity;
          } else if (item.code === 'TRANSFER_IN') {
            typeLabel = 'โอนคอร์สเข้า';
            direction = 'in';
            sessions = item.quantity;
          } else if (item.code === 'MANUAL_ADD') {
            typeLabel = 'ปรับปรุงคอร์สแมนนวล';
            direction = 'in';
            sessions = item.quantity;
          } else {
            const sessionsPerUnit = item.sessionsPerUnit || (item.code === 'SV03' ? 10 : 1);
            sessions = item.quantity * sessionsPerUnit;
          }

          // ประวัติคอร์สรักษา
          list.push({
            date: r.date,
            type: typeLabel,
            itemName: item.name,
            sessions,
            unit: 'ครั้ง',
            direction,
            docId: r.id,
            remark: r.discountReason || '-'
          });

          // ได้รับคะแนนสะสมจากการซื้อคอร์ส (1 เซสชัน = 1 คะแนน)
          if (item.code !== 'TRANSFER_OUT' && item.code !== 'TRANSFER_IN' && item.code !== 'MANUAL_ADD') {
            list.push({
              date: r.date,
              type: 'ได้รับคะแนนสะสม',
              itemName: `ได้รับคะแนนสะสม (ซื้อ ${item.name})`,
              sessions,
              unit: 'คะแนน',
              direction: 'in',
              docId: r.id,
              remark: 'ซื้อคอร์ส (1 ครั้ง = 1 คะแนน)'
            });
          }
        } else if (item.type === 'คะแนน') {
          let typeLabel = 'คะแนนสะสม';
          let direction = 'in';
          if (item.code === 'POINT_ADD_MANUAL') {
            typeLabel = 'ปรับปรุงแต้มแมนนวล';
            direction = 'in';
          } else if (item.code === 'POINT_DEDUCT_MANUAL') {
            typeLabel = 'ปรับปรุงแต้มแมนนวล';
            direction = 'out';
          } else if (item.code === 'POINT_TRANSFER_IN') {
            typeLabel = 'รับโอนคะแนน';
            direction = 'in';
          } else if (item.code === 'POINT_TRANSFER_OUT') {
            typeLabel = 'โอนคะแนนออก';
            direction = 'out';
          } else if (item.code === 'REWARD_REDEEM') {
            typeLabel = 'แลกของรางวัล';
            direction = 'out';
          }

          list.push({
            date: r.date,
            type: typeLabel,
            itemName: item.name,
            sessions: item.quantity,
            unit: 'คะแนน',
            direction,
            docId: r.id,
            code: item.code,
            remark: r.discountReason || '-'
          });
        }
      });
    });

    // ดึงนัดหมายที่ใช้บริการแล้ว
    const patientApps = appointments.filter(app => String(app.hn) === String(selectedHn) && app.status === 'รับบริการแล้ว' && app.type === 'ฝึกกระตุ้นพัฒนาการ');
    patientApps.forEach(app => {
      list.push({
        date: app.date,
        type: 'เข้าใช้บริการรักษา',
        itemName: `กิจกรรมบำบัดเดี่ยว (คิวสอน)`,
        sessions: 1,
        unit: 'ครั้ง',
        direction: 'out',
        docId: app.id,
        remark: (() => {
          const tId = app.therapistId;
          const therapist = therapists.find(t => t.id === tId);
          return `สอนโดย ${therapist ? formatTherapistName(therapist.nickname) : 'ไม่พบข้อมูลครู'}`;
        })()
      });
    });

    // เรียงประวัติจากล่าสุดลงไปอดีต
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [selectedHn, receipts, appointments, therapists]);

  const itemsPerPage = 10;
  const maxPages = useMemo(() => {
    return Math.ceil(courseTransactionHistory.length / itemsPerPage);
  }, [courseTransactionHistory]);

  const paginatedHistory = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return courseTransactionHistory.slice(startIndex, startIndex + itemsPerPage);
  }, [courseTransactionHistory, currentPage]);

  // ยื่นคำขอเพิ่มแมนนวล
  const handleManualAddSubmit = (e) => {
    e.preventDefault();
    if (!selectedHn || manualSessions <= 0) return;
    
    onManualAddCourse(selectedHn, Number(manualSessions), manualRemark);
    
    Swal.fire({
      icon: 'success',
      title: 'ปรับปรุงเพิ่มคอร์สแบบแมนนวลสำเร็จ!',
      text: `บวกเพิ่ม ${manualSessions} ครั้ง ให้ น้อง${currentPatient.nickname}`,
      confirmButtonColor: 'var(--secondary)'
    });
    
    setShowManualModal(false);
    setManualSessions(1);
    setManualRemark('เพิ่มคอร์สอำนวยความสะดวกภายนอก');
  };

  // ยื่นคำขอโอนคอร์ส
  const handleTransferSubmit = (e) => {
    e.preventDefault();
    if (!selectedHn || !transfereeHn || transferSessions <= 0) return;

    if (selectedHn === transfereeHn) {
      Swal.fire({
        icon: 'error',
        title: 'ทำรายการไม่สำเร็จ',
        text: 'ไม่สามารถโอนสิทธิ์คอร์สให้ตนเองได้',
        confirmButtonColor: 'var(--secondary)'
      });
      return;
    }

    // ตรวจสอบว่าโอนเกินที่เหลือหรือไม่
    if (transferSessions > currentBalanceInfo.balance) {
      Swal.fire({
        icon: 'error',
        title: 'สิทธิ์คอร์สคงเหลือไม่เพียงพอ',
        text: `น้อง${currentPatient.nickname} มีคอร์สคงเหลือเพียง ${currentBalanceInfo.balance} ครั้ง ไม่สามารถโอน ${transferSessions} ครั้งได้`,
        confirmButtonColor: 'var(--secondary)'
      });
      return;
    }

    const transferee = patients.find(p => p.hn === transfereeHn);

    onTransferCourse(selectedHn, transfereeHn, Number(transferSessions), transferRemark);

    Swal.fire({
      icon: 'success',
      title: 'โอนคอร์สสำเร็จ!',
      text: `โอนจำนวน ${transferSessions} ครั้ง จากน้อง${currentPatient.nickname} ไปยังน้อง${transferee.nickname} เรียบร้อยแล้ว (สร้างบิล 2 ใบอัตโนมัติ)`,
      confirmButtonColor: 'var(--secondary)'
    });

    setShowTransferModal(false);
    setTransferSessions(1);
    setTransfereeHn('');
    setTransferRemark('โอนสิทธิ์ระหว่างครอบครัว');
  };

  // ยื่นคำขอเพิ่ม / ลดคะแนน (Manual)
  const handleManualPointsSubmit = (e) => {
    e.preventDefault();
    if (!selectedHn || manualPoints <= 0) return;

    const isAdd = manualPointsAction === 'add';

    if (!isAdd && manualPoints > currentBalanceInfo.pointsBalance) {
      Swal.fire({
        icon: 'error',
        title: 'คะแนนสะสมไม่เพียงพอ',
        text: `น้อง${currentPatient.nickname} มีคะแนนคงเหลือเพียง ${currentBalanceInfo.pointsBalance} คะแนน ไม่สามารถหักลด ${manualPoints} คะแนนได้`,
        confirmButtonColor: 'var(--secondary)'
      });
      return;
    }

    onManualAdjustPoints(selectedHn, Number(manualPoints), manualPointsAction, manualPointsRemark);

    Swal.fire({
      icon: 'success',
      title: isAdd ? 'ปรับปรุงเพิ่มคะแนนสะสมสำเร็จ!' : 'ปรับปรุงลดคะแนนสะสมสำเร็จ!',
      text: isAdd 
        ? `บวกเพิ่ม ${manualPoints} คะแนน ให้ น้อง${currentPatient.nickname}` 
        : `หักลด ${manualPoints} คะแนน ให้ น้อง${currentPatient.nickname}`,
      confirmButtonColor: 'var(--secondary)'
    });

    setShowPointsManualModal(false);
    setManualPoints(1);
    setManualPointsAction('add');
    setManualPointsRemark('ปรับปรุงแต้มสะสมพิเศษ');
  };

  // ยื่นคำขอโอนคะแนน
  const handleTransferPointsSubmit = (e) => {
    e.preventDefault();
    if (!selectedHn || !transfereePointsHn || transferPoints <= 0) return;

    if (selectedHn === transfereePointsHn) {
      Swal.fire({
        icon: 'error',
        title: 'ทำรายการไม่สำเร็จ',
        text: 'ไม่สามารถโอนคะแนนสะสมให้ตนเองได้',
        confirmButtonColor: 'var(--secondary)'
      });
      return;
    }

    if (transferPoints > currentBalanceInfo.pointsBalance) {
      Swal.fire({
        icon: 'error',
        title: 'คะแนนสะสมไม่เพียงพอ',
        text: `น้อง${currentPatient.nickname} มีคะแนนคงเหลือเพียง ${currentBalanceInfo.pointsBalance} คะแนน ไม่สามารถโอน ${transferPoints} คะแนนได้`,
        confirmButtonColor: 'var(--secondary)'
      });
      return;
    }

    const transferee = patients.find(p => p.hn === transfereePointsHn);
    onTransferPoints(selectedHn, transfereePointsHn, Number(transferPoints), transferPointsRemark);

    Swal.fire({
      icon: 'success',
      title: 'โอนคะแนนสะสมสำเร็จ!',
      text: `โอนจำนวน ${transferPoints} คะแนน จากน้อง${currentPatient.nickname} ไปยังน้อง${transferee.nickname} เรียบร้อยแล้ว`,
      confirmButtonColor: 'var(--secondary)'
    });

    setShowPointsTransferModal(false);
    setTransferPoints(1);
    setTransfereePointsHn('');
    setPointsTransfereeSearchText('');
    setTransferPointsRemark('โอนคะแนนสะสมให้เพื่อน');
  };

  // ยื่นคำขอแลกของรางวัล
  const handleRedeemRewardSubmit = (e) => {
    e.preventDefault();
    if (!selectedHn || !selectedRewardCode) return;

    const reward = (rewards || []).find(r => r.code === selectedRewardCode);
    if (!reward) return;

    const pointsCost = reward.points || 0;
    const rewardName = reward.name;

    if (pointsCost > currentBalanceInfo.pointsBalance) {
      Swal.fire({
        icon: 'error',
        title: 'คะแนนสะสมไม่เพียงพอ',
        text: `น้อง${currentPatient.nickname} มีคะแนนคงเหลือเพียง ${currentBalanceInfo.pointsBalance} คะแนน ไม่สามารถแลกของรางวัลมูลค่า ${pointsCost} คะแนนได้`,
        confirmButtonColor: 'var(--secondary)'
      });
      return;
    }

    const usedCount = receipts ? receipts.filter(rec => (rec.promotionId === reward.code || rec.rewardId === reward.code) && rec.status !== 'ยกเลิก').length : 0;
    const remainingQuota = Math.max(0, reward.maxUses - usedCount);
    if (remainingQuota <= 0) {
      Swal.fire({
        icon: 'error',
        title: 'สิทธิ์ของรางวัลเต็มแล้ว',
        text: `ของรางวัล "${rewardName}" มีจำนวนจำกัด และถูกแลกสิทธิ์ครบแล้ว`,
        confirmButtonColor: 'var(--secondary)'
      });
      return;
    }

    onRedeemReward(selectedHn, reward.code, pointsCost, rewardName);

    Swal.fire({
      icon: 'success',
      title: 'แลกของรางวัลสำเร็จ!',
      text: `ใช้คะแนนจำนวน ${pointsCost} คะแนน แลกรับของรางวัล "${rewardName}" เรียบร้อยแล้ว`,
      confirmButtonColor: 'var(--secondary)'
    });

    setShowPointsRedeemModal(false);
    setSelectedRewardCode('');
  };

  // แก้ไขรายการปรับปรุงคะแนนแมนนวล (Start Edit)
  const handleStartEditPoints = (historyItem) => {
    setEditingPointsDocId(historyItem.docId);
    setEditPointsVal(historyItem.sessions);
    setEditPointsAction(historyItem.code === 'POINT_ADD_MANUAL' ? 'add' : 'deduct');
    setEditPointsRemark(historyItem.remark === '-' ? '' : historyItem.remark);
    setShowPointsEditModal(true);
  };

  // ยื่นคำขอแก้ไขคะแนนแมนนวล (Submit Edit)
  const handleEditPointsSubmit = (e) => {
    e.preventDefault();
    if (!editingPointsDocId || editPointsVal <= 0) return;

    const isAdd = editPointsAction === 'add';
    const currentBalance = currentBalanceInfo.pointsBalance;
    
    const origItem = courseTransactionHistory.find(h => h.docId === editingPointsDocId);
    const origValue = origItem ? origItem.sessions : 0;
    const origIsAdd = origItem && origItem.code === 'POINT_ADD_MANUAL';

    // คำนวณหาคะแนนสะสมที่แท้จริงหากไม่นับรายการเดิม
    const baseBalance = currentBalance + (origIsAdd ? -origValue : origValue);
    
    // คำนวณคะแนนใหม่จำลอง
    const hypoNewBalance = baseBalance + (isAdd ? editPointsVal : -editPointsVal);

    if (hypoNewBalance < 0) {
      Swal.fire({
        icon: 'error',
        title: 'คะแนนสะสมไม่เพียงพอ',
        text: `ไม่สามารถปรับปรุงคะแนนได้เนื่องจากจะทำให้คะแนนสะสมคงเหลือติดลบ (คะแนนคงเหลือหลังปรับปรุง: ${hypoNewBalance} คะแนน)`,
        confirmButtonColor: 'var(--secondary)'
      });
      return;
    }

    onEditManualPoints(editingPointsDocId, Number(editPointsVal), editPointsAction, editPointsRemark);

    Swal.fire({
      icon: 'success',
      title: 'แก้ไขรายการปรับปรุงคะแนนสำเร็จ!',
      text: `แก้ไขรายการปรับปรุงคะแนนของ น้อง${currentPatient.nickname} เรียบร้อยแล้ว`,
      confirmButtonColor: 'var(--secondary)'
    });

    setShowPointsEditModal(false);
    setEditingPointsDocId('');
    setEditPointsVal(1);
    setEditPointsAction('add');
    setEditPointsRemark('');
  };

  // ยื่นคำขอลบรายการปรับปรุงคะแนนแมนนวล (Delete Click)
  const handleDeletePointsClick = (historyItem) => {
    const isAdd = historyItem.code === 'POINT_ADD_MANUAL';
    const val = historyItem.sessions;
    
    if (isAdd && (currentBalanceInfo.pointsBalance - val) < 0) {
      Swal.fire({
        icon: 'error',
        title: 'ไม่สามารถลบรายการได้',
        text: `การลบรายการบวกแต้มแมนนวลนี้จะทำให้คะแนนสะสมคงเหลือของ น้อง${currentPatient.nickname} ติดลบ (คงเหลือหากลบ: ${currentBalanceInfo.pointsBalance - val} คะแนน)`,
        confirmButtonColor: 'var(--secondary)'
      });
      return;
    }

    Swal.fire({
      title: 'ยืนยันการลบรายการ?',
      text: `คุณต้องการลบรายการปรับปรุงแต้มแมนนวล "${historyItem.itemName}" หรือไม่? การลบนี้จะทำให้ยอดคะแนนคงเหลือเปลี่ยนแปลงทันที`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--danger)',
      cancelButtonColor: 'var(--light)',
      confirmButtonText: 'ใช่, ต้องการลบ',
      cancelButtonText: 'ยกเลิก'
    }).then((result) => {
      if (result.isConfirmed) {
        onDeleteManualPoints(historyItem.docId);
        Swal.fire({
          icon: 'success',
          title: 'ลบรายการสำเร็จ!',
          text: 'รายการปรับปรุงแต้มแมนนวลถูกลบเรียบร้อยแล้ว',
          confirmButtonColor: 'var(--secondary)'
        });
      }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="page-header">
        <h1 className="page-title">
          <FileText size={28} />
          ระบบบริหารจัดการคอร์สคงเหลือ (Course Balance)
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* รายชื่อและค้นหายอดคงเหลือ (ฝั่งซ้าย) */}
        <div className="card-3xl">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>ข้อมูลคอร์สรายบุคคล</h2>
            <div style={{ display: 'flex', gap: '0.25rem', backgroundColor: 'var(--light)', padding: '2px', borderRadius: 'var(--radius-md)' }}>
              {['ทั้งหมด', 'Active', 'Inactive'].map((status) => (
                <button
                  key={status}
                  type="button"
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    backgroundColor: patientStatusFilter === status ? 'white' : 'transparent',
                    color: patientStatusFilter === status ? 'var(--dark)' : 'var(--dark-light)',
                    boxShadow: patientStatusFilter === status ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => {
                    setPatientStatusFilter(status);
                    setSelectedHn('');
                  }}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">ค้นหาและเลือกผู้รับบริการ</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text"
                className="form-control"
                placeholder="-- ค้นหาด้วย HN หรือชื่อเล่น --"
                value={patientSearchText}
                onChange={(e) => {
                  setPatientSearchText(e.target.value);
                  setSelectedHn('');
                  setShowPatientDropdown(true);
                }}
                onFocus={() => setShowPatientDropdown(true)}
                onBlur={() => {
                  setTimeout(() => setShowPatientDropdown(false), 200);
                }}
              />
              {showPatientDropdown && (
                <div 
                  className="card-md"
                  style={{ 
                    position: 'absolute', 
                    top: '100%', 
                    left: 0, 
                    right: 0, 
                    maxHeight: '200px', 
                    overflowY: 'auto', 
                    zIndex: 1000,
                    backgroundColor: 'white',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-lg)',
                    borderRadius: 'var(--radius-md)',
                    marginTop: '0.25rem',
                    padding: '0.5rem 0'
                  }}
                >
                  {filteredSearchBalances.length === 0 ? (
                    <div style={{ padding: '0.5rem 1rem', color: 'var(--dark-light)', fontSize: '0.85rem' }}>
                      ไม่พบข้อมูลผู้รับบริการ
                    </div>
                  ) : (
                    filteredSearchBalances.map(b => (
                      <div 
                        key={b.hn} 
                        style={{ 
                          padding: '0.5rem 1rem', 
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          transition: 'background-color 0.2s',
                          backgroundColor: 'transparent'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--light)'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                        onClick={() => {
                          setSelectedHn(b.hn);
                          setPatientSearchText(`HN: ${b.hn} | ${formatPatientNickname(b.nickname)} (เหลือ ${b.balance} ครั้ง)`);
                          setShowPatientDropdown(false);
                        }}
                      >
                        HN: {b.hn} | {formatPatientNickname(b.nickname)} ({b.name}) (เหลือ {b.balance} ครั้ง)
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {currentBalanceInfo ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div className="course-summary-box">
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--dark-light)' }}>ซื้อสะสม</div>
                  <div className="course-metric-val" style={{ color: 'var(--info)' }}>{currentBalanceInfo.purchased} ครั้ง</div>
                </div>
                <div style={{ width: '1px', height: '40px', backgroundColor: 'var(--border)' }}></div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--dark-light)' }}>ใช้จริง</div>
                  <div className="course-metric-val" style={{ color: 'var(--danger)' }}>{currentBalanceInfo.used} ครั้ง</div>
                </div>
                <div style={{ width: '1px', height: '40px', backgroundColor: 'var(--border)' }}></div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--dark-light)' }}>คงเหลือ</div>
                  <div className="course-metric-val" style={{ color: 'var(--success)', fontSize: '1.8rem' }}>
                    {currentBalanceInfo.balance} ครั้ง
                  </div>
                </div>
              </div>

              {/* ปุ่มลัดจัดการคอร์ส */}
              {isAdmin && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={() => setShowManualModal(true)}
                  >
                    <Plus size={16} />
                    เพิ่มคอร์ส (Manual)
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    disabled={currentBalanceInfo.balance <= 0}
                    onClick={() => setShowTransferModal(true)}
                  >
                    <ArrowLeftRight size={16} />
                    โอนคอร์ส (Transfer)
                  </button>
                </div>
              )}

              {/* รายการคะแนนสะสม */}
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Gift size={18} color="var(--secondary)" />
                คะแนนสะสมและของรางวัล
              </h3>

              <div className="course-summary-box" style={{ background: 'linear-gradient(135deg, #f0f7ff, #e0efff)', borderColor: '#bcd8f3', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--dark-light)' }}>คะแนนสะสม</div>
                  <div className="course-metric-val" style={{ color: '#0066cc' }}>{currentBalanceInfo.pointsEarned} แต้ม</div>
                </div>
                <div style={{ width: '1px', height: '40px', backgroundColor: 'var(--border)' }}></div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--dark-light)' }}>ใช้ไป</div>
                  <div className="course-metric-val" style={{ color: 'var(--warning)' }}>{currentBalanceInfo.pointsUsed} แต้ม</div>
                </div>
                <div style={{ width: '1px', height: '40px', backgroundColor: 'var(--border)' }}></div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--dark-light)' }}>คงเหลือ</div>
                  <div className="course-metric-val" style={{ color: '#008080', fontSize: '1.8rem' }}>
                    {currentBalanceInfo.pointsBalance} แต้ม
                  </div>
                </div>
              </div>

              {/* ปุ่มลัดจัดการคะแนน */}
              {isAdmin && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    style={{ backgroundColor: '#0066cc', borderColor: '#0066cc', color: 'white' }}
                    onClick={() => setShowPointsManualModal(true)}
                  >
                    <Plus size={16} />
                    เพิ่ม / ลดคะแนน (Manual)
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    disabled={currentBalanceInfo.pointsBalance <= 0}
                    onClick={() => setShowPointsTransferModal(true)}
                  >
                    <ArrowLeftRight size={16} />
                    โอนคะแนน
                  </button>
                </div>
              )}

              {/* ปุ่มแลกของรางวัล */}
              <button 
                type="button" 
                className="btn btn-secondary"
                style={{ width: '100%', marginTop: '0.25rem', backgroundColor: '#008080', borderColor: '#008080', color: 'white' }}
                disabled={currentBalanceInfo.pointsBalance <= 0 || activeRewards.length === 0}
                onClick={() => setShowPointsRedeemModal(true)}
              >
                <Gift size={16} />
                แลกของรางวัล ({activeRewards.length} รายการพร้อมแลก)
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--dark-light)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
              กรุณาเลือกผู้รับบริการ เพื่อดำเนินการเช็คยอดคอร์ส ปรับปรุงยอด หรือทำการโอนคอร์ส
            </div>
          )}
        </div>

        {/* ประวัติการปรับปรุงคอร์สและเข้าใช้ (ฝั่งขวา) */}
        <div className="card-3xl">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <History color="var(--secondary)" size={20} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>ประวัติการทำรายการคอร์สแบบละเอียด</h2>
          </div>

          {!selectedHn ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--dark-light)' }}>
              กรุณาเลือกผู้ป่วยทางฝั่งซ้ายเพื่อดูประวัติ
            </div>
          ) : courseTransactionHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--dark-light)' }}>
              ไม่พบประวัติการซื้อคอร์ส หรือการเข้าใช้บริการของเด็กรายนี้
            </div>
          ) : (
            <>
              <div className="table-container">
                <table className="hdh-table">
                  <thead>
                    <tr>
                      <th>วันที่</th>
                      <th>ประเภทรายการ</th>
                      <th>รายละเอียดสินค้า/บริการ</th>
                      <th style={{ textAlign: 'center' }}>จำนวนเซสชัน</th>
                      <th>เอกสารอ้างอิง</th>
                      <th style={{ textAlign: 'center' }}>การดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedHistory.map((h, index) => {
                      const isManualPoints = h.code === 'POINT_ADD_MANUAL' || h.code === 'POINT_DEDUCT_MANUAL';
                      return (
                        <tr key={index}>
                          <td>{new Date(h.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                          <td>
                            <span className={`badge ${
                              h.type === 'โอนคอร์สออก' || h.type === 'โอนคะแนนออก' ? 'badge-danger' : 
                              h.type === 'เข้าใช้บริการรักษา' || h.type === 'แลกของรางวัล' ? 'badge-warning' : 
                              h.type === 'ซื้อคอร์สบริการ' || h.type === 'ได้รับคะแนนสะสม' || h.type === 'รับโอนคะแนน' || h.type === 'ปรับปรุงแต้มแมนนวล' ? 'badge-success' : 'badge-info'
                            }`}>
                              {h.type}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{h.itemName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--dark-light)' }}>{h.remark}</div>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: h.direction === 'in' ? 'var(--success)' : 'var(--danger)' }}>
                            {h.direction === 'in' ? `+${h.sessions} ${h.unit || 'ครั้ง'}` : `-${h.sessions} ${h.unit || 'ครั้ง'}`}
                          </td>
                          <td style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{h.docId}</td>
                          <td style={{ textAlign: 'center' }}>
                            {isManualPoints && isAdmin ? (
                              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                <button
                                  type="button"
                                  className="btn btn-light"
                                  style={{ padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', border: '1px solid var(--border)' }}
                                  onClick={() => handleStartEditPoints(h)}
                                >
                                  <Pencil size={12} color="var(--primary)" />
                                  แก้ไข
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-light"
                                  style={{ padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', border: '1px solid var(--border)', color: 'var(--danger)' }}
                                  onClick={() => handleDeletePointsClick(h)}
                                >
                                  <Trash2 size={12} color="var(--danger)" />
                                  ลบ
                                </button>
                              </div>
                            ) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {maxPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1rem', marginBottom: '0.5rem' }}>
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
                แสดง {courseTransactionHistory.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, courseTransactionHistory.length)} จากทั้งหมด {courseTransactionHistory.length} รายการ
              </div>
            </>
          )}
        </div>

      </div>

      {/* Modal 1: เพิ่มคอร์สแบบกำหนดเอง (Manual Add) */}
      {showManualModal && currentPatient && (
        <div className="modal-overlay">
          <div className="modal-content-wrapper" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>เพิ่มคอร์สแบบกำหนดเอง (Manual)</h3>
              <button className="close-modal-btn" onClick={() => setShowManualModal(false)}>×</button>
            </div>
            <form onSubmit={handleManualAddSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--light)', borderRadius: 'var(--radius-md)', marginBottom: '0.5rem' }}>
                  <strong>ผู้ได้รับสิทธิ์:</strong> {formatPatientNickname(currentPatient.nickname)} ({currentPatient.title}{currentPatient.firstname})
                </div>
                
                <div className="form-group">
                  <label className="form-label">จำนวนสิทธิ์ที่ต้องการเพิ่ม (ครั้ง) <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input 
                    type="number" 
                    className="form-control" 
                    min="1" max="100" 
                    value={manualSessions} 
                    onChange={(e) => setManualSessions(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">เหตุผลประกอบการปรับปรุงคอร์ส <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <textarea 
                    className="form-control" 
                    rows="3" 
                    value={manualRemark} 
                    onChange={(e) => setManualRemark(e.target.value)} 
                    required
                  ></textarea>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="submit" className="btn btn-secondary">ยืนยันปรับปรุงยอด</button>
                <button type="button" className="btn btn-light" onClick={() => setShowManualModal(false)}>ยกเลิก</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: โอนคอร์ส (Transfer) */}
      {showTransferModal && currentPatient && (
        <div className="modal-overlay">
          <div className="modal-content-wrapper" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>ทำรายการโอนสิทธิ์คอร์ส (Transfer)</h3>
              <button className="close-modal-btn" onClick={() => setShowTransferModal(false)}>×</button>
            </div>
            <form onSubmit={handleTransferSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--danger-light)', borderRadius: 'var(--radius-md)', color: 'var(--dark)' }}>
                  <strong>ผู้โอนคอร์ส (ต้นทาง):</strong> {formatPatientNickname(currentPatient.nickname)} (คงเหลือ {currentBalanceInfo?.balance} ครั้ง)
                </div>

                <div className="form-group">
                  <label className="form-label">ผู้รับโอนคอร์ส (ปลายทาง) <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="text"
                      className="form-control"
                      placeholder="-- ค้นหาด้วย HN หรือชื่อเล่น --"
                      value={transfereeSearchText}
                      onChange={(e) => {
                        setTransfereeSearchText(e.target.value);
                        setTransfereeHn('');
                        setShowTransfereeDropdown(true);
                      }}
                      onFocus={() => setShowTransfereeDropdown(true)}
                      onBlur={() => {
                        setTimeout(() => setShowTransfereeDropdown(false), 200);
                      }}
                      required
                    />
                    <input type="hidden" value={transfereeHn} required />
                    {showTransfereeDropdown && (
                      <div 
                        className="card-md"
                        style={{ 
                          position: 'absolute', 
                          top: '100%', 
                          left: 0, 
                          right: 0, 
                          maxHeight: '180px', 
                          overflowY: 'auto', 
                          zIndex: 1100,
                          backgroundColor: 'white',
                          border: '1px solid var(--border)',
                          boxShadow: 'var(--shadow-lg)',
                          borderRadius: 'var(--radius-md)',
                          marginTop: '0.25rem',
                          padding: '0.5rem 0'
                        }}
                      >
                        {filteredTransfereePatients.length === 0 ? (
                          <div style={{ padding: '0.5rem 1rem', color: 'var(--dark-light)', fontSize: '0.85rem' }}>
                            ไม่พบข้อมูลผู้รับโอน
                          </div>
                        ) : (
                          filteredTransfereePatients.map(p => (
                            <div 
                              key={p.hn} 
                              style={{ 
                                padding: '0.5rem 1rem', 
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                transition: 'background-color 0.2s',
                                backgroundColor: 'transparent'
                              }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--light)'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                              onClick={() => {
                                setTransfereeHn(p.hn);
                                setTransfereeSearchText(`HN: ${p.hn} | ${formatPatientNickname(p.nickname)} (${p.title}${p.firstname} ${p.lastname})`);
                                setShowTransfereeDropdown(false);
                              }}
                            >
                              HN: {p.hn} | {formatPatientNickname(p.nickname)} ({p.title}${p.firstname} {p.lastname})
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">จำนวนสิทธิ์ที่ต้องการโอน (ครั้ง) <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input 
                    type="number" 
                    className="form-control" 
                    min="1" 
                    max={currentBalanceInfo?.balance || 1} 
                    value={transferSessions} 
                    onChange={(e) => setTransferSessions(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">หมายเหตุการโอนสิทธิ์</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={transferRemark} 
                    onChange={(e) => setTransferRemark(e.target.value)} 
                  />
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="submit" className="btn btn-secondary">ยืนยันการโอนคอร์ส</button>
                <button type="button" className="btn btn-light" onClick={() => setShowTransferModal(false)}>ยกเลิก</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: เพิ่ม / ลดคะแนนสะสมแบบกำหนดเอง (Manual Adjust Points) */}
      {showPointsManualModal && currentPatient && (
        <div className="modal-overlay">
          <div className="modal-content-wrapper" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>เพิ่ม / ลดคะแนนแบบกำหนดเอง (Manual)</h3>
              <button className="close-modal-btn" onClick={() => setShowPointsManualModal(false)}>×</button>
            </div>
            <form onSubmit={handleManualPointsSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--light)', borderRadius: 'var(--radius-md)', marginBottom: '0.5rem' }}>
                  <strong>ผู้รับบริการ:</strong> {formatPatientNickname(currentPatient.nickname)} (มีคะแนนคงเหลือ {currentBalanceInfo?.pointsBalance} คะแนน)
                </div>

                <div className="form-group">
                  <label className="form-label">การดำเนินการ <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.25rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
                      <input 
                        type="radio" 
                        name="manualPointsAction" 
                        value="add" 
                        checked={manualPointsAction === 'add'} 
                        onChange={() => setManualPointsAction('add')} 
                      />
                      <span style={{ color: 'var(--success)' }}>บวกเพิ่มคะแนน (+)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
                      <input 
                        type="radio" 
                        name="manualPointsAction" 
                        value="deduct" 
                        checked={manualPointsAction === 'deduct'} 
                        onChange={() => setManualPointsAction('deduct')} 
                      />
                      <span style={{ color: 'var(--danger)' }}>หักลดคะแนน (-)</span>
                    </label>
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">
                    {manualPointsAction === 'add' ? 'จำนวนคะแนนที่ต้องการเพิ่ม (คะแนน)' : 'จำนวนคะแนนที่ต้องการลด (คะแนน)'} <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input 
                    type="number" 
                    className="form-control" 
                    min="1" 
                    max={manualPointsAction === 'add' ? 1000 : (currentBalanceInfo?.pointsBalance || 1)} 
                    value={manualPoints} 
                    onChange={(e) => setManualPoints(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">เหตุผลประกอบการปรับปรุงคะแนน <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <textarea 
                    className="form-control" 
                    rows="3" 
                    value={manualPointsRemark} 
                    onChange={(e) => setManualPointsRemark(e.target.value)} 
                    required
                  ></textarea>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="submit" className="btn btn-secondary" style={{ backgroundColor: manualPointsAction === 'add' ? 'var(--success)' : 'var(--danger)', borderColor: manualPointsAction === 'add' ? 'var(--success)' : 'var(--danger)', color: 'white' }}>
                  {manualPointsAction === 'add' ? 'ยืนยันการเพิ่มคะแนน' : 'ยืนยันการลดคะแนน'}
                </button>
                <button type="button" className="btn btn-light" onClick={() => setShowPointsManualModal(false)}>ยกเลิก</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: โอนคะแนนสะสม (Transfer Points) */}
      {showPointsTransferModal && currentPatient && (
        <div className="modal-overlay">
          <div className="modal-content-wrapper" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>ทำรายการโอนคะแนนสะสม (Transfer Points)</h3>
              <button className="close-modal-btn" onClick={() => setShowPointsTransferModal(false)}>×</button>
            </div>
            <form onSubmit={handleTransferPointsSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: '#fff3cd', borderRadius: 'var(--radius-md)', color: '#856404', border: '1px solid #ffeeba' }}>
                  <strong>ผู้โอนคะแนน (ต้นทาง):</strong> {formatPatientNickname(currentPatient.nickname)} (คงเหลือ {currentBalanceInfo?.pointsBalance} คะแนน)
                </div>

                <div className="form-group">
                  <label className="form-label">ผู้รับโอนคะแนน (ปลายทาง) <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="text"
                      className="form-control"
                      placeholder="-- ค้นหาด้วย HN หรือชื่อเล่น --"
                      value={pointsTransfereeSearchText}
                      onChange={(e) => {
                        setPointsTransfereeSearchText(e.target.value);
                        setTransfereePointsHn('');
                        setShowPointsTransfereeDropdown(true);
                      }}
                      onFocus={() => setShowPointsTransfereeDropdown(true)}
                      onBlur={() => {
                        setTimeout(() => setShowPointsTransfereeDropdown(false), 200);
                      }}
                      required
                    />
                    <input type="hidden" value={transfereePointsHn} required />
                    {showPointsTransfereeDropdown && (
                      <div 
                        className="card-md"
                        style={{ 
                          position: 'absolute', 
                          top: '100%', 
                          left: 0, 
                          right: 0, 
                          maxHeight: '180px', 
                          overflowY: 'auto', 
                          zIndex: 1100,
                          backgroundColor: 'white',
                          border: '1px solid var(--border)',
                          boxShadow: 'var(--shadow-lg)',
                          borderRadius: 'var(--radius-md)',
                          marginTop: '0.25rem',
                          padding: '0.5rem 0'
                        }}
                      >
                        {filteredPointsTransfereePatients.length === 0 ? (
                          <div style={{ padding: '0.5rem 1rem', color: 'var(--dark-light)', fontSize: '0.85rem' }}>
                            ไม่พบข้อมูลผู้รับโอน
                          </div>
                        ) : (
                          filteredPointsTransfereePatients.map(p => (
                            <div 
                              key={p.hn} 
                              style={{ 
                                padding: '0.5rem 1rem', 
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                transition: 'background-color 0.2s',
                                backgroundColor: 'transparent'
                              }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--light)'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                              onClick={() => {
                                setTransfereePointsHn(p.hn);
                                setPointsTransfereeSearchText(`HN: ${p.hn} | ${formatPatientNickname(p.nickname)} (${p.title}${p.firstname} ${p.lastname})`);
                                setShowPointsTransfereeDropdown(false);
                              }}
                            >
                              HN: {p.hn} | {formatPatientNickname(p.nickname)} ({p.title}${p.firstname} {p.lastname})
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">จำนวนคะแนนที่ต้องการโอน (คะแนน) <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input 
                    type="number" 
                    className="form-control" 
                    min="1" 
                    max={currentBalanceInfo?.pointsBalance || 1} 
                    value={transferPoints} 
                    onChange={(e) => setTransferPoints(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">หมายเหตุการโอนคะแนน</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={transferPointsRemark} 
                    onChange={(e) => setTransferPointsRemark(e.target.value)} 
                  />
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="submit" className="btn btn-secondary">ยืนยันการโอนคะแนน</button>
                <button type="button" className="btn btn-light" onClick={() => setShowPointsTransferModal(false)}>ยกเลิก</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 5: แลกของรางวัล (Redeem Reward) */}
      {showPointsRedeemModal && currentPatient && (
        <div className="modal-overlay">
          <div className="modal-content-wrapper" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}><Gift size={20} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />แลกของรางวัล (Redeem Reward)</h3>
              <button className="close-modal-btn" onClick={() => setShowPointsRedeemModal(false)}>×</button>
            </div>
            <form onSubmit={handleRedeemRewardSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: '#e2f0d9', borderRadius: 'var(--radius-md)', color: '#385723', border: '1px solid #c5e1a5' }}>
                  <strong>ผู้แลกรางวัล:</strong> {formatPatientNickname(currentPatient.nickname)} (มีคะแนนคงเหลือ {currentBalanceInfo?.pointsBalance} คะแนน)
                </div>

                <div className="form-group">
                  <label className="form-label">เลือกของรางวัลที่ต้องการแลก <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select 
                    className="form-control"
                    value={selectedRewardCode}
                    onChange={(e) => setSelectedRewardCode(e.target.value)}
                    required
                  >
                    <option value="">-- กรุณาเลือกของรางวัล --</option>
                    {activeRewards.map(r => {
                      const usedCount = receipts ? receipts.filter(rec => (rec.promotionId === r.code || rec.rewardId === r.code) && rec.status !== 'ยกเลิก').length : 0;
                      const remaining = Math.max(0, r.maxUses - usedCount);
                      return (
                        <option key={r.code} value={r.code} disabled={remaining <= 0}>
                          [{r.code}] {r.name} (ใช้ {r.points} คะแนน | เหลือ {remaining} สิทธิ์)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {selectedRewardCode && (() => {
                  const r = (rewards || []).find(reward => reward.code === selectedRewardCode);
                  if (!r) return null;
                  
                  const usedCount = receipts ? receipts.filter(rec => (rec.promotionId === r.code || rec.rewardId === r.code) && rec.status !== 'ยกเลิก').length : 0;
                  const remaining = Math.max(0, r.maxUses - usedCount);
                  const isPointsEnough = currentBalanceInfo?.pointsBalance >= r.points;

                  return (
                    <div className="card-md" style={{ backgroundColor: 'var(--light)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderRadius: 'var(--radius-md)', fontSize: '0.9rem' }}>
                      <div><strong>ชื่อของรางวัล:</strong> {r.name}</div>
                      <div><strong>รายละเอียด:</strong> {r.description || '-'}</div>
                      <div><strong>ประเภท:</strong> {r.type} {r.condition !== 'แลกสินค้าฟรี' && `(${r.condition} มูลค่า ${r.value})`}</div>
                      <div><strong>ราคาเต็มของสินค้า:</strong> {r.fullPrice} บาท</div>
                      <div><strong>คะแนนที่ใช้แลก:</strong> <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{r.points} คะแนน</span></div>
                      <div><strong>สิทธิ์คงเหลือ:</strong> {remaining} / {r.maxUses} สิทธิ์</div>
                      {!isPointsEnough && (
                        <div style={{ color: 'var(--danger)', fontWeight: 600, marginTop: '0.5rem' }}>
                          ⚠️ คะแนนคงเหลือไม่เพียงพอ (ต้องการ {r.points} คะแนน, มี {currentBalanceInfo?.pointsBalance} คะแนน)
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
              
              <div className="modal-footer">
                <button 
                  type="submit" 
                  className="btn btn-secondary" 
                  style={{ backgroundColor: '#008080', borderColor: '#008080', color: 'white' }}
                  disabled={!selectedRewardCode || currentBalanceInfo?.pointsBalance < ((rewards || []).find(r => r.code === selectedRewardCode)?.points || 0)}
                >
                  ยืนยันการแลกรางวัล
                </button>
                <button type="button" className="btn btn-light" onClick={() => setShowPointsRedeemModal(false)}>ยกเลิก</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 6: แก้ไขรายการปรับปรุงคะแนนแมนนวล (Edit Points Adjust) */}
      {showPointsEditModal && currentPatient && (
        <div className="modal-overlay">
          <div className="modal-content-wrapper" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>แก้ไขรายการปรับปรุงคะแนน</h3>
              <button className="close-modal-btn" onClick={() => setShowPointsEditModal(false)}>×</button>
            </div>
            <form onSubmit={handleEditPointsSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--light)', borderRadius: 'var(--radius-md)', marginBottom: '0.5rem' }}>
                  <strong>ผู้รับบริการ:</strong> {formatPatientNickname(currentPatient.nickname)} (HN: {currentPatient.hn})
                </div>

                <div className="form-group">
                  <label className="form-label">การดำเนินการ <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.25rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
                      <input 
                        type="radio" 
                        name="editPointsAction" 
                        value="add" 
                        checked={editPointsAction === 'add'} 
                        onChange={() => setEditPointsAction('add')} 
                      />
                      <span style={{ color: 'var(--success)' }}>บวกเพิ่มคะแนน (+)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
                      <input 
                        type="radio" 
                        name="editPointsAction" 
                        value="deduct" 
                        checked={editPointsAction === 'deduct'} 
                        onChange={() => setEditPointsAction('deduct')} 
                      />
                      <span style={{ color: 'var(--danger)' }}>หักลดคะแนน (-)</span>
                    </label>
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">
                    {editPointsAction === 'add' ? 'จำนวนคะแนนที่ต้องการเพิ่ม (คะแนน)' : 'จำนวนคะแนนที่ต้องการลด (คะแนน)'} <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input 
                    type="number" 
                    className="form-control" 
                    min="1" 
                    value={editPointsVal} 
                    onChange={(e) => setEditPointsVal(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">เหตุผลประกอบการปรับปรุงคะแนน <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <textarea 
                    className="form-control" 
                    rows="3" 
                    value={editPointsRemark} 
                    onChange={(e) => setEditPointsRemark(e.target.value)} 
                    required
                  ></textarea>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="submit" className="btn btn-secondary" style={{ backgroundColor: 'var(--primary)', borderColor: 'var(--primary)', color: 'white' }}>
                  บันทึกการแก้ไข
                </button>
                <button type="button" className="btn btn-light" onClick={() => setShowPointsEditModal(false)}>ยกเลิก</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
