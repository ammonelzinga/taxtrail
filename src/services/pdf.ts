import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as FileSystem from 'expo-file-system';
import * as Asset from 'expo-asset';

export async function generate1040ESPDF(data: {
  name?: string;
  ssn?: string;
  quarterlyPayment: number;
}) {
  // If assets/1040ES.pdf exists, load and fill it; else fallback to a simple PDF
  let base64: string;
  try {
    const moduleId = require('../../assets/1040ES.pdf');
    const asset = Asset.Asset.fromModule(moduleId);
    await asset.downloadAsync();
    const resp = await fetch(asset.localUri!);
    const ab = await resp.arrayBuffer();
    const pdfDoc = await PDFDocument.load(ab);
    const form = pdfDoc.getForm();
    try { form.getTextField('name').setText(data.name || ''); } catch {}
    try { form.getTextField('ssn').setText(data.ssn || ''); } catch {}
    try { form.getTextField('amount').setText(data.quarterlyPayment.toFixed(2)); } catch {}
    base64 = await pdfDoc.saveAsBase64({ dataUri: false });
  } catch (e) {
    // Fallback: simple generated doc
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    page.drawText('Form 1040-ES Estimated Tax Voucher (Simplified)', { x: 50, y: 740, size: 18, font, color: rgb(0, 0.2, 0.6) });
    page.drawText(`Name: ${data.name || ''}`, { x: 50, y: 700, size: 12, font });
    page.drawText(`SSN: ${data.ssn || ''}`, { x: 50, y: 680, size: 12, font });
    page.drawText(`Quarterly Payment: $${data.quarterlyPayment.toFixed(2)}`, { x: 50, y: 660, size: 14, font });
    base64 = await pdfDoc.saveAsBase64({ dataUri: false });
  }
  const fileUri = FileSystem.cacheDirectory + `1040es_${Date.now()}.pdf`;
  await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: 'base64' });
  return fileUri;
}
