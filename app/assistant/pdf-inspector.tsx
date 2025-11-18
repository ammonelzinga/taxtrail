import React, { useMemo, useState } from 'react';
import { View, Text, Alert, FlatList } from 'react-native';
import { Button } from '@/components/Button';
import { listFormFieldsFromModule, fillAllTextFields } from '@/services/pdfDev';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { uploadFromUri } from '@/services/storage';

type FormAsset = { key: string; label: string; moduleId?: any };
// Metro requires static require() calls; use literal paths with try/catch per asset.
let WORKSHEET_2025: any | undefined;
try { WORKSHEET_2025 = require('../../assets/1040ES_Worksheet_2025.pdf'); } catch {}

let RECORD_2025: any | undefined;
try { RECORD_2025 = require('../../assets/Record_EstimatedTaxPayments_2025.pdf'); } catch {}

let VOUCHER_2025: any | undefined;
try { VOUCHER_2025 = require('../../assets/1040ES_PaymentVoucher_2025.pdf'); } catch {}

let UNIFIED: any | undefined;
try { UNIFIED = require('../../assets/form1040esFillable.pdf'); } catch {}

const forms: FormAsset[] = [
  { key: 'worksheet', label: '1040-ES Worksheet (2025)', moduleId: WORKSHEET_2025 },
  { key: 'record', label: 'Record of Estimated Tax Payments (2025)', moduleId: RECORD_2025 },
  { key: 'voucher', label: '1040-ES Payment Voucher (2025)', moduleId: VOUCHER_2025 },
  { key: 'unified', label: 'Unified 1040-ES (fillable booklet)', moduleId: UNIFIED },
];

export default function PdfInspector() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<FormAsset>(forms[0]);
  const [fields, setFields] = useState<Array<{ name: string; type: string; value?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const missing = !selected?.moduleId;

  const onScan = async () => {
    if (missing) { Alert.alert('Template missing', 'Place the PDF in assets and try again.'); return; }
    try {
      setLoading(true);
      const res = await listFormFieldsFromModule(selected.moduleId);
      setFields(res);
    } catch (e: any) {
      Alert.alert('Scan failed', e.message);
    } finally { setLoading(false); }
  };

  const onFillPreview = async () => {
    if (missing) { Alert.alert('Template missing', 'Place the PDF in assets and try again.'); return; }
    try {
      setLoading(true);
      const uri = await fillAllTextFields(selected.moduleId, (n) => `sample:${n}`);
      if (!user) {
        Alert.alert('Preview created', `Saved locally at: ${uri}`);
        return;
      }
      const path = `${user.id}/forms/DEV_${selected.key}_${Date.now()}.pdf`;
      await uploadFromUri('forms', path, uri, 'application/pdf');
      Alert.alert('Preview uploaded', `Saved to forms bucket at: ${path}`);
    } catch (e: any) {
      Alert.alert('Preview failed', e.message);
    } finally { setLoading(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0B0F14', padding: 16 }}>
      <Text style={{ color: 'white', fontSize: 20, fontWeight: '700', marginBottom: 12 }}>PDF Field Inspector</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {forms.map((f) => (
          <Button key={f.key} title={f.label} onPress={() => setSelected(f)} variant={selected.key === f.key ? 'primary' : 'secondary'} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <Button title={loading ? 'Scanning…' : 'List Fields'} onPress={onScan} />
        <Button variant="secondary" title={loading ? 'Working…' : 'Fill Sample & Save'} onPress={onFillPreview} />
      </View>
      {missing ? (
        <Text style={{ color: '#FFB020' }}>Template not found in assets. See assets/1040es_template.md</Text>
      ) : (
        <FlatList
          data={fields}
          keyExtractor={(item) => item.name}
          renderItem={({ item }) => (
            <View style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1A2530' }}>
              <Text style={{ color: 'white' }}>{item.name}</Text>
              <Text style={{ color: '#9AA4AE' }}>{item.type}{item.value ? ` • ${item.value}` : ''}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={{ color: '#6C7783' }}>No AcroForm fields found. Many IRS PDFs are non-fillable/XFA. We’ll overlay values when generating.</Text>}
        />
      )}
    </View>
  );
}
