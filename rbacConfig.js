/**
 * @file rbacConfig.js
 * @description This file defines the Role-Based Access Control (RBAC) configuration for the application.
 * It includes a comprehensive list of all available permissions, maps these permissions to different user roles (user, doctor, admin),
 * and defines the menu structure for each role. It also provides utility functions to check user permissions.
 */

/**
 * @constant {Object} PERMISSIONS
 * @description An object containing all granular permissions available in the application.
 * These permissions are used to control access to various features and functionalities.
 */
export const PERMISSIONS = {
  // User Permissions
  VIEW_DASHBOARD_USER: 'view_dashboard_user',
  VIEW_APPOINTMENTS_USER: 'view_appointments_user',
  USE_CHAT_USER: 'use_chat_user',
  VIEW_RECORDS_USER: 'view_records_user',
  EDIT_PROFILE_USER: 'edit_profile_user',
  VIEW_DOCTORS_LIST: 'view_doctors_list',
  BOOK_APPOINTMENT: 'book_appointment',
  VIEW_ARTICLES_USER: 'view_articles_user',
  VIEW_COMMUNITIES_USER: 'view_communities_user',
  VIEW_GOALS_USER: 'view_goals_user',
  REPORT_ISSUE_USER: 'report_issue_user',
  USE_SYMPTOM_CHECKER: 'use_symptom_checker',
  VIEW_MEDICAL_RECORDS: 'view_medical_records',
  CREATE_EMERGENCY_REQUEST: 'create_emergency_request',
  VIEW_LOYALTY_REWARDS: 'view_loyalty_rewards',
  VIEW_DATA_PRIVACY_CENTER: 'view_data_privacy_center',
  MANAGE_PRESCRIPTIONS: 'manage_prescriptions', // New permission for prescription management
  VIDEO_CONSULTATION: 'video_consultation', // New permission for video consultation
  TRACK_MOOD: 'track_mood', // New permission for mood tracking
  
  // Doctor Permissions
  VIEW_DASHBOARD_DOCTOR: 'view_dashboard_doctor',
  VIEW_EMERGENCY_REQUESTS: 'view_emergency_requests',
  MANAGE_APPOINTMENTS_DOCTOR: 'manage_appointments_doctor',
  VIEW_PATIENTS_DOCTOR: 'view_patients_doctor',
  USE_CHAT_DOCTOR: 'use_chat_doctor',
  EDIT_PROFILE_DOCTOR: 'edit_profile_doctor',
  ISSUE_PRESCRIPTION: 'issue_prescription',
  VIEW_SCHEDULE_DOCTOR: 'view_schedule_doctor',
  VIEW_ARTICLES_DOCTOR: 'view_articles_doctor',
  REPORT_ISSUE_DOCTOR: 'report_issue_doctor',
  VIEW_DOCTOR_PERFORMANCE: 'view_doctor_performance',
  EDIT_CONSULTATION_CHARGES: 'edit_consultation_charges', // New permission for editing consultation charges

  // Admin Permissions
  VIEW_DASHBOARD_ADMIN: 'view_dashboard_admin',
  MANAGE_USERS: 'manage_users',
  MANAGE_DOCTORS: 'manage_doctors',
  MANAGE_COMMUNITIES: 'manage_communities',
  VIEW_REPORTS: 'view_reports',
  VIEW_ISSUES: 'view_issues',
  MANAGE_SETTINGS: 'manage_settings',
  MANAGE_ARTICLES: 'manage_articles',
  REPORT_ISSUE_ADMIN: 'report_issue_admin',
  MANAGE_LOYALTY: 'manage_loyalty',
  MANAGE_SUBSCRIPTION_PLANS: 'manage_subscription_plans', // New permission
};

/**
 * @constant {Object} ROLE_PERMISSIONS
 * @description Maps each role to an array of permissions that role possesses.
 * This object defines what each type of user (user, doctor, admin) is allowed to do.
 */
export const ROLE_PERMISSIONS = {
  user: [
    PERMISSIONS.VIEW_DASHBOARD_USER,
    PERMISSIONS.VIEW_APPOINTMENTS_USER,
    PERMISSIONS.USE_CHAT_USER,
    PERMISSIONS.VIEW_RECORDS_USER,
    PERMISSIONS.EDIT_PROFILE_USER,
    PERMISSIONS.VIEW_DOCTORS_LIST,
    PERMISSIONS.BOOK_APPOINTMENT,
    PERMISSIONS.VIEW_ARTICLES_USER,
    PERMISSIONS.VIEW_COMMUNITIES_USER,
    PERMISSIONS.VIEW_GOALS_USER,
    PERMISSIONS.REPORT_ISSUE_USER,
    PERMISSIONS.USE_SYMPTOM_CHECKER,
    PERMISSIONS.VIEW_MEDICAL_RECORDS,
    PERMISSIONS.CREATE_EMERGENCY_REQUEST,
    PERMISSIONS.VIEW_LOYALTY_REWARDS,
    PERMISSIONS.VIEW_DATA_PRIVACY_CENTER,
    PERMISSIONS.VIEW_ARTICLES_USER, // Allowing users to view articles
    PERMISSIONS.MANAGE_PRESCRIPTIONS, // Granting users permission to manage prescriptions
    PERMISSIONS.VIDEO_CONSULTATION, // Granting users permission for video consultation
    PERMISSIONS.TRACK_MOOD, // Granting users permission to track mood
  ],
  doctor: [
    PERMISSIONS.VIEW_DASHBOARD_DOCTOR,
    PERMISSIONS.MANAGE_ARTICLES, // Allowing doctors to write new articles
    PERMISSIONS.VIDEO_CONSULTATION, // Granting doctors permission for video consultation
    PERMISSIONS.MANAGE_APPOINTMENTS_DOCTOR,
    PERMISSIONS.VIEW_EMERGENCY_REQUESTS,
    PERMISSIONS.VIEW_PATIENTS_DOCTOR,
    PERMISSIONS.USE_CHAT_DOCTOR,
    PERMISSIONS.EDIT_PROFILE_DOCTOR,
    PERMISSIONS.ISSUE_PRESCRIPTION,
    PERMISSIONS.VIEW_SCHEDULE_DOCTOR,
    PERMISSIONS.VIEW_ARTICLES_DOCTOR,
    PERMISSIONS.REPORT_ISSUE_DOCTOR,
    PERMISSIONS.VIEW_DOCTOR_PERFORMANCE,
    PERMISSIONS.EDIT_CONSULTATION_CHARGES, // Granting doctors permission to edit consultation charges
  ],
  admin: [], // Admin permissions are initialized separately to include all user/doctor permissions
};

// Assign all relevant permissions to the admin role for comprehensive access.
ROLE_PERMISSIONS.admin = [
  PERMISSIONS.VIEW_DASHBOARD_ADMIN,
  PERMISSIONS.MANAGE_USERS,
  PERMISSIONS.MANAGE_DOCTORS,
  PERMISSIONS.MANAGE_COMMUNITIES,
  PERMISSIONS.VIEW_REPORTS,
  PERMISSIONS.VIEW_ISSUES,
  PERMISSIONS.MANAGE_SETTINGS,
  PERMISSIONS.MANAGE_ARTICLES,
  PERMISSIONS.MANAGE_LOYALTY,
  PERMISSIONS.MANAGE_SUBSCRIPTION_PLANS, // Grant admin permission to manage subscription plans
  PERMISSIONS.REPORT_ISSUE_ADMIN,
  // Admins inherit all user and doctor permissions for oversight and management
  ...ROLE_PERMISSIONS.user,
  ...ROLE_PERMISSIONS.doctor,
  PERMISSIONS.EDIT_CONSULTATION_CHARGES, // Granting admins permission to edit consultation charges
];

/**
 * @constant {Object} MENU_CONFIG
 * @description Defines the sidebar/navigation menu structure for each role.
 * Each menu item includes an ID, label, icon, route, associated permission, and an optional section for grouping.
 */
export const MENU_CONFIG = {
  user: [
    { id: 'dashboard', label: 'Dashboard', icon: 'home', route: '/dashboard', permission: PERMISSIONS.VIEW_DASHBOARD_USER, section: 'Main' },
    { id: 'doctors', label: 'Doctors', icon: 'stethoscope', route: '/doctors', permission: PERMISSIONS.VIEW_DOCTORS_LIST, section: 'Main' },
    { id: 'appointments', label: 'Appointments', icon: 'calendar', route: '/appointments', permission: PERMISSIONS.VIEW_APPOINTMENTS_USER, section: 'Main' },
    { id: 'chat', label: 'Chat', icon: 'chat', route: '/chat', permission: PERMISSIONS.USE_CHAT_USER, section: 'Main' },
    { id: 'symptom-checker', label: 'Symptom Checker', icon: 'activity', route: '/symptom-checker', permission: PERMISSIONS.USE_SYMPTOM_CHECKER, section: 'Health Tools' },
    { id: 'medical-records', label: 'Medical Records', icon: 'file', route: '/medical-records', permission: PERMISSIONS.VIEW_MEDICAL_RECORDS, section: 'Health Tools' },
    { id: 'emergency-request', label: 'Emergency Request', icon: 'alert', route: '/emergency-request', permission: PERMISSIONS.CREATE_EMERGENCY_REQUEST, section: 'Health Tools' },
    { id: 'prescription-management', label: 'Prescriptions', icon: 'capsule', route: '/prescriptions', permission: PERMISSIONS.MANAGE_PRESCRIPTIONS, section: 'Health Tools' },
   // { id: 'loyalty-rewards', label: 'Loyalty Rewards', icon: 'gift', route: '/loyalty-rewards', permission: PERMISSIONS.VIEW_LOYALTY_REWARDS, section: 'Engagement' },
    { id: 'subscriptions', label: 'Subscription Plans', icon: 'credit_card', route: '/subscriptions', permission: PERMISSIONS.VIEW_LOYALTY_REWARDS, section: 'Engagement' },
    { id: 'articles', label: 'Articles', icon: 'book', route: '/articles', permission: PERMISSIONS.VIEW_ARTICLES_USER, section: 'Engagement' },
    { id: 'communities', label: 'Communities', icon: 'community', route: '/communities', permission: PERMISSIONS.VIEW_COMMUNITIES_USER, section: 'Engagement' },
    { id: 'goals', label: 'Goal Tracker', icon: 'target', route: '/goals', permission: PERMISSIONS.VIEW_GOALS_USER, section: 'Engagement' },
    { id: 'mood-tracker', label: 'Mood Tracker', icon: 'mood', route: '/mood-tracker', permission: PERMISSIONS.TRACK_MOOD, section: 'Health Tools' },
    { id: 'profile', label: 'Profile Information', icon: 'profile', route: '/profile', permission: PERMISSIONS.EDIT_PROFILE_USER, section: 'Account' },
    { id: 'data-privacy', label: 'Data Privacy Center', icon: 'shield', route: '/data-privacy-center', permission: PERMISSIONS.VIEW_DATA_PRIVACY_CENTER, section: 'Account' },
    { id: 'report-issue', label: 'Report an Issue', icon: 'support', route: '/report-issue', permission: PERMISSIONS.REPORT_ISSUE_USER, section: 'Support' },
  ],
  doctor: [
    { id: 'dashboard', label: 'Doctor Dashboard', icon: 'stethoscope', route: '/doctor-dashboard', permission: PERMISSIONS.VIEW_DASHBOARD_DOCTOR, section: 'Main' },
    { id: 'schedule', label: 'Schedule', icon: 'calendar', route: '/doctor/schedule', permission: PERMISSIONS.VIEW_SCHEDULE_DOCTOR, section: 'Appointments' },
    { id: 'patients', label: 'Patients', icon: 'users', route: '/doctor/patients', permission: PERMISSIONS.VIEW_PATIENTS_DOCTOR, section: 'Patients' },
    { id: 'chat', label: 'Chat with Patients', icon: 'chat', route: '/doctor/chat', permission: PERMISSIONS.USE_CHAT_DOCTOR, section: 'Communication' },
    { id: 'emergency-requests', label: 'Emergency Requests', icon: 'alert', route: '/doctor/emergency-requests', permission: PERMISSIONS.VIEW_EMERGENCY_REQUESTS, section: 'Emergency' },
    { id: 'performance', label: 'Doctor Performance', icon: 'analytics', route: '/doctor/performance', permission: PERMISSIONS.VIEW_DOCTOR_PERFORMANCE, section: 'Analytics' },
    { id: 'articles', label: 'Articles', icon: 'book', route: '/articles', permission: PERMISSIONS.MANAGE_ARTICLES, section: 'Content' },
    { id: 'profile', label: 'Update Doctor Profile', icon: 'profile', route: '/profile', permission: PERMISSIONS.EDIT_PROFILE_DOCTOR, section: 'Account' },
    { id: 'report-issue', label: 'Report an Issue', icon: 'support', route: '/report-issue', permission: PERMISSIONS.REPORT_ISSUE_DOCTOR, section: 'Support' },
  ],
  admin: [
    { id: 'dashboard', label: 'Admin Dashboard', icon: 'home', route: '/admin-dashboard', permission: PERMISSIONS.VIEW_DASHBOARD_ADMIN, section: 'Main' },
    { id: 'users', label: 'User Management', icon: 'users', route: '/admin/users', permission: PERMISSIONS.MANAGE_USERS, section: 'Management' },
    { id: 'doctors', label: 'Doctor Management', icon: 'stethoscope', route: '/admin/doctors', permission: PERMISSIONS.MANAGE_DOCTORS, section: 'Management' },
    { id: 'communities', label: 'Community Management', icon: 'community', route: '/admin/community-management', permission: PERMISSIONS.MANAGE_COMMUNITIES, section: 'Management' },
    { id: 'loyalty', label: 'Loyalty & Rewards', icon: 'target', route: '/admin/loyalty', permission: PERMISSIONS.MANAGE_LOYALTY, section: 'Engagement' },
    { id: 'subscription-plans', label: 'Subscription Plans', icon: 'credit_card', route: '/admin/subscription-plans', permission: PERMISSIONS.MANAGE_SUBSCRIPTION_PLANS, section: 'Engagement' }, // New menu item
    { id: 'articles', label: 'Article Management', icon: 'book', route: '/admin/articles', permission: PERMISSIONS.MANAGE_ARTICLES, section: 'Content' },
    { id: 'reports', label: 'Analytics Reports', icon: 'analytics', route: '/admin/reports', permission: PERMISSIONS.VIEW_REPORTS, section: 'Analytics' },
    { id: 'issues', label: 'Reported Issues', icon: 'alert', route: '/admin/issues', permission: PERMISSIONS.VIEW_ISSUES, section: 'Support' },
    { id: 'settings', label: 'System Settings', icon: 'settings', route: '/admin/settings', permission: PERMISSIONS.MANAGE_SETTINGS, section: 'Settings' },
    { id: 'report-issue', label: 'Report an Issue', icon: 'support', route: '/report-issue', permission: PERMISSIONS.REPORT_ISSUE_ADMIN, section: 'Support' },
  ],
};
const getRolePermissions = (role) => ROLE_PERMISSIONS[role] || [];

export const hasAllPermissions = (role, requiredPermissions = []) => {
  if (!requiredPermissions.length) {
    return true;
  }
  const permissionsForRole = new Set(getRolePermissions(role));
  return requiredPermissions.every((permission) => permissionsForRole.has(permission));
};

export const hasAnyPermission = (role, requiredPermissions = []) => {
  if (!requiredPermissions.length) {
    return true;
  }
  const permissionsForRole = new Set(getRolePermissions(role));
  return requiredPermissions.some((permission) => permissionsForRole.has(permission));
};
