import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export interface ReportTicketRow {
  ticket_id: number;
  title: string;
  category: string;
  priority: string;
  status: string;
  location: string;
  reporter: string;
  technician: string;
  created_at: string;
  resolved_at: string;
  duration_hours: number;
}

/**
 * Generate formatted PDF maintenance audit report
 */
export function exportTicketsToPdf(
  rows: ReportTicketRow[],
  filterMeta: { startDate?: string; endDate?: string; categoryName?: string; statusName?: string } = {}
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Header banner
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, 297, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('CAMPUS FACILITIES & OPERATIONS DIRECTORATE', 14, 12);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Maintenance Work Order Audit & Performance Summary', 14, 18);

  const timestamp = new Date().toLocaleString();
  doc.text(`Generated: ${timestamp}`, 283, 18, { align: 'right' });

  // Filter Subheading
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  let filterDesc = 'Report Scope: All Campus Records';
  if (filterMeta.startDate || filterMeta.endDate) {
    filterDesc = `Date Range: ${filterMeta.startDate || 'Beginning'} to ${filterMeta.endDate || 'Present'}`;
  }
  if (filterMeta.categoryName) {
    filterDesc += ` | Category: ${filterMeta.categoryName}`;
  }
  if (filterMeta.statusName) {
    filterDesc += ` | Status: ${filterMeta.statusName}`;
  }
  doc.text(filterDesc, 14, 32);

  // Summary Metrics Banner
  const total = rows.length;
  const resolved = rows.filter((r) => r.status === 'Resolved' || r.status === 'Closed').length;
  const critical = rows.filter((r) => r.priority === 'Critical').length;
  const avgHours =
    resolved > 0
      ? (rows.filter((r) => r.status === 'Resolved' || r.status === 'Closed').reduce((acc, r) => acc + (Number(r.duration_hours) || 0), 0) / resolved).toFixed(1)
      : '0.0';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Total Tickets: ${total}   |   Resolved/Closed: ${resolved}   |   Critical Priority: ${critical}   |   Avg Resolution: ${avgHours} hrs`, 14, 38);

  // Table Data
  const tableData = rows.map((r) => [
    `#${r.ticket_id}`,
    r.title.length > 36 ? r.title.substring(0, 36) + '...' : r.title,
    r.category,
    r.priority,
    r.status,
    r.location.length > 24 ? r.location.substring(0, 24) + '...' : r.location,
    r.reporter,
    r.technician,
    new Date(r.created_at).toLocaleDateString(),
    r.resolved_at !== 'N/A' ? new Date(r.resolved_at).toLocaleDateString() : '—',
  ]);

  autoTable(doc, {
    startY: 42,
    head: [['ID', 'Work Order Title', 'Category', 'Priority', 'Status', 'Location', 'Reporter', 'Technician', 'Created', 'Resolved']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235], // Blue-600
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 14, fontStyle: 'bold' },
      1: { cellWidth: 58 },
      2: { cellWidth: 24 },
      3: { cellWidth: 18 },
      4: { cellWidth: 22 },
      5: { cellWidth: 45 },
      6: { cellWidth: 30 },
      7: { cellWidth: 30 },
      8: { cellWidth: 24 },
      9: { cellWidth: 24 },
    },
    didDrawPage: (data) => {
      // Footer page numbering
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `University Maintenance Operations · Confidential Internal Audit · Page ${data.pageNumber} of ${pageCount}`,
        14,
        205
      );
    },
  });

  const filename = `campus_maintenance_report_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

/**
 * Generate formatted Excel (.xlsx) workbook
 */
export function exportTicketsToExcel(
  rows: ReportTicketRow[],
  filename: string = `campus_maintenance_work_orders_${new Date().toISOString().split('T')[0]}.xlsx`
) {
  const formattedData = rows.map((r) => ({
    'Ticket ID': r.ticket_id,
    'Title': r.title,
    'Category': r.category,
    'Priority': r.priority,
    'Status': r.status,
    'Location': r.location,
    'Reporter': r.reporter,
    'Assigned Technician': r.technician,
    'Created At': r.created_at,
    'Resolved At': r.resolved_at,
    'Duration (Hours)': r.duration_hours,
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 10 },
    { wch: 40 },
    { wch: 15 },
    { wch: 12 },
    { wch: 14 },
    { wch: 30 },
    { wch: 20 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 16 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Maintenance Work Orders');

  XLSX.writeFile(workbook, filename);
}
