// src/screens/Tenant/TenantNoticeBoardScreen.js
// Real-time notice feed from the owner — read-only for tenants.

import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, FlatList, RefreshControl, StatusBar, TouchableOpacity,
} from 'react-native';
import { Text, Surface, Searchbar } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTenantContext } from './TenantDashboard';
import { getNoticesForUser } from '../../services/noticeService';
import SkeletonLoader from '../../components/common/SkeletonLoader';

const TEAL = '#0D9488';

const PRIORITY_MAP = {
  High: { color: '#EF4444', bg: '#FEE2E2', icon: 'alert-circle' },
  Medium: { color: '#F59E0B', bg: '#FEF3C7', icon: 'alert' },
  Low: { color: '#10B981', bg: '#D1FAE5', icon: 'information-outline' },
};

const TYPE_ICONS = {
  General: 'bulletin-board',
  Payment: 'cash',
  Event: 'calendar-star',
  Holiday: 'beach',
  Maintenance: 'wrench',
};

export default function TenantNoticeBoardScreen() {
  const { tenantProfile } = useTenantContext();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!tenantProfile?.ownerId) return;
    const unsub = getNoticesForUser(tenantProfile.ownerId, 'Tenants', (data) => {
      setNotices(data);
      setLoading(false);
      setRefreshing(false);
    });
    return () => unsub();
  }, [tenantProfile?.ownerId]);

  const filtered = notices.filter(n =>
    !searchQuery ||
    n.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (ts) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const renderNotice = ({ item }) => {
    const pCfg = PRIORITY_MAP[item.priority] || PRIORITY_MAP.Low;
    const typeIcon = TYPE_ICONS[item.type] || 'bulletin-board';
    return (
      <Surface style={styles.card} elevation={1}>
        <View style={[styles.priorityStrip, { backgroundColor: pCfg.color }]} />
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <View style={[styles.typeIconBox, { backgroundColor: pCfg.bg }]}>
              <MaterialCommunityIcons name={typeIcon} size={20} color={pCfg.color} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: pCfg.bg }]}>
                  <Text style={[styles.badgeText, { color: pCfg.color }]}>{item.priority || 'Low'}</Text>
                </View>
                {item.type && (
                  <View style={[styles.badge, { backgroundColor: '#F1F5F9' }]}>
                    <Text style={[styles.badgeText, { color: '#475569' }]}>{item.type}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          <Text style={styles.cardDesc}>{item.description}</Text>
          <View style={styles.cardFooter}>
            <MaterialCommunityIcons name="clock-outline" size={13} color="#94A3B8" />
            <Text style={styles.dateText}> {item.displayDate || formatDate(item.createdAt)}</Text>
          </View>
        </View>
      </Surface>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F766E" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notice Board</Text>
        <Text style={styles.headerSub}>Announcements from your hostel owner</Text>
        {notices.length > 0 && (
          <View style={styles.countBadge}>
            <MaterialCommunityIcons name="bell-ring" size={14} color={TEAL} />
            <Text style={styles.countText}>{notices.length} active notice{notices.length !== 1 ? 's' : ''}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderNotice}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => setRefreshing(true)}
            colors={[TEAL]}
          />
        }
        ListHeaderComponent={
          <Searchbar
            placeholder="Search notices..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchbar}
            inputStyle={{ fontSize: 14, color: '#0F172A' }}
            theme={{ colors: { onSurface: '#0F172A', onSurfaceVariant: '#64748B' } }}
            iconColor={TEAL}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={{ gap: 12 }}>
              <SkeletonLoader width="100%" height={120} style={{ borderRadius: 16 }} />
              <SkeletonLoader width="100%" height={120} style={{ borderRadius: 16 }} />
              <SkeletonLoader width="100%" height={120} style={{ borderRadius: 16 }} />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="clipboard-text-off-outline" size={56} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Notices Yet</Text>
              <Text style={styles.emptySub}>Your hostel owner hasn't posted any notices.</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0FDF4' },
  header: { backgroundColor: TEAL, paddingTop: 52, paddingBottom: 24, paddingHorizontal: 20 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  countBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 10, backgroundColor: '#fff', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, gap: 4 },
  countText: { fontSize: 12, fontWeight: '700', color: TEAL },
  listContent: { padding: 16, paddingBottom: 40 },
  searchbar: { marginBottom: 16, borderRadius: 12, elevation: 2, backgroundColor: '#fff' },
  card: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    marginBottom: 12, 
    flexDirection: 'row', 
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  priorityStrip: { width: 4 },
  cardBody: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  typeIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  cardDesc: { fontSize: 13, color: '#475569', lineHeight: 20, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 8 },
  dateText: { fontSize: 12, color: '#94A3B8' },
  emptyState: { alignItems: 'center', marginTop: 100, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#64748B' },
  emptySub: { fontSize: 13, color: '#94A3B8', textAlign: 'center' },
});
