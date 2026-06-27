import React, { useState, useEffect, useMemo } from 'react';
import { formatPatientNickname, formatTherapistName, parseDateToAD } from '../utils/format';
import { 
  ClipboardCheck, 
  Brain, 
  Eye, 
  Printer, 
  Trash2,
  X,
  Edit,
  Save,
  Plus
} from 'lucide-react';
import Swal from 'sweetalert2';

const getVMIStyle = (interpretation) => {
  if (!interpretation) return {};
  const text = interpretation.toLowerCase();
  if (text.includes('ต่ำ') || text.includes('below') || text.includes('low')) {
    return { backgroundColor: '#fce8e6', color: '#c5221f', border: '1px solid #fad2cf' }; // Red badge
  }
  if (text.includes('สูง') || text.includes('above') || text.includes('high')) {
    return { backgroundColor: '#e6f4ea', color: '#137333', border: '1px solid #ceead6' }; // Green badge
  }
  return {};
};

const getVMIInterpretation = (std) => {
  if (std === 0 || std === '-') return 'ไม่สามารถแปลผลได้';
  const val = Number(std);
  if (val >= 130 && val <= 160) return 'สูงมาก (Very High)';
  if (val >= 120 && val <= 129) return 'สูง (High)';
  if (val >= 110 && val <= 119) return 'สูงกว่าค่าเฉลี่ย (Above Average)';
  if (val >= 90 && val <= 109) return 'อยู่ในระดับค่าเฉลี่ย (Average)';
  if (val >= 80 && val <= 89) return 'ต่ำกว่าค่าเฉลี่ย (Below Average)';
  if (val >= 71 && val <= 79) return 'ต่ำ (Low)';
  if (val >= 0 && val <= 70) return 'ต่ำมาก (Very Low)';
  return 'ไม่สามารถแปลผลได้';
};

// Helper component to render native vector SVG Radar Chart
function RadarChart({ scores = {}, max = 15, labels = {} }) {
  const keys = Object.keys(scores);
  if (keys.length === 0) return null;
  
  const size = 220;
  const center = size / 2;
  const radius = 70;
  
  const points = keys.map((key, i) => {
    const val = scores[key] || 0;
    const angle = (i * 2 * Math.PI) / keys.length - Math.PI / 2;
    const r = (val / max) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y, label: labels[key] || key, angle };
  });
  
  const polyPoints = points.map(p => `${p.x},${p.y}`).join(' ');
  
  return (
    <svg width={size} height={size} style={{ margin: '0 auto', display: 'block' }}>
      {/* Grid circles */}
      {[0.25, 0.5, 0.75, 1].map((p, i) => (
        <circle key={i} cx={center} cy={center} r={radius * p} fill="none" stroke="#e9ecef" strokeWidth="1" />
      ))}
      {/* Grid lines */}
      {points.map((p, i) => {
        const xMax = center + radius * Math.cos(p.angle);
        const yMax = center + radius * Math.sin(p.angle);
        return (
          <g key={i}>
            <line x1={center} y1={center} x2={xMax} y2={yMax} stroke="#e9ecef" strokeWidth="1" />
            <text 
              x={center + (radius + 18) * Math.cos(p.angle)} 
              y={center + (radius + 18) * Math.sin(p.angle)} 
              fontSize="9" 
              textAnchor="middle" 
              dominantBaseline="middle"
              fill="#4A4036"
              fontWeight="600"
            >
              {p.label}
            </text>
          </g>
        );
      })}
      {/* Value polygon */}
      <polygon points={polyPoints} fill="rgba(84, 180, 235, 0.25)" stroke="#54B4EB" strokeWidth="2" />
      {/* Dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#54B4EB" stroke="#fff" strokeWidth="1" />
      ))}
    </svg>
  );
}

export default function DevelopmentalAssessment({ 
  patients, 
  assessments, 
  setAssessments,
  therapists = [],
  onAddAssessment, 
  onDeleteAssessment,
  onPrintAssessment,
  currentUser,
  templates = []
}) {
  const isAdmin = currentUser?.role === 'Admin';
  
  // Base states
  const [selectedHn, setSelectedHn] = useState('');
  const [patientSearchText, setPatientSearchText] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [therapistId, setTherapistId] = useState('');
  const [evalDate, setEvalDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [comment, setComment] = useState('');
  
  // Modals & General UI States
  const [showFormModal, setShowFormModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingAssessment, setViewingAssessment] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Multi-template selections state (default to empty)
  const [selectedTemplateIds, setSelectedTemplateIds] = useState([]);
  const [answers, setAnswers] = useState({});
  const [vmiRaw, setVmiRaw] = useState(0);
  const [vpRaw, setVpRaw] = useState(0);
  const [mcRaw, setMcRaw] = useState(0);

  // Legacy States (backward compatibility)
  const [gm, setGm] = useState('สมวัย');
  const [fm, setFm] = useState('สมวัย');
  const [language, setLanguage] = useState('สมวัย');
  const [social, setSocial] = useState('สมวัย');
  const [hasDevelopmental, setHasDevelopmental] = useState(true);
  const [hasSensory, setHasSensory] = useState(true);
  const [hasSnap, setHasSnap] = useState(true);
  const [tactile, setTactile] = useState(0);
  const [vestibular, setVestibular] = useState(0);
  const [proprioceptive, setProprioceptive] = useState(0);
  const [visual, setVisual] = useState(0);
  const [auditory, setAuditory] = useState(0);
  const [movement, setMovement] = useState(0);
  const [score6YearsPlus, setScore6YearsPlus] = useState(0);
  const [snapInattention, setSnapInattention] = useState(0);
  const [snapHyperactivity, setSnapHyperactivity] = useState(0);
  const [snapOppositional, setSnapOppositional] = useState(0);

  // Filter Active templates for selection
  const activeTemplates = useMemo(() => {
    return templates.filter(t => t.status === 'Active');
  }, [templates]);

  // Selected patient details
  const selectedPatient = useMemo(() => {
    return patients.find(p => p.hn === selectedHn);
  }, [selectedHn, patients]);

  // Calculate age of patient at the assessment date
  const patientAgeInfo = useMemo(() => {
    if (!selectedPatient) return { years: 0, months: 0, totalMonths: 0, text: 'กรุณาเลือกผู้รับบริการ' };
    const birthDate = parseDateToAD(selectedPatient.dob);
    if (!birthDate) return { years: 0, months: 0, totalMonths: 0, text: 'วันเกิดไม่ถูกต้อง' };
    const today = evalDate ? (parseDateToAD(evalDate) || new Date()) : new Date();
    
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    
    if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
      years--;
      months += 12;
    }
    if (today.getDate() < birthDate.getDate()) {
      months--;
    }
    if (months < 0) months = 11;

    const totalMonths = (years * 12) + months;
    return {
      years,
      months,
      totalMonths,
      text: `${years} ปี ${months} เดือน`
    };
  }, [selectedPatient, evalDate]);

  const isChild6YearsPlus = useMemo(() => {
    return patientAgeInfo.years >= 6;
  }, [patientAgeInfo]);

  // Patient search in modal form
  const filteredActivePatients = useMemo(() => {
    const q = patientSearchText.trim().toLowerCase();
    const activePatients = patients.filter(p => p.status === 'Active');
    if (!q || q.startsWith('hn:')) return activePatients;
    return activePatients.filter(p => 
      p.hn.toLowerCase().includes(q) ||
      (p.nickname && p.nickname.toLowerCase().includes(q)) ||
      p.firstname.toLowerCase().includes(q) ||
      p.lastname.toLowerCase().includes(q)
    );
  }, [patients, patientSearchText]);

  // Main assessments data list mapping
  const mappedAssessments = useMemo(() => {
    return assessments.map(item => {
      const patient = patients.find(p => p.hn === item.hn);
      return {
        ...item,
        patientName: patient ? `${patient.title}${patient.firstname} ${patient.lastname}` : 'ไม่พบข้อมูลผู้รับบริการ',
        patientNickname: patient ? patient.nickname : ''
      };
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [assessments, patients]);

  // Search filter
  const filteredAssessmentsList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return mappedAssessments;
    return mappedAssessments.filter(item => 
      item.id.toLowerCase().includes(q) ||
      item.hn.toLowerCase().includes(q) ||
      item.patientName.toLowerCase().includes(q) ||
      (item.patientNickname && item.patientNickname.toLowerCase().includes(q))
    );
  }, [mappedAssessments, searchQuery]);

  // Pagination (10 items per page)
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredAssessmentsList.length / itemsPerPage) || 1;
  const paginatedAssessments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAssessmentsList.slice(start, start + itemsPerPage);
  }, [filteredAssessmentsList, currentPage]);

  const handleOpenAddModal = () => {
    setSelectedHn('');
    setPatientSearchText('');
    setTherapistId(currentUser?.employeeId || '');
    setEvalDate(new Date().toISOString().split('T')[0]);
    setComment('');
    setSelectedTemplateIds([]);
    setAnswers({});
    setVmiRaw(0);
    setVpRaw(0);
    setMcRaw(0);

    // Reset Legacy states
    setGm('สมวัย');
    setFm('สมวัย');
    setLanguage('สมวัย');
    setSocial('สมวัย');
    setTactile(0);
    setVestibular(0);
    setProprioceptive(0);
    setVisual(0);
    setAuditory(0);
    setMovement(0);
    setScore6YearsPlus(0);
    setSnapInattention(0);
    setSnapHyperactivity(0);
    setSnapOppositional(0);

    setIsEditing(false);
    setEditingId(null);
    setShowFormModal(true);
  };

  const handleOpenEditModal = (item) => {
    setSelectedHn(item.hn);
    const p = patients.find(p => p.hn === item.hn);
    if (p) {
      setPatientSearchText(`HN: ${p.hn} | ${formatPatientNickname(p.nickname)} (${p.title}${p.firstname} ${p.lastname})`);
    } else {
      setPatientSearchText(`HN: ${item.hn}`);
    }
    setTherapistId(item.therapistId || '');
    setEvalDate(item.date);
    setComment(item.comment || '');
    
    // Support multi-template edits or legacy single-template migration
    const tempIds = item.templateIds || (item.templateId ? [item.templateId] : ['legacy']);
    setSelectedTemplateIds(tempIds);

    if (tempIds.includes('legacy')) {
      setGm(item.gm || 'สมวัย');
      setFm(item.fm || 'สมวัย');
      setLanguage(item.language || 'สมวัย');
      setSocial(item.social || 'สมวัย');
      setTactile(item.sensoryScores?.tactile ?? 0);
      setVestibular(item.sensoryScores?.vestibular ?? 0);
      setProprioceptive(item.sensoryScores?.proprioceptive ?? 0);
      setVisual(item.sensoryScores?.visual ?? 0);
      setAuditory(item.sensoryScores?.auditory ?? 0);
      setMovement(item.sensoryScores?.movement ?? 0);
      setScore6YearsPlus(item.sensoryScores?.score6YearsPlus ?? 0);
      setSnapInattention(item.snapIV?.inattention ?? 0);
      setSnapHyperactivity(item.snapIV?.hyperactivity ?? 0);
      setSnapOppositional(item.snapIV?.oppositional ?? 0);
      setHasDevelopmental(item.hasDevelopmental !== false);
      setHasSensory(item.hasSensory !== false);
      setHasSnap(item.hasSnap !== false);
    } else {
      setAnswers(item.details?.answers || {});
      // Load Beery VMI values if present in scores (either nested or direct)
      const vmiTemp = templates.find(t => tempIds.includes(t.id) && t.type === 'custom_vmi');
      const vmiTempId = vmiTemp ? vmiTemp.id : 'temp-beery-vmi';
      let vmiScores = item.scores?.[vmiTempId] || item.scores?.['temp-beery-vmi'] || {};
      
      // Fallback: scan all keys in item.scores for vmiRaw if not found directly
      if ((vmiScores.vmiRaw === undefined || vmiScores.vmiRaw === null) && item.scores) {
        const foundKey = Object.keys(item.scores).find(k => item.scores[k] && item.scores[k].vmiRaw !== undefined);
        if (foundKey) {
          vmiScores = item.scores[foundKey];
        } else if (item.scores.vmiRaw !== undefined) {
          vmiScores = item.scores;
        }
      }

      setVmiRaw(vmiScores.vmiRaw || 0);
      setVpRaw(vmiScores.vpRaw || 0);
      setMcRaw(vmiScores.mcRaw || 0);
    }

    setIsEditing(true);
    setEditingId(item.id);
    setShowFormModal(true);
  };

  // VMI score calculation lookup helper
  const calculateVMIScores = (raw, type, ageYears, ageMonths, temp) => {
    let table = [];
    if (type === 'vmi') table = temp?.scoringRules?.normTableVMI || temp?.scoringRules?.normTable || [];
    else if (type === 'vp') table = temp?.scoringRules?.normTableVP || [];
    else if (type === 'mc') table = temp?.scoringRules?.normTableMC || [];

    const patientTotalMonths = ageYears * 12 + ageMonths;

    const parseAgeStringToMonths = (val) => {
      if (val === undefined || val === null || val === '') return 0;
      const parts = String(val).trim().split('.');
      const y = parseInt(parts[0]) || 0;
      const m = parseInt(parts[1]) || 0;
      return y * 12 + m;
    };

    const match = table.find(row => {
      const minM = parseAgeStringToMonths(row.ageMinMonths);
      const maxM = parseAgeStringToMonths(row.ageMaxMonths);
      return patientTotalMonths >= minM && patientTotalMonths <= maxM && row.rawScore === raw;
    });
    
    if (!match || match.standardScore === 0) {
      return {
        standardScore: 0,
        scaledSscore: '-',
        percentile: '-',
        interpretation: 'ไม่สามารถแปลผลได้'
      };
    }

    const stdVal = match.standardScore;

    // Step 3: Lookup Scaled Score + Percentile from percentileTable (exact match)
    let scaledSscore = '-';
    let percentile = '-';
    const pctTable = temp?.scoringRules?.percentileTable || [];
    const pctMatch = pctTable.find(row => row.standardScore === stdVal);
    if (pctMatch) {
      scaledSscore = pctMatch.scaledSscore !== undefined ? pctMatch.scaledSscore : '-';
      percentile = pctMatch.percentile !== undefined ? pctMatch.percentile : '-';
    }

    // Step 4: Lookup interpretation from interpretationTable
    let interpretation = '';
    const intTable = temp?.scoringRules?.interpretationTable || [];
    const correctedIntTable = intTable.map(row => {
      if (row.minScore === 71 && row.maxScore === 89) {
        return { ...row, maxScore: 79 };
      }
      return row;
    });

    const intMatch = correctedIntTable.find(row => stdVal >= row.minScore && stdVal <= row.maxScore);
    if (intMatch) {
      interpretation = intMatch.interpretation;
    } else {
      interpretation = getVMIInterpretation(stdVal);
    }

    return { standardScore: stdVal, scaledSscore, percentile, interpretation };
  };

  const parseAgeToMonths = (ageVal) => {
    if (ageVal === undefined || ageVal === null || ageVal === '') return null;
    const valStr = String(ageVal).trim();
    if (valStr === '') return null;
    const parts = valStr.split('.');
    const years = parseInt(parts[0]) || 0;
    const months = parseInt(parts[1]) || 0;
    return (years * 12) + months;
  };

  const evaluateInterpretation = (score, catId, temp) => {
    const rules = temp?.scoringRules?.rules?.[catId] || [];
    const numericScore = Number(score);
    if (score === '' || isNaN(numericScore)) return '-';
    
    const currentAgeMonths = patientAgeInfo?.totalMonths || 0;
    
    for (const rule of rules) {
      // Check age constraints if defined
      let ageMatch = true;
      
      if (rule.ageMin !== undefined && rule.ageMin !== null && rule.ageMin !== '') {
        const minMonths = parseAgeToMonths(rule.ageMin);
        if (minMonths !== null && currentAgeMonths < minMonths) ageMatch = false;
      }
      
      if (rule.ageMax !== undefined && rule.ageMax !== null && rule.ageMax !== '') {
        const maxMonths = parseAgeToMonths(rule.ageMax);
        if (maxMonths !== null && currentAgeMonths > maxMonths) ageMatch = false;
      }
      
      if (!ageMatch) continue;

      const val = Number(rule.value);
      let isMatched = false;
      if (rule.operator === '>') {
        isMatched = (numericScore > val);
      } else if (rule.operator === '>=') {
        isMatched = (numericScore >= val);
      } else if (rule.operator === '<') {
        isMatched = (numericScore < val);
      } else if (rule.operator === '<=') {
        isMatched = (numericScore <= val);
      } else if (rule.operator === '==') {
        isMatched = (numericScore === val);
      }

      if (isMatched) {
        if (rule.interpretation === undefined || rule.interpretation === null || String(rule.interpretation).trim() === '') {
          return '-';
        }
        return rule.interpretation;
      }
    }
    return '-';
  };

  // Multi-select template checkbox handler
  const handleTemplateCheckboxChange = (id, checked) => {
    if (id === 'legacy') {
      if (checked) {
        setSelectedTemplateIds(['legacy']);
      } else {
        setSelectedTemplateIds([]);
      }
    } else {
      if (checked) {
        setSelectedTemplateIds(prev => [...prev.filter(x => x !== 'legacy'), id]);
      } else {
        setSelectedTemplateIds(prev => prev.filter(x => x !== id));
      }
    }
  };

  const getTemplateScores = (item, tempId) => {
    if (item.templateIds?.includes(tempId)) {
      return item.scores?.[tempId] || {};
    }
    if (item.templateId === tempId) {
      return item.scores || {};
    }
    return {};
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedHn) {
      Swal.fire({ icon: 'warning', title: 'กรุณาเลือกผู้รับบริการ', confirmButtonColor: 'var(--secondary)' });
      return;
    }
    if (!therapistId) {
      Swal.fire({ icon: 'warning', title: 'กรุณาเลือกนักกิจกรรมบำบัดผู้ประเมิน', confirmButtonColor: 'var(--secondary)' });
      return;
    }
    if (selectedTemplateIds.length === 0) {
      Swal.fire({ icon: 'warning', title: 'กรุณาเลือกแบบประเมินอย่างน้อย 1 รายการ', confirmButtonColor: 'var(--secondary)' });
      return;
    }

    // Generate Document ID
    const beYear = new Date(evalDate).getFullYear() + 543;
    const year2Digits = beYear.toString().slice(-2);
    const docId = isEditing && editingId ? editingId : `HDA${year2Digits}-${selectedHn}-${Date.now().toString().slice(-4)}`;

    let newAssessment = {};

    if (selectedTemplateIds.includes('legacy')) {
      newAssessment = {
        id: docId,
        hn: selectedHn,
        therapistId,
        date: evalDate,
        comment,
        templateId: 'legacy',
        templateIds: ['legacy'],
        gm,
        fm,
        language,
        social,
        sensoryScores: {
          tactile: Number(tactile),
          vestibular: Number(vestibular),
          proprioceptive: Number(proprioceptive),
          visual: Number(visual),
          auditory: Number(auditory),
          movement: Number(movement),
          total: Number(tactile) + Number(vestibular) + Number(proprioceptive) + Number(visual) + Number(auditory) + Number(movement),
          score6YearsPlus: isChild6YearsPlus ? Number(score6YearsPlus) || 0 : 0
        },
        snapIV: {
          inattention: Number(snapInattention),
          hyperactivity: Number(snapHyperactivity),
          oppositional: Number(snapOppositional),
          inattentionStatus: Number(snapInattention) >= 16 ? 'เสี่ยง' : 'ปกติ',
          hyperactivityStatus: Number(snapHyperactivity) >= 13 ? 'เสี่ยง' : 'ปกติ',
          oppositionalStatus: Number(snapOppositional) >= 15 ? 'เสี่ยง' : 'ปกติ'
        },
        hasDevelopmental,
        hasSensory,
        hasSnap,
        created_at: new Date().toISOString()
      };
    } else {
      // Calculate scores for all selected templates
      let scores = {};
      let details = { answers: answers };

      selectedTemplateIds.forEach(tempId => {
        const template = templates.find(t => t.id === tempId);
        if (!template) return;

        if (template.type === 'dynamic_checklist') {
          let tempScores = {};
          template.categories.forEach(cat => {
            const qCount = template.questions.filter(q => q.categoryId === cat.id).length;
            const passValue = (template.checklistOptions && template.checklistOptions[0]) || 'ผ่าน';
            const passCount = template.questions.filter(q => {
              if (q.categoryId !== cat.id) return false;
              const val = answers[q.id];
              return val === true || val === 'true' || val === passValue;
            }).length;
            tempScores[cat.id] = qCount > 0 ? Math.round((passCount / qCount) * 100) : 0;
          });
          scores[tempId] = tempScores;
        } 
        else if (template.type === 'dynamic_scale') {
          let tempScores = {};
          template.categories.forEach(cat => {
            const catQs = template.questions.filter(q => q.categoryId === cat.id);
            const sum = catQs.reduce((s, q) => s + (Number(answers[q.id]) || 0), 0);
            if (template.id === 'temp-snap-iv') {
              tempScores[cat.id] = catQs.length > 0 ? parseFloat((sum / catQs.length).toFixed(2)) : 0;
            } else {
              tempScores[cat.id] = sum;
            }
          });
          scores[tempId] = tempScores;
        }
        else if (template.type === 'custom_vmi') {
          const ageYears = patientAgeInfo.years;
          const ageMonths = patientAgeInfo.months;
          const vmiInfo = calculateVMIScores(vmiRaw, 'vmi', ageYears, ageMonths, template);
          const vpInfo = calculateVMIScores(vpRaw, 'vp', ageYears, ageMonths, template);
          const mcInfo = calculateVMIScores(mcRaw, 'mc', ageYears, ageMonths, template);
          
          scores[tempId] = {
            vmiRaw,
            vpRaw,
            mcRaw,
            vmiStd: vmiInfo.standardScore,
            vpStd: vpInfo.standardScore,
            mcStd: mcInfo.standardScore,
            vmiScale: vmiInfo.scaledSscore,
            vpScale: vpInfo.scaledSscore,
            mcScale: mcInfo.scaledSscore,
            vmiPct: vmiInfo.percentile,
            vpPct: vpInfo.percentile,
            mcPct: mcInfo.percentile,
            vmiInt: vmiInfo.interpretation,
            vpInt: vpInfo.interpretation,
            mcInt: mcInfo.interpretation
          };
        }
        else if (template.type === 'score_interpretation') {
          let tempScores = {};
          template.categories.forEach(cat => {
            const scoreVal = answers[tempId + '_' + cat.id] !== undefined ? answers[tempId + '_' + cat.id] : '';
            const intVal = evaluateInterpretation(scoreVal, cat.id, template);
            tempScores[cat.id] = {
              score: scoreVal,
              interpretation: intVal
            };
          });
          scores[tempId] = tempScores;
        }
        else if (template.type === 'custom_denver') {
          let tempScores = {};
          const sectors = ['personal-social', 'fine-motor-adaptive', 'language', 'gross-motor'];
          sectors.forEach(sec => {
            const secQs = template.scoringRules?.milestones.filter(m => m.sector === sec) || [];
            const secAns = secQs.map(q => answers[q.id]).filter(Boolean);
            tempScores[sec] = {
              P: secAns.filter(a => a === 'P').length,
              F: secAns.filter(a => a === 'F').length,
              R: secAns.filter(a => a === 'R').length,
              NO: secAns.filter(a => a === 'NO').length
            };
          });
          scores[tempId] = tempScores;
        }
      });

      newAssessment = {
        id: docId,
        hn: selectedHn,
        therapistId,
        date: evalDate,
        comment,
        templateId: selectedTemplateIds[0], // First selection for compatibility
        templateIds: selectedTemplateIds,
        scores,
        details,
        created_at: new Date().toISOString()
      };
    }

    if (isEditing) {
      setAssessments(prev => prev.map(a => a.id === docId ? newAssessment : a));
    } else {
      setAssessments(prev => [newAssessment, ...prev]);
    }
    
    setShowFormModal(false);
    Swal.fire({
      icon: 'success',
      title: 'บันทึกข้อมูลเรียบร้อย',
      timer: 1500,
      showConfirmButton: false
    });
  };

  const handleDeleteClick = (id) => {
    Swal.fire({
      title: 'ยืนยันการลบข้อมูล?',
      text: 'คุณไม่สามารถกู้คืนข้อมูลแบบประเมินนี้ได้หลังจากลบแล้ว',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--danger)',
      cancelButtonColor: 'var(--dark-light)',
      confirmButtonText: 'ยืนยันลบ',
      cancelButtonText: 'ยกเลิก'
    }).then((result) => {
      if (result.isConfirmed) {
        onDeleteAssessment(id);
        Swal.fire('ลบข้อมูลสำเร็จ', 'ข้อมูลประเมินพัฒนาการถูกลบออกแล้ว', 'success');
      }
    });
  };

  return (
    <div className="card shadow-sm animate-fade-in" style={{ padding: '1.5rem', backgroundColor: 'var(--white)' }}>
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--dark)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <ClipboardCheck size={26} color="var(--secondary)" />
            ระบบบันทึกผลการประเมินพัฒนาการ
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--dark-light)' }}>
            บันทึก ค้นหา และวิเคราะห์รายงานประวัติการประเมินพัฒนาการของเด็กรายบุคคล
          </p>
        </div>
      </div>

      {/* Search and buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div className="search-input-wrapper" style={{ flex: 1, minWidth: '250px', margin: 0 }}>
          <input 
            type="text" 
            className="form-control" 
            placeholder="ค้นหาจาก HN, ชื่อเล่น, หรือชื่อจริง..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} onClick={handleOpenAddModal}>
          <Plus size={16} /> บันทึกผลการประเมินใหม่
        </button>
      </div>

      {/* Table grid */}
      <div className="table-container">
        <table className="hdh-table">
          <thead>
            <tr>
              <th>เลขที่ใบประเมิน</th>
              <th>วันที่ประเมิน</th>
              <th>ผู้ป่วย</th>
              <th>แบบประเมินที่ทำ / สรุปย่อ</th>
              <th style={{ textAlign: 'center' }}>การดำเนินการ</th>
            </tr>
          </thead>
          <tbody>
            {paginatedAssessments.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--dark-light)' }}>
                  {searchQuery.trim() ? 'ไม่พบข้อมูลที่ตรงกับการค้นหา' : 'ยังไม่มีประวัติการประเมินบันทึกไว้ในระบบ'}
                </td>
              </tr>
            ) : (
              paginatedAssessments.map((item) => {
                const itemTempIds = item.templateIds || (item.templateId ? [item.templateId] : ['legacy']);
                const isLegacy = itemTempIds.includes('legacy');
                
                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600, color: 'var(--secondary)' }}>{item.id}</td>
                    <td>{new Date(item.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.patientName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--dark-light)' }}>HN: {item.hn} ({formatPatientNickname(item.patientNickname)})</div>
                    </td>
                    <td>
                      {isLegacy ? (
                        <div style={{ fontSize: '0.8rem' }}>
                          <span className="badge badge-secondary" style={{ fontSize: '0.65rem', marginBottom: '3px' }}>แบบประเมินรวม (เดิม)</span>
                          {item.snapIV && (
                            <div>
                              SNAP-IV: <strong style={{ color: item.snapIV.inattentionStatus === 'เสี่ยง' ? 'var(--danger)' : 'var(--success)' }}>สมาธิ: {item.snapIV.inattentionStatus}</strong>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {itemTempIds.map(tempId => {
                            const temp = templates.find(t => t.id === tempId);
                            const tScores = getTemplateScores(item, tempId);
                            return (
                              <div key={tempId} style={{ fontSize: '0.8rem', borderBottom: '1px dashed #eee', paddingBottom: '2px' }}>
                                <span className="badge badge-success" style={{ fontSize: '0.65rem', backgroundColor: '#e2f0d9', color: '#385723', border: '1px solid #c8e6c9', marginRight: '5px' }}>
                                  {temp?.name || 'แบบประเมินย่อย'}
                                </span>
                                {temp?.type === 'custom_vmi' && tScores && (
                                  <span>VMI std: <strong>{tScores.vmiStd}</strong> | MC: <strong>{tScores.mcStd}</strong></span>
                                )}
                                {temp?.type === 'dynamic_scale' && tempId === 'temp-snap-iv' && tScores && (
                                  <span>SNAP-IV - สมาธิเฉลี่ย: <strong>{tScores.inattention || tScores.inattentive}</strong></span>
                                )}
                                {temp?.type === 'dynamic_scale' && tempId === 'temp-sensory-6' && tScores && (
                                  <span>Sensory tactile: <strong>{tScores.tactile}</strong></span>
                                )}
                                {temp?.type === 'dynamic_checklist' && tScores && (
                                  <span>ผ่าน: <strong>{Object.values(tScores).reduce((a, b) => a + b, 0) / Math.max(1, Object.keys(tScores).length)}%</strong></span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                        <button 
                          className="btn btn-light btn-icon-only" 
                          title="ดูข้อมูล"
                          onClick={() => {
                            setViewingAssessment(item);
                            setShowViewModal(true);
                          }}
                        >
                          <Eye size={16} color="var(--secondary)" />
                        </button>

                        <button 
                          className="btn btn-light btn-icon-only" 
                          title="แก้ไขใบประเมิน"
                          onClick={() => handleOpenEditModal(item)}
                        >
                          <Edit size={16} color="var(--dark-light)" />
                        </button>
                        
                        <button 
                          className="btn btn-light btn-icon-only" 
                          title="พิมพ์ใบประเมิน (PDF)"
                          onClick={() => onPrintAssessment(item.id)}
                        >
                          <Printer size={16} color="var(--secondary)" />
                        </button>

                        {isAdmin && (
                          <button 
                            className="btn btn-light btn-icon-only" 
                            title="ลบข้อมูล"
                            onClick={() => handleDeleteClick(item.id)}
                          >
                            <Trash2 size={16} color="var(--danger)" />
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--dark-light)' }}>
            แสดงหน้า {currentPage} จากทั้งหมด {totalPages} หน้า
          </div>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <button 
              className="btn btn-light" 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
            >
              ย้อนกลับ
            </button>
            <button 
              className="btn btn-light" 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
            >
              ถัดไป
            </button>
          </div>
        </div>
      )}

      {/* CREATE & EDIT FORM MODAL */}
      {showFormModal && (
        <div className="modal-overlay" style={{ zIndex: 1050 }}>
          <div className="card-3xl" style={{ maxWidth: '850px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Brain size={22} color="var(--secondary)" />
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--dark)', margin: 0 }}>
                  {isEditing ? 'แก้ไขข้อมูลบันทึกผลการประเมิน' : 'บันทึกผลการประเมินพัฒนาการใหม่'}
                </h2>
              </div>
              <button className="close-modal-btn" onClick={() => setShowFormModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1rem 0' }}>
                
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div className="form-group">
                    <label className="form-label">ผู้รับบริการ <span style={{ color: 'var(--danger)' }}>*</span></label>
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
                        disabled={isEditing}
                        required
                      />
                      <input type="hidden" value={selectedHn} required />
                      
                      {showPatientDropdown && !isEditing && (
                        <div className="card-md" style={{ 
                          position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: '180px', overflowY: 'auto', zIndex: 1100,
                          backgroundColor: 'white', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0'
                        }}>
                          {filteredActivePatients.length === 0 ? (
                            <div style={{ padding: '0.5rem 1rem', color: 'var(--dark-light)', fontSize: '0.85rem' }}>ไม่พบข้อมูลผู้รับบริการ</div>
                          ) : (
                            filteredActivePatients.map(p => (
                              <div 
                                key={p.hn} 
                                style={{ padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.9rem' }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--light)'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                onClick={() => {
                                  setSelectedHn(p.hn);
                                  setPatientSearchText(`HN: ${p.hn} | ${formatPatientNickname(p.nickname)} (${p.title}${p.firstname} ${p.lastname})`);
                                  setShowPatientDropdown(false);
                                }}
                              >
                                HN: {p.hn} | {formatPatientNickname(p.nickname)} ({p.title}{p.firstname} {p.lastname})
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">วันที่ประเมิน <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={evalDate} 
                      onChange={(e) => setEvalDate(e.target.value)} 
                      required 
                    />
                  </div>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
                  <div className="form-group">
                    <label className="form-label">นักกิจกรรมบำบัดผู้ประเมิน <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <select
                      className="form-control"
                      value={therapistId}
                      onChange={(e) => setTherapistId(e.target.value)}
                      required
                    >
                      <option value="">-- เลือกนักกิจกรรมบำบัดผู้ประเมิน --</option>
                      {therapists.map(t => (
                        <option key={t.id} value={t.id}>
                          {formatTherapistName(t.nickname)} | {t.fullname} (ใบอนุญาต: {t.licenseNo || 'ไม่มี'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedHn && (
                  <div style={{ backgroundColor: 'var(--light)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.65rem 0.75rem', fontSize: '0.85rem' }}>
                    <strong>ข้อมูลประวัติเด็ก:</strong> อายุ ณ วันที่ตรวจ คือ <strong>{patientAgeInfo.text}</strong>
                  </div>
                )}

                {/* เลือกแบบประเมิน (สามารถเลือกได้หลายรายการ) */}
                <div className="form-group" style={{ backgroundColor: '#fcfcfc', border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem' }}>
                  <label className="form-label" style={{ fontWeight: 700, display: 'block', marginBottom: '0.5rem' }}>
                    เลือกแบบประเมินสำหรับบันทึก (เลือกได้หลายรายการ) <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    {selectedTemplateIds.includes('legacy') && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
                        <input 
                          type="checkbox"
                          checked={selectedTemplateIds.includes('legacy')}
                          onChange={(e) => handleTemplateCheckboxChange('legacy', e.target.checked)}
                          disabled={isEditing}
                        />
                        แบบประเมินรวม (แบบฟอร์มเดิม)
                      </label>
                    )}
                    
                    {activeTemplates.map(t => (
                      <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <input 
                          type="checkbox"
                          checked={selectedTemplateIds.includes(t.id)}
                          onChange={(e) => handleTemplateCheckboxChange(t.id, e.target.checked)}
                          disabled={isEditing}
                        />
                        {t.name}
                      </label>
                    ))}
                  </div>
                </div>

                {/* RENDER FORM: LEGACY COMBINED FORM */}
                {selectedTemplateIds.includes('legacy') && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ backgroundColor: '#fcfcfc', border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem' }}>
                      <h4 style={{ fontWeight: 700, margin: '0 0 0.5rem 0' }}>สรุปผลพัฒนาการ 4 ด้านพื้นฐาน</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                        {['gm', 'fm', 'language', 'social'].map(field => {
                          const stateVal = field === 'gm' ? gm : field === 'fm' ? fm : field === 'language' ? language : social;
                          const stateSet = field === 'gm' ? setGm : field === 'fm' ? setFm : field === 'language' ? setLanguage : setSocial;
                          return (
                            <div className="form-group" key={field}>
                              <label className="form-label" style={{ textTransform: 'uppercase' }}>{field}</label>
                              <select className="form-control" value={stateVal} onChange={(e) => stateSet(e.target.value)}>
                                <option value="สมวัย">สมวัย</option>
                                <option value="ไม่สมวัย">ไม่สมวัย</option>
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ backgroundColor: '#fcfcfc', border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem' }}>
                      <h4 style={{ fontWeight: 700, margin: '0 0 0.5rem 0' }}>สรุปผล Sensory Test (คะแนนรวมแต่ละด้าน)</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                        {['Visual', 'Auditory', 'Movement', 'Vestibular', 'Proprioceptive', 'Tactile'].map((name, i) => {
                          const stateVal = [visual, auditory, movement, vestibular, proprioceptive, tactile][i];
                          const stateSet = [setVisual, setAuditory, setMovement, setVestibular, setProprioceptive, setTactile][i];
                          return (
                            <div className="form-group" key={name}>
                              <label className="form-label">{name}</label>
                              <input type="number" className="form-control" min="0" max="50" value={stateVal} onChange={(e) => stateSet(parseInt(e.target.value) || 0)} />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ backgroundColor: '#fcfcfc', border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem' }}>
                      <h4 style={{ fontWeight: 700, margin: '0 0 0.5rem 0' }}>สรุปผล SNAP-IV คะแนนดิบ</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                        <div className="form-group">
                          <label className="form-label">สมาธิสั้น (Inattention)</label>
                          <input type="number" className="form-control" min="0" max="27" value={snapInattention} onChange={(e) => setSnapInattention(parseInt(e.target.value) || 0)} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">ซนวู่วาม (Hyperactivity)</label>
                          <input type="number" className="form-control" min="0" max="27" value={snapHyperactivity} onChange={(e) => setSnapHyperactivity(parseInt(e.target.value) || 0)} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">ดื้อต่อต้าน (Oppositional)</label>
                          <input type="number" className="form-control" min="0" max="24" value={snapOppositional} onChange={(e) => setSnapOppositional(parseInt(e.target.value) || 0)} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* RENDER FORM: DYNAMIC SCALE/CHECKLIST FOR MULTIPLE SELECTED TEMPLATES */}
                {!selectedTemplateIds.includes('legacy') && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {selectedTemplateIds.map(tempId => {
                      const temp = templates.find(t => t.id === tempId);
                      if (!temp) return null;

                      if (temp.type === 'dynamic_checklist' || temp.type === 'dynamic_scale') {
                        return (
                          <div key={temp.id} style={{ border: '1px solid var(--secondary)', borderRadius: '12px', padding: '1.25rem', backgroundColor: '#fafbfd' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 1rem 0', color: 'var(--secondary)', borderBottom: '1px solid var(--secondary)', paddingBottom: '0.25rem' }}>
                              แบบประเมิน: {temp.name}
                            </h3>
                            {temp.categories.map(cat => {
                              const catQs = temp.questions.filter(q => q.categoryId === cat.id);
                              return (
                                <div key={cat.id} style={{ backgroundColor: 'var(--white)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.75rem' }}>
                                  <h4 style={{ fontWeight: 700, margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--dark)' }}>{cat.name}</h4>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {catQs.map(q => {
                                      // Check age constraints
                                      const currentAgeMonths = patientAgeInfo.totalMonths;
                                      const hasMinAge = q.ageMin !== undefined && q.ageMin !== null && q.ageMin !== '';
                                      const hasMaxAge = q.ageMax !== undefined && q.ageMax !== null && q.ageMax !== '';
                                      const isAgeRestricted = (hasMinAge && currentAgeMonths < Number(q.ageMin)) ||
                                                              (hasMaxAge && currentAgeMonths > Number(q.ageMax));

                                      const qType = q.itemType || (temp.type === 'dynamic_scale' ? 'scale' : 'checklist');

                                      return (
                                        <div key={q.id} style={{ 
                                          display: 'flex', 
                                          justifyContent: 'space-between', 
                                          alignItems: 'center', 
                                          gap: '15px', 
                                          padding: '0.35rem 0', 
                                          borderBottom: '1px dashed #eee',
                                          opacity: isAgeRestricted ? 0.5 : 1
                                        }}>
                                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '0.82rem', color: isAgeRestricted ? 'var(--dark-light)' : 'var(--dark)' }}>
                                              {q.text}
                                            </span>
                                            {isAgeRestricted && (
                                              <span style={{ fontSize: '0.7rem', color: '#e67e22', fontWeight: 600 }}>
                                                ⚠️ ข้ามอัตโนมัติ (เฉพาะอายุ {q.ageMin || 0}-{q.ageMax || '∞'} เดือน | เด็กอายุ: {currentAgeMonths} เดือน)
                                              </span>
                                            )}
                                          </div>
                                          
                                          {qType === 'checklist' ? (
                                            <select
                                              className="form-control"
                                              style={{ 
                                                width: '130px', 
                                                padding: '0.2rem 0.4rem', 
                                                fontSize: '0.8rem', 
                                                height: '28px',
                                                cursor: isAgeRestricted ? 'not-allowed' : 'pointer'
                                              }}
                                              value={
                                                answers[q.id] === true || answers[q.id] === 'true'
                                                  ? ((temp.checklistOptions && temp.checklistOptions[0]) || 'ผ่าน')
                                                  : (answers[q.id] || '')
                                              }
                                              onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                                              disabled={isAgeRestricted}
                                            >
                                              <option value="">-- เลือก --</option>
                                              {(temp.checklistOptions && temp.checklistOptions.length > 0 ? temp.checklistOptions : ['ผ่าน', 'ไม่ผ่าน']).map((opt, oIdx) => (
                                                <option key={oIdx} value={opt}>{opt}</option>
                                              ))}
                                            </select>
                                          ) : qType === 'score_input' ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                              <input 
                                                type="number"
                                                className="form-control"
                                                style={{ width: '90px', padding: '0.2rem 0.4rem', fontSize: '0.8rem', height: '28px', textAlign: 'center' }}
                                                placeholder={q.targetScore ? `เกณฑ์: ${q.targetScore}` : 'คะแนนดิบ'}
                                                value={answers[q.id] || ''}
                                                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value === '' ? '' : Number(e.target.value) })}
                                                disabled={isAgeRestricted}
                                                min="0"
                                              />
                                              {q.targetScore && (
                                                <span style={{ fontSize: '0.75rem', color: 'var(--dark-light)' }}>
                                                  / {q.targetScore}
                                                </span>
                                              )}
                                            </div>
                                          ) : (
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                              {[...Array(temp.id === 'temp-snap-iv' ? 4 : 5)].map((_, idx) => {
                                                const scoreVal = temp.id === 'temp-snap-iv' ? idx : idx + 1;
                                                return (
                                                  <label key={idx} style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '2px', cursor: isAgeRestricted ? 'not-allowed' : 'pointer' }}>
                                                    <input 
                                                      type="radio"
                                                      name={`q_${q.id}`}
                                                      value={scoreVal}
                                                      checked={!isAgeRestricted && answers[q.id] === scoreVal}
                                                      onChange={() => setAnswers({ ...answers, [q.id]: scoreVal })}
                                                      disabled={isAgeRestricted}
                                                    />
                                                    {scoreVal}
                                                  </label>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      }
                      
                      if (temp.type === 'score_interpretation') {
                        return (
                          <div key={temp.id} style={{ border: '1px solid var(--secondary)', borderRadius: '12px', padding: '1.25rem', backgroundColor: '#fafbfd' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 1rem 0', color: 'var(--secondary)', borderBottom: '1px solid var(--secondary)', paddingBottom: '0.25rem' }}>
                              แบบประเมิน: {temp.name}
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px' }}>
                              {temp.categories.map(cat => {
                                const catRules = temp?.scoringRules?.rules?.[cat.id] || [];
                                const currentAgeMonths = patientAgeInfo?.totalMonths || 0;
                                const hasAgeMatch = catRules.length === 0 || catRules.some(rule => {
                                  let match = true;
                                  if (rule.ageMin !== undefined && rule.ageMin !== null && rule.ageMin !== '') {
                                    const minMonths = parseAgeToMonths(rule.ageMin);
                                    if (minMonths !== null && currentAgeMonths < minMonths) match = false;
                                  }
                                  if (rule.ageMax !== undefined && rule.ageMax !== null && rule.ageMax !== '') {
                                    const maxMonths = parseAgeToMonths(rule.ageMax);
                                    if (maxMonths !== null && currentAgeMonths > maxMonths) match = false;
                                  }
                                  return match;
                                });

                                if (!hasAgeMatch) return null;

                                const currentScore = answers[temp.id + '_' + cat.id] !== undefined ? answers[temp.id + '_' + cat.id] : '';
                                const interpretation = evaluateInterpretation(currentScore, cat.id, temp);
                                
                                return (
                                  <div key={cat.id} style={{ backgroundColor: 'var(--white)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <label className="form-label" style={{ fontWeight: 700, margin: 0, fontSize: '0.85rem' }}>{cat.name}</label>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                      <input 
                                        type="number"
                                        className="form-control"
                                        style={{ width: '90px', padding: '0.35rem', fontSize: '0.85rem' }}
                                        placeholder="ใส่คะแนนรวม"
                                        value={currentScore}
                                        onChange={(e) => setAnswers({ ...answers, [temp.id + '_' + cat.id]: e.target.value === '' ? '' : Number(e.target.value) })}
                                        min="0"
                                      />
                                      {cat.maxScore !== undefined && cat.maxScore !== null && cat.maxScore !== '' && (
                                        <span style={{ fontSize: '0.85rem', color: 'var(--dark-light)', marginLeft: '-5px', marginRight: '5px' }}>/ {cat.maxScore}</span>
                                      )}
                                      <span style={{ fontSize: '0.82rem', color: 'var(--dark-light)' }}>แปลผล:</span>
                                      <span className="badge badge-secondary" style={{ fontSize: '0.82rem', padding: '0.35rem 0.6rem' }}>
                                        {interpretation}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }
                      
                      if (temp.type === 'custom_vmi') {
                        const ageYears = patientAgeInfo.years;
                        const ageMonths = patientAgeInfo.months;
                        const vmiInfo = calculateVMIScores(vmiRaw, 'vmi', ageYears, ageMonths, temp);
                        const vpInfo = calculateVMIScores(vpRaw, 'vp', ageYears, ageMonths, temp);
                        const mcInfo = calculateVMIScores(mcRaw, 'mc', ageYears, ageMonths, temp);
                        
                        return (
                          <div key={temp.id} style={{ border: '1px solid var(--secondary)', borderRadius: '12px', padding: '1.25rem', backgroundColor: '#fafbfd' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 1rem 0', color: 'var(--secondary)', borderBottom: '1px solid var(--secondary)', paddingBottom: '0.25rem' }}>
                              แบบประเมิน: {temp.name}
                            </h3>
                            <table className="hdh-table" style={{ backgroundColor: 'white', marginBottom: 0 }}>
                              <thead>
                                <tr>
                                  <th>ประเภทคะแนน</th>
                                  <th style={{ textAlign: 'center' }}>1. Visual-Motor Integration (VM score)</th>
                                  <th style={{ textAlign: 'center' }}>2. Visual Perception (VP score)</th>
                                  <th style={{ textAlign: 'center' }}>3. Motor Coordination (Motor score)</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td><strong>คะแนนดิบ (Raw Score)</strong></td>
                                  <td>
                                    <input type="number" className="form-control" style={{ padding: '0.35rem 0.5rem', textAlign: 'center' }} min="0" max="30" value={vmiRaw} onChange={(e) => setVmiRaw(parseInt(e.target.value) || 0)} />
                                  </td>
                                  <td>
                                    <input type="number" className="form-control" style={{ padding: '0.35rem 0.5rem', textAlign: 'center' }} min="0" max="30" value={vpRaw} onChange={(e) => setVpRaw(parseInt(e.target.value) || 0)} />
                                  </td>
                                  <td>
                                    <input type="number" className="form-control" style={{ padding: '0.35rem 0.5rem', textAlign: 'center' }} min="0" max="30" value={mcRaw} onChange={(e) => setMcRaw(parseInt(e.target.value) || 0)} />
                                  </td>
                                </tr>
                                <tr>
                                  <td><strong>คะแนนมาตรฐาน (Standard Score)</strong></td>
                                  <td>
                                    <input type="text" className="form-control" style={{ padding: '0.35rem 0.5rem', fontWeight: 600, textAlign: 'center' }} value={vmiInfo.standardScore === 0 ? '-' : vmiInfo.standardScore} readOnly />
                                  </td>
                                  <td>
                                    <input type="text" className="form-control" style={{ padding: '0.35rem 0.5rem', fontWeight: 600, textAlign: 'center' }} value={vpInfo.standardScore === 0 ? '-' : vpInfo.standardScore} readOnly />
                                  </td>
                                  <td>
                                    <input type="text" className="form-control" style={{ padding: '0.35rem 0.5rem', fontWeight: 600, textAlign: 'center' }} value={mcInfo.standardScore === 0 ? '-' : mcInfo.standardScore} readOnly />
                                  </td>
                                </tr>
                                <tr>
                                  <td><strong>คะแนนสเกล (Scaled Score)</strong></td>
                                  <td>
                                    <input type="text" className="form-control" style={{ padding: '0.35rem 0.5rem', textAlign: 'center' }} value={vmiInfo.scaledSscore} readOnly />
                                  </td>
                                  <td>
                                    <input type="text" className="form-control" style={{ padding: '0.35rem 0.5rem', textAlign: 'center' }} value={vpInfo.scaledSscore} readOnly />
                                  </td>
                                  <td>
                                    <input type="text" className="form-control" style={{ padding: '0.35rem 0.5rem', textAlign: 'center' }} value={mcInfo.scaledSscore} readOnly />
                                  </td>
                                </tr>
                                <tr>
                                  <td><strong>Percentile (%)</strong></td>
                                  <td>
                                    <input type="text" className="form-control" style={{ padding: '0.35rem 0.5rem', textAlign: 'center' }} value={vmiInfo.percentile === '-' ? '-' : `${vmiInfo.percentile}%`} readOnly />
                                  </td>
                                  <td>
                                    <input type="text" className="form-control" style={{ padding: '0.35rem 0.5rem', textAlign: 'center' }} value={vpInfo.percentile === '-' ? '-' : `${vpInfo.percentile}%`} readOnly />
                                  </td>
                                  <td>
                                    <input type="text" className="form-control" style={{ padding: '0.35rem 0.5rem', textAlign: 'center' }} value={mcInfo.percentile === '-' ? '-' : `${mcInfo.percentile}%`} readOnly />
                                  </td>
                                </tr>
                                <tr>
                                  <td><strong>การแปลผล (Interpretation)</strong></td>
                                  <td style={{ textAlign: 'center' }}>
                                    <span className="badge badge-secondary" style={{ fontSize: '0.82rem', padding: '0.35rem 0.6rem', ...getVMIStyle(vmiInfo.interpretation) }}>
                                      {vmiInfo.interpretation}
                                    </span>
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    <span className="badge badge-secondary" style={{ fontSize: '0.82rem', padding: '0.35rem 0.6rem', ...getVMIStyle(vpInfo.interpretation) }}>
                                      {vpInfo.interpretation}
                                    </span>
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    <span className="badge badge-secondary" style={{ fontSize: '0.82rem', padding: '0.35rem 0.6rem', ...getVMIStyle(mcInfo.interpretation) }}>
                                      {mcInfo.interpretation}
                                    </span>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        );
                      }

                      if (temp.type === 'custom_denver') {
                        const sectors = [
                          { id: 'personal-social', name: 'ด้านส่วนบุคคลและสังคม (Personal-Social)' },
                          { id: 'fine-motor-adaptive', name: 'ด้านกล้ามเนื้อมัดเล็กปรับตัว (Fine Motor-Adaptive)' },
                          { id: 'language', name: 'ด้านพัฒนาการภาษา (Language)' },
                          { id: 'gross-motor', name: 'ด้านกล้ามเนื้อมัดใหญ่ (Gross Motor)' }
                        ];

                        return (
                          <div key={temp.id} style={{ border: '1px solid var(--secondary)', borderRadius: '12px', padding: '1.25rem', backgroundColor: '#fafbfd' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 1rem 0', color: 'var(--secondary)', borderBottom: '1px solid var(--secondary)', paddingBottom: '0.25rem' }}>
                              แบบประเมิน: {temp.name}
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              {sectors.map(sec => {
                                const secMilestones = temp.scoringRules?.milestones.filter(m => m.sector === sec.id) || [];
                                return (
                                  <div key={sec.id} style={{ backgroundColor: 'var(--white)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '0.75rem' }}>
                                    <h4 style={{ fontWeight: 700, margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--dark)' }}>{sec.name}</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                      {secMilestones.map(m => (
                                        <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0', borderBottom: '1px dashed #eee' }}>
                                          <div style={{ fontSize: '0.8rem' }}>
                                            {m.text}
                                            <span style={{ fontSize: '0.7rem', color: 'var(--dark-light)', marginLeft: '0.5rem' }}>
                                              (ผ่าน 50%: {m.age50}ด., 90%: {m.age90}ด.)
                                            </span>
                                          </div>
                                          
                                          <select
                                            className="form-control"
                                            style={{ width: '110px', padding: '0.2rem 0.4rem', fontSize: '0.8rem', height: '30px' }}
                                            value={answers[m.id] || ''}
                                            onChange={(e) => setAnswers({ ...answers, [m.id]: e.target.value })}
                                          >
                                            <option value="">-- ประเมิน --</option>
                                            <option value="P">P (ผ่าน)</option>
                                            <option value="F">F (ไม่ผ่าน)</option>
                                            <option value="R">R (ปฏิเสธ)</option>
                                            <option value="NO">NO (ไม่มีโอกาส)</option>
                                          </select>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">ความเห็นทางกิจกรรมบำบัดเพิ่มเติม (Comment)</label>
                  <textarea 
                    className="form-control" 
                    rows="3" 
                    placeholder="ระบุข้อสังเกตเพิ่มเติม..."
                    value={comment} 
                    onChange={(e) => setComment(e.target.value)} 
                  />
                </div>

              </div>
              <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-light" onClick={() => setShowFormModal(false)}>ยกเลิก</button>
                <button type="submit" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Save size={14} /> บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEWER MODAL */}
      {showViewModal && viewingAssessment && (
        <div className="modal-overlay" style={{ zIndex: 1050 }}>
          <div className="card-3xl" style={{ maxWidth: '800px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ClipboardCheck size={22} color="var(--secondary)" />
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--dark)', margin: 0 }}>
                  รายละเอียดผลการประเมินพัฒนาการ
                </h2>
              </div>
              <button className="close-modal-btn" onClick={() => setShowViewModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem 0' }}>
              {/* Patient Profile */}
              <div className="card-2xl" style={{ backgroundColor: 'var(--light)', border: '1px solid var(--border)', padding: '1rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--dark)' }}>ข้อมูลผู้รับการตรวจ</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.85rem' }}>
                  <div><strong>ชื่อ-สกุล:</strong> {viewingAssessment.patientName}</div>
                  <div><strong>ชื่อเล่น:</strong> {formatPatientNickname(viewingAssessment.patientNickname) || '-'}</div>
                  <div><strong>รหัส HN:</strong> {viewingAssessment.hn}</div>
                  <div><strong>วันที่ประเมิน:</strong> {new Date(viewingAssessment.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                </div>
              </div>

              {/* RENDER VIEW: LEGACY OR MULTI-TEMPLATES */}
              {(() => {
                const itemTempIds = viewingAssessment.templateIds || (viewingAssessment.templateId ? [viewingAssessment.templateId] : ['legacy']);
                
                if (itemTempIds.includes('legacy')) {
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {viewingAssessment.hasDevelopmental !== false && (
                        <div>
                          <h4 style={{ fontWeight: 700, margin: '0 0 0.5rem 0' }}>สรุปผลพัฒนาการ 4 ด้านพื้นฐาน</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                            {['gm', 'fm', 'language', 'social'].map(field => (
                              <div key={field} style={{ padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px', textAlign: 'center', backgroundColor: '#fafafa' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--dark-light)', textTransform: 'uppercase' }}>{field}</div>
                                <div style={{ fontSize: '1rem', fontWeight: 700, color: viewingAssessment[field] === 'สมวัย' ? 'green' : 'red', marginTop: '0.25rem' }}>{viewingAssessment[field]}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {viewingAssessment.hasSensory !== false && (
                        <div>
                          <h4 style={{ fontWeight: 700, margin: '0 0 0.5rem 0' }}>สรุปผล Sensory Profile Test</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                            {Object.keys(viewingAssessment.sensoryScores || {}).filter(k => k !== 'total' && k !== 'score6YearsPlus').map(k => (
                              <div key={k} style={{ padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', backgroundColor: '#fafafa', fontSize: '0.85rem' }}>
                                <span style={{ color: 'var(--dark-light)' }}>{k}:</span>
                                <strong>{viewingAssessment.sensoryScores[k]} / 50</strong>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {viewingAssessment.hasSnap !== false && (
                        <div>
                          <h4 style={{ fontWeight: 700, margin: '0 0 0.5rem 0' }}>สรุปผลประเมินสมาธิสั้น SNAP-IV</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                            {['inattention', 'hyperactivity', 'oppositional'].map(k => (
                              <div key={k} style={{ padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px', textAlign: 'center', backgroundColor: '#fafafa' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--dark-light)' }}>{k}</div>
                                <div style={{ fontSize: '1rem', fontWeight: 700, marginTop: '0.25rem' }}>{viewingAssessment.snapIV?.[k]}</div>
                                <div style={{ fontSize: '0.75rem', color: viewingAssessment.snapIV?.[k + 'Status'] !== 'ปกติ' ? 'red' : 'green', fontWeight: 700 }}>
                                  {viewingAssessment.snapIV?.[k + 'Status']}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                // Render each selected template sequentially
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {itemTempIds.map(tempId => {
                      const temp = templates.find(t => t.id === tempId);
                      if (!temp) return null;
                      
                      const tScores = getTemplateScores(viewingAssessment, tempId);

                      if (temp.type === 'dynamic_checklist') {
                        const isDev4 = temp.name.includes('พัฒนาการ 4 ด้าน') || temp.id.includes('dev-4');
                        return (
                          <div key={temp.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem', backgroundColor: '#fcfcfc' }}>
                            <h4 style={{ fontWeight: 700, margin: '0 0 0.75rem 0', color: 'var(--secondary)' }}>แบบประเมิน Checklist: {temp.name}</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                              {temp.categories.map(cat => {
                                if (isDev4) {
                                  const catQs = temp.questions.filter(q => q.categoryId === cat.id);
                                  const firstQ = catQs[0];
                                  const ans = firstQ ? (viewingAssessment.details?.answers?.[firstQ.id] || '-') : '-';
                                  const isNormal = ans === 'สมวัย' || ans === 'ผ่าน' || ans === 'ปกติ' || ans === '✓ ปกติ';
                                  return (
                                    <div key={cat.id} style={{ padding: '0.65rem 0.85rem', border: '1px solid var(--border-light)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' }}>
                                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{cat.name}</span>
                                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isNormal ? 'green' : (ans === '-' || ans === '' ? 'inherit' : 'red') }}>{ans}</span>
                                    </div>
                                  );
                                }
                                const pct = tScores[cat.id] || 0;
                                return (
                                  <div key={cat.id} style={{ padding: '0.5rem', border: '1px solid var(--border-light)', borderRadius: '6px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600 }}>
                                      <span>{cat.name}</span>
                                      <span>{pct}%</span>
                                    </div>
                                    <div style={{ height: '6px', backgroundColor: '#eee', borderRadius: '3px', overflow: 'hidden', marginTop: '4px' }}>
                                      <div style={{ width: `${pct}%`, height: '100%', backgroundColor: pct >= 50 ? '#2ecc71' : '#e74c3c' }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }

                      if (temp.type === 'dynamic_scale') {
                        const radarLabels = {};
                        temp.categories.forEach(c => { radarLabels[c.id] = c.name.split(' (')[0]; });
                        const isRadar = temp.chartType === 'radar';
                        const maxScore = temp.id === 'temp-snap-iv' ? 3 : 15;

                        return (
                          <div key={temp.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem', backgroundColor: '#fcfcfc' }}>
                            <h4 style={{ fontWeight: 700, margin: '0 0 0.75rem 0', color: 'var(--secondary)' }}>แบบประเมิน Scale: {temp.name}</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: isRadar ? '1.2fr 0.8fr' : '1fr', gap: '20px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {temp.categories.map(cat => (
                                  <div key={cat.id} style={{ padding: '0.4rem 0.75rem', border: '1px solid var(--border-light)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', backgroundColor: 'var(--white)', fontSize: '0.85rem' }}>
                                    <span>{cat.name}</span>
                                    <strong>{tScores[cat.id] || 0}</strong>
                                  </div>
                                ))}
                              </div>
                              {isRadar && (
                                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', borderLeft: '1px solid var(--border-light)' }}>
                                  <RadarChart scores={tScores} max={maxScore} labels={radarLabels} />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      if (temp.type === 'score_interpretation') {
                        return (
                          <div key={temp.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem', backgroundColor: '#fcfcfc' }}>
                            <h4 style={{ fontWeight: 700, margin: '0 0 0.75rem 0', color: 'var(--secondary)' }}>แบบประเมินคะแนน: {temp.name}</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                              {temp.categories.map(cat => {
                                const catData = tScores[cat.id] || { score: '-', interpretation: '-' };
                                if (catData.score === '' || catData.score === '-') return null;
                                return (
                                  <div key={cat.id} style={{ padding: '0.5rem', border: '1px solid var(--border-light)', borderRadius: '6px', backgroundColor: 'var(--white)', fontSize: '0.85rem' }}>
                                    <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{cat.name}</div>
                                    <div>คะแนนรวม: <strong>{catData.score}</strong>{cat.maxScore !== undefined && cat.maxScore !== null && cat.maxScore !== '' && <span style={{ color: 'var(--dark-light)', fontSize: '0.8rem' }}> / {cat.maxScore}</span>}</div>
                                    <div style={{ marginTop: '2px' }}>
                                      แปลผล: {(() => {
                                        const isSnap = temp.id.toLowerCase().includes('snap') || temp.name.toLowerCase().includes('snap');
                                        const isNotNormal = isSnap && catData.interpretation !== 'ปกติ' && catData.interpretation !== '✓ ปกติ' && catData.interpretation !== '-';
                                        const style = isNotNormal ? { backgroundColor: '#fce8e6', color: '#c5221f', border: '1px solid #fad2cf' } : {};
                                        return (
                                          <span className="badge badge-secondary" style={{ fontSize: '0.75rem', ...style }}>
                                            {catData.interpretation}
                                          </span>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }

                      if (temp.type === 'custom_vmi') {
                        return (
                          <div key={temp.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem', backgroundColor: '#fcfcfc' }}>
                            <h4 style={{ fontWeight: 700, margin: '0 0 0.75rem 0', color: 'var(--secondary)' }}>ผลคะแนนวิเคราะห์ Beery VMI</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              <table className="hdh-table" style={{ backgroundColor: 'white', fontSize: '0.85rem', margin: 0 }}>
                                <thead>
                                  <tr>
                                    <th>ประเภทคะแนน</th>
                                    <th style={{ textAlign: 'center' }}>1. Visual-Motor Integration (VM score)</th>
                                    <th style={{ textAlign: 'center' }}>2. Visual Perception (VP score)</th>
                                    <th style={{ textAlign: 'center' }}>3. Motor Coordination (Motor score)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td><strong>คะแนนดิบ (Raw Score)</strong></td>
                                    <td style={{ textAlign: 'center' }}>{tScores.vmiRaw || 0}</td>
                                    <td style={{ textAlign: 'center' }}>{tScores.vpRaw || 0}</td>
                                    <td style={{ textAlign: 'center' }}>{tScores.mcRaw || 0}</td>
                                  </tr>
                                  <tr>
                                    <td><strong>คะแนนมาตรฐาน (Standard Score)</strong></td>
                                    <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--secondary)' }}>{tScores.vmiStd === 0 ? '-' : (tScores.vmiStd || 0)}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--secondary)' }}>{tScores.vpStd === 0 ? '-' : (tScores.vpStd || 0)}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--secondary)' }}>{tScores.mcStd === 0 ? '-' : (tScores.mcStd || 0)}</td>
                                  </tr>
                                  <tr>
                                    <td><strong>คะแนนสเกล (Scaled Score)</strong></td>
                                    <td style={{ textAlign: 'center' }}>{tScores.vmiScale !== undefined ? tScores.vmiScale : '-'}</td>
                                    <td style={{ textAlign: 'center' }}>{tScores.vpScale !== undefined ? tScores.vpScale : '-'}</td>
                                    <td style={{ textAlign: 'center' }}>{tScores.mcScale !== undefined ? tScores.mcScale : '-'}</td>
                                  </tr>
                                  <tr>
                                    <td><strong>Percentile (%)</strong></td>
                                    <td style={{ textAlign: 'center' }}>{tScores.vmiPct !== undefined && tScores.vmiPct !== '-' ? `${tScores.vmiPct}%` : '-'}</td>
                                    <td style={{ textAlign: 'center' }}>{tScores.vpPct !== undefined && tScores.vpPct !== '-' ? `${tScores.vpPct}%` : '-'}</td>
                                    <td style={{ textAlign: 'center' }}>{tScores.mcPct !== undefined && tScores.mcPct !== '-' ? `${tScores.mcPct}%` : '-'}</td>
                                  </tr>
                                  <tr>
                                    <td><strong>การแปลผล (Interpretation)</strong></td>
                                    <td style={{ textAlign: 'center' }}>
                                      <span className="badge badge-secondary" style={{ fontSize: '0.78rem', ...getVMIStyle(tScores.vmiInt || getVMIInterpretation(tScores.vmiStd || 0)) }}>
                                        {tScores.vmiInt || getVMIInterpretation(tScores.vmiStd || 0)}
                                      </span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                      <span className="badge badge-secondary" style={{ fontSize: '0.78rem', ...getVMIStyle(tScores.vpInt || getVMIInterpretation(tScores.vpStd || 0)) }}>
                                        {tScores.vpInt || getVMIInterpretation(tScores.vpStd || 0)}
                                      </span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                      <span className="badge badge-secondary" style={{ fontSize: '0.78rem', ...getVMIStyle(tScores.mcInt || getVMIInterpretation(tScores.mcStd || 0)) }}>
                                        {tScores.mcInt || getVMIInterpretation(tScores.mcStd || 0)}
                                      </span>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      }

                      if (temp.type === 'custom_denver') {
                        return (
                          <div key={temp.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem', backgroundColor: '#fcfcfc' }}>
                            <h4 style={{ fontWeight: 700, margin: '0 0 0.75rem 0', color: 'var(--secondary)' }}>ผลรวมจำนวนข้อประเมิน Denver II</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                              {Object.keys(tScores).map(secId => {
                                const counts = tScores[secId] || { P: 0, F: 0, R: 0, NO: 0 };
                                return (
                                  <div key={secId} style={{ padding: '0.5rem', border: '1px solid var(--border-light)', borderRadius: '6px', backgroundColor: 'var(--white)', fontSize: '0.75rem' }}>
                                    <div style={{ fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>{secId.split('-')[0]}</div>
                                    <div>ผ่าน (P): <strong>{counts.P}</strong></div>
                                    <div>ไม่ผ่าน (F): <strong style={{ color: 'red' }}>{counts.F}</strong></div>
                                    <div>ปฏิเสธ (R): <strong>{counts.R}</strong></div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>
                );
              })()}

              {/* Comment view */}
              <div>
                <h3 className="assessment-section-title">ความเห็นทางกิจกรรมบำบัด</h3>
                <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--light)', border: '1px solid var(--border)', minHeight: '60px', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                  {viewingAssessment.comment || 'ไม่มีความคิดเห็นเพิ่มเติม'}
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
              <button className="btn btn-light" onClick={() => setShowViewModal(false)}>ปิดหน้าต่าง</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}