// src/screens/Tenant/TenantComplaintScreen.js
// Complaint submission form + history list for the tenant.

import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, Alert,
  StatusBar, KeyboardAvoidingView, Platform, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Text, TextInput, Button, Surface } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import auth from '@react-native-firebase/auth';
import { useTenantContext } from './TenantDashboard';
import { submitComplaint, getComplaintsForTenant } from '../../services/complaintService';
import SkeletonLoader from '../../components/common/SkeletonLoader';

const TEAL = '#0D9488';

const CATEGORIES = [
  { key: 'General', icon: 'information', color: '#3B82F6', bg: '#DBEAFE' },
  { key: 'Maintenance', icon: 'wrench', color: '#F59E0B', bg: '#FEF3C7' },
  { key: 'Billing', icon: 'currency-inr', color: '#8B5CF6', bg: '#EDE9FE' },
  { key: 'Cleanliness', icon: 'broom', color: '#10B981', bg: '#D1FAE5' },
  { key: 'Safety', icon: 'shield-alert', color: '#EF4444', bg: '#FEE2E2' },
];

const STATUS_CONFIG = {
  Open: { color: '#F59E0B', bg: '#FEF3C7', icon: 'clock-outline', label: 'Open' },
  'In Progress': { color: '#3B82F6', bg: '#DBEAFE', icon: 'progress-clock', label: 'In Progress' },
  Resolved: { color: '#10B981', bg: '#D1FAE5', icon: 'check-circle', label: 'Resolved' },
};

export default function TenantComplaintScreen() {
  const { tenantProfile } = useTenantContext();
  const [tab, setTab] = useState('new'); // 'new' | 'history'
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [submitting, setSubmitting] = useState(false);
  const [complaints, setComplaints] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const uid = auth().currentUser?.uid;
    if (!uid) return;

    const unsub = getComplaintsForTenant(uid, (data) => {
      setComplaints(data);
      setLoadingHistory(false);
    });
    return () => unsub();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleSubmit = async () => {
    if (!title.trim()) { Alert.alert('Missing', 'Please enter a complaint title.'); return; }
    if (!description.trim() || description.length < 10) { Alert.alert('Missing', 'Please describe your complaint (min. 10 characters).'); return; }
    if (!tenantProfile) { Alert.alert('Error', 'Your profile could not be loaded.'); return; }

    setSubmitting(true);
    try {
      await submitComplaint({
        tenantId: tenantProfile.id,
        tenantName: tenantProfile.name,
        tenantUid: auth().currentUser?.uid,
        ownerId: tenantProfile.ownerId,
        blockId: tenantProfile.blockId,
        roomNumber: tenantProfile.roomNumber,
        title: title.trim(),
        description: description.trim(),
        category,
      });
      Alert.alert('✅ Submitted!', 'Your complaint has been sent to the hostel owner.', [
        { text: 'OK', onPress: () => { setTitle(''); setDescription(''); setTab('history'); } },
      ]);
    } catch (err) {
      Alert.alert('Error', 'Could not submit complaint. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return '—';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F766E" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Complaints</Text>
        <Text style={styles.headerSub}>Report issues to your hostel owner</Text>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'new' && styles.tabBtnActive]}
          onPress={() => setTab('new')}
        >
          <MaterialCommunityIcons name="plus-circle-outline" size={17} color={tab === 'new' ? TEAL : '#94A3B8'} />
          <Text style={[styles.tabBtnText, tab === 'new' && styles.tabBtnTextActive]}>New Complaint</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'history' && styles.tabBtnActive]}
          onPress={() => setTab('history')}
        >
          <MaterialCommunityIcons name="history" size={17} color={tab === 'history' ? TEAL : '#94A3B8'} />
          <Text style={[styles.tabBtnText, tab === 'history' && styles.tabBtnTextActive]}>
            My Complaints {complaints.length > 0 ? `(${complaints.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'new' ? (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false}>
            {/* Category Selector */}
            <Text style={styles.fieldLabel}>Category *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.key}
                    style={[styles.catChip, category === cat.key && { borderColor: cat.color, borderWidth: 2, backgroundColor: cat.bg }]}
                    onPress={() => setCategory(cat.key)}
                  >
                    <MaterialCommunityIcons name={cat.icon} size={18} color={category === cat.key ? cat.color : '#94A3B8'} />
                    <Text style={[styles.catChipText, category === cat.key && { color: cat.color }]}>{cat.key}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Title */}
            <Text style={styles.fieldLabel}>Complaint Title *</Text>
            <TextInput
              mode="outlined"
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Leaking tap in bathroom"
              style={styles.input}
              outlineColor="#E2E8F0"
              activeOutlineColor={TEAL}
              textColor="#0F172A"
              theme={{ colors: { onSurface: '#0F172A', onSurfaceVariant: '#64748B' } }}
              left={<TextInput.Icon icon="format-title" />}
              maxLength={80}
            />

            {/* Description */}
            <Text style={styles.fieldLabel}>Description *</Text>
            <TextInput
              mode="outlined"
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the issue in detail..."
              multiline
              numberOfLines={5}
              style={[styles.input, styles.textArea]}
              outlineColor="#E2E8F0"
              activeOutlineColor={TEAL}
              textColor="#0F172A"
              theme={{ colors: { onSurface: '#0F172A', onSurfaceVariant: '#64748B' } }}
            />

            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={submitting}
              disabled={submitting}
              style={styles.submitBtn}
              buttonColor={TEAL}
              contentStyle={{ height: 52 }}
              labelStyle={{ fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5 }}
              icon="send"
            >
              Submit Complaint
            </Button>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.historyScroll} 
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[TEAL]} />}
        >
          {loadingHistory ? (
            <View style={{ gap: 12, marginTop: 10 }}>
              <SkeletonLoader width="100%" height={140} style={{ borderRadius: 16 }} />
              <SkeletonLoader width="100%" height={140} style={{ borderRadius: 16 }} />
              <SkeletonLoader width="100%" height={140} style={{ borderRadius: 16 }} />
            </View>
          ) : complaints.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="clipboard-check-outline" size={56} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Complaints Yet</Text>
              <Text style={styles.emptySub}>Submit your first complaint using the New tab above.</Text>
            </View>
          ) : (
            complaints.map(item => {
              const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.Open;
              const catCfg = CATEGORIES.find(c => c.key === item.category) || CATEGORIES[0];
              return (
                <Surface key={item.id} style={styles.complaintCard} elevation={1}>
                  <View style={styles.complaintTop}>
                    <View style={[styles.catIcon, { backgroundColor: catCfg.bg }]}>
                      <MaterialCommunityIcons name={catCfg.icon} size={20} color={catCfg.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.complaintTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.complaintDate}>{formatDate(item.createdAt)}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                      <MaterialCommunityIcons name={cfg.icon} size={13} color={cfg.color} />
                      <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.complaintDesc} numberOfLines={3}>{item.description}</Text>
                  {item.assignedToName && (
                    <View style={styles.assignedRow}>
                      <MaterialCommunityIcons name="account-wrench" size={14} color="#8B5CF6" />
                      <Text style={styles.assignedText}>Assigned to: {item.assignedToName}</Text>
                    </View>
                  )}
                  {item.status === 'Resolved' && item.resolvedAt && (
                    <View style={styles.resolvedRow}>
                      <MaterialCommunityIcons name="check-decagram" size={14} color="#10B981" />
                      <Text style={styles.resolvedText}>Resolved on {formatDate(item.resolvedAt)}</Text>
                    </View>
                  )}
                </Surface>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0FDF4' },
  header: { backgroundColor: TEAL, paddingTop: 52, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 6, borderRadius: 10 },
  tabBtnActive: { backgroundColor: '#CCFBF1' },
  tabBtnText: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  tabBtnTextActive: { color: TEAL },
  formScroll: { padding: 16, paddingBottom: 40 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#F8FAFC', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  catChipText: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  input: { backgroundColor: '#fff', marginBottom: 16 },
  textArea: { minHeight: 120, textAlignVertical: 'top', paddingTop: 16 },
  submitBtn: { borderRadius: 14, marginTop: 8, elevation: 3 },
  historyScroll: { padding: 16, paddingBottom: 40, gap: 12 },
  emptyState: { alignItems: 'center', marginTop: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#64748B' },
  emptySub: { fontSize: 13, color: '#64748B', textAlign: 'center' },
  complaintCard: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  complaintTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  catIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  complaintTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', flexShrink: 1 },
  complaintDate: { fontSize: 11, color: '#64748B', marginTop: 2, flexShrink: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  complaintDesc: { fontSize: 13, color: '#475569', lineHeight: 20 },
  assignedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  assignedText: { fontSize: 12, color: '#8B5CF6', fontWeight: '600', flexShrink: 1 },
  resolvedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  resolvedText: { fontSize: 12, color: '#10B981', fontWeight: '600', flexShrink: 1 },
});
