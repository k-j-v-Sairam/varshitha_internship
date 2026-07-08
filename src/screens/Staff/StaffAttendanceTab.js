// src/screens/Staff/StaffAttendanceTab.js
// Smart attendance tab: shows Attendance Taker form if isTaker=true,
// otherwise shows personal attendance history calendar.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, FlatList, TouchableOpacity, StatusBar, Alert,
  ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Text, Surface, Button } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import auth from '@react-native-firebase/auth';
import { useStaffContext } from './StaffDashboard';
import { getStaffInBlock, checkAttendanceSubmitted, submitAttendanceBatch } from '../../services/attendanceService';

const ROSE = '#E11D48';

// ─── Personal History (for non-takers) ────────────────────────────────────────
const PersonalHistory = ({ staffProfile }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const changeMonth = (dir) => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + dir, 1));
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthStr = String(month + 1).padStart(2, '0');

  const attendanceMap = staffProfile.attendance || {};
  const history = [];
  for (let i = daysInMonth; i >= 1; i--) {
    const dateStr = `${year}-${monthStr}-${String(i).padStart(2, '0')}`;
    const dayName = new Date(year, month, i).toLocaleDateString('en-US', { weekday: 'short' });
    const status = attendanceMap[dateStr] || 'N/A';
    history.push({ date: `${i} ${currentMonth.toLocaleString('default', { month: 'short' })}`, day: dayName, status, iso: dateStr });
  }

  const presentCount = history.filter(d => d.status === 'Present').length;
  const absentCount = history.filter(d => d.status === 'Absent').length;
  const halfDay = history.filter(d => d.status === 'Half Day').length;
  const notMarked = history.filter(d => d.status === 'N/A').length;

  const statusColor = (s) => ({ Present: '#10B981', Absent: '#EF4444', 'Half Day': '#F59E0B' }[s] || '#CBD5E1');

  return (
    <View style={{ flex: 1 }}>
      {/* Month Nav */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthBtn}>
          <MaterialCommunityIcons name="chevron-left" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</Text>
        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthBtn}>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <Surface style={styles.statsCard} elevation={1}>
        {[
          { val: presentCount, label: 'Present', color: '#10B981' },
          { val: absentCount, label: 'Absent', color: '#EF4444' },
          { val: halfDay, label: 'Half Day', color: '#F59E0B' },
          { val: notMarked, label: 'Unmarked', color: '#CBD5E1' },
        ].map((s, i) => (
          <React.Fragment key={s.label}>
            {i > 0 && <View style={styles.statDiv} />}
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: s.color }]}>{s.val}</Text>
              <Text style={styles.statLbl}>{s.label}</Text>
            </View>
          </React.Fragment>
        ))}
      </Surface>

      {/* Day List */}
      <FlatList
        data={history}
        keyExtractor={item => item.iso}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
        renderItem={({ item }) => (
          <View style={styles.histRow}>
            <View>
              <Text style={styles.histDate}>{item.date}</Text>
              <Text style={styles.histDay}>{item.day}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor(item.status) }]}>
                {item.status === 'N/A' ? 'Not Marked' : item.status}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
};

// ─── Attendance Taker Form ─────────────────────────────────────────────────────
const AttendanceTakerForm = ({ staffProfile }) => {
  const today = new Date().toISOString().split('T')[0];
  const [blockStaff, setBlockStaff] = useState([]);
  const [attendance, setAttendance] = useState({}); // { staffId: 'Present'|'Absent' }
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(null); // null=checking, false=no, obj=yes
  const [alreadyMarkedByOwner, setAlreadyMarkedByOwner] = useState({});

  useEffect(() => {
    const init = async () => {
      try {
        // Check if already submitted today
        const existingLog = await checkAttendanceSubmitted(staffProfile.ownerId, staffProfile.block, today);
        if (existingLog) {
          setAlreadySubmitted(existingLog);
          setLoading(false);
          return;
        }
        setAlreadySubmitted(false);

        // Load staff in block
        const staffList = await getStaffInBlock(staffProfile.ownerId, staffProfile.block);
        setBlockStaff(staffList);

        // Default everyone to Present, or use existing mark
        const defaults = {};
        const preMarked = {};
        staffList.forEach(s => { 
          if (s.attendance && s.attendance[today] && s.attendance[today] !== 'N/A') {
            defaults[s.id] = s.attendance[today];
            preMarked[s.id] = true;
          } else {
            defaults[s.id] = 'Present';
          }
        });
        setAttendance(defaults);
        setAlreadyMarkedByOwner(preMarked);
      } catch (err) {
        Alert.alert('Error', `Could not load staff list: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    if (staffProfile?.block && staffProfile?.ownerId) init();
  }, [staffProfile]);

  const toggleStatus = (staffId) => {
    if (alreadyMarkedByOwner[staffId]) {
      Alert.alert('Locked', 'Attendance for this staff member was already marked by the owner.');
      return;
    }
    setAttendance(prev => ({
      ...prev,
      [staffId]: prev[staffId] === 'Present' ? 'Absent' : 'Present',
    }));
  };

  const handleSubmit = () => {
    const currentHour = new Date().getHours();
    if (currentHour < 9 || currentHour >= 22) {
      Alert.alert('Not Allowed', 'Attendance can only be marked between 9:00 AM and 10:00 PM.');
      return;
    }
    const uid = auth().currentUser?.uid;
    Alert.alert(
      'Submit Attendance',
      `Lock today's attendance for Block ${staffProfile.block}? This cannot be edited later.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit & Lock',
          style: 'default',
          onPress: async () => {
            setSubmitting(true);
            try {
              const records = blockStaff.map(s => ({
                staffId: s.id,
                staffName: s.name,
                status: attendance[s.id] || 'Absent',
              }));
              await submitAttendanceBatch({
                attendanceRecords: records,
                date: today,
                blockId: staffProfile.block,
                ownerId: staffProfile.ownerId,
                markedById: uid,
                markedByName: staffProfile.name,
              });
              Alert.alert('✅ Submitted!', 'Attendance locked for today.');
              // Refresh
              const log = await checkAttendanceSubmitted(staffProfile.ownerId, staffProfile.block, today);
              setAlreadySubmitted(log);
            } catch (err) {
              Alert.alert('Error', 'Could not submit attendance.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) return <ActivityIndicator size="large" color={ROSE} style={{ marginTop: 60 }} />;

  if (alreadySubmitted) {
    return (
      <ScrollView contentContainerStyle={styles.lockedContainer}>
        <View style={styles.lockedCard}>
          <MaterialCommunityIcons name="lock-check" size={56} color="#10B981" />
          <Text style={styles.lockedTitle}>Attendance Submitted ✓</Text>
          <Text style={styles.lockedSub}>Today's attendance for Block {staffProfile.block} has been locked.</Text>
          <View style={styles.lockedStats}>
            <View style={styles.lockedStat}>
              <Text style={[styles.lockedStatNum, { color: '#10B981' }]}>{alreadySubmitted.presentCount || 0}</Text>
              <Text style={styles.lockedStatLabel}>Present</Text>
            </View>
            <View style={styles.lockedStat}>
              <Text style={[styles.lockedStatNum, { color: '#EF4444' }]}>{alreadySubmitted.absentCount || 0}</Text>
              <Text style={styles.lockedStatLabel}>Absent</Text>
            </View>
            <View style={styles.lockedStat}>
              <Text style={[styles.lockedStatNum, { color: '#94A3B8' }]}>{alreadySubmitted.totalRecords || 0}</Text>
              <Text style={styles.lockedStatLabel}>Total</Text>
            </View>
          </View>
          <Text style={styles.lockedMarked}>Marked by: {alreadySubmitted.markedByName}</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.takerHeader}>
        <MaterialCommunityIcons name="calendar-today" size={16} color={ROSE} />
        <Text style={styles.takerHeaderDate}>Marking for: {today} · Block {staffProfile.block}</Text>
      </View>
      <FlatList
        data={blockStaff}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="account-off-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Staff Found</Text>
            <Text style={styles.emptySub}>No staff members are assigned to Block {staffProfile.block}.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isPresent = attendance[item.id] === 'Present';
          return (
            <TouchableOpacity
              style={styles.staffRow}
              onPress={() => toggleStatus(item.id)}
              activeOpacity={0.8}
            >
              <View style={styles.staffAvatar}>
                <Text style={styles.staffAvatarLetter}>{(item.name || '?')[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.staffName}>{item.name}</Text>
                <Text style={styles.staffRole}>{(item.roles || [item.role]).filter(Boolean).join(', ')}</Text>
              </View>
              <TouchableOpacity
                style={[styles.statusToggle, { backgroundColor: isPresent ? '#D1FAE5' : '#FEE2E2', opacity: alreadyMarkedByOwner[item.id] ? 0.6 : 1 }]}
                onPress={() => toggleStatus(item.id)}
              >
                <MaterialCommunityIcons
                  name={isPresent ? 'check-circle' : 'close-circle'}
                  size={20}
                  color={isPresent ? '#10B981' : '#EF4444'}
                />
                <Text style={[styles.statusToggleText, { color: isPresent ? '#10B981' : '#EF4444' }]}>
                  {isPresent ? 'Present' : 'Absent'}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />
      {blockStaff.length > 0 && (
        <View style={styles.submitBar}>
          <Text style={styles.submitBarSummary}>
            {Object.values(attendance).filter(v => v === 'Present').length} Present / {Object.values(attendance).filter(v => v === 'Absent').length} Absent
          </Text>
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={submitting}
            disabled={submitting}
            buttonColor={ROSE}
            style={{ borderRadius: 12, flex: 1 }}
            contentStyle={{ height: 48 }}
            labelStyle={{ fontWeight: 'bold', fontSize: 15 }}
            icon="lock-check"
          >
            Submit & Lock
          </Button>
        </View>
      )}
    </View>
  );
};

// ─── Main Tab Component ────────────────────────────────────────────────────────
export default function StaffAttendanceTab() {
  const { staffProfile } = useStaffContext();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#BE123C" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {staffProfile?.isTaker ? 'Mark Attendance' : 'My Attendance'}
        </Text>
        <Text style={styles.headerSub}>
          {staffProfile?.isTaker
            ? `Block ${staffProfile?.block} · Attendance Taker`
            : 'Your personal attendance history'}
        </Text>
      </View>

      {staffProfile?.isTaker
        ? <AttendanceTakerForm staffProfile={staffProfile} />
        : <PersonalHistory staffProfile={staffProfile} />
      }
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF1F2' },
  header: { backgroundColor: ROSE, paddingTop: 52, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  // Personal History
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, backgroundColor: '#fff', gap: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  monthBtn: { padding: 6 },
  monthLabel: { fontSize: 16, fontWeight: 'bold', color: '#0F172A', minWidth: 180, textAlign: 'center' },
  statsCard: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 12, borderRadius: 16, paddingVertical: 14 },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: 'bold' },
  statLbl: { fontSize: 10, color: '#94A3B8', fontWeight: '600', marginTop: 2 },
  statDiv: { width: 1, backgroundColor: '#F1F5F9' },
  histRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#FEF1F2' },
  histDate: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  histDay: { fontSize: 11, color: '#94A3B8' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '700' },
  // Taker form
  takerHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  takerHeaderDate: { fontSize: 13, fontWeight: '600', color: ROSE },
  staffRow: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 12 },
  staffAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' },
  staffAvatarLetter: { fontSize: 18, fontWeight: 'bold', color: ROSE },
  staffName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  staffRole: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  statusToggle: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  statusToggleText: { fontSize: 13, fontWeight: '700' },
  submitBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  submitBarSummary: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  emptyState: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#64748B' },
  emptySub: { fontSize: 13, color: '#94A3B8', textAlign: 'center' },
  // Locked state
  lockedContainer: { padding: 24, alignItems: 'center' },
  lockedCard: { backgroundColor: '#fff', borderRadius: 24, padding: 28, alignItems: 'center', gap: 10, width: '100%' },
  lockedTitle: { fontSize: 20, fontWeight: 'bold', color: '#10B981' },
  lockedSub: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22 },
  lockedStats: { flexDirection: 'row', gap: 24, marginTop: 8 },
  lockedStat: { alignItems: 'center' },
  lockedStatNum: { fontSize: 28, fontWeight: 'bold' },
  lockedStatLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  lockedMarked: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
});
