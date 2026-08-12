import { writeXlsxFile } from 'xlsx';

export function generateBestWorstReports() {
  const data = [];
  // Assume data is populated with objects containing 'name', 'score', 'area_manager', 'nation', and 'garderobe' fields

  // Define column order with new specifications
  const columns = ['name', 'score', 'area_manager', 'nation', 'garderobe'];

  // Map data to column order
  const formattedData = data.map(item => ({
    name: item.name,
    score: item.score,
    area_manager: item.area_manager,
    nation: item.nation,
    garderobe: item.garderobe
  }));

  // Write to Excel file
  writeXlsxFile(formattedData, {
    fileName: 'best_worst_reports.xlsx',
    sheet: 'Reports',
    columns
  });
}
