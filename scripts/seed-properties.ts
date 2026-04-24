/**
 * Seed script: imports property and loan data from the T+L spreadsheets into mc.db.
 *
 * Usage:
 *   cd mission-control
 *   npx tsx scripts/seed-properties.ts
 *
 * Requires: openpyxl-style data already encoded below (no xlsx dependency needed).
 * Data extracted from:
 *   - _T+L List of Real Estate.xlsx  (properties)
 *   - SUMMARY OF ALL LOANS PER LLC - Timber + Love, Inc..xlsx  (loans)
 */

import Database from 'better-sqlite3'
import path from 'path'
import { nanoid } from 'nanoid'

const DB_PATH = process.env.DB_PATH || './mc.db'
const db = new Database(path.resolve(DB_PATH))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// ── Properties from "_T+L List of Real Estate.xlsx" ──────────────────────────

interface PropertySeed {
  holding_company_id: string
  address: string
  city: string
  state: string
  zip: string
  property_type: string | null
  notes: string | null
  bedrooms: number | null
  bathrooms: number | null
  sq_ft: number | null
  year_built: number | null
  estimated_value: number | null
  additional_insured: string[]
  status: string
}

const PROPERTIES: PropertySeed[] = [
  // ─── T&L Holdings Inc ───
  { holding_company_id: 'tl-holdings', address: '3020 W Fairview Ave, Boise, ID 83702', city: 'Boise', state: 'ID', zip: '83702', property_type: 'commercial', notes: 'Long-term rental (Crossfit Casual)', bedrooms: 0, bathrooms: 1, sq_ft: 6504, year_built: 1956, estimated_value: 4900000, additional_insured: ['JL Foster Roth', 'Curt Beukleman', 'Gerald Beukleman', 'Capital Educators'], status: 'active' },
  { holding_company_id: 'tl-holdings', address: '3024 W Fairview Ave, Boise, ID 83702', city: 'Boise', state: 'ID', zip: '83702', property_type: 'commercial', notes: 'T+L office building + long-term rental (Sunrise E-Bikes)', bedrooms: 0, bathrooms: 0, sq_ft: 6504, year_built: null, estimated_value: null, additional_insured: [], status: 'active' },
  { holding_company_id: 'tl-holdings', address: '1518 Fort St, Boise, ID 83702', city: 'Boise', state: 'ID', zip: '83702', property_type: 'commercial', notes: 'Realty office building + short-term rental (upstairs)', bedrooms: 3, bathrooms: 2, sq_ft: 2068, year_built: 1911, estimated_value: 800000, additional_insured: [], status: 'active' },

  // ─── Warm Springs Villa LLC ───
  { holding_company_id: 'warm-springs-villa', address: '108 N Avenue B Ave, Boise, ID 83712', city: 'Boise', state: 'ID', zip: '83712', property_type: 'multi-family', notes: 'Long-term rental', bedrooms: 1, bathrooms: 1, sq_ft: 700, year_built: 1895, estimated_value: 1200000, additional_insured: ['Capital Educators'], status: 'active' },
  { holding_company_id: 'warm-springs-villa', address: '110 N Avenue B Ave, Boise, ID 83712', city: 'Boise', state: 'ID', zip: '83712', property_type: 'multi-family', notes: 'Long-term rental', bedrooms: 1, bathrooms: 1, sq_ft: 900, year_built: null, estimated_value: null, additional_insured: [], status: 'active' },
  { holding_company_id: 'warm-springs-villa', address: '302 E Warm Springs Ave, Boise, ID 83712', city: 'Boise', state: 'ID', zip: '83712', property_type: 'multi-family', notes: 'Long-term rental', bedrooms: 2, bathrooms: 1, sq_ft: 1100, year_built: null, estimated_value: null, additional_insured: [], status: 'active' },
  { holding_company_id: 'warm-springs-villa', address: '304 E Warm Springs Ave, Boise, ID 83712', city: 'Boise', state: 'ID', zip: '83712', property_type: 'multi-family', notes: 'Long-term rental', bedrooms: 3, bathrooms: 1, sq_ft: 1600, year_built: null, estimated_value: null, additional_insured: [], status: 'active' },

  // ─── Invest in Boise Inc ───
  { holding_company_id: 'invest-in-boise', address: '2615 W Heron St #1, Boise, ID 83702', city: 'Boise', state: 'ID', zip: '83702', property_type: 'multi-family', notes: 'Long-term rental', bedrooms: 0, bathrooms: 1, sq_ft: 500, year_built: 1949, estimated_value: 725000, additional_insured: ['Pattie Griep'], status: 'active' },
  { holding_company_id: 'invest-in-boise', address: '2615 W Heron St #3, Boise, ID 83702', city: 'Boise', state: 'ID', zip: '83702', property_type: 'multi-family', notes: 'Long-term rental', bedrooms: 0, bathrooms: 1, sq_ft: 500, year_built: null, estimated_value: null, additional_insured: [], status: 'active' },
  { holding_company_id: 'invest-in-boise', address: '2615 W Heron St #5, Boise, ID 83702', city: 'Boise', state: 'ID', zip: '83702', property_type: 'multi-family', notes: 'Long-term rental', bedrooms: 0, bathrooms: 1, sq_ft: 500, year_built: null, estimated_value: null, additional_insured: [], status: 'active' },
  { holding_company_id: 'invest-in-boise', address: '495 S 3rd St E #A, Mountain Home, ID 83647', city: 'Mountain Home', state: 'ID', zip: '83647', property_type: 'multi-family', notes: 'Long-term rental', bedrooms: 3, bathrooms: 2, sq_ft: 1556, year_built: 1964, estimated_value: 600000, additional_insured: [], status: 'active' },
  { holding_company_id: 'invest-in-boise', address: '495 S 3rd St E #B, Mountain Home, ID 83647', city: 'Mountain Home', state: 'ID', zip: '83647', property_type: 'multi-family', notes: 'Long-term rental', bedrooms: 3, bathrooms: 1, sq_ft: 1088, year_built: null, estimated_value: null, additional_insured: [], status: 'active' },
  { holding_company_id: 'invest-in-boise', address: '495 S 3rd St E #C, Mountain Home, ID 83647', city: 'Mountain Home', state: 'ID', zip: '83647', property_type: 'multi-family', notes: 'Long-term rental', bedrooms: 0, bathrooms: 1, sq_ft: 800, year_built: null, estimated_value: null, additional_insured: [], status: 'active' },
  { holding_company_id: 'invest-in-boise', address: '1706 N 26th St, Boise, ID 83702', city: 'Boise', state: 'ID', zip: '83702', property_type: 'single-family', notes: 'Long-term rental', bedrooms: 3, bathrooms: 1, sq_ft: 1340, year_built: 1970, estimated_value: 650000, additional_insured: [], status: 'active' },
  { holding_company_id: 'invest-in-boise', address: '1714 N 26th St, Boise, ID 83702', city: 'Boise', state: 'ID', zip: '83702', property_type: 'vacant-lot', notes: 'Vacant Lot', bedrooms: 0, bathrooms: 0, sq_ft: 0, year_built: null, estimated_value: 250000, additional_insured: [], status: 'vacant' },
  { holding_company_id: 'invest-in-boise', address: '1718 N 26th St, Boise, ID 83702', city: 'Boise', state: 'ID', zip: '83702', property_type: 'single-family', notes: 'Flip project - In Progress', bedrooms: 0, bathrooms: 0, sq_ft: 0, year_built: 1900, estimated_value: 450000, additional_insured: ['Crescent Capital (Diane Barker)'], status: 'flip' },
  { holding_company_id: 'invest-in-boise', address: '2310 W Frederic St, Boise, ID 83705', city: 'Boise', state: 'ID', zip: '83705', property_type: 'single-family', notes: 'Flip project - In Progress', bedrooms: 4, bathrooms: 1, sq_ft: 2160, year_built: 1948, estimated_value: 600000, additional_insured: [], status: 'flip' },
  { holding_company_id: 'invest-in-boise', address: '11519 Roanoke Dr, Caldwell, ID 83605', city: 'Caldwell', state: 'ID', zip: '83605', property_type: 'single-family', notes: 'Long-term rental', bedrooms: null, bathrooms: null, sq_ft: null, year_built: null, estimated_value: null, additional_insured: [], status: 'active' },
  // Water Run + Promise Ln subdivision lots
  { holding_company_id: 'invest-in-boise', address: '3003 N Water Run Ln, Boise, ID 83703', city: 'Boise', state: 'ID', zip: '83703', property_type: 'vacant-lot', notes: 'Subdivision Lot 1 - Just starting development', bedrooms: null, bathrooms: null, sq_ft: null, year_built: null, estimated_value: 250000, additional_insured: [], status: 'in-progress' },
  { holding_company_id: 'invest-in-boise', address: '3035 N Water Run Ln, Boise, ID 83703', city: 'Boise', state: 'ID', zip: '83703', property_type: 'vacant-lot', notes: 'Subdivision Lot 3 - Vacant', bedrooms: null, bathrooms: null, sq_ft: null, year_built: null, estimated_value: 250000, additional_insured: [], status: 'vacant' },
  { holding_company_id: 'invest-in-boise', address: '3051 N Water Run Ln, Boise, ID 83703', city: 'Boise', state: 'ID', zip: '83703', property_type: 'vacant-lot', notes: 'Subdivision Lot 4 - Just starting development', bedrooms: null, bathrooms: null, sq_ft: null, year_built: null, estimated_value: 250000, additional_insured: [], status: 'in-progress' },
  { holding_company_id: 'invest-in-boise', address: '5107 W Promise Ln, Boise, ID 83703', city: 'Boise', state: 'ID', zip: '83703', property_type: 'vacant-lot', notes: 'Subdivision Lot 9 - Vacant', bedrooms: null, bathrooms: null, sq_ft: null, year_built: null, estimated_value: 250000, additional_insured: [], status: 'vacant' },
  { holding_company_id: 'invest-in-boise', address: '5121 W Promise Ln, Boise, ID 83703', city: 'Boise', state: 'ID', zip: '83703', property_type: 'vacant-lot', notes: 'Subdivision Lot 10 - Vacant', bedrooms: null, bathrooms: null, sq_ft: null, year_built: null, estimated_value: 250000, additional_insured: [], status: 'vacant' },
  { holding_company_id: 'invest-in-boise', address: '5143 W Promise Ln, Boise, ID 83703', city: 'Boise', state: 'ID', zip: '83703', property_type: 'vacant-lot', notes: 'Subdivision Lot 11 - Vacant', bedrooms: null, bathrooms: null, sq_ft: null, year_built: null, estimated_value: 250000, additional_insured: [], status: 'vacant' },

  // ─── Hanks Homes LLC ───
  { holding_company_id: 'hanks-homes', address: '145 2nd St, Grand View, ID 83624', city: 'Grand View', state: 'ID', zip: '83624', property_type: 'single-family', notes: 'Long-term rental - will likely be flip project', bedrooms: 1, bathrooms: 1, sq_ft: 500, year_built: 1940, estimated_value: 200000, additional_insured: [], status: 'active' },
  { holding_company_id: 'hanks-homes', address: '155 2nd St, Grand View, ID 83624', city: 'Grand View', state: 'ID', zip: '83624', property_type: 'single-family', notes: 'Long-term rental', bedrooms: 2, bathrooms: 1, sq_ft: 700, year_built: 1940, estimated_value: 200000, additional_insured: [], status: 'active' },
  { holding_company_id: 'hanks-homes', address: '820 Riverside Ave, Grand View, ID 83624', city: 'Grand View', state: 'ID', zip: '83624', property_type: 'single-family', notes: 'Long-term rental', bedrooms: 2, bathrooms: 1, sq_ft: 1100, year_built: 1962, estimated_value: 200000, additional_insured: [], status: 'active' },
  { holding_company_id: 'hanks-homes', address: '850 Riverside Ave, Grand View, ID 83624', city: 'Grand View', state: 'ID', zip: '83624', property_type: 'single-family', notes: 'Long-term rental - will likely be flip project', bedrooms: 2, bathrooms: 1, sq_ft: 1100, year_built: 1925, estimated_value: 200000, additional_insured: [], status: 'active' },
  { holding_company_id: 'hanks-homes', address: '424 W Thatcher St, Boise, ID 83702', city: 'Boise', state: 'ID', zip: '83702', property_type: 'single-family', notes: 'Long-term rental', bedrooms: 1, bathrooms: 1, sq_ft: 674, year_built: 1905, estimated_value: 400000, additional_insured: [], status: 'active' },
  { holding_company_id: 'hanks-homes', address: '706 W Resseguie St, Boise, ID 83702', city: 'Boise', state: 'ID', zip: '83702', property_type: 'single-family', notes: 'Long-term rental', bedrooms: 2, bathrooms: 1, sq_ft: 927, year_built: 1915, estimated_value: 450000, additional_insured: [], status: 'active' },
  { holding_company_id: 'hanks-homes', address: '1704 N 31st St, Boise, ID 83702', city: 'Boise', state: 'ID', zip: '83702', property_type: 'single-family', notes: 'Long-term rental', bedrooms: 4, bathrooms: 1, sq_ft: 1320, year_built: 1946, estimated_value: 650000, additional_insured: [], status: 'active' },
  { holding_company_id: 'hanks-homes', address: '1321 Cleveland St, Boise, ID 83705', city: 'Boise', state: 'ID', zip: '83705', property_type: 'single-family', notes: 'Long-term rental', bedrooms: 3, bathrooms: 1, sq_ft: 1065, year_built: 1962, estimated_value: 600000, additional_insured: [], status: 'active' },
  { holding_company_id: 'hanks-homes', address: '4611 W Clearview Dr, Boise, ID 83705', city: 'Boise', state: 'ID', zip: '83705', property_type: 'single-family', notes: 'Long-term rental', bedrooms: 3, bathrooms: 2, sq_ft: 1452, year_built: 1959, estimated_value: 600000, additional_insured: [], status: 'active' },
  { holding_company_id: 'hanks-homes', address: '3525 W State St, Boise, ID 83703', city: 'Boise', state: 'ID', zip: '83703', property_type: 'commercial', notes: 'Long-term rental', bedrooms: 0, bathrooms: 0, sq_ft: 1311, year_built: 1956, estimated_value: 600000, additional_insured: [], status: 'active' },
  { holding_company_id: 'hanks-homes', address: '107 N Hot Springs Dr, Boise, ID 83712', city: 'Boise', state: 'ID', zip: '83712', property_type: 'single-family', notes: "Luke's personal house", bedrooms: 4, bathrooms: 3, sq_ft: 1994, year_built: 1995, estimated_value: 800000, additional_insured: [], status: 'active' },
  { holding_company_id: 'hanks-homes', address: '5405 W Wylie Ln, Boise, ID 83703', city: 'Boise', state: 'ID', zip: '83703', property_type: 'single-family', notes: 'Vacant Lot', bedrooms: 0, bathrooms: 0, sq_ft: 52272, year_built: null, estimated_value: 1000000, additional_insured: ['Pioneer FCU (1246)', 'Diane Barker Individual 401k Trust'], status: 'active' },
  { holding_company_id: 'hanks-homes', address: '5406 W Wylie Ln, Boise, ID 83703', city: 'Boise', state: 'ID', zip: '83703', property_type: 'single-family', notes: 'Associated with Diane Barker 401K Trust loan', bedrooms: null, bathrooms: null, sq_ft: null, year_built: null, estimated_value: null, additional_insured: [], status: 'active' },
  { holding_company_id: 'hanks-homes', address: '3231 Highway 55, New Meadows, ID 83654', city: 'New Meadows', state: 'ID', zip: '83654', property_type: 'short-term-rental', notes: 'Short-term rental', bedrooms: 4, bathrooms: 3, sq_ft: 2237, year_built: 1992, estimated_value: 800000, additional_insured: [], status: 'active' },
  { holding_company_id: 'hanks-homes', address: '49-541 Kamehameha Hwy, Kaneohe, HI 96744', city: 'Kaneohe', state: 'HI', zip: '96744', property_type: 'short-term-rental', notes: 'Short-term rental', bedrooms: 3, bathrooms: 2, sq_ft: 1050, year_built: 1983, estimated_value: 1900000, additional_insured: ['Loan Depot'], status: 'active' },
  { holding_company_id: 'hanks-homes', address: '750 N Locust St, Boise, ID 83712', city: 'Boise', state: 'ID', zip: '83712', property_type: 'mid-term-rental', notes: 'Mid-term Rental', bedrooms: 4, bathrooms: 4, sq_ft: 3056, year_built: 1975, estimated_value: 650000, additional_insured: [], status: 'active' },
  { holding_company_id: 'hanks-homes', address: '1412 N 15th St, Boise, ID 83702', city: 'Boise', state: 'ID', zip: '83702', property_type: 'single-family', notes: 'Fort Street LLC loan collateral', bedrooms: null, bathrooms: null, sq_ft: null, year_built: null, estimated_value: null, additional_insured: [], status: 'active' },

  // ─── Timber + Love Inc ─── (no real property held, construction entity)
  { holding_company_id: 'timber-and-love', address: '5160 W Wylie Ln, Boise, ID 83703', city: 'Boise', state: 'ID', zip: '83703', property_type: 'single-family', notes: 'Grady loan collateral', bedrooms: null, bathrooms: null, sq_ft: null, year_built: null, estimated_value: null, additional_insured: [], status: 'active' },
]

// ── Loans from "SUMMARY OF ALL LOANS PER LLC" ─────────────────────────────────

interface LoanSeed {
  holding_company_id: string
  lender: string
  loan_type: string | null
  payment_type: string | null
  paid_from_account: string | null
  collateral_address: string
  payment_terms: string | null
  principal_amount: number | null
  interest_rate: number | null
  monthly_payment: number | null
  first_payment_date: string | null
  maturity_date: string | null
  loan_term_years: number | null
  due_day: string
  notes: string | null
}

const LOANS: LoanSeed[] = [
  // ─── Due 1st of month ───
  { holding_company_id: 'hanks-homes', lender: 'Select Portfolio Servicing (SPC)', loan_type: 'mortgage', payment_type: 'manual', paid_from_account: 'Timber Collective - CapEd 17802699', collateral_address: '750 N Locust St, Boise, ID 83712', payment_terms: 'Principal, Interest & Escrow', principal_amount: 680000, interest_rate: null, monthly_payment: 5137.69, first_payment_date: '2025-10-01', maturity_date: null, loan_term_years: null, due_day: '1st', notes: null },
  { holding_company_id: 'hanks-homes', lender: 'Marvin E. Rodgers Jr. & Sharon L. Rodgers', loan_type: 'deed-of-trust', payment_type: 'autopay', paid_from_account: 'Hanks Homes - CapEd 0929', collateral_address: '3525 W State St, Boise, ID 83703', payment_terms: 'Monthly Interest-only payments', principal_amount: 176862.49, interest_rate: 0.075, monthly_payment: 2975, first_payment_date: null, maturity_date: null, loan_term_years: null, due_day: '1st', notes: null },
  { holding_company_id: 'hanks-homes', lender: 'Pioneer FCU Loan - 10001246', loan_type: 'mortgage', payment_type: 'autopay', paid_from_account: 'Hanks Homes - CapEd 0929', collateral_address: '5405 W Wylie Ln, Boise, ID 83703', payment_terms: 'Monthly Principal + Interest payments', principal_amount: 187500, interest_rate: 0.04875, monthly_payment: 2118.12, first_payment_date: null, maturity_date: '2035-03-01', loan_term_years: null, due_day: '1st', notes: null },
  { holding_company_id: 'hanks-homes', lender: 'Jayo Trust via Pioneer Title Co.', loan_type: 'title-loan', payment_type: 'autopay', paid_from_account: 'Hanks Homes - CapEd 0929', collateral_address: '107 N Hot Springs Dr, Boise, ID 83712', payment_terms: 'Monthly Principal + Interest payments', principal_amount: 354750, interest_rate: 0.095, monthly_payment: 1778, first_payment_date: '2023-04-01', maturity_date: null, loan_term_years: null, due_day: '1st', notes: null },
  { holding_company_id: 'hanks-homes', lender: 'Loan Depot', loan_type: 'mortgage', payment_type: 'autopay', paid_from_account: 'Timber Collective - CapEd 17802699', collateral_address: '49-541 Kamehameha Hwy, Kaneohe, HI 96744', payment_terms: 'Principal, Interest & Escrow', principal_amount: 741983.93, interest_rate: 0.035, monthly_payment: 4385.68, first_payment_date: '2023-04-05', maturity_date: null, loan_term_years: null, due_day: '1st', notes: null },
  { holding_company_id: 'hanks-homes', lender: 'SBA Loan - 134499-7900', loan_type: 'sba', payment_type: 'autopay', paid_from_account: 'Timber + Love - CapEd 3224', collateral_address: '3024 W Fairview, Boise, ID 83702', payment_terms: 'Monthly Principal + Interest payments', principal_amount: null, interest_rate: null, monthly_payment: 183, first_payment_date: null, maturity_date: null, loan_term_years: null, due_day: '1st', notes: null },
  { holding_company_id: 'invest-in-boise', lender: 'FCI Lender Services, Inc.', loan_type: 'mortgage', payment_type: 'autopay', paid_from_account: 'Invest in Boise - CapEd 9690', collateral_address: '495 S 3rd St E, Mountain Home, ID 83647', payment_terms: 'Monthly Interest-only payments', principal_amount: 380000, interest_rate: 0.12, monthly_payment: 3926.67, first_payment_date: '2023-07-01', maturity_date: '2026-06-30', loan_term_years: 3, due_day: '1st', notes: null },
  { holding_company_id: 'invest-in-boise', lender: 'SBA Loan - 697305-7808', loan_type: 'sba', payment_type: 'autopay', paid_from_account: 'Invest in Boise - CapEd 9690', collateral_address: '3020 W Fairview, Boise, ID 83702', payment_terms: 'Monthly Principal + Interest payments', principal_amount: 145067.15, interest_rate: 0.0375, monthly_payment: 726, first_payment_date: '2021-05-28', maturity_date: '2050-06-03', loan_term_years: 29, due_day: '1st', notes: null },
  { holding_company_id: 'invest-in-boise', lender: 'FCI Lender Services, Inc.', loan_type: 'mortgage', payment_type: 'manual', paid_from_account: 'Invest in Boise - CapEd 9690', collateral_address: '3003 N Water Run Ln, Boise, ID 83703', payment_terms: null, principal_amount: 44200, interest_rate: 0.1099, monthly_payment: 278.60, first_payment_date: null, maturity_date: '2026-08-01', loan_term_years: null, due_day: '1st', notes: null },
  { holding_company_id: 'invest-in-boise', lender: 'FCI Lender Services, Inc.', loan_type: 'mortgage', payment_type: 'manual', paid_from_account: 'Invest in Boise - CapEd 9690', collateral_address: '3051 N Water Run Ln, Boise, ID 83703', payment_terms: null, principal_amount: 44200, interest_rate: 0.1099, monthly_payment: 528.97, first_payment_date: null, maturity_date: '2026-08-01', loan_term_years: null, due_day: '1st', notes: null },
  { holding_company_id: 'timber-and-love', lender: 'Colony Insurance (Case #06433562)', loan_type: null, payment_type: 'autopay', paid_from_account: 'Timber + Love - CapEd 3224', collateral_address: '3024 W Fairview, Boise, ID 83702', payment_terms: null, principal_amount: null, interest_rate: null, monthly_payment: 2078.17, first_payment_date: null, maturity_date: null, loan_term_years: null, due_day: '1st', notes: 'Insurance payment' },
  { holding_company_id: 'timber-and-love', lender: 'SBA Loan 736094-7806', loan_type: 'sba', payment_type: 'autopay', paid_from_account: 'Timber + Love - CapEd 3224', collateral_address: '3024 W Fairview, Boise, ID 83702', payment_terms: 'Monthly Principal + Interest payments', principal_amount: 88100.64, interest_rate: 0.0375, monthly_payment: 444, first_payment_date: '2021-06-01', maturity_date: '2050-06-03', loan_term_years: 29, due_day: '1st', notes: null },
  { holding_company_id: 'tl-holdings', lender: 'SBA Loan - 718577-7805', loan_type: 'sba', payment_type: 'autopay', paid_from_account: 'T+L Holdings - CapEd 2024', collateral_address: '3024 W Fairview, Boise, ID 83702', payment_terms: 'Monthly Interest-only payments', principal_amount: 30800, interest_rate: 0.0375, monthly_payment: 151, first_payment_date: '2021-05-28', maturity_date: '2050-06-03', loan_term_years: 29, due_day: '1st', notes: null },
  { holding_company_id: 'tl-holdings', lender: 'JL Foster Roth, LLC (Debi Foster)', loan_type: 'private-money', payment_type: 'autopay', paid_from_account: 'T+L Holdings - CapEd 2024', collateral_address: '3020 W Fairview Ave, Boise, ID 83702', payment_terms: 'Monthly Interest-only payments', principal_amount: 500000, interest_rate: 0.09, monthly_payment: 3750, first_payment_date: '2023-09-01', maturity_date: '2024-05-31', loan_term_years: 1, due_day: '1st', notes: null },
  { holding_company_id: 'hanks-homes', lender: 'Nina (Hawaii Management)', loan_type: null, payment_type: 'venmo', paid_from_account: 'Chase 3103', collateral_address: '49-541 Kamehameha Hwy, Kaneohe, HI 96744', payment_terms: null, principal_amount: null, interest_rate: null, monthly_payment: 2000, first_payment_date: '2025-10-01', maturity_date: null, loan_term_years: null, due_day: '1st', notes: 'Hawaii property management' },

  // ─── Quarterly (1st of quarter) ───
  { holding_company_id: 'tl-holdings', lender: 'Beuklemen, Gerald', loan_type: 'private-money', payment_type: 'autopay', paid_from_account: 'T+L Holdings - CapEd 2024', collateral_address: '3020 W Fairview Ave, Boise, ID 83702', payment_terms: 'Quarterly Interest-only (Jan, Apr, Jul, Oct)', principal_amount: 510000, interest_rate: 0.07, monthly_payment: 4000, first_payment_date: null, maturity_date: '2029-06-30', loan_term_years: 5, due_day: '1st (quarterly)', notes: 'Quarterly payment: Jan 1, Apr 1, Jul 1, Oct 1' },
  { holding_company_id: 'tl-holdings', lender: 'Beuklemen, Gerald', loan_type: 'private-money', payment_type: 'autopay', paid_from_account: 'T+L Holdings - CapEd 2024', collateral_address: '3020 W Fairview Ave, Boise, ID 83702', payment_terms: 'Quarterly Interest-only (Feb, May, Aug, Nov)', principal_amount: 500000, interest_rate: 0.09, monthly_payment: 4000, first_payment_date: '2023-09-01', maturity_date: '2024-05-31', loan_term_years: 1, due_day: '1st (following quarter)', notes: 'Quarterly payment: Feb 1, May 1, Aug 1, Nov 1' },

  // ─── Due 5th of month ───
  { holding_company_id: 'invest-in-boise', lender: 'Thorsix, LLC (TitleOne)', loan_type: 'title-loan', payment_type: 'autopay', paid_from_account: 'Invest in Boise - CapEd 9690', collateral_address: '1706 N 26th St, Boise, ID 83702', payment_terms: 'Monthly Interest-only; Principal at end of 12 months', principal_amount: 500000, interest_rate: 0.08, monthly_payment: 3345.33, first_payment_date: '2023-12-04', maturity_date: '2025-12-05', loan_term_years: null, due_day: '5th', notes: 'TitleOne LTE Acct# 35000100186120' },
  { holding_company_id: 'invest-in-boise', lender: 'Fort Street LLC (David Jacobs)', loan_type: 'private-money', payment_type: 'ramp-bill-pay', paid_from_account: 'Invest in Boise - CapEd 9690', collateral_address: '1412 N 15th St, Boise, ID 83702', payment_terms: 'Monthly Interest-only payments', principal_amount: null, interest_rate: null, monthly_payment: 6875, first_payment_date: null, maturity_date: null, loan_term_years: null, due_day: '5th', notes: 'Need to setup autopay from CapEd' },
  { holding_company_id: 'hanks-homes', lender: 'Diane Barker - Individual 401K Trust', loan_type: 'private-money', payment_type: 'ramp-bill-pay', paid_from_account: 'Hanks Homes - CapEd 0929', collateral_address: '5406 W Wylie Ln, Boise, ID 83703', payment_terms: 'Monthly Interest-only payments', principal_amount: null, interest_rate: null, monthly_payment: 1416.67, first_payment_date: null, maturity_date: null, loan_term_years: null, due_day: '5th', notes: 'Need to setup autopay from CapEd' },
  { holding_company_id: 'tl-holdings', lender: 'Curt Beukleman', loan_type: 'private-money', payment_type: 'autopay', paid_from_account: 'T+L Holdings - CapEd 2024', collateral_address: '3020 W Fairview Ave, Boise, ID 83702', payment_terms: 'Monthly Interest-only payments', principal_amount: 130000, interest_rate: 0.08, monthly_payment: 5866.67, first_payment_date: '2023-06-01', maturity_date: '2024-05-31', loan_term_years: 1, due_day: '5th', notes: null },

  // ─── Due 8th of month ───
  { holding_company_id: 'invest-in-boise', lender: 'TitleOne - Ronald and Patricia E. Griep', loan_type: 'title-loan', payment_type: 'autopay', paid_from_account: 'Invest in Boise - CapEd 9690', collateral_address: '2615 W Heron St, Boise, ID 83702', payment_terms: 'Monthly Interest-only payments', principal_amount: 459765.75, interest_rate: 0.08, monthly_payment: 3077.10, first_payment_date: '2023-11-10', maturity_date: null, loan_term_years: null, due_day: '8th', notes: null },
  { holding_company_id: 'invest-in-boise', lender: 'Crescent Capital, LLC c/o Diane Barker', loan_type: 'title-loan', payment_type: 'ramp-bill-pay', paid_from_account: 'Invest in Boise - CapEd 9690', collateral_address: '1718 N 26th St, Boise, ID 83702', payment_terms: 'Monthly Interest-only payments', principal_amount: 350000, interest_rate: 0.085, monthly_payment: 2479.17, first_payment_date: '2023-04-08', maturity_date: '2024-04-07', loan_term_years: null, due_day: '8th', notes: null },

  // ─── Due 13th of month ───
  { holding_company_id: 'hanks-homes', lender: 'KeyBank-LOC (Acct 2652)', loan_type: 'line-of-credit', payment_type: 'autopay', paid_from_account: 'Hanks Homes - CapEd 0929', collateral_address: '3231 Highway 55, New Meadows, ID 83654', payment_terms: 'Monthly Principal + Interest payments', principal_amount: 418252.27, interest_rate: 0.07625, monthly_payment: 2409, first_payment_date: '2023-04-13', maturity_date: '2037-03-28', loan_term_years: null, due_day: '13th', notes: null },

  // ─── Due 15th of month ───
  { holding_company_id: 'hanks-homes', lender: 'CapEd LOC 8780-0302', loan_type: 'line-of-credit', payment_type: 'autopay', paid_from_account: 'Hanks Homes - CapEd 0929', collateral_address: '4611 W Clearview Dr, Boise, ID 83703 / 706 W Resseguie St, Boise, ID 83702', payment_terms: 'Monthly Principal + Interest payments', principal_amount: null, interest_rate: null, monthly_payment: 4290.21, first_payment_date: null, maturity_date: null, loan_term_years: null, due_day: '15th', notes: null },
  { holding_company_id: 'hanks-homes', lender: 'Randy Shelton', loan_type: 'private-money', payment_type: null, paid_from_account: null, collateral_address: '820 Riverside Ave, Grand View, ID 83624', payment_terms: 'Due at maturity', principal_amount: 250000, interest_rate: 0.10, monthly_payment: 0, first_payment_date: '2025-07-15', maturity_date: '2026-07-15', loan_term_years: 1, due_day: '15th', notes: 'Interest-only, due at maturity' },
  { holding_company_id: 'timber-and-love', lender: 'Edward C. Grady & Karen S. Grady', loan_type: 'deed-of-trust', payment_type: 'ramp-bill-pay', paid_from_account: 'Timber + Love - CapEd 3224', collateral_address: '5160 W Wylie Ln, Boise, ID 83703', payment_terms: 'Monthly Interest-only payments', principal_amount: 1500000, interest_rate: 0.08, monthly_payment: 3750, first_payment_date: '2023-04-28', maturity_date: '2025-04-28', loan_term_years: 1, due_day: '15th', notes: null },
  { holding_company_id: 'warm-springs-villa', lender: 'CapEd Loan 0301', loan_type: 'line-of-credit', payment_type: 'autopay', paid_from_account: 'Warm Springs Villa - CapEd 3030', collateral_address: '304 E Warm Springs Ave, Boise, ID 83712', payment_terms: 'Monthly Principal + Interest payments', principal_amount: 225000, interest_rate: 0.0625, monthly_payment: 3691.84, first_payment_date: null, maturity_date: '2048-05-01', loan_term_years: null, due_day: '15th', notes: null },

  // ─── Due 25th of month ───
  { holding_company_id: 'hanks-homes', lender: 'CapEd LOC 8780-0303', loan_type: 'line-of-credit', payment_type: 'autopay', paid_from_account: 'Hanks Homes - CapEd 0929', collateral_address: '424 W Thatcher St / 1704 N 31st St / 1321 S Cleveland St, Boise', payment_terms: 'Monthly Principal + Interest payments', principal_amount: null, interest_rate: null, monthly_payment: 5875, first_payment_date: null, maturity_date: null, loan_term_years: null, due_day: '25th', notes: null },
  { holding_company_id: 'hanks-homes', lender: 'KeyBank-LOC (Acct 1387)', loan_type: 'line-of-credit', payment_type: 'autopay', paid_from_account: 'Hanks Homes - CapEd 0929', collateral_address: '107 N Hot Springs Dr, Boise, ID 83712', payment_terms: 'Monthly Principal + Interest payments', principal_amount: null, interest_rate: 0.0389, monthly_payment: 2152.08, first_payment_date: '2021-02-22', maturity_date: null, loan_term_years: null, due_day: '25th', notes: null },
  { holding_company_id: 'timber-and-love', lender: 'Pioneer FCU - LOC #0001734913', loan_type: 'line-of-credit', payment_type: 'autopay', paid_from_account: 'Timber + Love - CapEd 3224', collateral_address: '', payment_terms: 'Monthly Principal + Interest payments', principal_amount: 1780805.57, interest_rate: 0.0389, monthly_payment: 1020, first_payment_date: '2021-02-22', maturity_date: null, loan_term_years: null, due_day: '25th', notes: null },
  { holding_company_id: 'tl-holdings', lender: 'CapEd Loan 5330-0301', loan_type: 'line-of-credit', payment_type: 'autopay', paid_from_account: 'T+L Holdings - CapEd 2024', collateral_address: '3020 W Fairview Ave, Boise, ID 83702', payment_terms: 'Monthly Principal + Interest payments', principal_amount: 592582.04, interest_rate: 0.0625, monthly_payment: 10138.61, first_payment_date: null, maturity_date: null, loan_term_years: null, due_day: '25th', notes: null },

  // ─── Due 29th of month ───
  { holding_company_id: 'invest-in-boise', lender: 'Diane Barker', loan_type: 'deed-of-trust', payment_type: 'ramp-bill-pay', paid_from_account: 'Invest in Boise - CapEd 9690', collateral_address: '1714 N 26th St, Boise, ID 83701', payment_terms: 'Monthly Interest-only payments', principal_amount: null, interest_rate: null, monthly_payment: 1239.58, first_payment_date: null, maturity_date: null, loan_term_years: null, due_day: '29th', notes: null },
  { holding_company_id: 'invest-in-boise', lender: 'Crescent Capital, LLC', loan_type: 'private-money', payment_type: 'mailed-check', paid_from_account: 'Invest in Boise - CapEd 9690', collateral_address: '11519 Roanoke Dr, Caldwell, ID 83605', payment_terms: 'Monthly Interest-only payments', principal_amount: 250000, interest_rate: null, monthly_payment: 1770.83, first_payment_date: '2025-09-29', maturity_date: '2026-08-28', loan_term_years: null, due_day: '29th', notes: null },
]

// ── Seed execution ───────────────────────────────────────────────────────────

function run() {
  console.log('Seeding properties and loans into mc.db ...\n')

  // Build address-to-property-id lookup
  const addressToId: Record<string, string> = {}

  const insertProperty = db.prepare(`
    INSERT OR IGNORE INTO properties
      (id, holding_company_id, address, city, state, zip, property_type, notes,
       bedrooms, bathrooms, sq_ft, year_built, estimated_value,
       additional_insured, status)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `)

  const insertLoan = db.prepare(`
    INSERT OR IGNORE INTO loans
      (id, property_id, holding_company_id, lender, loan_type, payment_type,
       paid_from_account, collateral_address, payment_terms, principal_amount,
       outstanding_balance, interest_rate, monthly_payment, issue_date,
       first_payment_date, due_day, maturity_date, loan_term_years, notes, status)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `)

  const insertProps = db.transaction(() => {
    for (const p of PROPERTIES) {
      const id = nanoid()
      insertProperty.run(
        id, p.holding_company_id, p.address, p.city, p.state, p.zip,
        p.property_type, p.notes, p.bedrooms, p.bathrooms, p.sq_ft,
        p.year_built, p.estimated_value,
        JSON.stringify(p.additional_insured), p.status
      )
      // Normalize address for lookup: lowercase, collapse spaces
      const normalized = p.address.toLowerCase().replace(/\s+/g, ' ').trim()
      addressToId[normalized] = id
      // Also store partial (street number + street name) for fuzzy matching
      const parts = p.address.split(',')[0].trim().toLowerCase()
      addressToId[parts] = id
    }
  })

  insertProps()
  console.log(`Inserted ${PROPERTIES.length} properties`)

  // Match loans to properties by collateral address
  function findPropertyId(collateral: string, holdingCompanyId: string): string | null {
    if (!collateral) return null
    const norm = collateral.toLowerCase().replace(/\s+/g, ' ').trim()

    // Direct match
    if (addressToId[norm]) return addressToId[norm]

    // Try matching by street part (before comma)
    const street = norm.split(',')[0].trim()
    if (addressToId[street]) return addressToId[street]

    // Fuzzy: check if any property address contains the key street
    for (const [key, id] of Object.entries(addressToId)) {
      if (key.includes(street) || street.includes(key)) return id
    }

    return null
  }

  const insertLoans = db.transaction(() => {
    for (const l of LOANS) {
      const id = nanoid()
      const propertyId = findPropertyId(l.collateral_address, l.holding_company_id)
      insertLoan.run(
        id, propertyId, l.holding_company_id, l.lender, l.loan_type,
        l.payment_type, l.paid_from_account, l.collateral_address,
        l.payment_terms, l.principal_amount, l.principal_amount,
        l.interest_rate, l.monthly_payment, null,
        l.first_payment_date, l.due_day, l.maturity_date,
        l.loan_term_years, l.notes, 'active'
      )
    }
  })

  insertLoans()
  console.log(`Inserted ${LOANS.length} loans`)

  // Summary
  const propCount = (db.prepare('SELECT COUNT(*) as c FROM properties').get() as { c: number }).c
  const loanCount = (db.prepare('SELECT COUNT(*) as c FROM loans').get() as { c: number }).c
  const totalMonthly = (db.prepare('SELECT SUM(monthly_payment) as s FROM loans WHERE status = \'active\'').get() as { s: number }).s

  console.log(`\nDatabase summary:`)
  console.log(`  Properties: ${propCount}`)
  console.log(`  Loans: ${loanCount}`)
  console.log(`  Total monthly obligations: $${(totalMonthly || 0).toLocaleString()}`)
  console.log(`\nDone.`)
}

run()
