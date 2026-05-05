import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const exportToPdf = (transactions, activeAccount, currentMonthDate, balance, income, expense) => {
  const doc = new jsPDF();
  const currency = activeAccount?.currency || 'ARS';
  const monthStr = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(currentMonthDate);

  // Colors
  const primaryColor = [139, 92, 246]; // Violeta
  const textColor = [50, 50, 50];

  // Header
  doc.setFontSize(22);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Lumina Expenses', 14, 20);

  doc.setFontSize(14);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(`Resumen Mensual - ${monthStr.charAt(0).toUpperCase() + monthStr.slice(1)}`, 14, 30);
  doc.text(`Cuenta: ${activeAccount?.name || 'Personal'} (${currency})`, 14, 38);

  // Summary Cards
  doc.setFontSize(12);
  doc.text(`Ingresos: ${income.toFixed(2)}`, 14, 50);
  doc.text(`Gastos: ${expense.toFixed(2)}`, 80, 50);
  doc.text(`Balance Total: ${balance.toFixed(2)}`, 150, 50);

  // Table
  const tableColumn = ["Fecha", "Descripción", "Categoría", "Tipo", "Monto"];
  const tableRows = [];

  transactions.forEach(t => {
    const txData = [
      new Date(t.date).toLocaleDateString('es-AR'),
      t.description,
      t.category,
      t.type === 'income' ? 'Ingreso' : 'Gasto',
      `${t.type === 'income' ? '+' : '-'}${t.amount.toFixed(2)}`
    ];
    tableRows.push(txData);
  });

  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 60,
    theme: 'grid',
    styles: { fontSize: 10 },
    headStyles: { fillColor: primaryColor }
  });

  doc.save(`lumina-reporte-${monthStr.replace(' ', '-')}.pdf`);
};
