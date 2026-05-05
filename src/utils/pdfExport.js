import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const categoryMap = {
  Food: 'Comida', Shopping: 'Compras', Housing: 'Vivienda',
  Transport: 'Transporte', Salary: 'Sueldo', Other: 'Otros', Transferencia: 'Transferencia',
};

export const exportToPdf = (transactions, activeAccount, currentMonthDate, balance, income, expense) => {
  try {
    const doc = new jsPDF();
    const currency = activeAccount?.currency || 'ARS';
    const monthStr = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(currentMonthDate);
    const monthLabel = monthStr.charAt(0).toUpperCase() + monthStr.slice(1);

    const violet = [139, 92, 246];
    const cyan   = [6, 182, 212];
    const dark   = [15, 23, 42];
    const gray   = [100, 116, 139];
    const white  = [255, 255, 255];

    // ── Background header ──────────────────────────────────────────────────────
    doc.setFillColor(...dark);
    doc.rect(0, 0, 210, 40, 'F');

    doc.setFillColor(...violet);
    doc.rect(0, 40, 210, 2, 'F');

    // ── Title ──────────────────────────────────────────────────────────────────
    doc.setFontSize(22);
    doc.setTextColor(...white);
    doc.setFont('helvetica', 'bold');
    doc.text('Lumina Pro', 14, 18);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...cyan);
    doc.text(`Resumen Mensual — ${monthLabel}`, 14, 27);
    doc.text(`Cuenta: ${activeAccount?.name || 'Personal'} (${currency})`, 14, 35);

    // ── Summary cards ─────────────────────────────────────────────────────────
    const fmt = (n) => `$ ${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const cardY = 50;
    const cardH = 22;
    const cardW = 58;
    const gap   = 8;

    const cards = [
      { label: 'Ingresos',  value: fmt(income),  color: [16, 185, 129] },
      { label: 'Gastos',    value: fmt(expense),  color: [239, 68, 68] },
      { label: 'Balance',   value: fmt(balance),  color: [...violet] },
    ];

    cards.forEach(({ label, value, color }, i) => {
      const x = 14 + i * (cardW + gap);
      doc.setFillColor(245, 245, 255);
      doc.roundedRect(x, cardY, cardW, cardH, 3, 3, 'F');
      doc.setFillColor(...color);
      doc.roundedRect(x, cardY, 4, cardH, 2, 0, 'F');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...gray);
      doc.text(label.toUpperCase(), x + 8, cardY + 8);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...color);
      doc.text(value, x + 8, cardY + 17);
    });

    // ── Table ─────────────────────────────────────────────────────────────────
    const rows = transactions
      .filter(t => t.type !== 'transfer')
      .map(t => [
        new Date(t.date).toLocaleDateString('es-AR'),
        t.description || '—',
        categoryMap[t.category] || t.category || '—',
        t.type === 'income' ? 'Ingreso' : 'Gasto',
        (t.type === 'income' ? '+' : '-') + fmt(t.amount),
      ]);

    autoTable(doc, {
      head: [['Fecha', 'Descripción', 'Categoría', 'Tipo', 'Monto']],
      body: rows,
      startY: cardY + cardH + 10,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 4, textColor: [50, 50, 50] },
      headStyles: {
        fillColor: violet,
        textColor: white,
        fontStyle: 'bold',
        fontSize: 9,
      },
      alternateRowStyles: { fillColor: [248, 247, 255] },
      columnStyles: {
        0: { cellWidth: 24 },
        2: { cellWidth: 28 },
        3: { cellWidth: 22 },
        4: { cellWidth: 34, halign: 'right' },
      },
    });

    // ── Footer ─────────────────────────────────────────────────────────────────
    const pageCount = doc.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setFontSize(8);
      doc.setTextColor(...gray);
      doc.text(
        `Generado por Lumina Pro · ${new Date().toLocaleDateString('es-AR')}`,
        14, doc.internal.pageSize.height - 8
      );
      doc.text(`${p} / ${pageCount}`, 196, doc.internal.pageSize.height - 8, { align: 'right' });
    }

    doc.save(`lumina-${monthLabel.replace(' ', '-').toLowerCase()}.pdf`);
  } catch (error) {
    console.error('Error al generar PDF:', error);
    alert('No se pudo generar el PDF. Asegurate de tener transacciones en este mes.');
  }
};

