import * as Asset from 'expo-asset';
import * as FileSystem from 'expo-file-system';
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
  const base64 = await pdfDoc.saveAsBase64({ dataUri: false });
  const out = FileSystem.cacheDirectory + `PDF_Preview_${Date.now()}.pdf`;
  await FileSystem.writeAsStringAsync(out, base64, { encoding: FileSystem.EncodingType.Base64 });
  return out;
}
