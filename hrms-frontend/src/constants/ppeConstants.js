// src/constants/ppeConstants.js

export const STATUS_OPTIONS = [
  { value: 'available', label: 'Available', color: 'success' },
  { value: 'assigned', label: 'Assigned', color: 'primary' },
  { value: 'maintenance', label: 'Maintenance', color: 'warning' },
  { value: 'write_off', label: 'Write-off', color: 'error' },
];

export const CONDITION_OPTIONS = [
  { value: 'good', label: 'Good', color: 'success' },
  { value: 'fair', label: 'Fair', color: 'warning' },
  { value: 'poor', label: 'Poor', color: 'error' },
  { value: 'damaged', label: 'Damaged', color: 'error' },
  { value: 'expired', label: 'Expired', color: 'default' },
];

export const WRITE_OFF_REASONS = [
  { value: 'expired', label: 'Expired' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'lost', label: 'Lost' },
  { value: 'stolen', label: 'Stolen' },
  { value: 'obsolete', label: 'Obsolete' },
  { value: 'recalled', label: 'Recalled' },
  { value: 'replaced', label: 'Replaced' },
  { value: 'other', label: 'Other' },
];