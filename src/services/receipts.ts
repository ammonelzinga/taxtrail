import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '@/services/supabase';
import Constants from 'expo-constants';
import { parseImageWithMLKit } from '@/services/ocr';
import { Platform } from 'react-native';

export type ParsedReceipt = {
  merchant?: string;
  date?: string; // ISO
  lineItems?: { description: string; amount?: number }[];
  total?: number;
};

export async function pickReceiptImage(): Promise<ImagePicker.ImagePickerAsset | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (perm.status !== 'granted') {
    throw new Error('Camera permission not granted');
  }
  const res = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8
  });
  if (res.canceled) return null;
  return res.assets[0];
}

export async function uploadReceiptToStorage(userId: string, localUri: string) {
  const fileName = `${userId}/${Date.now()}.jpg`;
  let uploadBody: Blob | ArrayBuffer | Uint8Array;
  if (localUri.startsWith('file://')) {
    const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: 'base64' as any });
    uploadBody = base64ToUint8Array(base64);
  } else {
    try {
      const response = await fetch(localUri);
      if (typeof (response as any).blob === 'function') {
        uploadBody = await (response as any).blob();
      } else if (typeof response.arrayBuffer === 'function') {
        uploadBody = await response.arrayBuffer();
      } else {
        const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: 'base64' as any });
        uploadBody = base64ToUint8Array(base64);
      }
    } catch {
      const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: 'base64' as any });
      uploadBody = base64ToUint8Array(base64);
    }
  }

  const { data, error } = await supabase.storage
    .from('receipts')
    .upload(fileName, uploadBody as any, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  const { data: signed, error: signErr } = await supabase.storage
    .from('receipts')
    .createSignedUrl(data.path, 60 * 10);
  if (signErr) return { path: data.path };
  return { path: data.path, signedUrl: signed.signedUrl };
}

function base64ToUint8Array(base64: string) {
  // Polyfill decode without relying on Buffer/atob
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output: number[] = [];
  let i = 0;
  base64 = base64.replace(/[^A-Za-z0-9+/=]/g, '');
  while (i < base64.length) {
    const enc1 = chars.indexOf(base64.charAt(i++));
    const enc2 = chars.indexOf(base64.charAt(i++));
    const enc3 = chars.indexOf(base64.charAt(i++));
    const enc4 = chars.indexOf(base64.charAt(i++));
    const chr1 = (enc1 << 2) | (enc2 >> 4);
    const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const chr3 = ((enc3 & 3) << 6) | enc4;
    output.push(chr1);
    if (enc3 !== 64) output.push(chr2);
    if (enc4 !== 64) output.push(chr3);
  }
  return new Uint8Array(output);
}

export async function parseReceiptAIFromLocal(localUri: string): Promise<ParsedReceipt> {
  const extra = (Constants.expoConfig?.extra || {}) as any;
  const apiKey = extra.OPENAI_API_KEY as string;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');
  // Convert local file to base64 data URL so OpenAI can access image without a public URL
  const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });

  // Using Chat Completions with JSON schema-like output (simplified)
  const body = {
    model: 'gpt-4.1-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You extract structured data from receipt images in JSON.' },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Extract merchant, date (ISO), line items and total.' },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }
        ]
      }
    ]
  } as any;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error('OpenAI request failed');
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  try {
    const parsed = JSON.parse(content);
    return parsed as ParsedReceipt;
  } catch {
    return {} as ParsedReceipt;
  }
}

export async function parseReceiptOCR(localUri: string): Promise<ParsedReceipt> {
  // Implementation using ML Kit OCR if installed
  const { text } = await parseImageWithMLKit(localUri);
  // Very simple heuristics: find total by largest $/number pattern, find date, guess merchant from first line
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const merchant = lines[0] || undefined;
  const totalMatch = text.match(/\$?\s?(\d{1,3}(?:[\,\s]\d{3})*(?:\.\d{2})|\d+\.\d{2})\b/g);
  let total: number | undefined = undefined;
  if (totalMatch && totalMatch.length) {
    const nums = totalMatch.map((s) => Number((s.replace(/[^0-9.]/g, '')) || 0)).filter((n) => !isNaN(n));
    total = nums.length ? Math.max(...nums) : undefined;
  }
  const dateMatch = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
  let date: string | undefined;
  if (dateMatch) {
    const d = new Date(dateMatch[1].replace(/-/g, '/'));
    if (!isNaN(d.getTime())) date = d.toISOString().slice(0, 10);
  }
  return { merchant, total, date, lineItems: [] };
}
