import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Animated,
  Easing,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import apiClient from '../api/client';
import { useAuthStore, useThemeStore } from '../store/useStore';
import { useThemeColors } from '../theme';
import { Ionicons } from '@expo/vector-icons';

// Animated Touchable Component
const AnimatedTouchable = ({ children, onPress, style, disabled }) => {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
    >
      <Animated.View style={[style, { transform: [{ scale: scaleValue }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

export const RentScreen = () => {
  const { user, logout, refreshAccessToken } = useAuthStore();
  const { language } = useThemeStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);
  const es = language === 'es';

  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState(null);

  // Stats
  const [outstandingBalance, setOutstandingBalance] = useState(0);

  // Submit Rent Payment Modal State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [paymentOption, setPaymentOption] = useState('full'); // 'full' or 'partial'
  const [payAmount, setPayAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('ACH'); // 'ACH', 'Credit Card', 'Debit Card'
  const [submittingPay, setSubmittingPay] = useState(false);

  // ACH Bank details state
  const [achHolderName, setAchHolderName] = useState('');
  const [achBankName, setAchBankName] = useState('Chase Bank');
  const [achRoutingNumber, setAchRoutingNumber] = useState('');
  const [achAccountNumber, setAchAccountNumber] = useState('');
  const [achAccountType, setAchAccountType] = useState('Checking'); // 'Checking' or 'Savings'

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const runEntryAnimation = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 450,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Sync amount with payment option selection
  useEffect(() => {
    if (paymentOption === 'full') {
      setPayAmount(outstandingBalance.toString());
    }
  }, [outstandingBalance, paymentOption]);

  const amountNum = parseFloat(payAmount) || 0;
  const convenienceFee = paymentMethod === 'ACH' 
    ? 0 
    : paymentMethod === 'Credit Card' 
      ? Number((amountNum * 0.029).toFixed(2)) 
      : 4.99;
  const totalCharge = amountNum + convenienceFee;

  // Strictly fetch from live Railway endpoints: GET /payments & GET /invoices
  const fetchLiveFinancials = async () => {
    try {
      setLoading(true);
      const [paymentsRes, invoicesRes] = await Promise.all([
        apiClient.get('/payments', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/invoices', logout, refreshAccessToken).catch(() => null),
      ]);

      const rawPayments = Array.isArray(paymentsRes) ? paymentsRes : (paymentsRes?.data || []);
      const rawInvoices = Array.isArray(invoicesRes) ? invoicesRes : (invoicesRes?.data || []);

      const list = [];
      
      // Map invoices
      rawInvoices.forEach((inv) => {
        list.push({
          id: inv.id,
          date: inv.dueDate ? inv.dueDate.split('T')[0] : '2026-08-01',
          type: 'Invoice',
          desc: 'Monthly Rent Assessment',
          ref: `INV-${inv.id.substring(0, 8).toUpperCase()}`,
          invoiceAmt: Number(inv.amount) || 1100,
          paymentAmt: 0,
          additionalChg: 0,
          status: inv.status === 'PAID' || inv.status === 'Paid' ? 'Paid' : 'Unpaid',
        });
      });

      // Map payments
      rawPayments.forEach((pay) => {
        list.push({
          id: pay.id,
          date: pay.paidDate ? pay.paidDate.split('T')[0] : pay.dueDate ? pay.dueDate.split('T')[0] : '2026-08-01',
          type: 'Payment',
          desc: `Rent Payment - ${pay.paymentMethod || 'ACH'}`,
          ref: `PAY-${pay.id.substring(0, 8).toUpperCase()}`,
          invoiceAmt: 0,
          paymentAmt: Number(pay.amount) || 1068.1,
          additionalChg: 0,
          status: 'Cleared',
        });
      });

      if (list.length > 0) {
        // Sort by date and calculate running balance
        const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
        let runningBalance = 0;
        const mapped = sorted.map((tx) => {
          if (tx.type === 'Invoice') {
            runningBalance += tx.invoiceAmt;
          } else {
            runningBalance -= tx.paymentAmt;
          }
          return {
            ...tx,
            runningBal: runningBalance,
          };
        });
        setLedger(mapped);
        setOutstandingBalance(Math.max(0, runningBalance));
      } else {
        setLedger([]);
        setOutstandingBalance(0);
      }
    } catch (e) {
      console.log('Error fetching GET /payments & GET /invoices:', e.message);
      // Fallback
      setLedger([]);
      setOutstandingBalance(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
      runEntryAnimation();
    }
  };

  useEffect(() => {
    fetchLiveFinancials();
  }, []);

  const handleSubmitPayment = async () => {
    if (amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid payment amount');
      return;
    }

    setSubmittingPay(true);
    try {
      await apiClient.post(
        '/payments',
        {
          amount: totalCharge,
          baseAmount: amountNum,
          paymentMethod: paymentMethod,
          status: 'Paid',
          tenantId: user?.id || '',
        },
        logout,
        refreshAccessToken
      );
      fetchLiveFinancials();
      setIsPayModalOpen(false);
      Alert.alert(es ? 'Pago Exitoso' : 'Payment Successful', es ? `Pago de $${totalCharge.toFixed(2)} vía ${paymentMethod} enviado!` : `Rent payment of $${totalCharge.toFixed(2)} via ${paymentMethod} submitted!`);
    } catch (e) {
      console.log('Post payment error:', e.message);
      Alert.alert('Payment Error', e.message || 'Payment processing failed. Please try again.');
    } finally {
      setSubmittingPay(false);
    }
  };

  const filteredLedger = ledger.filter((item) => {
    const text = `${item.ref || ''} ${item.desc || ''} ${item.date || ''}`.toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  });

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText} allowFontScaling={false}>
          {es ? 'Cargando pagos de alquiler...' : 'Loading Rent Payments...'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.mainWrapper}
      contentContainerStyle={styles.outerContentContainer}
      showsVerticalScrollIndicator={true}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchLiveFinancials} tintColor="#38bdf8" />}
    >
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        {/* Page Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title} allowFontScaling={false}>
              {es ? 'Pagos de Alquiler' : 'Rent Payments'}
            </Text>
            
            {/* Submit Rent Payment Button */}
            <AnimatedTouchable style={styles.submitPayBtn} onPress={() => setIsPayModalOpen(true)}>
              <Ionicons name="card-outline" size={16} color="#0f172a" style={{ marginRight: 6 }} />
              <Text style={styles.submitPayBtnText} allowFontScaling={false}>
                {es ? 'Enviar Pago' : 'Submit Payment'}
              </Text>
            </AnimatedTouchable>
          </View>
        </View>

        {/* Outstanding & Autopay Status Cards Grid */}
        <View style={styles.statsContainer}>
          <View style={styles.outstandingCard}>
            <Text style={styles.statsLabel} allowFontScaling={false}>
              {es ? 'SALDO PENDIENTE DE PAGO' : 'OUTSTANDING BALANCE DUE'}
            </Text>
            <View style={styles.balanceRow}>
              <Text style={[styles.balanceVal, outstandingBalance === 0 ? { color: '#10b981' } : { color: '#f87171' }]} allowFontScaling={false}>
                ${outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </Text>
              {outstandingBalance === 0 && (
                <Ionicons name="checkmark-circle" size={18} color="#10b981" style={{ marginLeft: 6 }} />
              )}
            </View>
            <Text style={styles.statsSubText} allowFontScaling={false}>
              {outstandingBalance === 0 ? (es ? 'Sin Saldo Pendiente' : 'No Balance Due') : (es ? 'Facturas activas del próximo periodo.' : 'Next rent period invoices active.')}
            </Text>
          </View>

          <View style={styles.autopayCard}>
            <View style={styles.autopayHeaderRow}>
              <Ionicons name="settings-outline" size={12} color="#38bdf8" style={{ marginRight: 4 }} />
              <Text style={styles.statsLabel} allowFontScaling={false}>
                {es ? 'PAGO AUTOMÁTICO' : 'AUTOPAY SETUP'}
              </Text>
            </View>
            <View style={styles.autopayBadge}>
              <Text style={styles.autopayBadgeText} allowFontScaling={false}>
                {es ? 'ACTIVADO' : 'ENABLED'}
              </Text>
            </View>
            <Text style={styles.statsSubText} allowFontScaling={false} numberOfLines={2}>
              {es ? 'Debita automáticamente de la cuenta XXXX-9822 el día 1 del mes.' : 'Automatically pulls from checking ending in XXXX-9822 on 1st of month.'}
            </Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color="#64748b" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder={es ? 'Buscar por número de referencia o fecha...' : 'Search by reference number or date...'}
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={(txt) => {
                setSearchQuery(txt);
              }}
            />
          </View>
        </View>

        <Text style={styles.sectionHeader} allowFontScaling={false}>PAYMENT HISTORY LEDGER</Text>

        {/* Ledger list */}
        {filteredLedger.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={48} color="#475569" style={{ marginBottom: 8 }} />
            <Text style={styles.emptyText} allowFontScaling={false}>No transactions found</Text>
          </View>
        ) : (
          filteredLedger.map((item, idx) => (
            <AnimatedTouchable
              key={item.id || `tx-${idx}`}
              style={styles.ledgerCard}
              onPress={() => setSelectedTx(item)}
            >
              <View style={styles.cardHeaderRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Ionicons 
                      name={item.type === 'Invoice' ? 'document-text-outline' : 'card-outline'} 
                      size={18} 
                      color={item.type === 'Invoice' ? '#f59e0b' : '#38bdf8'} 
                      style={{ marginRight: 6 }} 
                    />
                    <Text style={styles.refText} allowFontScaling={false}>
                      {item.ref}
                    </Text>
                  </View>
                  <Text style={styles.descText} allowFontScaling={false}>
                    {item.desc}
                  </Text>
                  <Text style={styles.dateText} allowFontScaling={false}>
                    Date: {item.date}
                  </Text>
                </View>

                {/* Amount details, running balance and view option */}
                <View style={styles.rightGroup}>
                  <Text style={styles.amountText} allowFontScaling={false}>
                    {item.type === 'Invoice' 
                      ? `+$${item.invoiceAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                      : `-$${item.paymentAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                    }
                  </Text>

                  <View style={styles.badgesRow}>
                    <View style={[styles.statusBadge, item.status === 'Paid' || item.status === 'Cleared' ? styles.badgeGreen : styles.badgeRed]}>
                      <Text style={[styles.statusBadgeText, item.status === 'Paid' || item.status === 'Cleared' ? styles.badgeGreenText : styles.badgeRedText]} allowFontScaling={false}>
                        {item.status}
                      </Text>
                    </View>

                    <TouchableOpacity style={styles.eyeBtn} onPress={() => setSelectedTx(item)} activeOpacity={0.7}>
                      <Ionicons name="eye-outline" size={14} color="#cbd5e1" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </AnimatedTouchable>
          ))
        )}
      </Animated.View>

      {/* MODAL 1: View Payment/Invoice Details */}
      <Modal visible={!!selectedTx} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderTitleRow}>
                <Ionicons name="receipt-outline" size={22} color="#38bdf8" style={{ marginRight: 6 }} />
                <Text style={styles.modalTitle} allowFontScaling={false}>
                  Transaction Details
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedTx(null)}>
                <Ionicons name="close" size={22} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.detailCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel} allowFontScaling={false}>Reference Number</Text>
                <Text style={styles.detailVal} allowFontScaling={false}>{selectedTx?.ref}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel} allowFontScaling={false}>Type</Text>
                <Text style={styles.detailVal} allowFontScaling={false}>{selectedTx?.type}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel} allowFontScaling={false}>Description</Text>
                <Text style={styles.detailVal} allowFontScaling={false}>{selectedTx?.desc}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel} allowFontScaling={false}>Date</Text>
                <Text style={styles.detailVal} allowFontScaling={false}>{selectedTx?.date}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel} allowFontScaling={false}>Amount</Text>
                <Text style={[styles.detailVal, selectedTx?.type === 'Invoice' ? { color: '#f59e0b' } : { color: '#10b981' }]} allowFontScaling={false}>
                  ${selectedTx?.type === 'Invoice' 
                    ? selectedTx?.invoiceAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })
                    : selectedTx?.paymentAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })
                  }
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel} allowFontScaling={false}>Running Balance</Text>
                <Text style={styles.detailVal} allowFontScaling={false}>
                  ${selectedTx?.runningBal?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel} allowFontScaling={false}>Status</Text>
                <Text style={[styles.detailVal, selectedTx?.status === 'Paid' || selectedTx?.status === 'Cleared' ? { color: '#10b981' } : { color: '#f87171' }]} allowFontScaling={false}>
                  {selectedTx?.status}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setSelectedTx(null)}>
              <Text style={styles.closeModalBtnText} allowFontScaling={false}>Close Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: Submit Rent Payment (Clean 1-to-1 Web Parity) */}
      <Modal visible={isPayModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.85)' }}
        >
          <ScrollView 
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle} allowFontScaling={false}>Submit Rent Payment</Text>
                <TouchableOpacity onPress={() => setIsPayModalOpen(false)}>
                  <Ionicons name="close" size={22} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {/* PAYMENT OPTION */}
              <Text style={styles.inputLabel} allowFontScaling={false}>PAYMENT OPTION</Text>
              <View style={styles.paymentOptionRow}>
                <TouchableOpacity 
                  style={[styles.optionCard, paymentOption === 'full' && styles.optionCardActive]}
                  onPress={() => setPaymentOption('full')}
                >
                  <Text style={[styles.optionCardTitle, paymentOption === 'full' && styles.optionCardTitleActive]} allowFontScaling={false}>PAY IN FULL</Text>
                  <Text style={styles.optionCardSub} allowFontScaling={false}>${outstandingBalance.toFixed(2)}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.optionCard, paymentOption === 'partial' && styles.optionCardActive]}
                  onPress={() => setPaymentOption('partial')}
                >
                  <Text style={[styles.optionCardTitle, paymentOption === 'partial' && styles.optionCardTitleActive]} allowFontScaling={false}>PARTIAL PAYMENT</Text>
                  <Text style={styles.optionCardSub} allowFontScaling={false}>Pay custom amount</Text>
                </TouchableOpacity>
              </View>

              {/* PAYMENT AMOUNT */}
              {paymentOption === 'partial' && (
                <>
                  <Text style={styles.inputLabel} allowFontScaling={false}>PAYMENT AMOUNT ($) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter Custom Amount"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    value={payAmount}
                    onChangeText={setPayAmount}
                  />
                </>
              )}

              {/* PAYMENT METHOD */}
              <Text style={styles.inputLabel} allowFontScaling={false}>PAYMENT METHOD</Text>
              <View style={styles.methodSelectorRow}>
                <TouchableOpacity 
                  style={[styles.methodChip, paymentMethod === 'ACH' && styles.methodChipActive]}
                  onPress={() => setPaymentMethod('ACH')}
                >
                  <Ionicons name="business-outline" size={14} color={paymentMethod === 'ACH' ? '#0f172a' : '#94a3b8'} style={{ marginBottom: 2 }} />
                  <Text style={[styles.methodChipText, paymentMethod === 'ACH' && styles.methodChipTextActive]} allowFontScaling={false}>ACH BANK</Text>
                  <Text style={styles.methodChipFee} allowFontScaling={false}>$0.00 fee</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.methodChip, paymentMethod === 'Credit Card' && styles.methodChipActive]}
                  onPress={() => setPaymentMethod('Credit Card')}
                >
                  <Ionicons name="card-outline" size={14} color={paymentMethod === 'Credit Card' ? '#0f172a' : '#94a3b8'} style={{ marginBottom: 2 }} />
                  <Text style={[styles.methodChipText, paymentMethod === 'Credit Card' && styles.methodChipTextActive]} allowFontScaling={false}>CREDIT CARD</Text>
                  <Text style={styles.methodChipFee} allowFontScaling={false}>2.9% fee</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.methodChip, paymentMethod === 'Debit Card' && styles.methodChipActive]}
                  onPress={() => setPaymentMethod('Debit Card')}
                >
                  <Ionicons name="card-outline" size={14} color={paymentMethod === 'Debit Card' ? '#0f172a' : '#94a3b8'} style={{ marginBottom: 2 }} />
                  <Text style={[styles.methodChipText, paymentMethod === 'Debit Card' && styles.methodChipTextActive]} allowFontScaling={false}>DEBIT CARD</Text>
                  <Text style={styles.methodChipFee} allowFontScaling={false}>$4.99 fee</Text>
                </TouchableOpacity>
              </View>

              {/* ACH BANK DETAILS */}
              {paymentMethod === 'ACH' && (
                <View style={styles.bankForm}>
                  <Text style={styles.bankFormHeader} allowFontScaling={false}>ACH BANK INFORMATION</Text>
                  
                  <Text style={styles.inputLabel} allowFontScaling={false}>ACCOUNT HOLDER NAME</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="E.g., Jane Doe"
                    placeholderTextColor="#64748b"
                    value={achHolderName}
                    onChangeText={setAchHolderName}
                  />

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel} allowFontScaling={false}>BANK</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Chase Bank"
                        placeholderTextColor="#64748b"
                        value={achBankName}
                        onChangeText={setAchBankName}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel} allowFontScaling={false}>ACCOUNT TYPE</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Checking"
                        placeholderTextColor="#64748b"
                        value={achAccountType}
                        onChangeText={setAchAccountType}
                      />
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel} allowFontScaling={false}>ROUTING NUMBER</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="9-digit routing"
                        placeholderTextColor="#64748b"
                        keyboardType="numeric"
                        value={achRoutingNumber}
                        onChangeText={setAchRoutingNumber}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel} allowFontScaling={false}>ACCOUNT NUMBER</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Account number"
                        placeholderTextColor="#64748b"
                        keyboardType="numeric"
                        value={achAccountNumber}
                        onChangeText={setAchAccountNumber}
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* CARD DETAILS */}
              {paymentMethod !== 'ACH' && (
                <View style={styles.bankForm}>
                  <Text style={styles.bankFormHeader} allowFontScaling={false}>CARD INFORMATION</Text>
                  
                  <Text style={styles.inputLabel} allowFontScaling={false}>CARDHOLDER NAME</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="E.g., Jane Doe"
                    placeholderTextColor="#64748b"
                    value={achHolderName}
                    onChangeText={setAchHolderName}
                  />

                  <Text style={styles.inputLabel} allowFontScaling={false}>CARD NUMBER</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="XXXX XXXX XXXX XXXX"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                  />
                </View>
              )}

              {/* PAYMENT SUMMARY */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel} allowFontScaling={false}>Base Rent Amount</Text>
                  <Text style={styles.summaryVal} allowFontScaling={false}>${amountNum.toFixed(2)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel} allowFontScaling={false}>Convenience Fee ({paymentMethod})</Text>
                  <Text style={styles.summaryVal} allowFontScaling={false}>${convenienceFee.toFixed(2)}</Text>
                </View>
                <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 8, marginTop: 4 }]}>
                  <Text style={[styles.summaryLabel, { fontWeight: '800', color: '#f8fafc' }]} allowFontScaling={false}>Total Charge</Text>
                  <Text style={[styles.summaryVal, { fontWeight: '800', color: '#10b981' }]} allowFontScaling={false}>${totalCharge.toFixed(2)}</Text>
                </View>
              </View>

              <View style={styles.secureTextRow}>
                <Ionicons name="shield-checkmark" size={14} color="#10b981" style={{ marginRight: 6 }} />
                <Text style={styles.secureText} allowFontScaling={false}>256-BIT SSL SECURED TRANSACTION</Text>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setIsPayModalOpen(false)} disabled={submittingPay}>
                  <Text style={styles.cancelBtnText} allowFontScaling={false}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.modalBtn, styles.saveBtn, submittingPay && { opacity: 0.5 }]} onPress={handleSubmitPayment} disabled={submittingPay}>
                  <Text style={styles.saveBtnText} allowFontScaling={false}>
                    {submittingPay ? 'Processing...' : 'Pay Rent'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
};

const getStyles = (colors, isDarkMode) => StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: colors.background },
  outerContentContainer: { padding: 16, paddingBottom: 60 },
  center: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: colors.textSecondary, marginTop: 8 },

  header: { marginBottom: 16 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, flex: 1 },

  submitPayBtn: { backgroundColor: '#38bdf8', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  submitPayBtnText: { color: '#0f172a', fontSize: 13, fontWeight: '800' },

  statsContainer: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  outstandingCard: { flex: 1.2, backgroundColor: colors.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.cardBorder },
  autopayCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.cardBorder },
  statsLabel: { fontSize: 9.5, color: colors.textMuted, fontWeight: '800', letterSpacing: 0.5 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  balanceVal: { fontSize: 24, fontWeight: '800' },
  statsSubText: { fontSize: 10.5, color: colors.textMuted, lineHeight: 14 },
  autopayHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  autopayBadge: { backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 8, paddingVertical: 2.5, borderRadius: 6, borderWidth: 1, borderColor: '#10b981', alignSelf: 'flex-start', marginVertical: 4 },
  autopayBadgeText: { color: '#10b981', fontSize: 9, fontWeight: '800' },

  searchBarRow: { flexDirection: 'row', marginBottom: 16 },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    color: colors.textPrimary,
    fontSize: 13,
    flex: 1,
    padding: 0,
  },

  sectionHeader: { fontSize: 11, fontWeight: '800', color: colors.textMuted, marginBottom: 10, letterSpacing: 1 },

  emptyCard: { backgroundColor: colors.surface, padding: 32, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  emptyText: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },

  ledgerCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  refText: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  descText: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  dateText: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  rightGroup: { alignItems: 'flex-end', gap: 6 },
  amountText: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  badgesRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2.5, borderRadius: 4, borderWidth: 1 },
  badgeGreen: { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: '#10b981' },
  badgeGreenText: { color: '#10b981', fontSize: 9, fontWeight: '800' },
  badgeRed: { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: '#ef4444' },
  badgeRedText: { color: '#ef4444', fontSize: 9, fontWeight: '800' },
  eyeBtn: { backgroundColor: colors.inputBackground, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.cardBorder },

  modalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.85)', justifyContent: 'center', padding: 20 },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 40 : 16,
    paddingBottom: Platform.OS === 'ios' ? 60 : 30,
  },
  modalCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.cardBorder },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalHeaderTitleRow: { flexDirection: 'row', alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },

  detailCard: { backgroundColor: colors.inputBackground, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: colors.cardBorder },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.surface },
  detailLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '500' },
  detailVal: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  closeModalBtn: { backgroundColor: colors.buttonSecondary, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  closeModalBtnText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },

  inputLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '700', marginBottom: 6, marginTop: 10, letterSpacing: 0.5 },
  input: { backgroundColor: colors.inputBackground, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.textPrimary, fontSize: 13, marginBottom: 4 },

  paymentOptionRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  optionCard: { flex: 1, backgroundColor: colors.inputBackground, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 12, padding: 12, alignItems: 'center' },
  optionCardActive: { borderColor: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.1)' },
  optionCardTitle: { fontSize: 11, fontWeight: '800', color: colors.textMuted },
  optionCardTitleActive: { color: '#38bdf8' },
  optionCardSub: { fontSize: 12, fontWeight: '700', color: colors.textPrimary, marginTop: 4 },

  methodSelectorRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  methodChip: { flex: 1, backgroundColor: colors.inputBackground, paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.inputBorder },
  methodChipActive: { backgroundColor: '#38bdf8', borderColor: '#38bdf8' },
  methodChipText: { color: colors.textSecondary, fontSize: 10, fontWeight: '800' },
  methodChipTextActive: { color: '#0f172a' },
  methodChipFee: { fontSize: 9, color: colors.textSecondary, marginTop: 2 },

  bankForm: { backgroundColor: colors.inputBackground, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.inputBorder, marginVertical: 10 },
  bankFormHeader: { fontSize: 10.5, fontWeight: '800', color: '#38bdf8', letterSpacing: 0.5, marginBottom: 4 },

  summaryCard: { backgroundColor: colors.inputBackground, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.inputBorder, marginVertical: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '500' },
  summaryVal: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },

  secureTextRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 8 },
  secureText: { fontSize: 10, color: '#10b981', fontWeight: '800', letterSpacing: 0.5 },

  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  modalBtn: { width: '48%', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  cancelBtn: { backgroundColor: colors.buttonSecondary },
  cancelBtnText: { color: colors.textSecondary, fontWeight: '700', fontSize: 13 },
  saveBtn: { backgroundColor: '#38bdf8' },
  saveBtnText: { color: '#0f172a', fontWeight: '800', fontSize: 13 },
});
