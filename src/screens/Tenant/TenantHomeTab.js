// src/screens/Tenant/TenantHomeTab.js
// Hero home screen for the Tenant Dashboard.

import React, { useEffect, useRef, useState } from 'react';
import {
  View, StyleSheet, ScrollView, StatusBar, TouchableOpacity, Animated, RefreshControl
} from 'react-native';
import { Text, Surface, Divider } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import auth from '@react-native-firebase/auth';
import { useTenantContext } from './TenantDashboard';
import { getComplaintsForTenant } from '../../services/complaintService';
import { getNoticesForUser } from '../../services/noticeService';

const TEAL = '#0D9488';
const TEAL_DARK = '#0F766E';

const getRentStatusConfig = (status) => {
  switch (status) {
    case 'Paid': return { color: '#10B981', bg: '#D1FAE5', icon: 'check-circle', label: 'Paid ✓' };
    case 'Pending': return { color: '#F59E0B', bg: '#FEF3C7', icon: 'clock-alert', label: 'Due' };
    case 'Overdue': return { color: '#EF4444', bg: '#FEE2E2', icon: 'alert-circle', label: 'Overdue' };
    default: return { color: '#94A3B8', bg: '#F1F5F9', icon: 'help-circle', label: status || 'N/A' };
  }
};

const STATUS_CONFIG = {
  Open: { color: '#F59E0B', bg: '#FEF3C7', icon: 'clock-outline', label: 'Open' },
  'In Progress': { color: '#3B82F6', bg: '#DBEAFE', icon: 'progress-clock', label: 'In Progress' },
  Resolved: { color: '#10B981', bg: '#D1FAE5', icon: 'check-circle', label: 'Resolved' },
};

export default function TenantHomeTab({ navigation }) {
  const { tenantProfile } = useTenantContext();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const [recentNotice, setRecentNotice] = useState(null);
  const [recentComplaint, setRecentComplaint] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();

    const uid = auth().currentUser?.uid;
    if (!uid || !tenantProfile?.ownerId) return;

    // Fetch recent notice
    const unsubNotices = getNoticesForUser(tenantProfile.ownerId, 'Tenants', (notices) => {
      setRecentNotice(notices && notices.length > 0 ? notices[0] : null);
    });

    // Fetch recent complaint
    const unsubComplaints = getComplaintsForTenant(uid, (complaints) => {
      setRecentComplaint(complaints && complaints.length > 0 ? complaints[0] : null);
    });

    return () => {
      unsubNotices();
      unsubComplaints();
    };
  }, [tenantProfile]);

  if (!tenantProfile) return null;

  const rentConfig = getRentStatusConfig(tenantProfile.rentStatus);
  const firstName = (tenantProfile.name || 'Tenant').split(' ')[0];
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';
  const pendingDue = tenantProfile.balance > 0 ? `₹${tenantProfile.balance.toLocaleString('en-IN')}` : '₹0';

  const formatDate = (ts) => {
    if (!ts) return '—';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={TEAL_DARK} />

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[TEAL]} />}
      >

        {/* ── Hero Header ── */}
        <View style={styles.heroGradient}>
          <View style={styles.heroInner}>
            <View style={styles.heroTopRow}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarLetter}>{(tenantProfile.name || 'T')[0].toUpperCase()}</Text>
              </View>
              <TouchableOpacity
                style={styles.signOutBtn}
                onPress={() => auth().signOut()}
              >
                <MaterialCommunityIcons name="logout-variant" size={20} color="rgba(255,255,255,0.85)" />
              </TouchableOpacity>
            </View>

            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.heroName} numberOfLines={1}>{firstName} 👋</Text>

            <View style={styles.roomBadgeRow}>
              <View style={styles.roomBadge}>
                <MaterialCommunityIcons name="door" size={14} color={TEAL} />
                <Text style={styles.roomBadgeText}>Room {tenantProfile.roomNumber || 'Unassigned'}</Text>
              </View>
              <View style={styles.roomBadge}>
                <MaterialCommunityIcons name="office-building" size={14} color={TEAL} />
                <Text style={styles.roomBadgeText} numberOfLines={1}>Block {tenantProfile.blockId || 'Unassigned'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Dashboard Content ── */}
        <Animated.View style={[styles.contentWrapper, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          
          <Text style={styles.sectionTitle}>Dashboard Hub</Text>
          
          <View style={styles.hubGrid}>
            
            {/* Rent Status Card */}
            <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Rent')}>
              <Surface style={styles.infoWidget} elevation={1}>
                <View style={styles.widgetHeader}>
                  <View style={[styles.widgetIconBg, { backgroundColor: rentConfig.bg }]}>
                    <MaterialCommunityIcons name="cash-multiple" size={18} color={rentConfig.color} />
                  </View>
                  <Text style={styles.widgetTitle}>Rent & Dues</Text>
                </View>
                <Divider style={styles.widgetDivider} />
                <View style={styles.widgetBody}>
                  <Text style={styles.widgetSubTitle}>Current Status</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <MaterialCommunityIcons name={rentConfig.icon} size={16} color={rentConfig.color} />
                    <Text style={[styles.widgetValue, { color: rentConfig.color }]}>{rentConfig.label}</Text>
                  </View>
                  {tenantProfile.balance > 0 && (
                    <Text style={styles.widgetDueText}>Due Amount: <Text style={{fontWeight:'700'}}>{pendingDue}</Text></Text>
                  )}
                </View>
              </Surface>
            </TouchableOpacity>

            {/* Recent Complaint Card */}
            <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Complaints')}>
              <Surface style={styles.infoWidget} elevation={1}>
                <View style={styles.widgetHeader}>
                  <View style={[styles.widgetIconBg, { backgroundColor: '#FEF3C7' }]}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#F59E0B" />
                  </View>
                  <Text style={styles.widgetTitle}>Latest Complaint</Text>
                </View>
                <Divider style={styles.widgetDivider} />
                <View style={styles.widgetBody}>
                  {recentComplaint ? (
                    <>
                      <Text style={styles.widgetItemTitle} numberOfLines={1}>{recentComplaint.title}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        {(() => {
                          const cfg = STATUS_CONFIG[recentComplaint.status] || STATUS_CONFIG.Open;
                          return (
                            <>
                              <MaterialCommunityIcons name={cfg.icon} size={14} color={cfg.color} />
                              <Text style={[styles.widgetItemStatus, { color: cfg.color }]}>{cfg.label}</Text>
                            </>
                          );
                        })()}
                        <Text style={styles.widgetItemDate}>• {formatDate(recentComplaint.createdAt)}</Text>
                      </View>
                    </>
                  ) : (
                    <Text style={styles.emptyWidgetText}>No complaints raised yet.</Text>
                  )}
                </View>
              </Surface>
            </TouchableOpacity>

            {/* Recent Notice Card */}
            <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Notices')}>
              <Surface style={styles.infoWidget} elevation={1}>
                <View style={styles.widgetHeader}>
                  <View style={[styles.widgetIconBg, { backgroundColor: '#CCFBF1' }]}>
                    <MaterialCommunityIcons name="bulletin-board" size={18} color={TEAL} />
                  </View>
                  <Text style={styles.widgetTitle}>Recent Notice</Text>
                </View>
                <Divider style={styles.widgetDivider} />
                <View style={styles.widgetBody}>
                  {recentNotice ? (
                    <>
                      <Text style={styles.widgetItemTitle} numberOfLines={1}>{recentNotice.title}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                         <MaterialCommunityIcons name="clock-outline" size={13} color="#94A3B8" />
                         <Text style={styles.widgetItemDate}>{formatDate(recentNotice.createdAt)}</Text>
                      </View>
                    </>
                  ) : (
                    <Text style={styles.emptyWidgetText}>No recent notices from the hostel owner.</Text>
                  )}
                </View>
              </Surface>
            </TouchableOpacity>

          </View>
        </Animated.View>

        {/* ── Tenant Info Card ── */}
        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <Text style={styles.sectionTitle}>My Details</Text>
          <Surface style={styles.detailCard} elevation={1}>
            <InfoRow icon="phone-outline" label="Phone" value={tenantProfile.phone || '—'} />
            <InfoRow icon="email-outline" label="Email" value={tenantProfile.email || '—'} />
            <InfoRow icon="briefcase-outline" label="Workplace" value={tenantProfile.workplace || '—'} />
            <InfoRow icon="calendar-outline" label="Joined" value={tenantProfile.joined || '—'} />
            <InfoRow icon="cash" label="Agreed Rent" value={`₹${(tenantProfile.agreedRent || 0).toLocaleString('en-IN')}`} last />
          </Surface>
        </Animated.View>

      </ScrollView>
    </View>
  );
}

const InfoRow = ({ icon, label, value, last }) => (
  <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
    <View style={styles.infoIcon}>
      <MaterialCommunityIcons name={icon} size={18} color={TEAL} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0FDF4' },
  heroGradient: {
    backgroundColor: TEAL,
    paddingTop: 52,
    paddingBottom: 32,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroInner: {},
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  avatarCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  signOutBtn: { padding: 8 },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.95)', fontWeight: '500' },
  heroName: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginTop: 2 },
  roomBadgeRow: { flexDirection: 'row', marginTop: 10, gap: 8 },
  roomBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, gap: 4, flexShrink: 1 },
  roomBadgeText: { fontSize: 12, fontWeight: '700', color: TEAL, flexShrink: 1 },
  
  contentWrapper: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  section: { marginTop: 24, paddingHorizontal: 16, gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 8, marginLeft: 4 },
  
  hubGrid: { gap: 12 },
  infoWidget: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  widgetHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  widgetIconBg: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  widgetTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', flexShrink: 1 },
  widgetDivider: { marginVertical: 12, backgroundColor: '#F1F5F9' },
  widgetBody: { paddingLeft: 4, overflow: 'hidden' },
  widgetSubTitle: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' },
  widgetValue: { fontSize: 14, fontWeight: '800', flexShrink: 1 },
  widgetDueText: { fontSize: 13, color: '#EF4444', marginTop: 6, fontWeight: '500', flexShrink: 1 },
  widgetItemTitle: { fontSize: 14, fontWeight: '600', color: '#334155', flexShrink: 1 },
  widgetItemStatus: { fontSize: 12, fontWeight: '700', flexShrink: 1 },
  widgetItemDate: { fontSize: 12, color: '#64748B', fontWeight: '500', flexShrink: 1 },
  emptyWidgetText: { fontSize: 13, color: '#64748B', fontStyle: 'italic', flexShrink: 1 },
  
  detailCard: { 
    backgroundColor: '#fff', 
    borderRadius: 18, 
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 12 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  infoIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#CCFBF1', justifyContent: 'center', alignItems: 'center' },
  infoLabel: { fontSize: 11, color: '#64748B', fontWeight: '700', textTransform: 'uppercase' },
  infoValue: { fontSize: 14, color: '#0F172A', fontWeight: '600', marginTop: 1, flexShrink: 1 },
});
