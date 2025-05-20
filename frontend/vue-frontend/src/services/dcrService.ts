import api from './api'

// Types
export interface Branch {
  id: string;
  name: string;
  code: string;
}

export interface FormSpec {
  groups: Array<{
    id: string;
    label: string;
    fields: Array<{
      id: string;
      key: string;
      label: string;
      type: string;
      required: boolean;
    }>;
  }>;
}

export interface DcrRecord {
  id: string;
  dcr_number: string;
  dcr_date: string;
  status: 'DRAFT' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
  values: Array<{
    field_id: string;
    value_num: number;
  }>;
}

export interface ReportData {
  branch: Branch;
  period: string;
  dailyData: Array<any>;
  groups: Array<any>;
  revenueTotals: Array<any>;
}

// DCR Service
const dcrService = {
  // Get all branches
  async getBranches(): Promise<Branch[]> {
    return api.get('/api/branches');
  },

  // Get DCR records for a branch and month
  async getDcrRecords(branchId: string, month: string): Promise<DcrRecord[]> {
    return api.get(`/api/branches/${branchId}/dcr?month=${month}`);
  },

  // Get form specification for a branch
  async getFormSpec(branchId: string): Promise<FormSpec> {
    return api.get(`/api/form-spec?branchId=${branchId}`);
  },

  // Get DCR by ID
  async getDcrById(dcrId: string): Promise<DcrRecord> {
    return api.get(`/api/dcr/${dcrId}`);
  },

  // Create new DCR
  async createDcr(branchId: string, dcrData: any): Promise<DcrRecord> {
    return api.post(`/api/branches/${branchId}/dcr`, dcrData);
  },

  // Update DCR
  async updateDcr(dcrId: string, dcrData: any): Promise<DcrRecord> {
    return api.put(`/api/dcr/${dcrId}`, dcrData);
  },

  // Change DCR status
  async updateDcrStatus(dcrId: string, action: string, data = {}): Promise<DcrRecord> {
    return api.post(`/api/dcr/${dcrId}/${action}`, data);
  },

  // Get report data
  async getReportData(branchId: string, yearMonth: string): Promise<ReportData> {
    return api.get(`/api/branches/${branchId}/reports/${yearMonth}/data`);
  },

  // Get report PDF URL
  getReportPdfUrl(branchId: string, yearMonth: string): string {
    return `${import.meta.env.VITE_API_BASE_URL}/api/branches/${branchId}/reports/${yearMonth}/pdf`;
  }
};

export default dcrService; 