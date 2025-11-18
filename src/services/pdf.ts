import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as FileSystem from 'expo-file-system/legacy';
import * as Asset from 'expo-asset';

export async function generate1040ESPDF(data: {
  name?: string;
  ssn?: string;
  quarterlyPayment: number;
}) {
  // If assets/1040ES.pdf exists, load and fill it; else fallback to a simple PDF
  let base64: string;
  const bytesToBase64 = (bytes: Uint8Array) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let output = '';
    let i = 0;
    const len = bytes.length;
    while (i < len) {
      const b1 = bytes[i++] ?? 0;
      const b2 = bytes[i++] ?? 0;
      const b3 = bytes[i++] ?? 0;
      const triplet = (b1 << 16) | (b2 << 8) | b3;
      const enc1 = (triplet >> 18) & 0x3f;
      const enc2 = (triplet >> 12) & 0x3f;
      const enc3 = (triplet >> 6) & 0x3f;
      const enc4 = triplet & 0x3f;
      output += chars.charAt(enc1) + chars.charAt(enc2) + chars.charAt(enc3) + chars.charAt(enc4);
    }
    const mod = len % 3;
    if (mod > 0) output = output.slice(0, mod === 1 ? -2 : -1) + (mod === 1 ? '==' : '=');
    return output;
  };
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
    const bytes = await pdfDoc.save();
    base64 = bytesToBase64(bytes);
  } catch (e) {
    // Fallback: simple generated doc
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    page.drawText('Form 1040-ES Estimated Tax Voucher (Simplified)', { x: 50, y: 740, size: 18, font, color: rgb(0, 0.2, 0.6) });
    page.drawText(`Name: ${data.name || ''}`, { x: 50, y: 700, size: 12, font });
    page.drawText(`SSN: ${data.ssn || ''}`, { x: 50, y: 680, size: 12, font });
    page.drawText(`Quarterly Payment: $${data.quarterlyPayment.toFixed(2)}`, { x: 50, y: 660, size: 14, font });
    const bytes = await pdfDoc.save();
    base64 = bytesToBase64(bytes);
  }
  const dir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory || '';
  const fileUri = dir + `1040es_${Date.now()}.pdf`;
  await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: 'base64' as any });
  return fileUri;
}
