/**
 * CSV Import/Export utilities for Ecological Profile Census
 */

interface HouseholdMember {
  id?: string;
  full_name?: string;
  relation_to_head?: string;
  relationship_to_head?: string;
  birth_date?: string;
  age?: number;
  gender?: string;
  civil_status?: string;
  religion?: string;
  contact_number?: string;
  occupation?: string;
  education_attainment?: string;
  education_level?: string;
  schooling_status?: string;
  employment_status?: string;
  employment_category?: string;
  monthly_income_cash?: string;
  monthly_income_kind?: string;
  monthly_income?: string;
  is_head_of_household?: boolean;
  is_pwd?: boolean;
  is_solo_parent?: boolean;
}

export interface EcologicalSubmission {
  id: string;
  submission_number: string;
  status: string;
  household_number: string | null;
  address: string | null;
  street_purok: string | null;
  house_number: string | null;
  respondent_name: string | null;
  respondent_relation: string | null;
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  staff_notes: string | null;
  interview_date: string | null;
  barangay: string | null;
  city: string | null;
  province: string | null;
  district: string | null;
  house_ownership: string | null;
  lot_ownership: string | null;
  dwelling_type: string | null;
  lighting_source: string | null;
  water_supply_level: string | null;
  years_staying: number | null;
  place_of_origin: string | null;
  ethnic_group: string | null;
  water_storage: string[] | null;
  food_storage_type: string[] | null;
  toilet_facilities: string[] | null;
  drainage_facilities: string[] | null;
  garbage_disposal: string[] | null;
  communication_services: string[] | null;
  means_of_transport: string[] | null;
  info_sources: string[] | null;
  is_4ps_beneficiary: boolean | null;
  solo_parent_count: number | null;
  pwd_count: number | null;
  additional_notes: string | null;
  household_members: HouseholdMember[] | null;
  health_data: Record<string, unknown> | null;
  immunization_data: Record<string, unknown> | null;
  education_data: Record<string, unknown> | null;
  family_planning: Record<string, unknown> | null;
  pregnant_data: Record<string, unknown> | null;
  disability_data: Record<string, unknown> | null;
  senior_data: Record<string, unknown> | null;
  death_data: Record<string, unknown> | null;
  food_production: Record<string, unknown> | null;
  animals: Record<string, unknown> | null;
}

// CSV column headers for export
const EXPORT_HEADERS = [
  'Submission Number',
  'Status',
  'Household Number',
  'House Number',
  'Street/Purok',
  'Address',
  'Barangay',
  'City',
  'Province',
  'District',
  'Respondent Name',
  'Respondent Relation',
  'Interview Date',
  'Years Staying',
  'Place of Origin',
  'Ethnic Group',
  'House Ownership',
  'Lot Ownership',
  'Dwelling Type',
  'Lighting Source',
  'Water Supply Level',
  'Water Storage',
  'Food Storage Type',
  'Toilet Facilities',
  'Drainage Facilities',
  'Garbage Disposal',
  'Communication Services',
  'Means of Transport',
  'Info Sources',
  '4Ps Beneficiary',
  'Solo Parent Count',
  'PWD Count',
  'Member Count',
  'Members (JSON)',
  'Additional Notes',
  'Reviewed By',
  'Reviewed At',
  'Created At',
];

// Escape CSV value
const escapeCSV = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  
  const str = String(value);
  // If value contains comma, newline, or quote, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

// Format array to string
const formatArray = (arr: string[] | null): string => {
  if (!arr || arr.length === 0) return '';
  return arr.join('; ');
};

// Convert submission to CSV row
const submissionToRow = (sub: EcologicalSubmission): string => {
  const memberCount = sub.household_members?.length || 0;
  const membersJson = sub.household_members ? JSON.stringify(sub.household_members) : '';
  
  const values = [
    sub.submission_number,
    sub.status,
    sub.household_number,
    sub.house_number,
    sub.street_purok,
    sub.address,
    sub.barangay,
    sub.city,
    sub.province,
    sub.district,
    sub.respondent_name,
    sub.respondent_relation,
    sub.interview_date,
    sub.years_staying,
    sub.place_of_origin,
    sub.ethnic_group,
    sub.house_ownership,
    sub.lot_ownership,
    sub.dwelling_type,
    sub.lighting_source,
    sub.water_supply_level,
    formatArray(sub.water_storage),
    formatArray(sub.food_storage_type),
    formatArray(sub.toilet_facilities),
    formatArray(sub.drainage_facilities),
    formatArray(sub.garbage_disposal),
    formatArray(sub.communication_services),
    formatArray(sub.means_of_transport),
    formatArray(sub.info_sources),
    sub.is_4ps_beneficiary ? 'Yes' : 'No',
    sub.solo_parent_count,
    sub.pwd_count,
    memberCount,
    membersJson,
    sub.additional_notes,
    sub.reviewed_by,
    sub.reviewed_at,
    sub.created_at,
  ];
  
  return values.map(escapeCSV).join(',');
};

/**
 * Export submissions to CSV format
 */
export const exportSubmissionsToCSV = (submissions: EcologicalSubmission[]): string => {
  const headerRow = EXPORT_HEADERS.map(escapeCSV).join(',');
  const dataRows = submissions.map(submissionToRow);
  return [headerRow, ...dataRows].join('\n');
};

/**
 * Download CSV file
 */
export const downloadCSV = (csvContent: string, filename: string): void => {
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export household members to a separate CSV (flattened format)
 */
export const exportMembersToCSV = (submissions: EcologicalSubmission[]): string => {
  const memberHeaders = [
    'Submission Number',
    'Household Number',
    'Full Name',
    'Relation to Head',
    'Birth Date',
    'Age',
    'Gender',
    'Civil Status',
    'Religion',
    'Contact Number',
    'Occupation',
    'Education',
    'Schooling Status',
    'Employment Status',
    'Employment Category',
    'Monthly Income (Cash)',
    'Monthly Income (Kind)',
    'Is Head of Household',
    'Is PWD',
    'Is Solo Parent',
  ];
  
  const rows: string[] = [memberHeaders.map(escapeCSV).join(',')];
  
  submissions.forEach(sub => {
    if (sub.household_members && sub.household_members.length > 0) {
      sub.household_members.forEach(member => {
        const values = [
          sub.submission_number,
          sub.household_number,
          member.full_name,
          member.relation_to_head || member.relationship_to_head,
          member.birth_date,
          member.age,
          member.gender,
          member.civil_status,
          member.religion,
          member.contact_number,
          member.occupation,
          member.education_attainment || member.education_level,
          member.schooling_status,
          member.employment_status,
          member.employment_category,
          member.monthly_income_cash || member.monthly_income,
          member.monthly_income_kind,
          member.is_head_of_household ? 'Yes' : 'No',
          member.is_pwd ? 'Yes' : 'No',
          member.is_solo_parent ? 'Yes' : 'No',
        ];
        rows.push(values.map(escapeCSV).join(','));
      });
    }
  });
  
  return rows.join('\n');
};

// Import CSV parsing
interface ParsedCSVRow {
  [key: string]: string;
}

/**
 * Parse CSV content to array of objects
 */
export const parseCSV = (content: string): ParsedCSVRow[] => {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return [];
  
  // Parse header row
  const headers = parseCSVLine(lines[0]);
  
  // Parse data rows
  const rows: ParsedCSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length !== headers.length) continue;
    
    const row: ParsedCSVRow = {};
    headers.forEach((header, index) => {
      row[header.trim()] = values[index];
    });
    rows.push(row);
  }
  
  return rows;
};

/**
 * Parse a single CSV line (handles quoted values)
 */
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  
  result.push(current);
  return result;
};

/**
 * Validate imported CSV data
 */
export interface ImportValidationResult {
  valid: boolean;
  errors: string[];
  data: Partial<EcologicalSubmission>[];
}

export const validateImportData = (rows: ParsedCSVRow[]): ImportValidationResult => {
  const errors: string[] = [];
  const data: Partial<EcologicalSubmission>[] = [];
  
  const requiredFields = ['Household Number'];
  
  rows.forEach((row, index) => {
    const rowNum = index + 2; // Account for header row
    
    // Check required fields
    requiredFields.forEach(field => {
      if (!row[field] || row[field].trim() === '') {
        errors.push(`Row ${rowNum}: Missing required field "${field}"`);
      }
    });
    
    // Parse row to submission format
    const submission: Partial<EcologicalSubmission> = {
      household_number: row['Household Number'] || null,
      house_number: row['House Number'] || null,
      street_purok: row['Street/Purok'] || null,
      address: row['Address'] || null,
      barangay: row['Barangay'] || null,
      city: row['City'] || null,
      province: row['Province'] || null,
      district: row['District'] || null,
      respondent_name: row['Respondent Name'] || null,
      respondent_relation: row['Respondent Relation'] || null,
      interview_date: row['Interview Date'] || null,
      years_staying: row['Years Staying'] ? parseInt(row['Years Staying']) : null,
      place_of_origin: row['Place of Origin'] || null,
      ethnic_group: row['Ethnic Group'] || null,
      house_ownership: row['House Ownership'] || null,
      lot_ownership: row['Lot Ownership'] || null,
      dwelling_type: row['Dwelling Type'] || null,
      lighting_source: row['Lighting Source'] || null,
      water_supply_level: row['Water Supply Level'] || null,
      water_storage: row['Water Storage'] ? row['Water Storage'].split('; ').filter(Boolean) : null,
      food_storage_type: row['Food Storage Type'] ? row['Food Storage Type'].split('; ').filter(Boolean) : null,
      toilet_facilities: row['Toilet Facilities'] ? row['Toilet Facilities'].split('; ').filter(Boolean) : null,
      drainage_facilities: row['Drainage Facilities'] ? row['Drainage Facilities'].split('; ').filter(Boolean) : null,
      garbage_disposal: row['Garbage Disposal'] ? row['Garbage Disposal'].split('; ').filter(Boolean) : null,
      communication_services: row['Communication Services'] ? row['Communication Services'].split('; ').filter(Boolean) : null,
      means_of_transport: row['Means of Transport'] ? row['Means of Transport'].split('; ').filter(Boolean) : null,
      info_sources: row['Info Sources'] ? row['Info Sources'].split('; ').filter(Boolean) : null,
      is_4ps_beneficiary: row['4Ps Beneficiary']?.toLowerCase() === 'yes',
      solo_parent_count: row['Solo Parent Count'] ? parseInt(row['Solo Parent Count']) : null,
      pwd_count: row['PWD Count'] ? parseInt(row['PWD Count']) : null,
      additional_notes: row['Additional Notes'] || null,
    };
    
    // Parse members if provided
    if (row['Members (JSON)'] && row['Members (JSON)'].trim()) {
      try {
        submission.household_members = JSON.parse(row['Members (JSON)']);
      } catch {
        errors.push(`Row ${rowNum}: Invalid JSON in "Members (JSON)" field`);
      }
    }
    
    data.push(submission);
  });
  
  return {
    valid: errors.length === 0,
    errors,
    data,
  };
};

/**
 * Generate a sample/template CSV for imports
 */
export const generateImportTemplate = (): string => {
  const headers = [
    'Household Number',
    'House Number',
    'Street/Purok',
    'Address',
    'Barangay',
    'City',
    'Province',
    'District',
    'Respondent Name',
    'Respondent Relation',
    'Interview Date',
    'Years Staying',
    'Place of Origin',
    'Ethnic Group',
    'House Ownership',
    'Lot Ownership',
    'Dwelling Type',
    'Lighting Source',
    'Water Supply Level',
    'Water Storage',
    'Food Storage Type',
    'Toilet Facilities',
    'Drainage Facilities',
    'Garbage Disposal',
    'Communication Services',
    'Means of Transport',
    'Info Sources',
    '4Ps Beneficiary',
    'Solo Parent Count',
    'PWD Count',
    'Additional Notes',
    'Members (JSON)',
  ];
  
  const sampleRow = [
    'HH-001',
    '123',
    'Purok 1',
    '123 Sample Street',
    'Sample Barangay',
    'Sample City',
    'Sample Province',
    'District 1',
    'Juan Dela Cruz',
    'Head of Household',
    '2024-01-15',
    '5',
    'Manila',
    'Tagalog',
    'Owned',
    'Owned',
    'Single Family Home',
    'Electric',
    'Level 1',
    'Water Tank; Container',
    'Refrigerator',
    'Water Sealed',
    'Open Drainage',
    'Collected by LGU',
    'Mobile Phone; Internet',
    'Tricycle; Motorcycle',
    'TV; Radio',
    'No',
    '0',
    '0',
    'Sample notes here',
    '[{"full_name":"Juan Dela Cruz","relation_to_head":"Head","birth_date":"1980-01-01","gender":"Male","civil_status":"Married"}]',
  ];
  
  return [
    headers.map(escapeCSV).join(','),
    sampleRow.map(escapeCSV).join(','),
  ].join('\n');
};
