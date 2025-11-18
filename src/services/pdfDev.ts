import * as Asset from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { PDFDocument, PDFField, PDFTextField, PDFCheckBox, PDFDropdown, PDFRadioGroup, PDFOptionList } from 'pdf-lib';

type FieldInfo = { name: string; type: string; value?: string };

async function loadAssetArrayBuffer(moduleId: any): Promise<ArrayBuffer> {
  const asset = Asset.Asset.fromModule(moduleId);
  await asset.downloadAsync();
  const resp = await fetch(asset.localUri!);
  return await resp.arrayBuffer();
}

export async function listFormFieldsFromModule(moduleId: any): Promise<FieldInfo[]> {
  const ab = await loadAssetArrayBuffer(moduleId);
  const pdfDoc = await PDFDocument.load(ab);
  const form = pdfDoc.getForm();
  const fields = form.getFields();
  const result: FieldInfo[] = [];
  for (const f of fields) {
    const name = f.getName();
    let type = 'unknown';
    let value: string | undefined = undefined;
    if (f instanceof PDFTextField) {
      type = 'text';
      try { value = (f as PDFTextField).getText(); } catch {}
    } else if (f instanceof PDFCheckBox) {
      type = 'checkbox';
    } else if (f instanceof PDFDropdown) {
      type = 'dropdown';
    } else if (f instanceof PDFRadioGroup) {
      type = 'radio';
    } else if (f instanceof PDFOptionList) {
      type = 'optionlist';
    } else {
      type = (f as any)?.constructor?.name || 'unknown';
    }
    result.push({ name, type, value });
  }
  return result;
}

export async function fillAllTextFields(moduleId: any, filler: (name: string) => string = (n) => n): Promise<string> {
  const ab = await loadAssetArrayBuffer(moduleId);
  const pdfDoc = await PDFDocument.load(ab);
  const form = pdfDoc.getForm();
  for (const f of form.getFields()) {
    if (f instanceof PDFTextField) {
      try { (f as PDFTextField).setText(filler(f.getName())); } catch {}
    }
  }
  const bytes = await pdfDoc.save();
  const base64 = (function bytesToBase64(bytes: Uint8Array) {
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
  })(bytes);
  const dir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory || '';
  const out = dir + `PDF_Preview_${Date.now()}.pdf`;
  await FileSystem.writeAsStringAsync(out, base64, { encoding: 'base64' as any });
  return out;
}
