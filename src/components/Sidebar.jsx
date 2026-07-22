import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  UserRound, 
  Calendar, 
  ClipboardCheck, 
  ClipboardList,
  FileText, 
  ShoppingCart, 
  History, 
  BarChart3, 
  Settings as SettingsIcon, 
  LogOut, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  Users2 as UsersIcon,
  Coins as CoinsIcon,
  Sliders as SlidersIcon,
  CircleDollarSign,
  FileSymlink
} from 'lucide-react';
import { DEFAULT_CLINIC_LOGO, SmartAvatar } from '../utils/defaultAssets';

export default function Sidebar({ activeTab, setActiveTab, user, onLogout, collapsed, setCollapsed, clinicInfo }) {
  
  const toggleCollapse = () => {
    const newVal = !collapsed;
    setCollapsed(newVal);
    localStorage.setItem('hdh_sidebar_collapsed', JSON.stringify(newVal));
  };

  const menuItems = [
    { id: 'dashboard', label: 'หน้าหลัก', icon: LayoutDashboard, roles: ['Admin', 'OT', 'Staff'] },
    { id: 'patients', label: 'ทะเบียนประวัติ', icon: UserRound, roles: ['Admin', 'OT', 'Staff'] },
    { id: 'appointments', label: 'ตารางนัดหมาย', icon: Calendar, roles: ['Admin', 'OT', 'Staff'] },
    { id: 'assessments', label: 'ประเมินพัฒนาการ', icon: ClipboardCheck, roles: ['Admin', 'OT', 'Staff'] },
    { id: 'opd', label: 'บันทึกผลการฝึก', icon: ClipboardList, roles: ['Admin', 'OT', 'Staff'] },
    { id: 'referrals', label: 'หนังสือส่งตัว', icon: FileSymlink, roles: ['Admin', 'OT'] },
    { id: 'courses', label: 'คอร์สลูกค้า', icon: FileText, roles: ['Admin', 'OT', 'Staff'] },
    { id: 'pos', label: 'ออกใบเสร็จ', icon: ShoppingCart, roles: ['Admin', 'Staff'] },
    { id: 'history', label: 'ประวัติใบเสร็จ', icon: History, roles: ['Admin', 'Staff'] },
    { id: 'summaries', label: 'สรุปชั่วโมงงานครู', icon: BarChart3, roles: ['Admin', 'OT'] },

    { id: 'transactions', label: 'ข้อมูลรายรับ-รายจ่าย', icon: CircleDollarSign, roles: ['Admin'] },
    { id: 'users', label: 'บัญชีผู้ใช้งานระบบ', icon: UsersIcon, roles: ['Admin'] },
    { id: 'salary', label: 'เงินเดือน', icon: CoinsIcon, roles: ['Admin', 'OT', 'Staff'] },
    { id: 'profile', label: 'ข้อมูลส่วนตัว', icon: UserRound, roles: ['Admin', 'OT', 'Staff'] },
    { id: 'settings', label: 'ตั้งค่าระบบ', icon: SettingsIcon, roles: ['Admin'] },
    { id: 'assessmentSettings', label: 'ตั้งค่าแบบประเมิน', icon: ClipboardCheck, roles: ['Admin'] },
    { id: 'salarySettings', label: 'ตั้งค่าเงินเดือน', icon: SlidersIcon, roles: ['Admin'] }
  ];

  const sections = [
    {
      id: 'customers',
      title: 'การจัดการผู้รับบริการ',
      items: ['patients', 'appointments', 'courses']
    },
    {
      id: 'development',
      title: 'พัฒนาการและการประเมิน',
      items: ['assessments', 'opd', 'referrals']
    },
    {
      id: 'billing',
      title: 'การเงินและบริการ',
      items: ['pos', 'history', 'summaries', 'transactions']
    },
    {
      id: 'hr',
      title: 'การบริหารจัดการบุคคล',
      items: ['users', 'salary', 'profile']
    },
    {
      id: 'admin',
      title: 'การบริหารจัดการคลินิก',
      items: ['settings', 'assessmentSettings', 'salarySettings']
    }
  ];

  const [collapsedSections, setCollapsedSections] = useState(() => {
    const saved = localStorage.getItem('hdh_sidebar_sections_collapsed');
    return saved ? JSON.parse(saved) : {
      customers: true,
      development: true,
      billing: true,
      hr: true,
      admin: true
    };
  });

  const toggleSection = (sectionId) => {
    const updated = {
      ...collapsedSections,
      [sectionId]: !collapsedSections[sectionId]
    };
    setCollapsedSections(updated);
    localStorage.setItem('hdh_sidebar_sections_collapsed', JSON.stringify(updated));
  };

  const filteredMenu = menuItems.filter(item => item.roles.includes(user.role));
  const dashboardItem = filteredMenu.find(item => item.id === 'dashboard');

  const sectionsData = sections.map(section => {
    const sectionItems = filteredMenu.filter(item => section.items.includes(item.id));
    return {
      ...section,
      items: sectionItems
    };
  }).filter(sec => sec.items.length > 0);

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <a href="#" className="brand" onClick={(e) => { e.preventDefault(); setActiveTab('dashboard'); }}>
          <div className="brand-icon" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img 
              src={clinicInfo?.logoUrl || DEFAULT_CLINIC_LOGO} 
              alt="Logo" 
              referrerPolicy="no-referrer"
              style={{ width: '100%', height: '100%', objectFit: 'cover', maxWidth: '100%', maxHeight: '100%' }} 
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = DEFAULT_CLINIC_LOGO;
              }} 
            />
          </div>
          <span className="brand-text">
            {clinicInfo?.name ? (
              clinicInfo.name.includes(" คลินิก") 
                ? clinicInfo.name.split(" คลินิก")[0] 
                : clinicInfo.name
            ) : (
              'Hug Dee Home'
            )}
          </span>
        </a>
        <button className="toggle-sidebar-btn" onClick={toggleCollapse} title={collapsed ? "ขยายเมนู" : "ย่อเมนู"}>
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <ul className="sidebar-menu">
        {/* Dashboard Menu Item */}
        {dashboardItem && (
          <li key={dashboardItem.id} className={`menu-item ${activeTab === dashboardItem.id ? 'active' : ''}`}>
            <a 
              className="menu-link" 
              onClick={() => setActiveTab(dashboardItem.id)}
              title={collapsed ? dashboardItem.label : ''}
            >
              <LayoutDashboard size={20} className="menu-icon" />
              <span className="menu-text">{dashboardItem.label}</span>
            </a>
          </li>
        )}

        {collapsed && dashboardItem && sectionsData.length > 0 && (
          <li className="sidebar-section-divider" />
        )}

        {/* Section Groups */}
        {sectionsData.map((section, index) => {
          const isSecCollapsed = collapsedSections[section.id];

          if (collapsed) {
            return (
              <React.Fragment key={section.id}>
                {section.items.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <li key={item.id} className={`menu-item ${activeTab === item.id ? 'active' : ''}`}>
                      <a 
                        className="menu-link" 
                        onClick={() => setActiveTab(item.id)}
                        title={item.label}
                      >
                        <IconComponent size={20} className="menu-icon" />
                      </a>
                    </li>
                  );
                })}
                {index < sectionsData.length - 1 && (
                  <li className="sidebar-section-divider" />
                )}
              </React.Fragment>
            );
          }

          return (
            <div key={section.id} className="sidebar-section">
              <div 
                className="sidebar-section-header" 
                onClick={() => toggleSection(section.id)}
              >
                <span className="sidebar-section-title">{section.title}</span>
                <span className={`sidebar-section-chevron ${isSecCollapsed ? 'collapsed' : ''}`}>
                  <ChevronDown size={14} />
                </span>
              </div>
              {!isSecCollapsed && (
                <ul className="sidebar-section-menu">
                  {section.items.map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <li key={item.id} className={`menu-item ${activeTab === item.id ? 'active' : ''}`}>
                        <a 
                          className="menu-link" 
                          onClick={() => setActiveTab(item.id)}
                        >
                          <IconComponent size={20} className="menu-icon" />
                          <span className="menu-text">{item.label}</span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </ul>

      <div className="sidebar-user">
        <div className="user-info">
          <div className="user-avatar" title={user.fullname} style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SmartAvatar src={user?.avatarUrl} name={user?.fullname} fontSize="0.75rem" />
          </div>
          <div className="user-details">
            <span className="user-name">{user.fullname}</span>
            <span className="user-role">สิทธิ์: {user.role === 'Admin' ? 'ผู้ดูแลระบบ (Admin)' : user.role === 'OT' ? 'นักบำบัด (OT)' : 'พนักงาน (Staff)'}</span>
          </div>
        </div>
        <button className="logout-btn" onClick={onLogout} title="ออกจากระบบ">
          <LogOut size={16} />
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </div>
  );
}
