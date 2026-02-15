export const leadsColumns = [
  { key: 'appointmentId', label: 'Appt. ID' },
  { key: 'ownerName', label: 'Owner', type: 'avatar' as const },
  { key: 'customerContactNumber', label: 'Contact' },
  { key: 'carRegistrationNumber', label: 'Reg. No.' },
  { key: 'make', label: 'Make' },
  { key: 'model', label: 'Model' },
  { key: 'variant', label: 'Variant' },
  { key: 'yearOfRegistration', label: 'Year' },
  { key: 'odometerReadingInKms', label: 'Odometer (KM)', type: 'number' as const },
  { key: 'inspectionStatus', label: 'Inspection', type: 'badge' as const },
  { key: 'approvalStatus', label: 'Approval', type: 'badge' as const },
  { key: 'priority', label: 'Priority', type: 'badge' as const },
  { key: 'inspectionDateTime', label: 'Inspection Date', type: 'date' as const },
  { key: 'addedBy', label: 'Added By' },
]

export const leadsFormFields = [
  { key: 'ownerName', label: 'Owner Name', placeholder: 'Full Name', required: true },
  { key: 'customerContactNumber', label: 'Contact Number', placeholder: '+91 9999999999', required: true },
  { key: 'emailAddress', label: 'Email', type: 'email' as const, placeholder: 'owner@email.com' },
  { key: 'carRegistrationNumber', label: 'Registration Number', placeholder: 'XX00XX0000', required: true },
  { key: 'make', label: 'Make', placeholder: 'e.g. Jeep' },
  { key: 'model', label: 'Model', placeholder: 'e.g. Compass' },
  { key: 'variant', label: 'Variant', placeholder: 'e.g. Limited 2.0 Diesel' },
  { key: 'yearOfRegistration', label: 'Year of Registration', placeholder: '2024' },
  { key: 'yearOfManufacture', label: 'Year of Manufacture', placeholder: '2023' },
  { key: 'odometerReadingInKms', label: 'Odometer (KM)', type: 'number' as const, placeholder: '15000' },
  { key: 'ownershipSerialNumber', label: 'Ownership Number', type: 'number' as const, placeholder: '1' },
  { key: 'city', label: 'City', placeholder: 'Mumbai' },
  { key: 'zipCode', label: 'ZIP Code', placeholder: '400001' },
  { key: 'inspectionAddress', label: 'Inspection Address', type: 'textarea' as const, placeholder: 'Full address for inspection' },
  { key: 'inspectionDateTime', label: 'Inspection Date & Time', type: 'date' as const },
  { key: 'inspectionStatus', label: 'Inspection Status', type: 'select' as const, options: [
    { label: 'Pending', value: 'Pending' },
    { label: 'Scheduled', value: 'Scheduled' },
    { label: 'Re-Scheduled', value: 'Re-Scheduled' },
    { label: 'Under Inspection', value: 'Under Inspection' },
    { label: 'Inspected', value: 'Inspected' },
    { label: 'Cancelled', value: 'Cancelled' },
  ] },
  { key: 'approvalStatus', label: 'Approval Status', type: 'select' as const, options: [
    { label: 'Pending', value: 'Pending' },
    { label: 'Under Review', value: 'Under Review' },
    { label: 'Quality Approved', value: 'Quality Approved' },
    { label: 'Quality Rejected', value: 'Quality Rejected' },
  ] },
  { key: 'priority', label: 'Priority', type: 'select' as const, options: [
    { label: 'High', value: 'High' },
    { label: 'Medium', value: 'Medium' },
    { label: 'Low', value: 'Low' },
  ] },
  { key: 'appointmentSource', label: 'Source', placeholder: 'e.g. Website, Referral' },
  { key: 'allocatedTo', label: 'Allocated To', placeholder: 'Team member name' },
  { key: 'repName', label: 'Representative Name', placeholder: 'Rep name' },
  { key: 'repContact', label: 'Representative Contact', placeholder: '+91 9999999999' },
  { key: 'bankSource', label: 'Bank Source', placeholder: 'Bank name' },
  { key: 'referenceName', label: 'Reference Name', placeholder: 'Reference' },
  { key: 'remarks', label: 'Remarks', type: 'textarea' as const, placeholder: 'Any additional remarks...' },
  { key: 'additionalNotes', label: 'Additional Notes', type: 'textarea' as const, placeholder: 'Notes...' },
]

// No longer needed — data comes from API
export const leadsSeedData: any[] = []

// Compound filter: each route filters by BOTH inspectionStatus AND approvalStatus
export interface LeadRouteFilter {
  inspectionStatus: string
  approvalStatus: string
  label: string
}

export const routeFilters = {
  // /leads (index)
  'leads': {
    inspectionStatus: 'Pending',
    approvalStatus: 'Pending',
    label: 'Leads',
  },
  // /leads/scheduled
  'scheduled': {
    inspectionStatus: 'Scheduled',
    approvalStatus: 'Pending',
    label: 'Scheduled',
  },
  // /leads/re-scheduled
  're-scheduled': {
    inspectionStatus: 'Rescheduled',
    approvalStatus: 'Pending',
    label: 'Re-Scheduled',
  },
  // /leads/quality-approved
  'quality-approved': {
    inspectionStatus: 'Running',
    approvalStatus: 'Approved',
    label: 'Quality Approved',
  },
  // /leads/cancelled
  'cancelled': {
    inspectionStatus: 'Cancelled',
    approvalStatus: 'Pending',
    label: 'Cancelled',
  },
  // /leads/inspected
  'inspected': {
    inspectionStatus: 'Inspected',
    approvalStatus: 'Pending',
    label: 'Inspected',
  },
  // /leads/under-review
  'under-review': {
    inspectionStatus: 'Inspected',
    approvalStatus: 'Under Review',
    label: 'Under Review',
  },
  // /leads/quality-rejected
  'quality-rejected': {
    inspectionStatus: 'Inspected',
    approvalStatus: 'Rejected',
    label: 'Quality Rejected',
  },
}
