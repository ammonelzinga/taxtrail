import { supabase } from '@/services/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

export async function getSignedReceiptUrl(path: string, expiresInSeconds = 600) {
  const { data, error } = await supabase.storage.from('receipts').createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

export async function getSignedUrl(bucket: string, path: string, expiresInSeconds = 600) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

export async function uploadFromUri(bucket: string, path: string, uri: string, contentType: string) {
  let body: Blob | ArrayBuffer | Uint8Array;
  const isFileUri = uri.startsWith('file://');
  if (isFileUri) {
    // Prefer direct base64 read for file URIs in RN to avoid fetch(blob) pitfalls
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' as any });
    body = base64ToUint8Array(base64);
  } else {
    try {
      const resp = await fetch(uri);
      if (typeof (resp as any).blob === 'function') {
        body = await (resp as any).blob();
      } else if (typeof resp.arrayBuffer === 'function') {
        body = await resp.arrayBuffer();
      } else {
        // Last resort
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' as any });
        body = base64ToUint8Array(base64);
      }
    } catch {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' as any });
      body = base64ToUint8Array(base64);
    }
  }
  const { error } = await supabase.storage.from(bucket).upload(path, body as any, { contentType });
  if (error) throw error;
}

function base64ToUint8Array(base64: string) {
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
