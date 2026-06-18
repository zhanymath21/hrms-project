// src/services/recruitmentService.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://192.168.0.13:8000/api',
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const recruitmentService = {
  // ============================================================
  // CANDIDATES
  // ============================================================
  
  /**
   * Get all candidates with pagination and filters
   * @param {Object} params - { page, per_page, search, status, has_cv }
   */
  getCandidates: async (params = {}) => {
    const res = await api.get('/candidates', { params });
    return res.data.data || res.data;
  },

  /**
   * Get single candidate by ID
   * @param {number} id - Candidate ID
   */
  getCandidate: async (id) => {
    const res = await api.get(`/candidates/${id}`);
    return res.data.data;
  },

  /**
   * Create new candidate
   * @param {Object|FormData} data - Candidate data
   */
  createCandidate: async (data) => {
    const res = await api.post('/candidates', data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {}
    });
    return res.data;
  },

  /**
   * Update existing candidate
   * @param {number} id - Candidate ID
   * @param {Object|FormData} data - Updated candidate data
   */
  updateCandidate: async (id, data) => {
    const res = await api.post(`/candidates/${id}`, data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {}
    });
    return res.data;
  },

  /**
   * Delete candidate
   * @param {number} id - Candidate ID
   */
  deleteCandidate: async (id) => {
    const res = await api.delete(`/candidates/${id}`);
    return res.data;
  },

  /**
   * Update candidate status
   * @param {number} id - Candidate ID
   * @param {string} status - New status
   */
  updateCandidateStatus: async (id, status) => {
    const res = await api.put(`/candidates/${id}/status`, { status });
    return res.data;
  },

  /**
   * Upload CV for candidate
   * @param {number} id - Candidate ID
   * @param {FormData} formData - Form data with file
   */
  uploadCandidateCV: async (id, formData) => {
    const res = await api.post(`/candidates/${id}/cv`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  /**
   * Get all candidates with CV
   * @param {Object} params - { page, per_page, search }
   */
  getCandidatesWithCV: async (params = {}) => {
    const res = await api.get('/candidates/cv', { params });
    return res.data.data || res.data;
  },

  /**
   * Download CV file
   * @param {number} id - Candidate ID
   */
  downloadCV: async (id) => {
    const res = await api.get(`/candidates/${id}/cv/download`, {
      responseType: 'blob'
    });
    return res.data;
  },

  /**
   * Get candidate statistics
   */
  getCandidateStats: async () => {
    const res = await api.get('/candidates/stats');
    return res.data.data || {};
  },

  // ============================================================
  // VACANCIES / JOB POSTINGS
  // ============================================================

  /**
   * Get all vacancies with pagination and filters
   * @param {Object} params - { page, per_page, search, status, department_id }
   */
  getVacancies: async (params = {}) => {
    const res = await api.get('/vacancies', { params });
    return res.data.data || res.data;
  },

  /**
   * Get single vacancy by ID
   * @param {number} id - Vacancy ID
   */
  getVacancy: async (id) => {
    const res = await api.get(`/vacancies/${id}`);
    return res.data.data;
  },

  /**
   * Create new vacancy
   * @param {Object} data - Vacancy data
   */
  createVacancy: async (data) => {
    const res = await api.post('/vacancies', data);
    return res.data;
  },

  /**
   * Update existing vacancy
   * @param {number} id - Vacancy ID
   * @param {Object} data - Updated vacancy data
   */
  updateVacancy: async (id, data) => {
    const res = await api.put(`/vacancies/${id}`, data);
    return res.data;
  },

  /**
   * Delete vacancy
   * @param {number} id - Vacancy ID
   */
  deleteVacancy: async (id) => {
    const res = await api.delete(`/vacancies/${id}`);
    return res.data;
  },

  /**
   * Update vacancy status
   * @param {number} id - Vacancy ID
   * @param {string} status - New status (open/closed/on_hold)
   */
  updateVacancyStatus: async (id, status) => {
    const res = await api.put(`/vacancies/${id}/status`, { status });
    return res.data;
  },

  /**
   * Get vacancy statistics
   */
  getVacancyStats: async () => {
    const res = await api.get('/vacancies/stats');
    return res.data.data || {};
  },

  // ============================================================
  // APPLICATIONS
  // ============================================================

  /**
   * Get all applications with pagination and filters
   * @param {Object} params - { page, per_page, status, vacancy_id, candidate_id }
   */
  getApplications: async (params = {}) => {
    const res = await api.get('/applications', { params });
    return res.data.data || res.data;
  },

  /**
   * Get single application by ID
   * @param {number} id - Application ID
   */
  getApplication: async (id) => {
    const res = await api.get(`/applications/${id}`);
    return res.data.data;
  },

  /**
   * Create new application
   * @param {Object} data - { candidate_id, vacancy_id, notes }
   */
  createApplication: async (data) => {
    const res = await api.post('/applications', data);
    return res.data;
  },

  /**
   * Update application
   * @param {number} id - Application ID
   * @param {Object} data - Updated application data
   */
  updateApplication: async (id, data) => {
    const res = await api.put(`/applications/${id}`, data);
    return res.data;
  },

  /**
   * Update application status
   * @param {number} id - Application ID
   * @param {string} status - New status (pending/reviewed/interview/accepted/rejected)
   * @param {Object} data - Additional data { notes, interview_date }
   */
  updateApplicationStatus: async (id, status, data = {}) => {
    const res = await api.put(`/applications/${id}/status`, { status, ...data });
    return res.data;
  },

  /**
   * Delete application
   * @param {number} id - Application ID
   */
  deleteApplication: async (id) => {
    const res = await api.delete(`/applications/${id}`);
    return res.data;
  },

  /**
   * Get applications by candidate
   * @param {number} candidateId - Candidate ID
   */
  getApplicationsByCandidate: async (candidateId) => {
    const res = await api.get(`/candidates/${candidateId}/applications`);
    return res.data.data || [];
  },

  /**
   * Get applications by vacancy
   * @param {number} vacancyId - Vacancy ID
   */
  getApplicationsByVacancy: async (vacancyId) => {
    const res = await api.get(`/vacancies/${vacancyId}/applications`);
    return res.data.data || [];
  },

  /**
   * Get application statistics
   */
  getApplicationStats: async () => {
    const res = await api.get('/applications/stats');
    return res.data.data || {};
  },

  // ============================================================
  // ONBOARDING
  // ============================================================

  /**
   * Get all onboarding records
   * @param {Object} params - { page, per_page, status, employee_id }
   */
  getOnboardingList: async (params = {}) => {
    const res = await api.get('/onboarding', { params });
    return res.data.data || res.data;
  },

  /**
   * Get single onboarding record
   * @param {number} id - Onboarding ID
   */
  getOnboarding: async (id) => {
    const res = await api.get(`/onboarding/${id}`);
    return res.data.data;
  },

  /**
   * Create new onboarding record
   * @param {Object} data - { candidate_id, employee_id, start_date, position, department_id }
   */
  createOnboarding: async (data) => {
    const res = await api.post('/onboarding', data);
    return res.data;
  },

  /**
   * Update onboarding record
   * @param {number} id - Onboarding ID
   * @param {Object} data - Updated onboarding data
   */
  updateOnboarding: async (id, data) => {
    const res = await api.put(`/onboarding/${id}`, data);
    return res.data;
  },

  /**
   * Update onboarding progress
   * @param {number} id - Onboarding ID
   * @param {number} progress - Progress percentage (0-100)
   * @param {string} notes - Additional notes
   */
  updateOnboardingProgress: async (id, progress, notes = '') => {
    const res = await api.put(`/onboarding/${id}/progress`, { progress, notes });
    return res.data;
  },

  /**
   * Complete onboarding
   * @param {number} id - Onboarding ID
   */
  completeOnboarding: async (id) => {
    const res = await api.post(`/onboarding/${id}/complete`);
    return res.data;
  },

  /**
   * Delete onboarding record
   * @param {number} id - Onboarding ID
   */
  deleteOnboarding: async (id) => {
    const res = await api.delete(`/onboarding/${id}`);
    return res.data;
  },

  /**
   * Get onboarding statistics
   */
  getOnboardingStats: async () => {
    const res = await api.get('/onboarding/stats');
    return res.data.data || {};
  },

  // ============================================================
  // DASHBOARD / OVERVIEW
  // ============================================================

  /**
   * Get recruitment dashboard summary
   */
  getDashboardSummary: async () => {
    const res = await api.get('/recruitment/dashboard');
    return res.data.data || {};
  },

  /**
   * Get recruitment pipeline data
   */
  getPipeline: async () => {
    const res = await api.get('/recruitment/pipeline');
    return res.data.data || {};
  },

  /**
   * Get recruitment metrics
   * @param {string} period - daily, weekly, monthly, yearly
   */
  getMetrics: async (period = 'monthly') => {
    const res = await api.get('/recruitment/metrics', { params: { period } });
    return res.data.data || {};
  },

  // ============================================================
  // UTILITIES
  // ============================================================

  /**
   * Get all departments (for dropdowns)
   */
  getDepartments: async () => {
    const res = await api.get('/departments');
    return res.data.data || [];
  },

  /**
   * Get all employees (for dropdowns)
   */
  getEmployees: async () => {
    const res = await api.get('/employees', { params: { per_page: 1000, status: 'active' } });
    return res.data.data?.data || res.data.data || [];
  },

  /**
   * Get candidate status options
   */
  getStatusOptions: async () => {
    const res = await api.get('/recruitment/status-options');
    return res.data.data || [];
  },

  /**
   * Get document types for candidate
   */
  getDocumentTypes: async () => {
    const res = await api.get('/recruitment/document-types');
    return res.data.data || [];
  },
};

export default recruitmentService;