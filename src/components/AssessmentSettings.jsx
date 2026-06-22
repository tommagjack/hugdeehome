import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  Upload, 
  Download,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  X,
  PlusCircle,
  Eye
} from 'lucide-react';
import Swal from 'sweetalert2';

const parseAgeToMonths = (ageVal) => {
  if (ageVal === undefined || ageVal === null || ageVal === '') return null;
  const valStr = String(ageVal).trim();
  if (valStr === '') return null;
  const parts = valStr.split('.');
  const years = parseInt(parts[0]) || 0;
  const months = parseInt(parts[1]) || 0;
  return (years * 12) + months;
};

export default function AssessmentSettings({ templates = [], setTemplates, therapists = [] }) {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // View Template Preview States
  const [viewingTemplate, setViewingTemplate] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  // Edit Template States
  const [editingOriginalId, setEditingOriginalId] = useState('');
  const [editId, setEditId] = useState('');
  const [editType, setEditType] = useState('');
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editQuestions, setEditQuestions] = useState([]);
  const [editCategories, setEditCategories] = useState([]);
  const [editScoringRules, setEditScoringRules] = useState({ rules: {} });

  // Create Template States
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newType, setNewType] = useState('dynamic_checklist');
  const [newCategories, setNewCategories] = useState([{ id: 'cat_1', name: 'หมวดหมู่ที่ 1' }]);
  const [newChecklistOptions, setNewChecklistOptions] = useState('ผ่าน,ไม่ผ่าน');
  const [editChecklistOptions, setEditChecklistOptions] = useState('ผ่าน,ไม่ผ่าน');
  
  // CSV Import State
  const [csvText, setCsvText] = useState('');
  const [csvFile, setCsvFile] = useState(null);
  const [vmiImportTableType, setVmiImportTableType] = useState('normTableVMI');

  // Toggle active/inactive status
  const toggleTemplateStatus = (id) => {
    const updated = templates.map(t => {
      if (t.id === id) {
        const nextStatus = t.status === 'Active' ? 'Inactive' : 'Active';
        return { ...t, status: nextStatus };
      }
      return t;
    });
    setTemplates(updated);
    localStorage.setItem('hdh_assessment_templates', JSON.stringify(updated));
    Swal.fire({
      icon: 'success',
      title: 'อัปเดตสถานะสำเร็จ',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 1500
    });
  };

  const handleEditClick = (template) => {
    setSelectedTemplate(template);
    setEditingOriginalId(template.id);
    setEditId(template.id);
    setEditType(template.type);
    setEditName(template.name);
    setEditDescription(template.description);
    setEditScoringRules(template.scoringRules || { rules: {} });
    setEditChecklistOptions(
      template.checklistOptions && Array.isArray(template.checklistOptions)
        ? template.checklistOptions.join(', ')
        : 'ผ่าน,ไม่ผ่าน'
    );
    
    // Map questions supporting age limits, target scores, and itemTypes
    const mappedQuestions = (template.questions || []).map(q => ({
      id: q.id,
      categoryId: q.categoryId || '',
      text: q.text || '',
      ageMin: q.ageMin !== undefined && q.ageMin !== null ? q.ageMin : '',
      ageMax: q.ageMax !== undefined && q.ageMax !== null ? q.ageMax : '',
      itemType: q.itemType || (template.type === 'dynamic_scale' ? 'scale' : 'checklist'),
      targetScore: q.targetScore !== undefined && q.targetScore !== null ? q.targetScore : ''
    }));

    setEditQuestions(mappedQuestions);
    setEditCategories(template.categories ? template.categories.map(c => ({ ...c })) : []);
    setShowEditModal(true);
  };

  const handleViewClick = (template) => {
    setViewingTemplate(template);
    setShowViewModal(true);
  };

  // Add a new question/item to the template
  const handleAddQuestion = () => {
    const newId = `q_custom_${Date.now()}`;
    const defaultCategory = editCategories.length > 0 ? editCategories[0].id : '';
    setEditQuestions([
      ...editQuestions,
      { 
        id: newId, 
        categoryId: defaultCategory, 
        text: 'หัวข้อประเมินใหม่',
        ageMin: '',
        ageMax: '',
        itemType: editType === 'dynamic_scale' ? 'scale' : 'checklist',
        targetScore: ''
      }
    ]);
  };

  const handleDeleteQuestion = (id) => {
    setEditQuestions(editQuestions.filter(q => q.id !== id));
  };

  const handleQuestionFieldChange = (id, field, value) => {
    setEditQuestions(editQuestions.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  // CSV Simple Parser
  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/);
    return lines.map(line => {
      let cells = [];
      let inQuote = false;
      let currentCell = '';
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuote = !inQuote;
        } else if (char === ',' && !inQuote) {
          cells.push(currentCell.trim());
          currentCell = '';
        } else {
          currentCell += char;
        }
      }
      cells.push(currentCell.trim());
      return cells.map(cell => cell.replace(/^"|"$/g, ''));
    }).filter(row => row.length > 0 && row.some(cell => cell !== ''));
  };

  // Handle CSV File Upload
  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvText(event.target.result);
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Process CSV upload
  const processImportedCsv = () => {
    if (!csvText) {
      Swal.fire('ข้อผิดพลาด', 'กรุณาเลือกไฟล์ CSV ก่อนกดยืนยันอัปโหลด', 'error');
      return;
    }

    try {
      const rows = parseCSV(csvText);
      if (rows.length < 2) {
        Swal.fire('ข้อผิดพลาด', 'ไฟล์ CSV ไม่มีข้อมูลเพียงพอ', 'error');
        return;
      }

      const headers = rows[0].map(h => h.toLowerCase().trim());
      if (editType === 'custom_vmi') {
        const getIndex = (keys) => {
          return headers.findIndex(h => keys.includes(h));
        };
        const ageMinIdx = getIndex(['ageminmonths', 'agemin', 'อายุ min', 'อายุ_min', 'อายุขั้นต่ำ']);
        const ageMaxIdx = getIndex(['agemaxmonths', 'agemax', 'อายุ max', 'อายุ_max', 'อายุสูงสุด']);
        const rawScoreIdx = getIndex(['rawscore', 'raw_score', 'คะแนนดิบ']);
        const stdScoreIdx = getIndex(['standardscore', 'standard_score', 'vmi_standard_score', 'vm_standard_score', 'motor_standard_score', 'std_score', 'standard_score', 'standard_score']);
        const percentileIdx = getIndex(['percentile', 'percentile_score', 'เปอร์เซ็นไทล์']);
        const scaledScoreIdx = getIndex(['scaledsscore', 'scaled_score', 'scaledscore', 'คะแนนสเกล']);

        let parsedData = [];

        if (vmiImportTableType === 'percentileTable') {
          if (stdScoreIdx === -1 || percentileIdx === -1 || scaledScoreIdx === -1) {
            Swal.fire('รูปแบบไฟล์ไม่ถูกต้อง', 'Percentile CSV ต้องมีคอลัมน์: คะแนนมาตรฐาน (Standard Score), Scaled Score (scaledSscore), Percentile', 'error');
            return;
          }
          parsedData = rows.slice(1).map(row => ({
            standardScore: parseInt(row[stdScoreIdx]) || 0,
            scaledSscore: parseInt(row[scaledScoreIdx]) || 0,
            percentile: parseFloat(row[percentileIdx]) || 0
          }));
        } 
        else if (vmiImportTableType === 'interpretationTable') {
          const minScoreIdx = getIndex(['minscore', 'min_score', 'คะแนนต่ำสุด']);
          const maxScoreIdx = getIndex(['maxscore', 'max_score', 'คะแนนสูงสุด']);
          const interpretationIdx = getIndex(['interpretation', 'label', 'การแปลผล', 'interpretation_label']);
          if (minScoreIdx === -1 || maxScoreIdx === -1 || interpretationIdx === -1) {
            Swal.fire('รูปแบบไฟล์ไม่ถูกต้อง', 'Interpretation CSV ต้องมีคอลัมน์: คะแนนต่ำสุด (Min), คะแนนสูงสุด (Max), การแปลผล (Interpretation)', 'error');
            return;
          }
          parsedData = rows.slice(1).map(row => ({
            minScore: parseInt(row[minScoreIdx]) || 0,
            maxScore: parseInt(row[maxScoreIdx]) || 0,
            interpretation: row[interpretationIdx] || ''
          }));
        }
        else {
          // Norm tables VMI, VP, MC
          if (ageMinIdx === -1 || ageMaxIdx === -1 || rawScoreIdx === -1 || stdScoreIdx === -1) {
            Swal.fire('รูปแบบไฟล์ไม่ถูกต้อง', 'Norm CSV ต้องมีคอลัมน์: อายุ Min, อายุ Max, คะแนนดิบ, คะแนนมาตรฐาน', 'error');
            return;
          }
          parsedData = rows.slice(1).map(row => ({
            ageMinMonths: String(row[ageMinIdx] || '').trim(),
            ageMaxMonths: String(row[ageMaxIdx] || '').trim(),
            rawScore: parseInt(row[rawScoreIdx]) || 0,
            standardScore: parseInt(row[stdScoreIdx]) || 0,
            percentile: percentileIdx !== -1 ? (parseFloat(row[percentileIdx]) || 0) : 0
          }));
        }

        const updated = {
          ...selectedTemplate,
          id: editId.trim(),
          type: editType,
          name: editName.trim(),
          description: editDescription.trim(),
          scoringRules: {
            ...(selectedTemplate.scoringRules || {}),
            [vmiImportTableType]: parsedData
          }
        };

        const finalTemplates = templates.map(t => t.id === editingOriginalId ? updated : t);
        setTemplates(finalTemplates);
        localStorage.setItem('hdh_assessment_templates', JSON.stringify(finalTemplates));
        setShowEditModal(false);
        Swal.fire('สำเร็จ', `อัปโหลดตารางเกณฑ์ Beery VMI (${vmiImportTableType}) สำเร็จ (${parsedData.length} แถว)`, 'success');
      } 
      else if (editType === 'custom_denver') {
        const hasRequired = ['id', 'sector', 'text', 'age25', 'age50', 'age75', 'age90'].every(col => headers.includes(col));
        if (!hasRequired) {
          Swal.fire('รูปแบบไฟล์ไม่ถูกต้อง', 'Denver II CSV ต้องมีคอลัมน์: id, sector, text, age25, age50, age75, age90', 'error');
          return;
        }

        const milestones = rows.slice(1).map(row => {
          return {
            id: row[headers.indexOf('id')] || `den_custom_${Date.now()}`,
            sector: row[headers.indexOf('sector')] || 'personal-social',
            text: row[headers.indexOf('text')] || '',
            age25: parseFloat(row[headers.indexOf('age25')]) || 0,
            age50: parseFloat(row[headers.indexOf('age50')]) || 0,
            age75: parseFloat(row[headers.indexOf('age75')]) || 0,
            age90: parseFloat(row[headers.indexOf('age90')]) || 0
          };
        });

        const updated = {
          ...selectedTemplate,
          id: editId.trim(),
          type: editType,
          name: editName.trim(),
          description: editDescription.trim(),
          scoringRules: {
            ...selectedTemplate.scoringRules,
            milestones: milestones
          }
        };

        const finalTemplates = templates.map(t => t.id === editingOriginalId ? updated : t);
        setTemplates(finalTemplates);
        localStorage.setItem('hdh_assessment_templates', JSON.stringify(finalTemplates));
        setShowEditModal(false);
        Swal.fire('สำเร็จ', `อัปโหลดเกณฑ์พัฒนาการ Denver II สำเร็จ (${milestones.length} ทักษะ)`, 'success');
      }
      else {
        // Questions import supporting id, categoryId, text, ageMin, ageMax, itemType, targetScore
        const hasRequired = ['id', 'categoryid', 'text'].every(col => headers.includes(col));
        if (!hasRequired) {
          Swal.fire('รูปแบบไฟล์ไม่ถูกต้อง', 'CSV สำหรับข้อคำถาม/ทักษะประเมิน ต้องมีคอลัมน์ขั้นต่ำ: id, categoryId, text', 'error');
          return;
        }

        const newQuestions = rows.slice(1).map(row => {
          const rawAgeMin = headers.includes('agemin') ? row[headers.indexOf('agemin')] : '';
          const rawAgeMax = headers.includes('agemax') ? row[headers.indexOf('agemax')] : '';
          const rawTargetScore = headers.includes('targetscore') ? row[headers.indexOf('targetscore')] : '';

          return {
            id: row[headers.indexOf('id')] || `q_import_${Date.now()}`,
            categoryId: row[headers.indexOf('categoryid')] || '',
            text: row[headers.indexOf('text')] || '',
            ageMin: rawAgeMin !== '' && !isNaN(rawAgeMin) ? Number(rawAgeMin) : '',
            ageMax: rawAgeMax !== '' && !isNaN(rawAgeMax) ? Number(rawAgeMax) : '',
            itemType: headers.includes('itemtype') ? (row[headers.indexOf('itemtype')] || 'checklist') : 'checklist',
            targetScore: rawTargetScore !== '' && !isNaN(rawTargetScore) ? Number(rawTargetScore) : ''
          };
        });

        setEditQuestions(newQuestions);
        Swal.fire('นำเข้าสำเร็จ', `โหลดหัวข้อประเมินจำนวน ${newQuestions.length} รายการจากไฟล์ CSV สำเร็จ (กรุณากดบันทึกเพื่อบันทึกลงระบบ)`, 'success');
      }

      setCsvFile(null);
      setCsvText('');
    } catch (error) {
      console.error(error);
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถอ่านข้อมูลในไฟล์ CSV ได้', 'error');
    }
  };

  const handleSaveTemplateSettings = (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      Swal.fire('ข้อผิดพลาด', 'กรุณาระบุชื่อแบบประเมิน', 'error');
      return;
    }
    if (!editId.trim()) {
      Swal.fire('ข้อผิดพลาด', 'กรุณาระบุรหัสแบบประเมิน', 'error');
      return;
    }

    // Check duplicate ID
    if (editId.trim() !== editingOriginalId && templates.some(t => t.id === editId.trim())) {
      Swal.fire('ข้อผิดพลาด', 'รหัสแบบประเมินซ้ำกับที่มีอยู่ในระบบ', 'error');
      return;
    }

    // Sanitize age constraints and target scores
    const sanitizedQuestions = editQuestions.map(q => ({
      ...q,
      ageMin: q.ageMin !== '' && q.ageMin !== null && !isNaN(q.ageMin) ? Number(q.ageMin) : null,
      ageMax: q.ageMax !== '' && q.ageMax !== null && !isNaN(q.ageMax) ? Number(q.ageMax) : null,
      targetScore: q.targetScore !== '' && q.targetScore !== null && !isNaN(q.targetScore) ? Number(q.targetScore) : null
    }));

    const updated = {
      ...selectedTemplate,
      id: editId.trim(),
      type: editType,
      name: editName.trim(),
      description: editDescription.trim(),
      questions: editType === 'score_interpretation' ? [] : sanitizedQuestions,
      categories: editCategories.map(c => ({ ...c, maxScore: c.maxScore !== undefined && c.maxScore !== '' && c.maxScore !== null ? Number(c.maxScore) : undefined })),
      scoringRules: editType === 'score_interpretation' ? editScoringRules : selectedTemplate.scoringRules,
      checklistOptions: editType === 'dynamic_checklist'
        ? editChecklistOptions.split(',').map(s => s.trim()).filter(Boolean)
        : undefined
    };

    const finalTemplates = templates.map(t => t.id === editingOriginalId ? updated : t);
    setTemplates(finalTemplates);
    localStorage.setItem('hdh_assessment_templates', JSON.stringify(finalTemplates));
    setShowEditModal(false);

    Swal.fire({
      icon: 'success',
      title: 'บันทึกการตั้งค่าเทมเพลตสำเร็จ',
      timer: 1500,
      showConfirmButton: false
    });
  };

  // DYNAMIC CSV EXPORT based on actual data
  const handleDownloadSample = () => {
    let csvContent = "";
    let fileName = "";
    
    if (editType === 'custom_vmi') {
      fileName = `${editId}_${vmiImportTableType}.csv`;
      const tableData = selectedTemplate?.scoringRules?.[vmiImportTableType] || [];
      
      if (vmiImportTableType === 'percentileTable') {
        if (tableData.length > 0) {
          csvContent = "standardScore,scaledSscore,percentile\n" + 
            tableData.map(r => `${r.standardScore},${r.scaledSscore || 0},${r.percentile}`).join("\n");
        } else {
          csvContent = "standardScore,scaledSscore,percentile\n100,10,50\n110,12,75\n120,15,91\n90,8,25";
        }
      }
      else if (vmiImportTableType === 'interpretationTable') {
        if (tableData.length > 0) {
          csvContent = "minScore,maxScore,interpretation\n" + 
            tableData.map(r => `${r.minScore},${r.maxScore},"${(r.interpretation || '').replace(/"/g, '""')}"`).join("\n");
        } else {
          csvContent = "minScore,maxScore,interpretation\n130,160,สูงมาก (Very High)\n120,129,สูง (High)\n110,119,สูงกว่าค่าเฉลี่ย (Above Average)\n90,109,อยู่ในระดับค่าเฉลี่ย (Average)\n80,89,ต่ำกว่าค่าเฉลี่ย (Below Average)\n71,79,ต่ำ (Low)\n0,70,ต่ำมาก (Very Low)";
        }
      }
      else {
        if (tableData.length > 0) {
          csvContent = "ageMinMonths,ageMaxMonths,rawScore,standardScore,percentile\n" + 
            tableData.map(r => `${r.ageMinMonths},${r.ageMaxMonths},${r.rawScore},${r.standardScore},${r.percentile || 0}`).join("\n");
        } else {
          csvContent = "ageMinMonths,ageMaxMonths,rawScore,standardScore,percentile\n2,2.2,15,100,50\n2,2.2,16,105,63\n2.4,2.7,17,110,75";
        }
      }
    } 
    else if (editType === 'custom_denver') {
      fileName = `${editId}_milestones.csv`;
      const milestones = selectedTemplate?.scoringRules?.milestones || [];
      
      if (milestones.length > 0) {
        csvContent = "id,sector,text,age25,age50,age75,age90\n" + 
          milestones.map(m => `"${m.id}","${m.sector}","${m.text.replace(/"/g, '""')}",${m.age25},${m.age50},${m.age75},${m.age90}`).join("\n");
      } else {
        csvContent = "id,sector,text,age25,age50,age75,age90\nd_s1,personal-social,จ้องหน้าสบตา,0.5,1.0,1.5,2.0\nd_s2,personal-social,ยิ้มตอบรับ,1.0,1.5,2.0,2.5";
      }
    } 
    else {
      // Checklist / Scale Export from actual questions state
      fileName = `${editId}_questions.csv`;
      const questionsToExport = editQuestions.length > 0 ? editQuestions : (selectedTemplate?.questions || []);
      
      if (questionsToExport.length > 0) {
        csvContent = "id,categoryId,text,ageMin,ageMax,itemType,targetScore\n" + 
          questionsToExport.map(q => 
            `"${q.id}","${q.categoryId}","${(q.text || '').replace(/"/g, '""')}",${q.ageMin !== undefined && q.ageMin !== null ? q.ageMin : ''},${q.ageMax !== undefined && q.ageMax !== null ? q.ageMax : ''},"${q.itemType || 'checklist'}",${q.targetScore !== undefined && q.targetScore !== null ? q.targetScore : ''}`
          ).join("\n");
      } else {
        csvContent = "id,categoryId,text,ageMin,ageMax,itemType,targetScore\nq_item_1,cat_1,หัวข้อทดสอบการมองเห็นวัตถุเคลื่อนไหว,12,36,checklist,\nq_item_2,cat_1,ทักษะการตอบสนองต่อการกระตุ้น,24,,scale,4";
      }
    }

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Creating a new custom template
  const handleOpenCreateModal = () => {
    setNewName('');
    setNewDescription('');
    setNewType('dynamic_checklist');
    setNewCategories([{ id: 'cat_1', name: 'หมวดหมู่ที่ 1', maxScore: '' }]);
    setNewChecklistOptions('ผ่าน,ไม่ผ่าน');
    setShowCreateModal(true);
  };

  const handleAddCategoryField = () => {
    const nextIdx = newCategories.length + 1;
    setNewCategories([...newCategories, { id: `cat_${nextIdx}`, name: `หมวดหมู่ที่ ${nextIdx}`, maxScore: '' }]);
  };

  const handleRemoveCategoryField = (idx) => {
    if (newCategories.length === 1) return;
    setNewCategories(newCategories.filter((_, i) => i !== idx));
  };

  const handleCategoryFieldChange = (idx, field, value) => {
    setNewCategories(newCategories.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const handleCreateTemplate = (e) => {
    e.preventDefault();
    if (!newName.trim()) {
      Swal.fire('ข้อผิดพลาด', 'กรุณาระบุชื่อแบบฟอร์มประเมิน', 'error');
      return;
    }

    const newTemplateId = `temp_custom_${Date.now()}`;
    const newTemplate = {
      id: newTemplateId,
      name: newName.trim(),
      description: newDescription.trim(),
      type: newType,
      status: 'Active',
      isSystem: false,
      categories: newCategories.map(c => ({ id: c.id.trim(), name: c.name.trim(), maxScore: c.maxScore !== undefined && c.maxScore !== '' ? Number(c.maxScore) : undefined })),
      questions: [],
      chartType: newType === 'dynamic_scale' ? 'radar' : undefined,
      checklistOptions: newType === 'dynamic_checklist'
        ? newChecklistOptions.split(',').map(s => s.trim()).filter(Boolean)
        : undefined
    };

    const updatedTemplates = [...templates, newTemplate];
    setTemplates(updatedTemplates);
    localStorage.setItem('hdh_assessment_templates', JSON.stringify(updatedTemplates));
    setShowCreateModal(false);

    Swal.fire('สำเร็จ', 'สร้างแม่แบบแบบประเมินใหม่เรียบร้อยแล้ว', 'success');
  };

  const handleDeleteTemplate = (id) => {
    Swal.fire({
      title: 'ยืนยันการลบแม่แบบ?',
      text: 'การลบแม่แบบเดิม/แม่แบบระบบอาจส่งผลให้ไม่สามารถดูข้อมูลประวัติประเมินเก่าที่อ้างอิงแม่แบบนี้ได้ คุณแน่ใจหรือไม่?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--danger)',
      cancelButtonColor: 'var(--dark-light)',
      confirmButtonText: 'ยืนยันลบ',
      cancelButtonText: 'ยกเลิก'
    }).then((result) => {
      if (result.isConfirmed) {
        const updated = templates.filter(t => t.id !== id);
        setTemplates(updated);
        localStorage.setItem('hdh_assessment_templates', JSON.stringify(updated));
        Swal.fire('ลบแม่แบบสำเร็จ', 'แม่แบบถูกลบออกแล้ว', 'success');
      }
    });
  };

  return (
    <div className="card shadow-sm animate-fade-in" style={{ padding: '1.5rem', backgroundColor: 'var(--white)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--dark)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <SettingsIcon size={24} style={{ color: 'var(--secondary)' }} />
            ตั้งค่าแม่แบบแบบประเมินพัฒนาการ
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--dark-light)' }}>
            จัดการแม่แบบข้อประเมิน เกณฑ์คะแนนเปรียบเทียบ และสถานะเปิดใช้งานฟอร์มตรวจประเมินพัฒนาการของคลินิก
          </p>
        </div>

        <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} onClick={handleOpenCreateModal}>
          <Plus size={16} /> สร้างแบบประเมินใหม่
        </button>
      </div>

      {/* Grid List of Templates */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {templates.map(t => {
          const isActive = t.status === 'Active';
          
          return (
            <div key={t.id} className="card-sub" style={{ 
              border: isActive ? '1px solid #c8e6c9' : '1px solid var(--border)',
              borderRadius: '12px',
              padding: '1.25rem',
              backgroundColor: isActive ? '#f8fdf8' : 'var(--white)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              transition: 'all 0.2s ease-in-out'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span className={`badge ${isActive ? 'badge-success' : 'badge-secondary'}`} style={{ fontSize: '0.7rem' }}>
                    {isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--secondary)', fontFamily: 'monospace' }}>
                    {t.type}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--dark)', margin: '0 0 0.5rem 0' }}>{t.name}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--dark-light)', margin: '0 0 1.25rem 0', lineHeight: '1.5' }}>
                  {t.description || 'ไม่มีรายละเอียดคำอธิบายแบบประเมิน'}
                </p>
              </div>

              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {/* Toggle Switch */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button 
                    onClick={() => toggleTemplateStatus(t.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.8rem',
                      color: isActive ? '#2e7d32' : 'var(--dark-light)',
                      fontWeight: 600
                    }}
                    title={isActive ? "คลิกเพื่อปิดใช้งานฟอร์มนี้" : "คลิกเพื่อเปิดใช้งานฟอร์มนี้"}
                  >
                    {isActive ? <ToggleRight size={26} color="#4caf50" /> : <ToggleLeft size={26} color="#9e9e9e" />}
                    {isActive ? 'เปิดใช้งานอยู่' : 'ปิดใช้งานอยู่'}
                  </button>
                </div>

                {/* Actions row */}
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', width: '100%', marginTop: '0.25rem' }}>
                  <button 
                    className="btn btn-light" 
                    style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}
                    onClick={() => handleViewClick(t)}
                  >
                    <Eye size={12} /> ดูแบบฟอร์ม
                  </button>
                  <button 
                    className="btn btn-light" 
                    style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}
                    onClick={() => handleEditClick(t)}
                  >
                    <Edit3 size={12} /> ตั้งค่า
                  </button>
                  <button 
                    className="btn btn-light" 
                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem', color: 'var(--danger)' }}
                    onClick={() => handleDeleteTemplate(t.id)}
                    title="ลบแบบประเมินนี้"
                  >
                    <Trash2 size={12} /> ลบ
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE NEW TEMPLATE MODAL */}
      {showCreateModal && (
        <div className="modal-overlay" style={{ zIndex: 1050 }}>
          <div className="card-3xl" style={{ maxWidth: '600px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--dark)', margin: 0 }}>
                สร้างแบบประเมินและแบบฟอร์มใหม่
              </h2>
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#9e9e9e' }}
              >&times;</button>
            </div>

            <form onSubmit={handleCreateTemplate}>
              <div className="modal-body" style={{ padding: '1.25rem 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>ชื่อแบบประเมิน <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="เช่น แบบประเมินทักษะการเรียนรู้, แบบวัดสมาธิ"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>ประเภทแบบฟอร์ม</label>
                  <select 
                    className="form-control" 
                    value={newType} 
                    onChange={(e) => setNewType(e.target.value)}
                  >
                    <option value="dynamic_checklist">Checklist (เลือกกำหนดตัวเลือกเองได้)</option>
                    <option value="dynamic_scale">Likert Scale (คะแนนเป็นตัวเลข เช่น 1-5)</option>
                    <option value="score_interpretation">เกณฑ์ช่วงคะแนน (ประเมินด้วยคะแนนรวมรายหัวข้อ)</option>
                    <option value="custom_vmi">Beery VMI (เฉพาะทาง)</option>
                    <option value="custom_denver">Denver II (เฉพาะทาง)</option>
                  </select>
                </div>

                {newType === 'dynamic_checklist' && (
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>ตัวเลือกของ Checklist <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={newChecklistOptions}
                      onChange={(e) => setNewChecklistOptions(e.target.value)}
                      placeholder="ใส่ตัวเลือก คั่นด้วยจุลภาค เช่น ผ่าน, ไม่ผ่าน"
                      required
                    />
                    <small className="form-text text-muted" style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.75rem', color: '#757575' }}>
                      * ใส่ตัวเลือกคั่นด้วยเครื่องหมายจุลภาค (,) ตัวเลือกแรกจะถูกพิจารณาเป็นคะแนน "ผ่าน"
                    </small>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>คำอธิบาย</label>
                  <textarea 
                    className="form-control" 
                    rows="2"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="รายละเอียดเบื้องต้นของแบบฟอร์มประเมินนี้"
                  />
                </div>

                {/* Categories Input Area */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label className="form-label" style={{ fontWeight: 600, margin: 0 }}>หมวดหมู่ภายในแบบประเมิน (อย่างน้อย 1 หมวด)</label>
                    <button 
                      type="button" 
                      className="btn btn-light" 
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.15rem' }}
                      onClick={handleAddCategoryField}
                    >
                      <PlusCircle size={12} /> เพิ่มหมวด
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {newCategories.map((c, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input 
                          type="text" 
                          className="form-control" 
                          style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
                          placeholder="รหัสหมวด (เช่น gm, self_care)"
                          value={c.id}
                          onChange={(e) => handleCategoryFieldChange(idx, 'id', e.target.value)}
                          required
                        />
                        <input 
                          type="text" 
                          className="form-control" 
                          style={{ flex: 2, padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
                          placeholder="ชื่อหมวดหมู่แสดงผลภาษาไทย"
                          value={c.name}
                          onChange={(e) => handleCategoryFieldChange(idx, 'name', e.target.value)}
                          required
                        />
                        <input 
                          type="number" 
                          className="form-control" 
                          style={{ width: '100px', padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
                          placeholder="คะแนนเต็ม"
                          value={c.maxScore !== undefined ? c.maxScore : ''}
                          onChange={(e) => handleCategoryFieldChange(idx, 'maxScore', e.target.value === '' ? '' : Number(e.target.value))}
                        />
                        <button 
                          type="button" 
                          className="btn btn-light btn-icon-only" 
                          style={{ padding: '0.35rem', color: 'var(--danger)' }}
                          onClick={() => handleRemoveCategoryField(idx)}
                          disabled={newCategories.length === 1}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-light" onClick={() => setShowCreateModal(false)}>ยกเลิก</button>
                <button type="submit" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Save size={14} /> สร้างแบบประเมิน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW PREVIEW MODAL */}
      {showViewModal && viewingTemplate && (
        <div className="modal-overlay" style={{ zIndex: 1050 }}>
          <div className="card-3xl" style={{ maxWidth: '750px', width: '95%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--secondary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Eye size={20} /> พรีวิวข้อสอบและหัวข้อประเมิน: {viewingTemplate.name}
              </h2>
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setShowViewModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#9e9e9e' }}
              >&times;</button>
            </div>

            <div className="modal-body" style={{ padding: '1.25rem 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <strong>รหัสแบบประเมิน (ID):</strong> <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{viewingTemplate.id}</span>
              </div>
              <div>
                <strong>ประเภทแบบฟอร์ม (Type):</strong> <span className="badge badge-secondary" style={{ fontSize: '0.75rem', marginLeft: '5px' }}>{viewingTemplate.type}</span>
              </div>
              <div>
                <strong>รายละเอียด:</strong> {viewingTemplate.description || 'ไม่มีคำอธิบาย'}
              </div>

              {/* Preview items for Checklists and Scales */}
              {!viewingTemplate.type.startsWith('custom_') && (
                <div style={{ marginTop: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>โครงสร้างข้อประเมินแยกตามหมวดหมู่</h4>
                  
                  {viewingTemplate.categories.map(cat => {
                    const catQs = viewingTemplate.questions?.filter(q => q.categoryId === cat.id) || [];
                    return (
                      <div key={cat.id} style={{ backgroundColor: '#fcfcfc', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '1rem', marginBottom: '0.75rem' }}>
                        <h5 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--dark)', margin: '0 0 0.5rem 0' }}>{cat.name} ({cat.id})</h5>
                        {catQs.length === 0 ? (
                          <div style={{ fontSize: '0.8rem', color: 'var(--dark-light)', fontStyle: 'italic' }}>ยังไม่มีข้อคำถามในหมวดหมู่นี้</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {catQs.map((q, qidx) => (
                              <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', borderBottom: '1px dashed #eee', paddingBottom: '4px' }}>
                                <span>{qidx + 1}. {q.text}</span>
                                <div style={{ fontSize: '0.75rem', color: 'var(--dark-light)', display: 'flex', gap: '10px' }}>
                                  {(q.ageMin || q.ageMax) && (
                                    <span style={{ color: '#d35400' }}>
                                      ช่วงอายุ: {q.ageMin || '0'}-{q.ageMax || '∞'} ด.
                                    </span>
                                  )}
                                  <span>ประเภท: {q.itemType || 'checklist'}</span>
                                  {q.targetScore && <span style={{ fontWeight: 600 }}>เกณฑ์: {q.targetScore}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Preview table for VMI Norm table */}
              {viewingTemplate.type === 'custom_vmi' && (
                <div style={{ marginTop: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem' }}>ตารางเกณฑ์คะแนนมาตรฐาน Beery VMI (Norm Table)</h4>
                  <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <table className="hdh-table" style={{ margin: 0, fontSize: '0.8rem' }}>
                      <thead>
                        <tr>
                          <th>ช่วงอายุขั้นต่ำ (เดือน)</th>
                          <th>ช่วงอายุสูงสุด (เดือน)</th>
                          <th>คะแนนดิบ</th>
                          <th>คะแนนมาตรฐาน</th>
                          <th>Percentile</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(viewingTemplate.scoringRules?.normTable || []).slice(0, 50).map((row, idx) => (
                          <tr key={idx}>
                            <td>{row.ageMinMonths} ม.</td>
                            <td>{row.ageMaxMonths} ม.</td>
                            <td>{row.rawScore}</td>
                            <td style={{ fontWeight: 600, color: 'var(--secondary)' }}>{row.standardScore}</td>
                            <td>{row.percentile}%</td>
                          </tr>
                        ))}
                        {(viewingTemplate.scoringRules?.normTable || []).length > 50 && (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', color: 'var(--dark-light)', fontStyle: 'italic' }}>
                              ... และข้อมูลตารางเกณฑ์อีก {(viewingTemplate.scoringRules?.normTable || []).length - 50} แถว ...
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Preview table for Denver II Milestones */}
              {viewingTemplate.type === 'custom_denver' && (
                <div style={{ marginTop: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem' }}>รายการทักษะพัฒนาการ Denver II Milestones</h4>
                  <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <table className="hdh-table" style={{ margin: 0, fontSize: '0.8rem' }}>
                      <thead>
                        <tr>
                          <th>หมวดทักษะ (Sector)</th>
                          <th>หัวข้อทดสอบ</th>
                          <th>ผ่าน 25%</th>
                          <th>ผ่าน 50%</th>
                          <th>ผ่าน 75%</th>
                          <th>ผ่าน 90%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(viewingTemplate.scoringRules?.milestones || []).slice(0, 50).map((row, idx) => (
                          <tr key={idx}>
                            <td style={{ textTransform: 'uppercase', fontWeight: 600 }}>{row.sector}</td>
                            <td>{row.text}</td>
                            <td>{row.age25} ด.</td>
                            <td style={{ fontWeight: 600, color: 'var(--secondary)' }}>{row.age50} ด.</td>
                            <td>{row.age75} ด.</td>
                            <td style={{ fontWeight: 600, color: 'var(--danger)' }}>{row.age90} ด.</td>
                          </tr>
                        ))}
                        {(viewingTemplate.scoringRules?.milestones || []).length > 50 && (
                          <tr>
                            <td colSpan="6" style={{ textAlign: 'center', color: 'var(--dark-light)', fontStyle: 'italic' }}>
                              ... และรายการทักษะอีก {(viewingTemplate.scoringRules?.milestones || []).length - 50} รายการ ...
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <button type="button" className="btn btn-light" onClick={() => setShowViewModal(false)}>ปิดหน้าต่าง</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && selectedTemplate && (
        <div className="modal-overlay" style={{ zIndex: 1050 }}>
          <div className="card-3xl" style={{ maxWidth: '900px', width: '97%', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--dark)', margin: 0 }}>
                ตั้งค่าแม่แบบ: {selectedTemplate.name}
              </h2>
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setShowEditModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#9e9e9e' }}
              >&times;</button>
            </div>

            <form onSubmit={handleSaveTemplateSettings}>
              <div className="modal-body" style={{ padding: '1.25rem 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>ชื่อแบบประเมิน <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>รหัสแบบประเมิน (ID) <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={editId}
                      onChange={(e) => setEditId(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>ประเภทแบบฟอร์ม <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select 
                    className="form-control" 
                    value={editType} 
                    onChange={(e) => setEditType(e.target.value)}
                    required
                  >
                    <option value="dynamic_checklist">Checklist (ผ่าน / ไม่ผ่าน)</option>
                    <option value="dynamic_scale">Likert Scale (คะแนนเป็นตัวเลข เช่น 1-5)</option>
                    <option value="score_interpretation">เกณฑ์ช่วงคะแนน (ประเมินด้วยคะแนนรวมรายหัวข้อ)</option>
                    <option value="custom_vmi">Beery VMI (เฉพาะทาง)</option>
                    <option value="custom_denver">Denver II (เฉพาะทาง)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>คำอธิบายเกี่ยวกับฟอร์มนี้</label>
                  <textarea 
                    className="form-control" 
                    rows="2"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                </div>

                {editType === 'dynamic_checklist' && (
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>ตัวเลือกของ Checklist <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={editChecklistOptions}
                      onChange={(e) => setEditChecklistOptions(e.target.value)}
                      placeholder="ใส่ตัวเลือก คั่นด้วยจุลภาค เช่น ผ่าน, ไม่ผ่าน"
                      required
                    />
                    <small className="form-text text-muted" style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.75rem', color: '#757575' }}>
                      * ใส่ตัวเลือกคั่นด้วยเครื่องหมายจุลภาค (,) ตัวเลือกแรกจะถูกพิจารณาเป็นคะแนน "ผ่าน"
                    </small>
                  </div>
                )}

                {/* CSV File Upload Section */}
                <div style={{ 
                  backgroundColor: '#f5f7fa', 
                  borderRadius: '10px', 
                  padding: '1.25rem', 
                  border: '1px dashed #bdc3c7',
                  marginTop: '0.5rem'
                }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Upload size={16} color="var(--secondary)" />
                    อัปโหลด / อิมพอร์ตข้อมูลแม่แบบด้วยไฟล์ CSV
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--dark-light)', margin: '0 0 0.75rem 0', lineHeight: '1.5' }}>
                    อัปเดตเกณฑ์มาตรฐาน ข้อคำถาม ทักษะเป้าหมาย หรือตารางเทียบคะแนน ได้อย่างง่ายดายผ่านไฟล์สเปรดชีต (เช่น Excel) แล้วนำมาอัปโหลดเป็นไฟล์ CSV (.csv)
                  </p>
                  
                  {editType === 'custom_vmi' && (
                    <div className="form-group" style={{ marginBottom: '10px', maxWidth: '350px' }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>เลือกส่วนของตาราง Beery VMI ที่ต้องการอิมพอร์ต:</label>
                      <select 
                        className="form-control" 
                        value={vmiImportTableType} 
                        onChange={(e) => setVmiImportTableType(e.target.value)}
                        style={{ fontSize: '0.82rem', padding: '0.35rem' }}
                      >
                        <option value="normTableVMI">1. VMI Norm Table (ตารางคะแนนมาตรฐาน Visual-Motor Integration)</option>
                        <option value="normTableVP">2. VP Norm Table (ตารางคะแนนมาตรฐาน Visual Perception)</option>
                        <option value="normTableMC">3. MC Norm Table (ตารางคะแนนมาตรฐาน Motor Coordination)</option>
                        <option value="percentileTable">4. Percentile Lookup Table (ตารางเทียบคะแนนมาตรฐาน -&gt; %)</option>
                        <option value="interpretationTable">5. Interpretation Lookup Table (ตารางเกณฑ์แปลผลความสามารถ)</option>
                      </select>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                    <input 
                      type="file" 
                      accept=".csv"
                      onChange={handleCsvUpload}
                      style={{ fontSize: '0.82rem' }}
                    />
                    
                    {csvFile && (
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                        onClick={processImportedCsv}
                      >
                        ยืนยันการอัปโหลดไฟล์
                      </button>
                    )}
                    
                    <button 
                      type="button" 
                      className="btn btn-light" 
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginLeft: 'auto' }}
                      onClick={handleDownloadSample}
                    >
                      <Download size={12} /> ดาวน์โหลดแม่แบบ / ไฟล์ปัจจุบัน (.csv)
                    </button>
                  </div>
                </div>

                {/* Questions/Items Editor */}
                {!editType.startsWith('custom_') && editType !== 'score_interpretation' && (
                  <div style={{ marginTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>รายการทักษะและหัวข้อประเมิน ({editQuestions.length} รายการ)</h4>
                      <button 
                        type="button" 
                        className="btn btn-primary" 
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        onClick={handleAddQuestion}
                      >
                        <Plus size={12} /> เพิ่มหัวข้อประเมิน
                      </button>
                    </div>

                    <div style={{ 
                      maxHeight: '320px', 
                      overflowY: 'auto', 
                      border: '1px solid var(--border)', 
                      borderRadius: '8px', 
                      padding: '0.5rem',
                      backgroundColor: '#fafafa'
                    }}>
                      {editQuestions.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--dark-light)', fontSize: '0.85rem' }}>
                          ไม่มีรายการหัวข้อตรวจในแบบประเมินนี้ กรุณากดปุ่มเพิ่มหัวข้อตรวจประเมินหรืออัปโหลดผ่านไฟล์ CSV
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {editQuestions.map((q, idx) => (
                            <div key={q.id} style={{ 
                              display: 'grid', 
                              gridTemplateColumns: '30px 1.5fr 1fr 140px 110px 100px 40px', 
                              gap: '8px', 
                              alignItems: 'center', 
                              backgroundColor: 'var(--white)', 
                              padding: '0.5rem', 
                              borderRadius: '8px', 
                              border: '1px solid var(--border-light)' 
                            }}>
                              {/* 1. Index */}
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--dark-light)', textAlign: 'center' }}>
                                {idx + 1}
                              </span>
                              
                              {/* 2. Topic text */}
                              <input 
                                type="text"
                                className="form-control"
                                style={{ padding: '0.35rem 0.5rem', fontSize: '0.82rem' }}
                                value={q.text}
                                onChange={(e) => handleQuestionFieldChange(q.id, 'text', e.target.value)}
                                placeholder="หัวข้อ / ทักษะที่ตรวจประเมิน"
                                required
                              />

                              {/* 3. Category Select */}
                              {editCategories.length > 0 ? (
                                <select
                                  className="form-control"
                                  style={{ padding: '0.35rem 0.5rem', fontSize: '0.82rem' }}
                                  value={q.categoryId}
                                  onChange={(e) => handleQuestionFieldChange(q.id, 'categoryId', e.target.value)}
                                >
                                  {editCategories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                  ))}
                                </select>
                              ) : <span />}

                              {/* 4. Age Constraints (Min-Max Months) */}
                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                <input 
                                  type="number"
                                  className="form-control"
                                  style={{ padding: '0.35rem', fontSize: '0.78rem', textAlign: 'center' }}
                                  placeholder="อายุต่ำสุด (ด.)"
                                  value={q.ageMin}
                                  onChange={(e) => handleQuestionFieldChange(q.id, 'ageMin', e.target.value)}
                                  min="0"
                                />
                                <span style={{ fontSize: '0.75rem' }}>-</span>
                                <input 
                                  type="number"
                                  className="form-control"
                                  style={{ padding: '0.35rem', fontSize: '0.78rem', textAlign: 'center' }}
                                  placeholder="อายุสูงสุด (ด.)"
                                  value={q.ageMax}
                                  onChange={(e) => handleQuestionFieldChange(q.id, 'ageMax', e.target.value)}
                                  min="0"
                                />
                              </div>

                              {/* 5. Input Type selector */}
                              <select
                                className="form-control"
                                style={{ padding: '0.35rem 0.5rem', fontSize: '0.78rem' }}
                                value={q.itemType}
                                onChange={(e) => handleQuestionFieldChange(q.id, 'itemType', e.target.value)}
                              >
                                <option value="checklist">Checklist (ผ่าน)</option>
                                <option value="scale">Likert Scale</option>
                                <option value="score_input">กรอกคะแนนดิบ</option>
                              </select>

                              {/* 6. Target Criterion / Score */}
                              <input 
                                type="number"
                                className="form-control"
                                style={{ padding: '0.35rem', fontSize: '0.78rem', textAlign: 'center' }}
                                placeholder="เกณฑ์คะแนน"
                                value={q.targetScore}
                                onChange={(e) => handleQuestionFieldChange(q.id, 'targetScore', e.target.value)}
                                min="0"
                              />

                              {/* 7. Action */}
                              <button 
                                type="button"
                                className="btn btn-light btn-icon-only"
                                style={{ padding: '0.35rem', color: 'var(--danger)', justifySelf: 'center' }}
                                onClick={() => handleDeleteQuestion(q.id)}
                                title="ลบหัวข้อนี้"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {editType === 'score_interpretation' && (
                  <div style={{ marginTop: '1rem' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--secondary)', marginBottom: '0.75rem' }}>
                      ตั้งค่าเกณฑ์การแปลผลตามช่วงคะแนนรายหัวข้อ
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--dark-light)', margin: '0 0 1rem 0' }}>
                      กำหนดเกณฑ์สำหรับแปลผลคะแนนรวมในแต่ละด้าน เช่น หากคะแนนรวมของด้าน GM &gt;= 16 ให้แปลผลเป็น "ปกติ"
                    </p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      {editCategories.map(cat => {
                        const catRules = editScoringRules.rules?.[cat.id] || [];
                        
                        return (
                          <div key={cat.id} style={{ 
                            backgroundColor: '#fafbfd', 
                            border: '1px solid var(--border)', 
                            borderRadius: '10px', 
                            padding: '1rem' 
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <strong style={{ fontSize: '0.9rem', color: 'var(--dark)' }}>ด้าน: {cat.name} ({cat.id})</strong>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '0.8rem', color: 'var(--dark-light)' }}>คะแนนเต็ม:</span>
                                  <input 
                                    type="number" 
                                    className="form-control" 
                                    style={{ width: '80px', padding: '0.2rem 0.4rem', fontSize: '0.8rem', height: '28px', textAlign: 'center' }}
                                    value={cat.maxScore !== undefined && cat.maxScore !== null ? cat.maxScore : ''}
                                    onChange={(e) => {
                                      const val = e.target.value === '' ? '' : Number(e.target.value);
                                      setEditCategories(editCategories.map(c => c.id === cat.id ? { ...c, maxScore: val } : c));
                                    }}
                                    placeholder="ไม่ระบุ"
                                  />
                                </div>
                              </div>
                              <button
                                type="button"
                                className="btn btn-light"
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.15rem' }}
                                onClick={() => {
                                  const newRule = { operator: '>=', value: 0, interpretation: 'ปกติ', ageMin: '', ageMax: '' };
                                  const updatedRules = {
                                    ...editScoringRules,
                                    rules: {
                                      ...(editScoringRules.rules || {}),
                                      [cat.id]: [...catRules, newRule]
                                    }
                                  };
                                  setEditScoringRules(updatedRules);
                                }}
                              >
                                <Plus size={12} /> เพิ่มเกณฑ์คะแนน
                              </button>
                            </div>
                            
                            {catRules.length === 0 ? (
                              <div style={{ fontSize: '0.8rem', color: 'var(--dark-light)', fontStyle: 'italic', padding: '0.5rem 0' }}>
                                ยังไม่มีการตั้งเกณฑ์คะแนนสำหรับด้านนี้ (ระบบจะไม่แปลผลอัตโนมัติ)
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {catRules.map((rule, ruleIdx) => (
                                  <div key={ruleIdx} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--dark-light)' }}>ถ้าคะแนนรวม</span>
                                    
                                    <select
                                      className="form-control"
                                      style={{ width: '90px', padding: '0.35rem', fontSize: '0.82rem', height: '32px' }}
                                      value={rule.operator}
                                      onChange={(e) => {
                                        const updatedCatRules = catRules.map((r, i) => i === ruleIdx ? { ...r, operator: e.target.value } : r);
                                        setEditScoringRules({
                                          ...editScoringRules,
                                          rules: {
                                            ...(editScoringRules.rules || {}),
                                            [cat.id]: updatedCatRules
                                          }
                                        });
                                      }}
                                    >
                                      <option value=">">&gt;</option>
                                      <option value=">=">&gt;=</option>
                                      <option value="<">&lt;</option>
                                      <option value="<=">&lt;=</option>
                                      <option value="==">==</option>
                                    </select>
                                    
                                    <input
                                      type="number"
                                      className="form-control"
                                      style={{ width: '90px', padding: '0.35rem', fontSize: '0.82rem', height: '32px', textAlign: 'center' }}
                                      value={rule.value}
                                      onChange={(e) => {
                                        const updatedCatRules = catRules.map((r, i) => i === ruleIdx ? { ...r, value: Number(e.target.value) } : r);
                                        setEditScoringRules({
                                          ...editScoringRules,
                                          rules: {
                                            ...(editScoringRules.rules || {}),
                                            [cat.id]: updatedCatRules
                                          }
                                        });
                                      }}
                                      placeholder="คะแนน"
                                      required
                                    />
                                    
                                    <span style={{ fontSize: '0.8rem', color: 'var(--dark-light)' }}>และอายุ</span>
                                    
                                    <input
                                      type="text"
                                      className="form-control"
                                      style={{ width: '75px', padding: '0.35rem', fontSize: '0.82rem', height: '32px', textAlign: 'center' }}
                                      value={rule.ageMin || ''}
                                      onChange={(e) => {
                                        const updatedCatRules = catRules.map((r, i) => i === ruleIdx ? { ...r, ageMin: e.target.value } : r);
                                        setEditScoringRules({
                                          ...editScoringRules,
                                          rules: {
                                            ...(editScoringRules.rules || {}),
                                            [cat.id]: updatedCatRules
                                          }
                                        });
                                      }}
                                      placeholder="ปี.เดือน"
                                    />
                                    
                                    <span style={{ fontSize: '0.8rem', color: 'var(--dark-light)' }}>ถึง</span>
                                    
                                    <input
                                      type="text"
                                      className="form-control"
                                      style={{ width: '75px', padding: '0.35rem', fontSize: '0.82rem', height: '32px', textAlign: 'center' }}
                                      value={rule.ageMax || ''}
                                      onChange={(e) => {
                                        const updatedCatRules = catRules.map((r, i) => i === ruleIdx ? { ...r, ageMax: e.target.value } : r);
                                        setEditScoringRules({
                                          ...editScoringRules,
                                          rules: {
                                            ...(editScoringRules.rules || {}),
                                            [cat.id]: updatedCatRules
                                          }
                                        });
                                      }}
                                      placeholder="ปี.เดือน"
                                    />
                                    
                                    <span style={{ fontSize: '0.8rem', color: 'var(--dark-light)' }}>แล้วให้แปลผลเป็น:</span>
                                    
                                    <input
                                      type="text"
                                      className="form-control"
                                      style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.82rem', height: '32px' }}
                                      value={rule.interpretation}
                                      onChange={(e) => {
                                        const updatedCatRules = catRules.map((r, i) => i === ruleIdx ? { ...r, interpretation: e.target.value } : r);
                                        setEditScoringRules({
                                          ...editScoringRules,
                                          rules: {
                                            ...(editScoringRules.rules || {}),
                                            [cat.id]: updatedCatRules
                                          }
                                        });
                                      }}
                                      placeholder="เช่น สมวัย, มีความเสี่ยง, บกพร่อง (เว้นว่าง = ไม่ต้องแปลผล)"
                                    />
                                    
                                    <button
                                      type="button"
                                      className="btn btn-light btn-icon-only"
                                      style={{ padding: '0.35rem', color: 'var(--danger)', height: '32px' }}
                                      onClick={() => {
                                        const updatedCatRules = catRules.filter((_, i) => i !== ruleIdx);
                                        setEditScoringRules({
                                          ...editScoringRules,
                                          rules: {
                                            ...(editScoringRules.rules || {}),
                                            [cat.id]: updatedCatRules
                                          }
                                        });
                                      }}
                                      title="ลบเกณฑ์คะแนน"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Custom warning */}
                {editType.startsWith('custom_') && (
                  <div style={{ 
                    backgroundColor: '#fff9e6', 
                    border: '1px solid #ffe0b2', 
                    borderRadius: '8px', 
                    padding: '0.75rem 1rem', 
                    display: 'flex', 
                    gap: '10px', 
                    alignItems: 'flex-start',
                    marginTop: '0.5rem'
                  }}>
                    <AlertCircle size={18} color="#f57c00" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ fontSize: '0.82rem', color: '#e65100', lineHeight: '1.4' }}>
                      <strong>หมายเหตุสำหรับแบบประเมินเฉพาะทาง:</strong> แบบประเมินชุดนี้แสดงผลสรุปและประเมินเป็นลักษณะแผนภูมิที่ถูกออกแบบโครงสร้างเฉพาะสำหรับการทำงานระบบ สำหรับการแก้ไขรายข้อเชิงละเอียดสามารถตั้งค่าหรือแทนที่ด้วยตารางเกณฑ์ผ่านเครื่องมืออัปโหลดไฟล์ CSV ด้านบนได้ครับ
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-light" onClick={() => setShowEditModal(false)}>ยกเลิก</button>
                <button type="submit" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Save size={14} /> บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
