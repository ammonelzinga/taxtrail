// Optional native OCR service using react-native-mlkit-ocr
// Installation (requires Custom Dev Client):
//   npm i react-native-mlkit-ocr
//   npx expo prebuild
//   npx expo run:android   (or run:ios on macOS)

export type OCRResult = { text: string };

export async function parseImageWithMLKit(localUri: string): Promise<OCRResult> {
  let MLKit: any;
  try {
    MLKit = require('react-native-mlkit-ocr');
  } catch (e) {
    throw new Error('react-native-mlkit-ocr is not installed. See README Native Modules section.');
  }
  // react-native-mlkit-ocr exposes recognize(localImagePath)
  const blocks = await MLKit.recognize(localUri);
  const text = (blocks || []).map((b: any) => b.text).join('\n');
  return { text };
}
