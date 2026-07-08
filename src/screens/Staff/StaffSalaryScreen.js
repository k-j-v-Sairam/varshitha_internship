// src/screens/Staff/StaffSalaryScreen.js
// Read-only salary status view for staff members.

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, ActivityIndicator } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import { useStaffContext } from './StaffDashboard';

const ROSE = '#E11D48';

const formatCurrency = (amount) =>
  `₹${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

const formatDate = (ts) => {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const getCurrentMonthYear = () => {
  const now = new Date();
  return `${now.toLocaleString('default', { month: 'short' })}-${now.getFullYear()}`;
};

const generateRecentMonths = () => {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: `${d.toLocaleString('default', { month: 'short' })}-${d.getFullYear()}`,
      dateStr: `${d.toLocaleString('default', { month: 'long' })} ${d.getFullYear()}`,
      time: d.getTime()
    });
  }
  return months;
};

const getJoinTime = (profile) => {
  if (!profile) return Date.now();
  if (profile.joinDate) return new Date(profile.joinDate).getTime();
  if (profile.createdAt?.toDate) return profile.createdAt.toDate().getTime();
  if (profile.createdAt) return new Date(profile.createdAt).getTime();
  return Date.now();
};

export default function StaffSalaryScreen() {
  const { staffProfile } = useStaffContext();
  const [salaryHistory, setSalaryHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!staffProfile?.id) { setLoading(false); return; }
    // Fetch salary payment transactions for this staff
    firestore()
      .collection('transactions')
      .where('type', '==', 'SalaryPayment')
      .where('staffId', '==', staffProfile.id)
      .orderBy('date', 'desc')
      .get()
      .then(snap => {
        setSalaryHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [staffProfile?.id]);

  if (!staffProfile) return null;

  const salaryStatus = staffProfile.salaryStatus || 'Pending';
  const salary = staffProfile.salary || 0;
  const salaryMonth = staffProfile.salaryMonth || getCurrentMonthYear();

  const isCleared = salaryStatus === 'Cleared';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#BE123C" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Salary Tracker</Text>
        <Text style={styles.headerSub}>Your compensation overview</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Current Status Card */}
        <Surface style={[styles.statusCard, { borderTopColor: isCleared ? '#10B981' : '#F59E0B', borderTopWidth: 4 }]} elevation={2}>
          <View style={styles.statusTop}>
            <View style={[styles.statusIconBox, { backgroundColor: isCleared ? '#D1FAE5' : '#FEF3C7' }]}>
              <MaterialCommunityIcons
                name={isCleared ? 'check-circle' : 'clock-alert-outline'}
                size={36}
                color={isCleared ? '#10B981' : '#F59E0B'}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.currentMonthLabel}>Current Month</Text>
              <Text style={styles.currentMonth}>{salaryMonth}</Text>
              <View style={[styles.statusPill, { backgroundColor: isCleared ? '#D1FAE5' : '#FEF3C7' }]}>
                <Text style={[styles.statusPillText, { color: isCleared ? '#10B981' : '#F59E0B' }]}>
                  {isCleared ? '✓ Salary Cleared' : '⏳ Salary Pending'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.salaryDivider} />

          <View style={styles.salaryAmountRow}>
            <Text style={styles.salaryLabel}>Monthly Salary</Text>
            <Text style={styles.salaryAmount}>{formatCurrency(salary)}</Text>
          </View>

          {isCleared && (
            <View style={styles.clearedNote}>
              <MaterialCommunityIcons name="information-outline" size={14} color="#10B981" />
              <Text style={styles.clearedNoteText}>Your salary for {salaryMonth} has been cleared by your employer.</Text>
            </View>
          )}
          {!isCleared && (
            <View style={styles.pendingNote}>
              <MaterialCommunityIcons name="information-outline" size={14} color="#F59E0B" />
              <Text style={styles.pendingNoteText}>Your salary for {salaryMonth} is pending. Contact your employer if overdue.</Text>
            </View>
          )}
        </Surface>

        {/* Quick Stats */}
        <Surface style={styles.statsCard} elevation={1}>
          <StatBox icon="cash-multiple" label="Annual Package" value={formatCurrency(salary * 12)} color="#8B5CF6" />
          <View style={styles.statDivider} />
          <StatBox icon="history" label="Payments" value={String(salaryHistory.length)} color="#3B82F6" />
          <View style={styles.statDivider} />
          <StatBox icon="cash-check" label="Total Received" value={formatCurrency(salaryHistory.reduce((s, h) => s + Number(h.amount || 0), 0))} color="#10B981" />
        </Surface>

        {/* Payment History */}
        <Text style={styles.sectionTitle}>Payment History</Text>

        {loading ? (
          <ActivityIndicator size="large" color={ROSE} style={{ marginTop: 40 }} />
        ) : (
          generateRecentMonths().map(monthObj => {
            // Check if there's a payment for this month
            const tx = salaryHistory.find(t => 
              t.salaryMonth === monthObj.label || 
              (t.date && new Date(t.date.toDate ? t.date.toDate() : t.date).toLocaleString('default', { month: 'short' }) + '-' + new Date(t.date.toDate ? t.date.toDate() : t.date).getFullYear() === monthObj.label)
            );

            if (tx) {
              const displayMonth = tx.salaryMonth || (tx.date ? new Date(tx.date.toDate ? tx.date.toDate() : tx.date).toLocaleString('en-IN', { month: 'long', year: 'numeric' }) : monthObj.dateStr);
              return (
                <Surface key={monthObj.label} style={styles.txCard} elevation={1}>
                  <View style={styles.txTopRow}>
                    <View style={styles.txHeaderLeft}>
                      <View style={styles.txIconBox}>
                        <MaterialCommunityIcons name="check-circle" size={20} color="#10B981" />
                      </View>
                      <View>
                        <Text style={styles.txTitle}>{displayMonth}</Text>
                        <Text style={styles.txSubtitle}>{formatDate(tx.date)}</Text>
                      </View>
                    </View>
                    <Text style={styles.txAmount}>{formatCurrency(tx.amount)}</Text>
                  </View>
                  
                  <View style={styles.txDivider} />
                  
                  <View style={styles.txBottomRow}>
                    <Text style={styles.txRefText}>Ref: {tx.id.substring(0, 8).toUpperCase()}</Text>
                    <View style={styles.txStatusBadge}>
                      <Text style={styles.txStatusText}>Cleared</Text>
                    </View>
                  </View>
                </Surface>
              );
            }

            // No transaction found
            const joinTime = getJoinTime(staffProfile);
            const joinDate = new Date(joinTime);
            const isBeforeJoin = monthObj.time < new Date(joinDate.getFullYear(), joinDate.getMonth(), 1).getTime();

            const statusLabel = isBeforeJoin ? 'Not Joined' : 'Pending';
            const statusColor = isBeforeJoin ? '#94A3B8' : '#F59E0B';
            const statusIcon = isBeforeJoin ? 'account-off' : 'clock-alert-outline';
            const statusBg = isBeforeJoin ? '#F1F5F9' : '#FEF3C7';

            return (
              <Surface key={monthObj.label} style={styles.txCard} elevation={1}>
                <View style={styles.txTopRow}>
                  <View style={styles.txHeaderLeft}>
                    <View style={[styles.txIconBox, { backgroundColor: statusBg }]}>
                      <MaterialCommunityIcons name={statusIcon} size={20} color={statusColor} />
                    </View>
                    <View>
                      <Text style={styles.txTitle}>{monthObj.dateStr}</Text>
                      <Text style={styles.txSubtitle}>—</Text>
                    </View>
                  </View>
                  <Text style={[styles.txAmount, { color: statusColor }]}>{statusLabel === 'Pending' ? formatCurrency(salary) : '—'}</Text>
                </View>
                
                <View style={styles.txDivider} />
                
                <View style={styles.txBottomRow}>
                  <Text style={styles.txRefText}>—</Text>
                  <View style={[styles.txStatusBadge, { backgroundColor: statusBg }]}>
                    <Text style={[styles.txStatusText, { color: statusColor }]}>{statusLabel}</Text>
                  </View>
                </View>
              </Surface>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const StatBox = ({ icon, label, value, color }) => (
  <View style={styles.statBox}>
    <MaterialCommunityIcons name={icon} size={20} color={color} />
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF1F2' },
  header: { backgroundColor: ROSE, paddingTop: 52, paddingBottom: 24, paddingHorizontal: 20 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  scroll: { padding: 16, paddingBottom: 40 },
  statusCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16 },
  statusTop: { flexDirection: 'row', alignItems: 'center' },
  statusIconBox: { width: 68, height: 68, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  currentMonthLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase' },
  currentMonth: { fontSize: 18, fontWeight: 'bold', color: '#0F172A', marginTop: 2 },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, marginTop: 8 },
  statusPillText: { fontSize: 12, fontWeight: '700' },
  salaryDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 16 },
  salaryAmountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  salaryLabel: { fontSize: 14, color: '#64748B', fontWeight: '600' },
  salaryAmount: { fontSize: 28, fontWeight: 'bold', color: '#0F172A' },
  clearedNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 12, backgroundColor: '#D1FAE5', padding: 10, borderRadius: 10 },
  clearedNoteText: { fontSize: 12, color: '#10B981', flex: 1, lineHeight: 18 },
  pendingNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 12, backgroundColor: '#FEF3C7', padding: 10, borderRadius: 10 },
  pendingNoteText: { fontSize: 12, color: '#D97706', flex: 1, lineHeight: 18 },
  statsCard: { backgroundColor: '#fff', borderRadius: 18, flexDirection: 'row', padding: 16, marginBottom: 20 },
  statBox: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 15, fontWeight: 'bold' },
  statLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '600', textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: '#F1F5F9' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  txCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12 },
  txTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  txHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  txIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center' },
  txTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  txSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  txAmount: { fontSize: 16, fontWeight: 'bold', color: '#10B981' },
  txDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
  txBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  txRefText: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  txStatusBadge: { backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  txStatusText: { fontSize: 11, fontWeight: '700', color: '#10B981' },
  emptyState: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#64748B' },
  emptySub: { fontSize: 13, color: '#94A3B8', textAlign: 'center' },
});
