// src/screens/Owner/OwnerComplaintsScreen.js
// Owner's complaint management screen — view all tenant complaints, assign to staff, track status.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, FlatList, TouchableOpacity, StatusBar,
  Alert, ActivityIndicator, Modal, ScrollView,
} from 'react-native';
import { Text, Surface, Searchbar, Button } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { getComplaintsForOwner, assignComplaint, resolveComplaint, deleteComplaint } from '../../services/complaintService';
import { Colors } from '../../theme/colors';

const PRIMARY = Colors.primary || '#4338CA';

const CATEGORY_MAP = {
  Maintenance: { icon: 'wrench', color: '#F59E0B', bg: '#FEF3C7' },
  General: { icon: 'information', color: '#3B82F6', bg: '#DBEAFE' },
  Billing: { icon: 'currency-inr', color: '#8B5CF6', bg: '#EDE9FE' },
  Cleanliness: { icon: 'broom', color: '#10B981', bg: '#D1FAE5' },
  Safety: { icon: 'shield-alert', color: '#EF4444', bg: '#FEE2E2' },
};

const STATUS_CONFIG = {
  Open: { color: '#F59E0B', bg: '#FEF3C7', icon: 'clock-outline', label: 'Open' },
  'In Progress': { color: '#3B82F6', bg: '#DBEAFE', icon: 'progress-clock', label: 'In Progress' },
  Resolved: { color: '#10B981', bg: '#D1FAE5', icon: 'check-circle', label: 'Resolved' },
};

const formatDate = (ts) => {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function OwnerComplaintsScreen({ navigation }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [expandedId, setExpandedId] = useState(null);

  // Assign modal state
  const [assignModal, setAssignModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const ownerId = auth().currentUser?.uid;

  useEffect(() => {
    if (!ownerId) return;
    const unsub = getComplaintsForOwner(ownerId, (data) => {
      setComplaints(data);
      setLoading(false);
    });
    return () => unsub();
  }, [ownerId]);

  const loadStaff = useCallback(async () => {
    if (!ownerId) return;
    setLoadingStaff(true);
    try {
      const snap = await firestore()
        .collection('staff')
        .where('ownerId', '==', ownerId)
        .get();
      setStaffList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {
      Alert.alert('Error', 'Could not load staff list.');
    } finally {
      setLoadingStaff(false);
    }
  }, [ownerId]);

  const openAssignModal = (complaint) => {
    setSelectedComplaint(complaint);
    setAssignModal(true);
    loadStaff();
  };

  const handleAssign = async (staff) => {
    if (!selectedComplaint) return;
    setAssigning(true);
    try {
      await assignComplaint({
        complaintId: selectedComplaint.id,
        staffDocId: staff.id,
        staffName: staff.name,
        staffUid: staff.id, // staff doc ID == Firebase Auth UID
      });
      setAssignModal(false);
      setSelectedComplaint(null);
      Alert.alert('✅ Assigned', `Complaint assigned to ${staff.name}`);
    } catch {
      Alert.alert('Error', 'Could not assign complaint.');
    } finally {
      setAssigning(false);
    }
  };

  const handleResolve = (complaintId, title) => {
    Alert.alert(
      'Mark as Resolved',
      `Resolve "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resolve',
          onPress: async () => {
            try {
              await resolveComplaint(complaintId);
            } catch {
              Alert.alert('Error', 'Could not resolve complaint.');
            }
          },
        },
      ]
    );
  };

  const handleDelete = (complaintId, title) => {
    Alert.alert(
      'Delete Complaint',
      `Delete "${title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteComplaint(complaintId);
            } catch {
              Alert.alert('Error', 'Could not delete complaint.');
            }
          },
        },
      ]
    );
  };

  const filtered = complaints.filter(c => {
    const matchSearch = !searchQuery ||
      c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tenantName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = filterStatus === 'All' || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const openCount = complaints.filter(c => c.status === 'Open').length;
  const inProgressCount = complaints.filter(c => c.status === 'In Progress').length;
  const resolvedCount = complaints.filter(c => c.status === 'Resolved').length;

  const renderComplaint = ({ item }) => {
    const catCfg = CATEGORY_MAP[item.category] || CATEGORY_MAP.General;
    const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.Open;
    const isExpanded = expandedId === item.id;

    return (
      <TouchableOpacity
        style={[styles.card, isExpanded && styles.cardExpanded]}
        onPress={() => setExpandedId(isExpanded ? null : item.id)}
        activeOpacity={0.85}
      >
        {/* Top Row */}
        <View style={styles.cardTop}>
          <View style={[styles.catIcon, { backgroundColor: catCfg.bg }]}>
            <MaterialCommunityIcons name={catCfg.icon} size={20} color={catCfg.color} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.cardTitle} numberOfLines={isExpanded ? undefined : 1}>{item.title}</Text>
            <View style={styles.metaRow}>
              <View style={[styles.statusChip, { backgroundColor: statusCfg.bg }]}>
                <MaterialCommunityIcons name={statusCfg.icon} size={11} color={statusCfg.color} />
                <Text style={[styles.statusChipText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
              </View>
              <View style={[styles.catChip, { backgroundColor: catCfg.bg }]}>
                <Text style={[styles.catChipText, { color: catCfg.color }]}>{item.category}</Text>
              </View>
            </View>
          </View>
          <MaterialCommunityIcons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#94A3B8"
          />
        </View>

        {/* Tenant & Date info */}
        <View style={styles.tenantRow}>
          <MaterialCommunityIcons name="account" size={13} color="#64748B" />
          <Text style={styles.tenantText} numberOfLines={1} ellipsizeMode="tail">
            {item.tenantName} · Room {item.roomNumber} · Block {item.blockId}
          </Text>
          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
        </View>

        {/* Expanded Content */}
        {isExpanded && (
          <View style={styles.expandedBody}>
            <Text style={styles.descLabel}>Description:</Text>
            <Text style={styles.descText}>{item.description}</Text>

            {/* Assignment status */}
            {item.assignedToName && (
              <View style={styles.assignedBadge}>
                <MaterialCommunityIcons name="account-wrench" size={15} color="#8B5CF6" />
                <Text style={styles.assignedText}>Assigned to: {item.assignedToName}</Text>
              </View>
            )}

            {item.status === 'Resolved' && item.resolvedAt && (
              <View style={styles.resolvedBadge}>
                <MaterialCommunityIcons name="check-decagram" size={15} color="#10B981" />
                <Text style={styles.resolvedText}>Resolved on {formatDate(item.resolvedAt)}</Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              {item.status !== 'Resolved' && (
                <Button
                  mode="contained"
                  onPress={() => openAssignModal(item)}
                  buttonColor={PRIMARY}
                  style={[styles.actionBtn, { flex: 1 }]}
                  contentStyle={{ height: 38 }}
                  labelStyle={{ fontSize: 12, fontWeight: 'bold' }}
                  icon="account-arrow-right"
                  compact
                >
                  {item.assignedTo ? 'Reassign' : 'Assign'}
                </Button>
              )}
              {item.status !== 'Resolved' && (
                <Button
                  mode="outlined"
                  onPress={() => handleResolve(item.id, item.title)}
                  textColor="#10B981"
                  style={[styles.actionBtn, { flex: 1, borderColor: '#10B981' }]}
                  contentStyle={{ height: 38 }}
                  labelStyle={{ fontSize: 12, fontWeight: 'bold' }}
                  icon="check-circle-outline"
                  compact
                >
                  Resolve
                </Button>
              )}
              <Button
                mode="outlined"
                onPress={() => handleDelete(item.id, item.title)}
                textColor="#EF4444"
                style={[styles.actionBtn, { borderColor: '#EF4444' }]}
                contentStyle={{ height: 38 }}
                labelStyle={{ fontSize: 12, fontWeight: 'bold' }}
                icon="delete-outline"
                compact
              >
                Delete
              </Button>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3730A3" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Complaint Management</Text>
          <Text style={styles.headerSub}>Review and assign tenant complaints</Text>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        {[
          { label: 'Open', count: openCount, color: '#F59E0B', filterKey: 'Open' },
          { label: 'In Progress', count: inProgressCount, color: '#3B82F6', filterKey: 'In Progress' },
          { label: 'Resolved', count: resolvedCount, color: '#10B981', filterKey: 'Resolved' },
          { label: 'All', count: complaints.length, color: PRIMARY, filterKey: 'All' },
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

      {/* Search */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <Searchbar
          placeholder="Search complaints..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchbar}
          inputStyle={{ fontSize: 14 }}
          iconColor={PRIMARY}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={PRIMARY} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderComplaint}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="clipboard-check-outline" size={56} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Complaints</Text>
              <Text style={styles.emptySub}>
                {filterStatus === 'All' ? 'No complaints submitted yet.' : `No ${filterStatus} complaints.`}
              </Text>
            </View>
          }
        />
      )}

      {/* Assign Modal */}
      <Modal visible={assignModal} animationType="slide" transparent onRequestClose={() => setAssignModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign to Staff</Text>
              <TouchableOpacity onPress={() => setAssignModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            {selectedComplaint && (
              <View style={styles.modalComplaintInfo}>
                <MaterialCommunityIcons name="alert-circle-outline" size={15} color={PRIMARY} />
                <Text style={styles.modalComplaintTitle} numberOfLines={1}>{selectedComplaint.title}</Text>
              </View>
            )}
            {loadingStaff ? (
              <ActivityIndicator size="large" color={PRIMARY} style={{ marginTop: 40 }} />
            ) : staffList.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptySub}>No staff found. Add staff first.</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {staffList.map(staff => (
                  <TouchableOpacity
                    key={staff.id}
                    style={[styles.staffRow, assigning && { opacity: 0.6 }]}
                    onPress={() => handleAssign(staff)}
                    disabled={assigning}
                  >
                    <View style={styles.staffAvatar}>
                      <Text style={styles.staffAvatarLetter}>{(staff.name || '?')[0].toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.staffName}>{staff.name}</Text>
                      <Text style={styles.staffRole}>
                        {(staff.roles || [staff.role]).filter(Boolean).join(', ')} · Block {staff.block || '—'}
                      </Text>
                    </View>
                    {selectedComplaint?.assignedTo === staff.id && (
                      <MaterialCommunityIcons name="check-circle" size={20} color="#10B981" />
                    )}
                    <MaterialCommunityIcons name="chevron-right" size={20} color="#CBD5E1" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
  statsRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 14, gap: 8 },
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
  statNum: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '600', marginTop: 2, textAlign: 'center' },
  searchbar: { borderRadius: 12, elevation: 2, backgroundColor: '#fff' },
  listContent: { padding: 16, paddingBottom: 40, gap: 10 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, elevation: 2 },
  cardExpanded: { borderWidth: 1.5, borderColor: PRIMARY + '40' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  catIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  metaRow: { flexDirection: 'row', gap: 6, marginTop: 5, flexWrap: 'wrap' },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10 },
  statusChipText: { fontSize: 10, fontWeight: '700' },
  catChip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10 },
  catChipText: { fontSize: 10, fontWeight: '700' },
  tenantRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F8FAFC', flexWrap: 'wrap' },
  tenantText: { fontSize: 12, color: '#64748B', fontWeight: '500', flex: 1 },
  dateText: { fontSize: 11, color: '#94A3B8' },
  expandedBody: { marginTop: 12, gap: 10 },
  descLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' },
  descText: { fontSize: 14, color: '#475569', lineHeight: 22 },
  assignedBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#EDE9FE', padding: 10, borderRadius: 10 },
  assignedText: { fontSize: 13, fontWeight: '700', color: '#8B5CF6' },
  resolvedBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#D1FAE5', padding: 10, borderRadius: 10 },
  resolvedText: { fontSize: 13, fontWeight: '700', color: '#10B981' },
  actionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn: { borderRadius: 10 },
  emptyState: { alignItems: 'center', marginTop: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#64748B' },
  emptySub: { fontSize: 13, color: '#94A3B8', textAlign: 'center' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '75%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  modalComplaintInfo: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#EEF2FF', padding: 10, borderRadius: 10, marginBottom: 14 },
  modalComplaintTitle: { fontSize: 13, fontWeight: '700', color: PRIMARY, flex: 1 },
  staffRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 12 },
  staffAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  staffAvatarLetter: { fontSize: 18, fontWeight: 'bold', color: PRIMARY },
  staffName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  staffRole: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
});
