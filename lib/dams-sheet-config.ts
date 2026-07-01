/** Google Sheets source for Talagang small dams water levels. */

export const DEFAULT_DAMS_SPREADSHEET_ID =
  "1AQZ2xKvRQ_-mBEE5AT0jg931WCJaDJXcyVjtXOFhYDA";

export const DEFAULT_DAMS_WORKSHEET_NAME = "Sheet1";

export function damsSpreadsheetUrl(spreadsheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}
