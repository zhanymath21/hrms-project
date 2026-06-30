// src/services/employeeService.js

import api from './axios';

const employeeService = {
    /**
     * Download import template
     */
    downloadTemplate: async () => {
        try {
            console.log('📥 Downloading employee template...');
            console.log('🔗 Using API:', api.defaults.baseURL);
            
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Please login first');
            }

            console.log('📡 Endpoint: /employees/import/template');
            
            const response = await api.get('/employees/import/template', {
                responseType: 'blob',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/json',
                },
                timeout: 30000,
            });

            console.log('✅ Response status:', response.status);

            // Check content type
            const contentType = response.headers['content-type'] || '';
            if (contentType.includes('text/html')) {
                const text = await response.data.text();
                console.error('❌ Received HTML:', text.substring(0, 200));
                throw new Error('Server returned HTML. Please check the endpoint.');
            }

            if (contentType.includes('application/json')) {
                const text = await response.data.text();
                try {
                    const json = JSON.parse(text);
                    throw new Error(json.message || 'Server error');
                } catch (e) {
                    throw new Error('Invalid response from server');
                }
            }

            // Create download link
            const blob = new Blob([response.data], { 
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'Employee_Import_Template.xlsx';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            console.log('✅ Template downloaded successfully');
            return true;

        } catch (error) {
            console.error('❌ Download template error:', error);
            
            let errorMessage = 'Failed to download template. ';
            
            if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
                errorMessage += `\n🚫 Cannot connect to server at ${api.defaults.baseURL}`;
                errorMessage += '\n🔍 Please check:';
                errorMessage += '\n  1. Laravel server is running';
                errorMessage += '\n  2. Server is accessible from browser';
                errorMessage += `\n  3. Try accessing: ${api.defaults.baseURL}/employees/import/template`;
            } else if (error.response) {
                if (error.response.status === 401) {
                    errorMessage += 'Please login again.';
                } else if (error.response.status === 403) {
                    errorMessage += 'Permission denied.';
                } else if (error.response.status === 404) {
                    errorMessage += 'Endpoint not found. Check route configuration.';
                } else {
                    errorMessage += `Server error (${error.response.status})`;
                }
            } else {
                errorMessage += error.message || 'Unknown error';
            }
            
            throw new Error(errorMessage);
        }
    },

    /**
     * Import employees from Excel
     */
    importEmployees: async (file) => {
        try {
            console.log('📤 Importing employees...');
            
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Please login first');
            }

            const formData = new FormData();
            formData.append('file', file);
            
            const response = await api.post('/employees/import', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`,
                },
                timeout: 60000,
            });
            
            console.log('✅ Import completed:', response.data);
            return response.data;
            
        } catch (error) {
            console.error('❌ Import employees error:', error);
            
            let errorMessage = 'Failed to import employees. ';
            if (error.response) {
                errorMessage += error.response.data?.message || `Server error (${error.response.status})`;
            } else {
                errorMessage += error.message || 'Unknown error';
            }
            
            throw new Error(errorMessage);
        }
    },

    /**
     * Export employees to Excel
     */
    exportEmployees: async (params = {}) => {
        try {
            console.log('📤 Exporting employees with params:', params);
            
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Please login first');
            }

            const response = await api.get('/employees/export', {
                params,
                responseType: 'blob',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                timeout: 60000,
            });
            
            console.log('✅ Export completed');
            return response;
            
        } catch (error) {
            console.error('❌ Export employees error:', error);
            
            let errorMessage = 'Failed to export employees. ';
            if (error.response) {
                errorMessage += error.response.data?.message || `Server error (${error.response.status})`;
            } else {
                errorMessage += error.message || 'Unknown error';
            }
            
            throw new Error(errorMessage);
        }
    },
};

export default employeeService;