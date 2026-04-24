export type TaskStatus =
  | 'backlog' | 'proposed' | 'approval_gated' | 'approved'
  | 'executing' | 'review' | 'completed' | 'blocked'

export type Priority = 'critical' | 'high' | 'medium' | 'low'
export type ApprovalType = 'publish' | 'spend' | 'deploy' | 'campaign' | 'content' | 'legal' | 'other'
export type ApprovalCategory = 'execution' | 'progression' | 'review' | 'acknowledgment'
export type AgentStatus = 'active' | 'idle' | 'error' | 'offline'
export type EntityHealth = 'healthy' | 'warning' | 'critical' | 'unknown'

export interface Task {
  id: string
  title: string
  entity: string
  status: TaskStatus
  priority: Priority
  assigned_agent: string | null
  description: string | null
  objective: string | null
  dod: string | null
  expected_output: string | null
  dependencies: string[]
  tags: string[]
  source: string
  created_at: string
  updated_at: string
  due_at: string | null
  started_at: string | null
  completed_at: string | null
  approval_requested_at: string | null
  approved_by: string | null
  approved_at: string | null
  last_activity_at: string
}

export interface ActivityEntry {
  id: number
  agent: string
  entity: string | null
  action: string
  detail: string | null
  task_id: string | null
  tags: string[]
  created_at: string
}

export interface AgentHeartbeat {
  agent_id: string
  agent_name: string
  emoji: string
  role: string
  last_seen: string | null
  status: AgentStatus
  current_task: string | null
  current_entity: string | null
  model: string | null
  heartbeat_count: number
  active_goals: number
  pending_proactive: number
  error_count_24h: number
  tasks_completed_24h: number
}

export interface Approval {
  id: string
  task_id: string | null
  type: ApprovalType
  approval_category: ApprovalCategory | null
  requested_by: string
  entity: string
  title: string
  description: string
  cost_estimate: string | null
  urgency: 'urgent' | 'normal' | 'low'
  status: 'pending' | 'approved' | 'rejected' | 'acknowledged' | 'needs_modification'
  created_at: string
  expires_at: string | null
}

export interface EntityKPI {
  entity: string
  kpi_1_label: string | null
  kpi_1_value: string | null
  kpi_1_trend: 'up' | 'down' | 'flat' | null
  kpi_2_label: string | null
  kpi_2_value: string | null
  kpi_2_trend: 'up' | 'down' | 'flat' | null
  kpi_3_label: string | null
  kpi_3_value: string | null
  health_status: EntityHealth
  updated_at: string
}

export interface StrategicPriority {
  id: string
  title: string
  entity: string
  status: 'active' | 'blocked' | 'completed' | 'paused'
  assigned_agents: string[]
  description: string | null
  progress_pct: number
  blockers: string | null
  next_action: string | null
  sort_order: number
}

export type PropertyType = 'commercial' | 'single-family' | 'multi-family' | 'vacant-lot' | 'short-term-rental' | 'mid-term-rental'
export type PropertyStatus = 'active' | 'sold' | 'vacant' | 'in-progress' | 'flip'
export type LoanType = 'mortgage' | 'deed-of-trust' | 'private-money' | 'sba' | 'line-of-credit' | 'title-loan'
export type PaymentType = 'autopay' | 'manual' | 'ramp-bill-pay' | 'mailed-check' | 'venmo'
export type LoanStatus = 'active' | 'paid-off' | 'refinanced' | 'defaulted'
export type CoverageType = 'property' | 'liability' | 'builders-risk' | 'workers-comp' | 'umbrella' | 'flood'
export type InsuranceStatus = 'active' | 'expired' | 'pending-renewal' | 'cancelled'
export type AlertSeverity = 'critical' | 'warning' | 'info'

export interface HoldingCompany {
  id: string
  name: string
  ein: string | null
  bank_account: string | null
  created_at: string
  updated_at: string
}

export interface Property {
  id: string
  holding_company_id: string
  address: string
  city: string | null
  state: string | null
  zip: string | null
  property_type: PropertyType | null
  notes: string | null
  bedrooms: number | null
  bathrooms: number | null
  sq_ft: number | null
  year_built: number | null
  estimated_value: number | null
  additional_insured: string[]
  status: PropertyStatus
  drive_folder_url: string | null
  created_at: string
  updated_at: string
}

export interface Loan {
  id: string
  property_id: string | null
  holding_company_id: string
  lender: string
  loan_type: LoanType | null
  payment_type: PaymentType | null
  paid_from_account: string | null
  collateral_address: string | null
  payment_terms: string | null
  principal_amount: number | null
  outstanding_balance: number | null
  interest_rate: number | null
  monthly_payment: number | null
  issue_date: string | null
  first_payment_date: string | null
  due_day: string | null
  maturity_date: string | null
  loan_term_years: number | null
  drive_doc_url: string | null
  notes: string | null
  status: LoanStatus
  created_at: string
  updated_at: string
}

export interface InsurancePolicy {
  id: string
  property_id: string | null
  holding_company_id: string
  coverage_type: CoverageType | null
  provider: string | null
  policy_number: string | null
  premium_amount: number | null
  premium_frequency: string | null
  effective_date: string | null
  expiration_date: string | null
  renewal_date: string | null
  additional_insured: string[]
  drive_doc_url: string | null
  notes: string | null
  status: InsuranceStatus
  created_at: string
  updated_at: string
}

export interface PropertyAlert {
  id: string
  severity: AlertSeverity
  type: 'loan-maturity' | 'insurance-expiration' | 'payment-due' | 'past-due'
  title: string
  detail: string
  date: string
  days_until: number
  related_property_id: string | null
  related_property_address: string | null
  holding_company: string | null
}
