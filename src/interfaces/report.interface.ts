export interface IMonthlyReportQuery {
  month?: string; // YYYY-MM, defaults to the current Lagos month
}

export interface IExpenseReportQuery {
  from?: string; // YYYY-MM-DD
  to?: string;
}
