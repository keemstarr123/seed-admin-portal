export type AdminRole = "super_admin" | "reviewer" | "content_admin" | "loan_admin";

export type AdminUser = {
  id: string;
  email: string | null;
  roles: AdminRole[];
};

export type ApiResult<T> = {
  data?: T;
  error?: string;
};

export type DashboardMetrics = {
  pendingUsers: number;
  lowScoreUsers: number;
  approvedUsers: number;
  courses: number;
  activeLoanAgents: number;
  totalUsers: number;
  rejectedUsers: number;
  suspendedUsers: number;
  mandatoryCourses: number;
  totalChapters: number;
  avgAgentExperience: number;
  userStatus: Array<{ label: string; value: number; color: string }>;
  learningMix: Array<{ label: string; value: number; color: string }>;
  loanBankMix: Array<{ label: string; value: number; color: string }>;
  reviewQueue: Array<{
    id: string;
    score: number;
    status: string;
    date: string | null;
  }>;
  recentUsers: Array<{
    id: string;
    name: string | null;
    email: string | null;
    status: string | null;
    created_at: string | null;
  }>;
  recentAuditLogs: Array<{
    id: string;
    action: string | null;
    target_type: string | null;
    admin_email: string | null;
    created_at: string | null;
  }>;
};
