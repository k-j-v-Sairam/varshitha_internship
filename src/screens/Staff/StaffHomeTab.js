// src/screens/Staff/StaffHomeTab.js
// Hero home screen for the Staff Dashboard.

import React, { useEffect, useRef } from 'react';
import {
  View, StyleSheet, ScrollView, StatusBar, TouchableOpacity, Animated,
} from 'react-native';
import { Text, Surface } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import auth from '@react-native-firebase/auth';
import { useStaffContext } from './StaffDashboard';
import { getNoticesForUser } from '../../services/noticeService';
import { getMySupplyAlerts } from '../../services/supplyAlertService';

const ROSE = '#E11D48';
const ROSE_DARK = '#BE123C';

export default function StaffHomeTab({ navigation }) {
  const { staffProfile } = useStaffContext();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const [recentNotice, setRecentNotice] = React.useState(null);
  const [recentSupply, setRecentSupply] = React.useState(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();

    if (staffProfile?.ownerId) {
      const unsubNotices = getNoticesForUser(staffProfile.ownerId, 'Staff', (data) => {
        setRecentNotice(data.length > 0 ? data[0] : null);
      });
      return () => unsubNotices();
    }
  }, [staffProfile?.ownerId]);

  useEffect(() => {
    const uid = auth().currentUser?.uid;
    if (uid) {
      const unsubAlerts = getMySupplyAlerts(uid, (data) => {
        setRecentSupply(data.length > 0 ? data[0] : null);
      });
      return () => unsubAlerts();
    }
  }, []);

  if (!staffProfile) return null;

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';
  const firstName = (staffProfile.name || 'Staff').split(' ')[0];

  // Compute attendance stats for current month
  const attendanceMap = staffProfile.attendance || {};
  const curYear = now.getFullYear();
  const curMonth = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `${curYear}-${curMonth}`;
  const thisMonthEntries = Object.entries(attendanceMap).filter(([k]) => k.startsWith(prefix));
  const presentDays = thisMonthEntries.filter(([, v]) => v === 'Present').length;
  const absentDays = thisMonthEntries.filter(([, v]) => v === 'Absent').length;
  const markedDays = thisMonthEntries.length;

  const salaryStatus = staffProfile.salaryStatus || 'Pending';
  const salaryConfig = salaryStatus === 'Cleared'
    ? { color: '#10B981', bg: '#D1FAE5', icon: 'check-circle', label: 'Salary Cleared ✓' }
    : { color: '#F59E0B', bg: '#FEF3C7', icon: 'clock-alert', label: 'Salary Pending' };

  const totalMarked = presentDays + absentDays;
  const attendancePercentage = totalMarked > 0 ? Math.round((presentDays / totalMarked) * 100) : 0;
  const percentageColor = attendancePercentage >= 85 ? '#10B981' : attendancePercentage >= 75 ? '#F59E0B' : '#EF4444';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={ROSE_DARK} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* ── Hero Header ── */}
        <View style={styles.hero}>
          <View style={styles.heroTopRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarLetter}>{(staffProfile.name || 'S')[0].toUpperCase()}</Text>
            </View>
            <TouchableOpacity style={styles.signOutBtn} onPress={() => auth().signOut()}>
              <MaterialCommunityIcons name="logout-variant" size={20} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
          </View>
          <Text style={styles.greeting}>{greeting},</Text>
          <Text style={styles.heroName}>{firstName} 👋</Text>

          {/* Role chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(staffProfile.roles || [staffProfile.role]).filter(Boolean).map(r => (
                <View key={r} style={styles.roleChip}>
                  <MaterialCommunityIcons name="briefcase" size={12} color={ROSE} />
                  <Text style={styles.roleChipText}>{r}</Text>
                </View>
              ))}
              {staffProfile.block && staffProfile.block !== 'Unassigned' && (
                <View style={styles.roleChip}>
                  <MaterialCommunityIcons name="office-building" size={12} color={ROSE} />
                  <Text style={styles.roleChipText}>Block {staffProfile.block}</Text>
                </View>
              )}
              {staffProfile.isTaker && (
                <View style={[styles.roleChip, { backgroundColor: '#FEE2E2' }]}>
                  <MaterialCommunityIcons name="clipboard-check" size={12} color={ROSE} />
                  <Text style={[styles.roleChipText, { color: ROSE }]}>Attendance Taker</Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Salary Status pill */}
          <View style={[styles.salaryPill, { backgroundColor: salaryConfig.bg }]}>
            <MaterialCommunityIcons name={salaryConfig.icon} size={16} color={salaryConfig.color} />
            <Text style={[styles.salaryPillText, { color: salaryConfig.color }]}>{salaryConfig.label}</Text>
          </View>
        </View>

        {/* ── Attendance Stats ── */}
        <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.sectionTitle}>This Month's Attendance</Text>
          <Surface style={styles.statsCard} elevation={1}>
            <StatBox value={presentDays} label="Present" color="#10B981" icon="check-circle-outline" />
            <View style={styles.statDivider} />
            <StatBox value={absentDays} label="Absent" color="#EF4444" icon="close-circle-outline" />
            <View style={styles.statDivider} />
            <StatBox value={`${attendancePercentage}%`} label="Attendance" color={percentageColor} icon="chart-donut" />
          </Surface>
        </Animated.View>

        {/* ── Dashboard Overview ── */}
        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <Text style={styles.sectionTitle}>Overview</Text>
          
          {/* Recent Notice */}
          <Surface style={styles.overviewCard} elevation={1}>
            <View style={styles.overviewIconBox}>
              <MaterialCommunityIcons name="bulletin-board" size={22} color="#3B82F6" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.overviewTitle}>Latest Notice</Text>
              <Text style={styles.overviewValue} numberOfLines={1}>
                {recentNotice ? recentNotice.title : 'No new notices'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.getParent()?.navigate('Notices')}>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#94A3B8" />
            </TouchableOpacity>
          </Surface>

          {/* Current Salary Status */}
          <Surface style={styles.overviewCard} elevation={1}>
            <View style={[styles.overviewIconBox, { backgroundColor: salaryConfig.bg }]}>
              <MaterialCommunityIcons name={salaryConfig.icon} size={22} color={salaryConfig.color} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.overviewTitle}>Salary Status</Text>
              <Text style={[styles.overviewValue, { color: salaryConfig.color }]}>
                {salaryConfig.label}
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.getParent()?.navigate('Salary')}>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#94A3B8" />
            </TouchableOpacity>
          </Surface>

          {/* Recent Supply Alert */}
          <Surface style={styles.overviewCard} elevation={1}>
            <View style={[styles.overviewIconBox, { backgroundColor: '#EDE9FE' }]}>
              <MaterialCommunityIcons name="package-variant" size={22} color="#8B5CF6" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.overviewTitle}>Recent Supply Alert</Text>
              <Text style={styles.overviewValue} numberOfLines={1}>
                {recentSupply ? `${recentSupply.item} - ${recentSupply.status === 'Acknowledged' ? 'Seen' : 'Pending'}` : 'No recent alerts'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.getParent()?.navigate('Supplies')}>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#94A3B8" />
            </TouchableOpacity>
          </Surface>
        </Animated.View>

        {/* ── Staff Details ── */}
        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <Text style={styles.sectionTitle}>My Details</Text>
          <Surface style={styles.detailCard} elevation={1}>
            <InfoRow icon="phone-outline" label="Phone" value={staffProfile.phone || '—'} />
            <InfoRow icon="email-outline" label="Email" value={staffProfile.email || '—'} />
            <InfoRow icon="clock-outline" label="Shift" value={staffProfile.shift || '—'} />
            <InfoRow icon="currency-inr" label="Salary" value={`₹${(staffProfile.salary || 0).toLocaleString('en-IN')}/month`} />
            <InfoRow icon="identifier" label="Staff ID" value={staffProfile.staffId || '—'} last />
          </Surface>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const StatBox = ({ value, label, color, icon }) => (
  <View style={styles.statBox}>
    <MaterialCommunityIcons name={icon} size={22} color={color} />
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const InfoRow = ({ icon, label, value, last }) => (
  <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
    <View style={styles.infoIcon}>
      <MaterialCommunityIcons name={icon} size={18} color={ROSE} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF1F2' },
  hero: { backgroundColor: ROSE, paddingTop: 52, paddingBottom: 24, paddingHorizontal: 20 },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  avatarCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  signOutBtn: { padding: 8 },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  heroName: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginTop: 2 },
  roleChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, gap: 4 },
  roleChipText: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
  salaryPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, gap: 6, marginTop: 14 },
  salaryPillText: { fontSize: 13, fontWeight: '700' },
  section: { marginTop: 20, paddingHorizontal: 16, gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  statsCard: { backgroundColor: '#fff', borderRadius: 18, flexDirection: 'row', padding: 16 },
  statBox: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 24, fontWeight: 'bold' },
  statLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  statDivider: { width: 1, backgroundColor: '#F1F5F9' },
  overviewCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  overviewIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center' },
  overviewTitle: { fontSize: 11, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase' },
  overviewValue: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginTop: 2 },
  detailCard: { backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 12 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  infoIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' },
  infoLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase' },
  infoValue: { fontSize: 14, color: '#0F172A', fontWeight: '600', marginTop: 1 },
});
