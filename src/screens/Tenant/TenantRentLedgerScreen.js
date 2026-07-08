// src/screens/Tenant/TenantRentLedgerScreen.js
// Read-only rent & dues ledger for the tenant.

import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, StatusBar, ActivityIndicator, RefreshControl
} from 'react-native';
import { Text, Surface } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import auth from '@react-native-firebase/auth';
import { useTenantContext } from './TenantDashboard';
import { getTenantRentLedger } from '../../services/tenantService';
import SkeletonLoader from '../../components/common/SkeletonLoader';

const TEAL = '#0D9488';

const formatCurrency = (amount) =>
  `₹${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

const formatDate = (ts) => {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function TenantRentLedgerScreen() {
  const { tenantProfile } = useTenantContext();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLedger = () => {
    const uid = auth().currentUser?.uid;
    if (!uid) { 
      setLoading(false); 
      setRefreshing(false);
      return; 
    }
    getTenantRentLedger(uid).then(data => {
      setTransactions(data);
      setLoading(false);
      setRefreshing(false);
    });
  };

  useEffect(() => {
    fetchLedger();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLedger();
  };

  if (!tenantProfile) return null;

  const agreedRent = Number(tenantProfile.agreedRent || 0);
  const balance = Number(tenantProfile.balance || 0);
  const totalPaid = transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  const getMonthsSinceJoined = () => {
    if (!tenantProfile?.joined) return [];
    
    const parsedJoin = new Date(tenantProfile.joined);
    const joinDate = isNaN(parsedJoin) ? new Date() : parsedJoin;
    const currentDate = new Date();
    
    const months = [];
    let d = new Date(joinDate.getFullYear(), joinDate.getMonth() - 1, 1);
    const joinMonthStart = new Date(joinDate.getFullYear(), joinDate.getMonth(), 1);
    
    while (d <= currentDate) {
      const monthYear = `${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
      const display = `${d.toLocaleString('default', { month: 'long' })} ${d.getFullYear()}`;
      const matchingTx = transactions.find(tx => tx.monthYear === monthYear);
      const isPaid = !!matchingTx;
      const isBeforeJoin = d < joinMonthStart;

      months.unshift({ 
        id: monthYear,
        monthYear, 
        display, 
        isPaid, 
        isBeforeJoin,
        amount: matchingTx ? matchingTx.amount : (tenantProfile.agreedRent || 0),
        txDate: matchingTx ? matchingTx.date : null,
        description: matchingTx ? matchingTx.description : `Rent for ${display}`
      });
      d.setMonth(d.getMonth() + 1);
    }
    return months;
  };

  const paymentHistory = getMonthsSinceJoined();
  const currentMonthItem = paymentHistory.length > 0 ? paymentHistory[0] : null;
  const currentMonthStatus = currentMonthItem 
    ? (currentMonthItem.isBeforeJoin ? 'Unassigned' : currentMonthItem.isPaid ? 'Paid' : 'Pending') 
    : 'Unassigned';
  const displayMonthLabel = currentMonthItem ? `MONTHLY RENT (${currentMonthItem.display})` : 'MONTHLY RENT';

  const rentStatusConfig = {
    Paid: { color: '#10B981', bg: '#D1FAE5', icon: 'check-circle', label: 'Cleared' },
    Pending: { color: '#F59E0B', bg: '#FEF3C7', icon: 'clock-alert', label: 'Pending' },
    Overdue: { color: '#EF4444', bg: '#FEE2E2', icon: 'alert-circle', label: 'Overdue' },
    Unassigned: { color: '#94A3B8', bg: '#F1F5F9', icon: 'help-circle', label: 'Not Joined' },
  }[currentMonthStatus] || { color: '#94A3B8', bg: '#F1F5F9', icon: 'help-circle', label: currentMonthStatus };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F766E" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Rent & Dues Ledger</Text>
        <Text style={styles.headerSub}>Your complete payment history</Text>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[TEAL]} />}
      >

        {/* Current Month Status Card */}
        <Surface style={styles.statusCard} elevation={2}>
          <View style={styles.statusTop}>
            <View>
              <Text style={styles.statusLabel}>{displayMonthLabel}</Text>
              <Text style={styles.statusAmount}>{formatCurrency(agreedRent)}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: rentStatusConfig.bg }]}>
              <MaterialCommunityIcons name={rentStatusConfig.icon} size={16} color={rentStatusConfig.color} />
              <Text style={[styles.statusBadgeText, { color: rentStatusConfig.color }]}>{rentStatusConfig.label}</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <MaterialCommunityIcons name="cash-check" size={20} color="#10B981" />
              <Text style={styles.statValue}>{formatCurrency(totalPaid)}</Text>
              <Text style={styles.statLabel}>Total Paid</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <MaterialCommunityIcons name="calendar" size={20} color="#8B5CF6" />
              <Text style={styles.statValue}>{transactions.length}</Text>
              <Text style={styles.statLabel}>Payments</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={20} color={balance > 0 ? '#EF4444' : '#10B981'} />
              <Text style={[styles.statValue, { color: balance > 0 ? '#EF4444' : '#10B981' }]}>
                {balance > 0 ? formatCurrency(balance) : '₹0'}
              </Text>
              <Text style={styles.statLabel}>Outstanding</Text>
            </View>
          </View>
        </Surface>

        {/* Pending Dues Alert */}
        {balance > 0 && (
          <View style={styles.duesAlert}>
            <MaterialCommunityIcons name="alert-circle" size={20} color="#EF4444" />
            <View style={{ flex: 1 }}>
              <Text style={styles.duesTitle}>Outstanding Balance: {formatCurrency(balance)}</Text>
              <Text style={styles.duesSub}>Please contact your hostel owner to clear your dues.</Text>
            </View>
          </View>
        )}

        {/* Payment History */}
        <Text style={styles.sectionTitle}>Payment History</Text>

        {loading ? (
          <View style={{ gap: 12, marginTop: 10 }}>
            <SkeletonLoader width="100%" height={80} style={{ borderRadius: 14 }} />
            <SkeletonLoader width="100%" height={80} style={{ borderRadius: 14 }} />
            <SkeletonLoader width="100%" height={80} style={{ borderRadius: 14 }} />
          </View>
        ) : paymentHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="receipt-text-outline" size={56} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Payments Yet</Text>
            <Text style={styles.emptySub}>Your payment history will appear here once recorded.</Text>
          </View>
        ) : (
          paymentHistory.map(item => (
            <Surface key={item.id} style={styles.txCard} elevation={1}>
              <View style={styles.txLeft}>
                <View style={[styles.txIcon, { backgroundColor: item.isBeforeJoin ? '#F1F5F9' : item.isPaid ? '#D1FAE5' : '#FEF3C7' }]}>
                  <MaterialCommunityIcons 
                    name={item.isBeforeJoin ? 'cancel' : item.isPaid ? 'cash-check' : 'clock-outline'} 
                    size={22} 
                    color={item.isBeforeJoin ? '#94A3B8' : item.isPaid ? '#10B981' : '#F59E0B'} 
                  />
                </View>
                <View>
                  <Text style={styles.txDesc}>{item.isBeforeJoin ? 'Not Joined' : item.description}</Text>
                  <Text style={styles.txDate}>{item.isPaid && item.txDate ? formatDate(item.txDate) : item.isBeforeJoin ? '—' : 'Pending Payment'}</Text>
                  {item.monthYear && (
                    <View style={styles.monthBadge}>
                      <Text style={styles.monthBadgeText}>{item.monthYear}</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.txRight}>
                <Text style={[styles.txAmount, { color: item.isBeforeJoin ? '#94A3B8' : item.isPaid ? '#10B981' : '#F59E0B' }]}>{item.isBeforeJoin ? '—' : formatCurrency(item.amount)}</Text>
                <View style={[styles.paidChip, { backgroundColor: item.isBeforeJoin ? '#F1F5F9' : item.isPaid ? '#D1FAE5' : '#FEF3C7' }]}>
                  <MaterialCommunityIcons 
                    name={item.isBeforeJoin ? 'cancel' : item.isPaid ? 'check' : 'clock'} 
                    size={11} 
                    color={item.isBeforeJoin ? '#94A3B8' : item.isPaid ? '#10B981' : '#F59E0B'} 
                  />
                  <Text style={[styles.paidChipText, { color: item.isBeforeJoin ? '#94A3B8' : item.isPaid ? '#10B981' : '#F59E0B' }]}>
                    {item.isBeforeJoin ? 'Not Joined' : item.isPaid ? 'Paid' : 'Pending'}
                  </Text>
                </View>
              </View>
            </Surface>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0FDF4' },
  header: { backgroundColor: TEAL, paddingTop: 52, paddingBottom: 24, paddingHorizontal: 20 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  scroll: { padding: 16, paddingBottom: 40 },
  statusCard: { 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    padding: 20, 
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  statusTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  statusLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase' },
  statusAmount: { fontSize: 30, fontWeight: 'bold', color: '#0F172A', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusBadgeText: { fontSize: 13, fontWeight: '700' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statBox: { alignItems: 'center', gap: 4 },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  statLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  statDivider: { width: 1, backgroundColor: '#F1F5F9', height: 50 },
  duesAlert: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FEE2E2', borderRadius: 14, padding: 14, gap: 10, marginBottom: 16 },
  duesTitle: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
  duesSub: { fontSize: 12, color: '#EF4444', marginTop: 2, opacity: 0.8 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  txCard: { 
    backgroundColor: '#fff', 
    borderRadius: 14, 
    padding: 14, 
    marginBottom: 10, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  txLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1 },
  txIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center' },
  txDesc: { fontSize: 14, fontWeight: '600', color: '#0F172A', flexShrink: 1 },
  txDate: { fontSize: 12, color: '#64748B', marginTop: 2, flexShrink: 1 },
  monthBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, alignSelf: 'flex-start', marginTop: 4 },
  monthBadgeText: { fontSize: 10, fontWeight: '700', color: '#475569' },
  txRight: { alignItems: 'flex-end', gap: 4, paddingLeft: 10 },
  txAmount: { fontSize: 18, fontWeight: 'bold', color: '#10B981' },
  paidChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  paidChipText: { fontSize: 10, fontWeight: '700', color: '#10B981' },
  emptyState: { alignItems: 'center', marginTop: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#64748B' },
  emptySub: { fontSize: 13, color: '#94A3B8', textAlign: 'center' },
});
