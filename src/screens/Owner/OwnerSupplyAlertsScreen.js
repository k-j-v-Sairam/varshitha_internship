// src/screens/Owner/OwnerSupplyAlertsScreen.js
// Owner's view of all supply alerts from staff — acknowledge and track.

import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, FlatList, TouchableOpacity, StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { Text, Surface, Button } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import auth from '@react-native-firebase/auth';
import { getSupplyAlertsForOwner, resolveSupplyAlert } from '../../services/supplyAlertService';
import { Colors } from '../../theme/colors';

const PRIMARY = Colors.primary || '#4338CA';

const SUPPLY_ICONS = {
  'Cleaning Supplies': { icon: 'spray-bottle', color: '#10B981', bg: '#D1FAE5' },
  'Water Cans': { icon: 'water', color: '#3B82F6', bg: '#DBEAFE' },
  'Kitchen Supplies': { icon: 'pot-steam', color: '#F59E0B', bg: '#FEF3C7' },
  'Electrical/Bulbs': { icon: 'lightbulb-on', color: '#EAB308', bg: '#FEF9C3' },
  'Bathroom Supplies': { icon: 'shower-head', color: '#8B5CF6', bg: '#EDE9FE' },
  'General Inventory': { icon: 'package-variant', color: '#0D9488', bg: '#CCFBF1' },
  'Electrical Issue': { icon: 'lightning-bolt', color: '#EF4444', bg: '#FEE2E2' },
  'Plumbing Issue': { icon: 'pipe-leak', color: '#64748B', bg: '#F1F5F9' },
  'Gas/LPG': { icon: 'gas-cylinder', color: '#F97316', bg: '#FFEDD5' },
  'First Aid Kit': { icon: 'medical-bag', color: '#EF4444', bg: '#FEE2E2' },
  'Bed/Mattress Issue': { icon: 'bed', color: '#6366F1', bg: '#EEF2FF' },
  'Pest Control': { icon: 'bug', color: '#92400E', bg: '#FEF3C7' },
  'Miscellaneous': { icon: 'dots-horizontal-circle-outline', color: '#475569', bg: '#F8FAFC' },
};

const formatDate = (ts) => {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

export default function OwnerSupplyAlertsScreen({ navigation }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All');
  const [acknowledging, setAcknowledging] = useState(null);

  const ownerId = auth().currentUser?.uid;

  useEffect(() => {
    if (!ownerId) return;
    const unsub = getSupplyAlertsForOwner(ownerId, (data) => {
      setAlerts(data);
      setLoading(false);
    });
    return () => unsub();
  }, [ownerId]);

  const handleAcknowledge = async (alertId, item) => {
    setAcknowledging(alertId);
    try {
      await resolveSupplyAlert(alertId);
    } catch {
      Alert.alert('Error', 'Could not resolve alert.');
    } finally {
      setAcknowledging(null);
    }
  };

  const filtered = filterStatus === 'All' ? alerts :
    alerts.filter(a => a.status === filterStatus || (filterStatus === 'Resolved' && a.status === 'Acknowledged'));

  const pendingCount = alerts.filter(a => a.status === 'Pending').length;
  const ackCount = alerts.filter(a => a.status === 'Resolved' || a.status === 'Acknowledged').length;

  const renderAlert = ({ item }) => {
    const iconCfg = SUPPLY_ICONS[item.item] || { icon: 'package-variant', color: '#64748B', bg: '#F1F5F9' };
    const isPending = item.status === 'Pending';

    return (
      <Surface style={[styles.alertCard, isPending && styles.alertCardPending]} elevation={1}>
        <View style={[styles.alertIcon, { backgroundColor: iconCfg.bg }]}>
          <MaterialCommunityIcons name={iconCfg.icon} size={26} color={iconCfg.color} />
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.alertItem}>{item.quantity || 1}x {item.item}</Text>
          {item.description ? <Text style={styles.alertDesc}>{item.description}</Text> : null}
          <View style={styles.alertMeta}>
            <MaterialCommunityIcons name="account" size={13} color="#94A3B8" />
            <Text style={styles.alertMetaText}>{item.staffName} · Block {item.blockId}</Text>
          </View>
          <Text style={styles.alertDate}>{formatDate(item.createdAt)}</Text>
        </View>
        <View style={styles.alertRight}>
          <View style={[styles.statusPill, { backgroundColor: isPending ? '#FEF3C7' : '#D1FAE5' }]}>
            <Text style={[styles.statusPillText, { color: isPending ? '#F59E0B' : '#10B981' }]}>
              {isPending ? 'Pending' : '✓ Resolved'}
            </Text>
          </View>
          {isPending && (
            <TouchableOpacity
              style={[styles.ackBtn, acknowledging === item.id && { opacity: 0.6 }]}
              onPress={() => handleAcknowledge(item.id, item.item)}
              disabled={!!acknowledging}
            >
              {acknowledging === item.id ? (
                <ActivityIndicator size="small" color={PRIMARY} />
              ) : (
                <MaterialCommunityIcons name="check" size={18} color={PRIMARY} />
              )}
            </TouchableOpacity>
          )}
        </View>
      </Surface>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3730A3" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Supply Alerts</Text>
          <Text style={styles.headerSub}>Requests from your staff members</Text>
        </View>
        {pendingCount > 0 && (
          <View style={styles.badgeChip}>
            <Text style={styles.badgeChipText}>{pendingCount} new</Text>
          </View>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { label: 'All', count: alerts.length, color: PRIMARY, filterKey: 'All' },
          { label: 'Pending', count: pendingCount, color: '#F59E0B', filterKey: 'Pending' },
          { label: 'Resolved', count: ackCount, color: '#10B981', filterKey: 'Resolved' },
        ].map(s => (
          <TouchableOpacity
            key={s.filterKey}
            style={[styles.statCard, filterStatus === s.filterKey && { borderColor: s.color, borderWidth: 2 }]}
            onPress={() => setFilterStatus(s.filterKey)}
          >
            <Text style={[styles.statNum, { color: s.color }]}>{s.count}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={PRIMARY} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderAlert}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="bell-off-outline" size={56} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Alerts</Text>
              <Text style={styles.emptySub}>
                {filterStatus === 'All' ? 'No supply alerts from staff yet.' : `No ${filterStatus} alerts.`}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    backgroundColor: PRIMARY,
    paddingTop: 52,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  badgeChip: { backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeChipText: { fontSize: 11, fontWeight: '700', color: '#D97706' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    elevation: 2,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  statNum: { fontSize: 22, fontWeight: 'bold' },
  statLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '600', marginTop: 2 },
  listContent: { padding: 16, paddingBottom: 40, gap: 10 },
  alertCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'flex-start' },
  alertCardPending: { borderLeftWidth: 3, borderLeftColor: '#F59E0B' },
  alertIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  alertItem: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  alertDesc: { fontSize: 13, color: '#334155', marginTop: 2, fontStyle: 'italic' },
  alertMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  alertMetaText: { fontSize: 12, color: '#94A3B8' },
  alertDate: { fontSize: 11, color: '#CBD5E1', marginTop: 3 },
  alertRight: { alignItems: 'flex-end', gap: 8, marginLeft: 10 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  ackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: { alignItems: 'center', marginTop: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#64748B' },
  emptySub: { fontSize: 13, color: '#94A3B8', textAlign: 'center' },
});
