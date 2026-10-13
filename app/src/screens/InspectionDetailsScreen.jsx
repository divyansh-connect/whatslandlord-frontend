import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { WebView } from 'react-native-webview';
import apiClient from '../api/client';
import { useAuthStore } from '../store/useStore';
import { useThemeColors } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

const signatureHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #0f172a; }
    canvas { width: 100%; height: 100%; display: block; background: #1e293b; cursor: crosshair; }
  </style>
</head>
<body>
  <canvas id="sig-canvas"></canvas>
  <script>
    const canvas = document.getElementById('sig-canvas');
    const ctx = canvas.getContext('2d');
    
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    };
    
    window.addEventListener('resize', resizeCanvas);
    setTimeout(resizeCanvas, 150);
    
    let drawing = false;
    let lastX = 0;
    let lastY = 0;
    
    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    };
    
    const startDrawing = (e) => {
      drawing = true;
      const pos = getPos(e);
      lastX = pos.x;
      lastY = pos.y;
    };
    
    const draw = (e) => {
      if (!drawing) return;
      e.preventDefault();
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastX = pos.x;
      lastY = pos.y;
    };
    
    const stopDrawing = () => {
      if (!drawing) return;
      drawing = false;
      const dataUrl = canvas.toDataURL('image/png');
      window.ReactNativeWebView.postMessage(dataUrl);
    };
    
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    
    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);
    
    window.addEventListener('message', (e) => {
      if (e.data === 'clear') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        window.ReactNativeWebView.postMessage('');
      }
    });
  </script>
</body>
</html>
`;

export const InspectionDetailsScreen = ({ inspectionId, onNavigate }) => {
  const { logout, refreshAccessToken } = useAuthStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [inspection, setInspection] = useState(null);
  
  // Local list of rooms & items
  const [rooms, setRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState('');
  const [overallNotes, setOverallNotes] = useState('');
  
  // Signatures
  const [inspectorSig, setInspectorSig] = useState('');
  const [tenantSig, setTenantSig] = useState('');
  
  // Modals
  const [sigModalOpen, setSigModalOpen] = useState(false);
  const [sigType, setSigType] = useState('inspector'); // 'inspector' | 'tenant'
  
  const inspectorWebviewRef = useRef(null);
  const tenantWebviewRef = useRef(null);

  const ratings = [
    { value: 'EXCELLENT', label: 'Excellent', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
    { value: 'GOOD', label: 'Good', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)' },
    { value: 'FAIR', label: 'Fair', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
    { value: 'POOR', label: 'Poor', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' },
  ];

  const fetchInspectionDetails = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/inspections/${inspectionId}`, logout, refreshAccessToken);
      const data = res?.data || res;
      if (data) {
        setInspection(data);
        setRooms(data.rooms || []);
        if (data.rooms && data.rooms.length > 0) {
          setActiveRoomId(data.rooms[0].id);
        }
        setOverallNotes(data.overallNotes || '');
        setInspectorSig(data.inspectorSignature || '');
        setTenantSig(data.tenantSignature || '');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to load inspection details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (inspectionId) {
      fetchInspectionDetails();
    }
  }, [inspectionId]);

  const handleRateItem = (roomId, itemId, ratingVal) => {
    setRooms(prev => prev.map(r => {
      if (r.id !== roomId) return r;
      return {
        ...r,
        items: r.items.map(item => {
          if (item.id !== itemId) return item;
          return { ...item, condition: ratingVal, completed: true };
        })
      };
    }));
  };

  const handleItemNoteChange = (roomId, itemId, noteVal) => {
    setRooms(prev => prev.map(r => {
      if (r.id !== roomId) return r;
      return {
        ...r,
        items: r.items.map(item => {
          if (item.id !== itemId) return item;
          return { ...item, notes: noteVal };
        })
      };
    }));
  };

  const handlePickPhoto = async (roomId, itemId) => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0];
        
        // Convert URI to base64
        setSubmitting(true);
        const response = await fetch(file.uri);
        const blob = await response.blob();
        const reader = new FileReader();
        
        reader.onloadend = () => {
          const base64Data = reader.result;
          setRooms(prev => prev.map(r => {
            if (r.id !== roomId) return r;
            return {
              ...r,
              items: r.items.map(item => {
                if (item.id !== itemId) return item;
                const oldPhotos = item.photos || [];
                return {
                  ...item,
                  photos: [
                    ...oldPhotos,
                    {
                      url: base64Data,
                      caption: file.name || 'photo.jpg',
                      sortOrder: oldPhotos.length,
                    }
                  ]
                };
              })
            };
          }));
          setSubmitting(false);
        };
        reader.readAsDataURL(blob);
      }
    } catch (err) {
      console.log('PickPhoto Error:', err);
      setSubmitting(false);
    }
  };

  const handleRemovePhoto = (roomId, itemId, photoIdx) => {
    setRooms(prev => prev.map(r => {
      if (r.id !== roomId) return r;
      return {
        ...r,
        items: r.items.map(item => {
          if (item.id !== itemId) return item;
          const oldPhotos = item.photos || [];
          return {
            ...item,
            photos: oldPhotos.filter((_, idx) => idx !== photoIdx)
          };
        })
      };
    }));
  };

  const compilePayload = () => {
    const itemsList = [];
    rooms.forEach(r => {
      r.items.forEach(item => {
        itemsList.push({
          id: item.id,
          condition: item.condition || undefined,
          notes: item.notes || '',
          completed: item.completed || false,
          photos: item.photos || [],
        });
      });
    });

    return {
      overallNotes,
      inspectorSignature: inspectorSig || undefined,
      tenantSignature: tenantSig || undefined,
      items: itemsList,
    };
  };

  const handleSaveDraft = async (silent = false) => {
    try {
      if (!silent) setSubmitting(true);
      const payload = compilePayload();
      await apiClient.put(`/inspections/${inspectionId}`, payload, logout, refreshAccessToken);
      if (!silent) Alert.alert('Success', 'Inspection draft saved successfully.');
    } catch (e) {
      if (!silent) Alert.alert('Error', e.message || 'Failed to save draft.');
    } finally {
      if (!silent) setSubmitting(false);
    }
  };

  const handleCompleteInspection = async () => {
    let missingField = false;
    rooms.forEach(r => {
      r.items.forEach(item => {
        if (item.required && (!item.completed || !item.condition)) {
          missingField = true;
        }
      });
    });

    if (missingField) {
      Alert.alert('Validation Error', 'Please rate all required items before completing.');
      return;
    }

    if (!inspectorSig) {
      Alert.alert('Signature Required', 'Inspector signature is required.');
      return;
    }

    if (!tenantSig) {
      Alert.alert('Signature Required', 'Resident/Tenant signature is required.');
      return;
    }

    try {
      setSubmitting(true);
      
      const payload = compilePayload();
      await apiClient.put(`/inspections/${inspectionId}`, payload, logout, refreshAccessToken);
      
      await apiClient.post(`/inspections/${inspectionId}/complete`, {}, logout, refreshAccessToken);
      
      Alert.alert('Success', 'Inspection has been finalized and locked.');
      if (onNavigate) {
        onNavigate('leads');
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to finalize inspection.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeRoom = rooms.find(r => r.id === activeRoomId);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText} allowFontScaling={false}>Loading inspection checklist...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainWrapper}>
      <View style={styles.fixedHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 60, marginTop: 10 }}>
          <TouchableOpacity onPress={() => onNavigate && onNavigate('leads')} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} style={{ marginRight: 6 }} />
            <Text style={styles.title} allowFontScaling={false}>Inspection details</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveDraftBtn} onPress={() => handleSaveDraft(false)} disabled={submitting}>
            <Text style={styles.saveDraftText} allowFontScaling={false}>Save Draft</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle} allowFontScaling={false}>
          {inspection?.templateName || 'Standard Template'} · {inspection?.propertyName || 'Property'} · Room {inspection?.unitNumber || '1A'}
        </Text>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScrollContainer}>
          {rooms.map((room) => {
            const isActive = room.id === activeRoomId;
            const completedCount = room.items.filter(i => i.completed).length;
            const totalCount = room.items.length;
            return (
              <TouchableOpacity
                key={room.id}
                style={[styles.tabItem, isActive && styles.tabItemActive]}
                onPress={() => setActiveRoomId(room.id)}
              >
                <Text style={[styles.tabItemText, isActive && styles.tabItemTextActive]} allowFontScaling={false}>
                  {room.name} ({completedCount}/{totalCount})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {activeRoom ? (
          <View style={{ marginTop: 14 }}>
            {activeRoom.items.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.itemLabel} allowFontScaling={false}>
                      {item.label}
                      {item.required && <Text style={{ color: '#ef4444' }}> *</Text>}
                    </Text>
                    <Text style={styles.itemSubText} allowFontScaling={false}>
                      {item.required ? 'REQUIRED FIELD' : 'OPTIONAL FIELD'}
                    </Text>
                  </View>

                  <View style={styles.ratingRow}>
                    {ratings.map((r) => {
                      const isSelected = item.condition === r.value;
                      return (
                        <TouchableOpacity
                          key={r.value}
                          style={[
                            styles.rateBtn,
                            isSelected && { backgroundColor: r.bg, borderColor: r.color }
                          ]}
                          onPress={() => handleRateItem(activeRoom.id, item.id, r.value)}
                        >
                          <Text style={[styles.rateBtnText, { color: isSelected ? r.color : colors.textSecondary }]} allowFontScaling={false}>
                            {r.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <TextInput
                  style={styles.notesInput}
                  placeholder="Provide condition notes..."
                  placeholderTextColor="#64748b"
                  value={item.notes || ''}
                  onChangeText={(val) => handleItemNoteChange(activeRoom.id, item.id, val)}
                />

                <Text style={styles.fieldLabel} allowFontScaling={false}>CONDITION PHOTOS</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginVertical: 8 }}>
                  <TouchableOpacity style={styles.addPhotoBtn} onPress={() => handlePickPhoto(activeRoom.id, item.id)}>
                    <Ionicons name="camera-outline" size={20} color="#38bdf8" />
                    <Text style={{ color: '#38bdf8', fontSize: 10, fontWeight: '700', marginTop: 2 }} allowFontScaling={false}>Add Photo</Text>
                  </TouchableOpacity>

                  {(item.photos || []).map((photo, pIdx) => (
                    <View key={pIdx} style={styles.photoPreviewWrapper}>
                      <Image source={{ uri: photo.url }} style={styles.photoPreview} />
                      <TouchableOpacity style={styles.removePhotoBtn} onPress={() => handleRemovePhoto(activeRoom.id, item.id, pIdx)}>
                        <Ionicons name="close-circle" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            ))}
          </View>
        ) : null}

        <View style={[styles.itemCard, { marginTop: 16 }]}>
          <Text style={styles.itemLabel} allowFontScaling={false}>Overall Inspection Summary</Text>
          <TextInput
            style={[styles.notesInput, { minHeight: 80, textAlignVertical: 'top', marginTop: 10 }]}
            placeholder="Provide a general summary of property conditions..."
            placeholderTextColor="#64748b"
            multiline
            value={overallNotes}
            onChangeText={setOverallNotes}
          />
        </View>

        <Text style={styles.sectionTitle} allowFontScaling={false}>REQUIRED SIGNATURES</Text>
        <View style={styles.sigContainer}>
          <View style={styles.sigCard}>
            <Text style={styles.sigLabel} allowFontScaling={false}>INSPECTOR SIGNATURE</Text>
            {inspectorSig ? (
              <Image source={{ uri: inspectorSig }} style={styles.sigImage} resizeMode="contain" />
            ) : (
              <View style={styles.emptySigBox}>
                <Text style={styles.emptySigText} allowFontScaling={false}>No signature recorded</Text>
              </View>
            )}
            <TouchableOpacity 
              style={styles.drawSigBtn} 
              onPress={() => {
                setSigType('inspector');
                setSigModalOpen(true);
              }}
            >
              <Text style={styles.drawSigText} allowFontScaling={false}>Draw Signature</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sigCard}>
            <Text style={styles.sigLabel} allowFontScaling={false}>TENANT / RESIDENT SIGNATURE</Text>
            {tenantSig ? (
              <Image source={{ uri: tenantSig }} style={styles.sigImage} resizeMode="contain" />
            ) : (
              <View style={styles.emptySigBox}>
                <Text style={styles.emptySigText} allowFontScaling={false}>No signature recorded</Text>
              </View>
            )}
            <TouchableOpacity 
              style={styles.drawSigBtn} 
              onPress={() => {
                setSigType('tenant');
                setSigModalOpen(true);
              }}
            >
              <Text style={styles.drawSigText} allowFontScaling={false}>Draw Signature</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.finalizeBtn} onPress={handleCompleteInspection} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator size="small" color="#0f172a" />
          ) : (
            <Text style={styles.finalizeBtnText} allowFontScaling={false}>Finalize & Submit Inspection</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={sigModalOpen} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { height: '60%', padding: 14 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} allowFontScaling={false}>
                Draw {sigType === 'inspector' ? 'Inspector' : 'Resident'} Signature
              </Text>
              <TouchableOpacity onPress={() => setSigModalOpen(false)}>
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.webviewWrapper}>
              <WebView
                ref={sigType === 'inspector' ? inspectorWebviewRef : tenantWebviewRef}
                source={{ html: signatureHtml }}
                onMessage={(e) => {
                  const data = e.nativeEvent.data;
                  if (sigType === 'inspector') {
                    setInspectorSig(data);
                  } else {
                    setTenantSig(data);
                  }
                }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                scalesPageToFit={true}
                scrollEnabled={false}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={() => {
                  const ref = sigType === 'inspector' ? inspectorWebviewRef : tenantWebviewRef;
                  if (ref.current) ref.current.postMessage('clear');
                  if (sigType === 'inspector') {
                    setInspectorSig('');
                  } else {
                    setTenantSig('');
                  }
                }}
              >
                <Text style={styles.cancelBtnText} allowFontScaling={false}>Clear</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#38bdf8' }]} onPress={() => setSigModalOpen(false)}>
                <Text style={[styles.submitBtnText, { color: '#0f172a', fontWeight: '800' }]} allowFontScaling={false}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const getStyles = (colors, isDarkMode) => StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 60 },
  center: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: colors.textSecondary, fontSize: 13, marginTop: 8 },

  fixedHeader: {
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    zIndex: 10,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },

  saveDraftBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  saveDraftText: { color: '#38bdf8', fontSize: 12, fontWeight: '700' },

  tabScrollContainer: {
    flexDirection: 'row',
    marginTop: 14,
    paddingBottom: 4,
  },
  tabItem: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: colors.surface,
    marginRight: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  tabItemActive: { backgroundColor: '#38bdf8', borderColor: '#38bdf8' },
  tabItemText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  tabItemTextActive: { color: '#0f172a', fontWeight: '800' },

  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemLabel: { fontSize: 13, fontWeight: '800', color: colors.textPrimary },
  itemSubText: { fontSize: 9.5, color: colors.textSecondary, fontWeight: '700', marginTop: 2 },
  
  ratingRow: { flexDirection: 'row', gap: 4 },
  rateBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.inputBackground,
  },
  rateBtnText: { fontSize: 10, fontWeight: '700' },

  notesInput: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.textPrimary,
    marginTop: 12,
    fontSize: 12,
  },

  fieldLabel: { fontSize: 9.5, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.5, marginTop: 12 },
  addPhotoBtn: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#38bdf8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.05)',
  },
  photoPreviewWrapper: { position: 'relative', marginRight: 8 },
  photoPreview: { width: 60, height: 60, borderRadius: 8 },
  removePhotoBtn: { position: 'absolute', top: -4, right: -4 },

  sectionTitle: { fontSize: 11, fontWeight: '800', color: colors.textSecondary, marginTop: 20, marginBottom: 10, letterSpacing: 0.5 },
  sigContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  sigCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  sigLabel: { fontSize: 9, fontWeight: '800', color: colors.textSecondary, marginBottom: 8, textAlign: 'center' },
  emptySigBox: { height: 70, width: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: colors.inputBackground, borderRadius: 8 },
  emptySigText: { fontSize: 10, color: colors.textSecondary, fontWeight: '500' },
  sigImage: { height: 70, width: '100%', backgroundColor: '#ffffff', borderRadius: 8 },
  drawSigBtn: { marginTop: 10, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, backgroundColor: 'rgba(56, 189, 248, 0.15)', borderWidth: 1, borderColor: '#38bdf8' },
  drawSigText: { color: '#38bdf8', fontSize: 10.5, fontWeight: '700' },

  finalizeBtn: { backgroundColor: '#38bdf8', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  finalizeBtnText: { color: '#0f172a', fontWeight: '800', fontSize: 13 },

  modalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.85)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: colors.cardBorder },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 14, fontWeight: '800', color: colors.textPrimary },
  webviewWrapper: { flex: 1, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, backgroundColor: colors.buttonSecondary },
  cancelBtnText: { color: colors.textSecondary, fontWeight: '700', fontSize: 12 },
  submitBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  submitBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
  actionRowContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  smallActionBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  smallActionText: { fontSize: 11, fontWeight: '800' },
});
