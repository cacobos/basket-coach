import { Injectable } from '@angular/core';
import type { Payment, PlayerFee } from '../../../core/models/models';

@Injectable({ providedIn: 'root' })
export class ReceiptService {
  async generateReceipt(payment: Payment, fee: PlayerFee, playerName: string, clubName: string): Promise<void> {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageW = pdf.internal.pageSize.getWidth();
    const margin = 20;
    let y = margin;

    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.text('RECIBO DE PAGO', pageW / 2, y, { align: 'center' });
    y += 14;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(clubName, pageW / 2, y, { align: 'center' });
    y += 8;
    pdf.setFontSize(8);
    pdf.text(new Date(payment.paid_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }), pageW / 2, y, { align: 'center' });
    y += 16;

    pdf.setDrawColor(189, 194, 255);
    pdf.setLineWidth(0.5);
    pdf.line(margin, y, pageW - margin, y);
    y += 8;

    const leftX = margin;
    const rightX = pageW / 2 + 10;
    const colW = pageW / 2 - margin - 10;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');

    const rows: { label: string; value: string }[] = [
      { label: 'Jugador', value: playerName },
      { label: 'Concepto', value: fee.fee_plan_id ? 'Cuota' : 'Pago' },
      { label: 'Importe', value: `${payment.amount.toFixed(2)} €` },
      { label: 'Método de pago', value: this.methodLabel(payment.method) },
      { label: 'Fecha de pago', value: new Date(payment.paid_at).toLocaleDateString('es-ES') },
      { label: 'Referencia', value: payment.id.slice(0, 8).toUpperCase() },
    ];

    for (const row of rows) {
      const col = y;
      pdf.setFont('helvetica', 'bold');
      pdf.text(row.label, leftX, col);
      pdf.setFont('helvetica', 'normal');
      pdf.text(row.value, rightX, col);
      y += 7;
    }

    y += 8;
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.3);
    pdf.line(margin, y, pageW - margin, y);
    y += 8;

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(150, 150, 150);
    pdf.text('Este recibo es un comprobante de pago generado por BasketFlow.', pageW / 2, y, { align: 'center' });
    y += 4;
    pdf.text('No tiene validez fiscal a menos que así lo acuerde el club.', pageW / 2, y, { align: 'center' });

    pdf.save(`recibo-${payment.id.slice(0, 8)}.pdf`);
  }

  private methodLabel(m: string): string {
    const map: Record<string, string> = { transfer: 'Transferencia', cash: 'Efectivo', bizum: 'Bizum', other: 'Otro' };
    return map[m] || m;
  }
}
