// src/screens/Staff/StaffMaintenanceBoardScreen.js
// To-do list of maintenance complaints assigned to this staff member by the owner.

import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, FlatList, TouchableOpacity, StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { Text, Surface, Button } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import auth from '@react-native-firebase/auth';
import { useStaffContext } from './StaffDashboard';
import { getComplaintsForStaff, resolveComplaint } from '../../services/complaintService';

const ROSE = '#E11D48';

const CATEGORY_MAP = {
  Maintenance: { icon: 'wrench', color: '#F59E0B', bg: '#FEF3C7' },
  General: { icon: 'information', color: '#3B82F6', bg: '#DBEAFE' },
  Billing: { icon: 'currency-inr', color: '#8B5CF6', bg: '#EDE9FE' },
  Cleanliness: { icon: 'broom', color: '#10B981', bg: '#D1FAE5' },
  Safety: { icon: 'shield-alert', color: '#EF4444', bg: '#FEE2E2' },
};

const formatDate = (ts) => {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function StaffMaintenanceBoardScreen() {
  const { staffProfile } = useStaffContext();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'resolved'

  useEffect(() => {
    const uid = auth().currentUser?.uid;
    if (!uid) return;

    const unsub = getComplaintsForStaff(uid, (data) => {
      setComplaints(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const pending = complaints.filter(c => c.status !== 'Resolved');
  const resolved = complaints.filter(c => c.status === 'Resolved');
  const displayed = activeTab === 'pending' ? pending : resolved;

  const handleResolve = (complaintId, title) => {
    Alert.alert(
      'Mark as Resolved',
      `Mark "${title}" as completed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resolve',
          onPress: async () => {
            setResolvingId(complaintId);
            try {
              await resolveComplaint(complaintId);
            } catch {
              Alert.alert('Error', 'Could not mark as resolved.');
            } finally {
              setResolvingId(null);
            }
          },
        },
      ]
    );
  };

  const renderCard = ({ item }) => {
    const catCfg = CATEGORY_MAP[item.category] || CATEGORY_MAP.Maintenance;
    const isExpanded = expandedId === item.id;
    const isResolved = item.status === 'Resolved';

    return (
      <TouchableOpacity
        style={[styles.card, isExpanded && styles.cardExpanded]}
        onPress={() => setExpandedId(isExpanded ? null : item.id)}
        activeOpacity={0.85}
      >
        <View style={styles.cardTop}>
          <View style={[styles.catIcon, { backgroundColor: catCfg.bg }]}>
            <MaterialCommunityIcons name={catCfg.icon} size={22} color={catCfg.color} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.cardTitle} numberOfLines={isExpanded ? undefined : 1}>{item.title}</Text>
            <View style={styles.cardMeta}>
              <View style={[styles.catBadge, { backgroundColor: catCfg.bg }]}>
                <Text style={[styles.catBadgeText, { color: catCfg.color }]}>{item.category}</Text>
              </View>
              <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
            </View>
          </View>
          <MaterialCommunityIcons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={22}
            color="#94A3B8"
          />
        </View>

        {/* Tenant info */}
        <View style={styles.tenantRow}>
          <MaterialCommunityIcons name="account" size={14} color="#64748B" />
          <Text style={styles.tenantText} numberOfLines={1} ellipsizeMode="tail">
            {item.tenantName} · Room {item.roomNumber} · Block {item.blockId}
          </Text>
        </View>

        {/* Expanded: full description + resolve button */}
        {isExpanded && (
          <View style={styles.expandedBody}>
            <Text style={styles.descLabel}>Complaint Details:</Text>
            <Text style={styles.descText}>{item.description}</Text>

            {isResolved ? (
              <View style={styles.resolvedBadge}>
                <MaterialCommunityIcons name="check-decagram" size={18} color="#10B981" />
                <Text style={styles.resolvedText}>Resolved on {formatDate(item.resolvedAt)}</Text>
              </View>
            ) : (
              <Button
                mode="contained"
                onPress={() => handleResolve(item.id, item.title)}
                loading={resolvingId === item.id}
                disabled={!!resolvingId}
                buttonColor="#10B981"
                style={styles.resolveBtn}
                contentStyle={{ height: 44 }}
                labelStyle={{ fontWeight: 'bold', fontSize: 14 }}
                icon="check-circle"
              >
                Mark as Resolved
              </Button>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#BE123C" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Maintenance Board</Text>
        <Text style={styles.headerSub}>Tasks assigned to you by the owner</Text>
      </View>

      {/* Tab switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'pending' && styles.tabBtnActive]}
          onPress={() => setActiveTab('pending')}
        >
          <MaterialCommunityIcons name="clipboard-list" size={16} color={activeTab === 'pending' ? ROSE : '#94A3B8'} />
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
            Pending {pending.length > 0 ? `(${pending.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'resolved' && styles.tabBtnActive]}
          onPress={() => setActiveTab('resolved')}
        >
          <MaterialCommunityIcons name="clipboard-check" size={16} color={activeTab === 'resolved' ? ROSE : '#94A3B8'} />
          <Text style={[styles.tabText, activeTab === 'resolved' && styles.tabTextActive]}>
            Resolved {resolved.length > 0 ? `(${resolved.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={ROSE} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={item => item.id}
          renderItem={renderCard}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name={activeTab === 'pending' ? 'clipboard-check-outline' : 'clipboard-text-off-outline'}
                size={56}
                color="#CBD5E1"
              />
              <Text style={styles.emptyTitle}>
                {activeTab === 'pending' ? 'All Clear! 🎉' : 'No Resolved Tasks'}
              </Text>
              <Text style={styles.emptySub}>
                {activeTab === 'pending'
                  ? 'No pending tasks assigned to you.'
                  : 'Tasks you complete will appear here.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF1F2' },
  header: { backgroundColor: ROSE, paddingTop: 52, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 6, borderRadius: 10 },
  tabBtnActive: { backgroundColor: '#FEE2E2' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  tabTextActive: { color: ROSE },
  listContent: { padding: 16, paddingBottom: 40, gap: 10 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14 },
  cardExpanded: { borderWidth: 1.5, borderColor: ROSE + '30' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  catIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  catBadgeText: { fontSize: 10, fontWeight: '700' },
  cardDate: { fontSize: 11, color: '#94A3B8' },
  tenantRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F8FAFC' },
  tenantText: { fontSize: 12, color: '#64748B', fontWeight: '500', flex: 1 },
  expandedBody: { marginTop: 12, gap: 10 },
  descLabel: { fontSize: 12, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' },
  descText: { fontSize: 14, color: '#475569', lineHeight: 22 },
  resolveBtn: { borderRadius: 12 },
  resolvedBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#D1FAE5', padding: 10, borderRadius: 10 },
  resolvedText: { fontSize: 13, fontWeight: '700', color: '#10B981' },
  emptyState: { alignItems: 'center', marginTop: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#64748B' },
  emptySub: { fontSize: 13, color: '#94A3B8', textAlign: 'center' },
});
