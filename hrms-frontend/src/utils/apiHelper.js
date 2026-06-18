// src/utils/apiHelper.js
export const handleApiResponse = (response) => {
  try {
    let data = [];
    let meta = { total: 0, per_page: 15, current_page: 1, last_page: 1 };
    
    if (response?.data?.status === 'success') {
      if (response.data.data?.data && Array.isArray(response.data.data.data)) {
        data = response.data.data.data;
        meta = {
          total: response.data.data.total || 0,
          per_page: response.data.data.per_page || 15,
          current_page: response.data.data.current_page || 1,
          last_page: response.data.data.last_page || 1,
        };
      } else if (Array.isArray(response.data.data)) {
        data = response.data.data;
      } else if (response.data.data && typeof response.data.data === 'object') {
        data = response.data.data.data || [];
        meta = {
          total: response.data.data.total || 0,
          per_page: response.data.data.per_page || 15,
          current_page: response.data.data.current_page || 1,
          last_page: response.data.data.last_page || 1,
        };
      }
    } else if (Array.isArray(response?.data)) {
      data = response.data;
    }
    
    return { data: Array.isArray(data) ? data : [], meta };
  } catch (error) {
    console.error('Error parsing API response:', error);
    return { data: [], meta: { total: 0, per_page: 15, current_page: 1, last_page: 1 } };
  }
};