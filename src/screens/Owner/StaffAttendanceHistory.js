import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, StatusBar, Alert, RefreshControl } from 'react-native';
import { Text, IconButton, Surface } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';

const StaffAttendanceHistory = ({ navigation, route }) => {
  const { staff: initialStaff } = route.params || { staff: { name: 'Unknown', role: 'Staff' } };

  const [localStaff, setLocalStaff] = useState(initialStaff);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  // Real-time listener for instant updates when attendance is marked
  useEffect(() => {
    if (!initialStaff?.id) return;
    const subscriber = firestore()
      .collection('staff')
      .doc(initialStaff.id)
      .onSnapshot((doc) => {
        if (doc.exists) {
          setLocalStaff({ id: doc.id, ...doc.data() });
        }
      });
    return () => subscriber();
  }, [initialStaff?.id]);

  // Explicit pull-to-refresh
  const onRefresh = useCallback(async () => {
    if (!localStaff?.id) return;
    setRefreshing(true);
    try {
      const doc = await firestore().collection('staff').doc(localStaff.id).get();
      if (doc.exists) setLocalStaff({ id: doc.id, ...doc.data() });
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  }, [localStaff?.id]);

  const changeMonth = (direction) => {
    // Never mutate state — always create a new date
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1);
    setCurrentMonth(newDate);
  };

  // Build attendance list from real staff.attendance Firestore data
  const generateHistory = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const history = [];

    for (let i = 1; i <= daysInMonth; i++) {
      const dateObj = new Date(year, month, i);
      const isoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      const dateLabel = `${i} ${dateObj.toLocaleString('default', { month: 'short' })}`;

      // Read from real Firestore attendance map
      const attendanceMap = localStaff.attendance || {};
      const rawStatus = attendanceMap[isoDate]; // e.g. "Present", "Absent", "Half Day"

      let status = rawStatus || 'N/A';
      let inTime = '--';
      let outTime = '--';

      if (status === 'Present') { inTime = '09:00 AM'; outTime = '06:00 PM'; }
      else if (status === 'Half Day') { inTime = '09:00 AM'; outTime = '01:00 PM'; }

      history.push({ isoDate, date: dateLabel, day: dayOfWeek, status, inTime, outTime });
    }

    return history.reverse(); // Newest first
  };

  const attendanceData = generateHistory();

  const presentCount = attendanceData.filter(d => d.status === 'Present').length;
  const absentCount = attendanceData.filter(d => d.status === 'Absent').length;
  const halfDayCount = attendanceData.filter(d => d.status === 'Half Day').length;
  const notMarkedCount = attendanceData.filter(d => d.status === 'N/A').length;

  const getStatusColor = (status) => {
    switch (status) {
      case 'Present': return '#10B981';
      case 'Absent': return '#EF4444';
      case 'Half Day': return '#F59E0B';
      case 'N/A': return '#CBD5E1';
      default: return '#9CA3AF';
    }
  };

  const handleMarkStatus = (isoDate, currentStatus) => {
    if (!localStaff?.id) return;
    const options = ['Present', 'Absent', 'Half Day', 'Cancel'];
    Alert.alert('Mark Attendance', `Change status for ${isoDate}?`, 
      options.map(opt => ({
        text: opt,
        style: opt === 'Cancel' ? 'cancel' : opt === 'Absent' ? 'destructive' : 'default',
        onPress: opt === 'Cancel' ? undefined : async () => {
          try {
            await firestore().collection('staff').doc(localStaff.id).update({
              [`attendance.${isoDate}`]: opt,
            });
            Alert.alert('Updated', `Attendance marked as ${opt}`);
          } catch {
            Alert.alert('Error', 'Could not update attendance.');
          }
        }
      }))
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#CF6679" />

      {/* HEADER */}
      <View style={styles.header}>
        <IconButton icon="arrow-left" iconColor="#fff" size={24} onPress={() => navigation.goBack()} />
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Attendance Register</Text>
          <Text style={styles.headerSubtitle}>{localStaff.name} • {localStaff.role}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* MONTH SELECTOR */}
      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={() => changeMonth(-1)}>
          <MaterialCommunityIcons name="chevron-left" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.monthText}>
          {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </Text>
        <TouchableOpacity onPress={() => changeMonth(1)}>
          <MaterialCommunityIcons name="chevron-right" size={28} color="#333" />
        </TouchableOpacity>
      </View>

      {/* STATS SUMMARY */}
      <Surface style={styles.statsCard} elevation={1}>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: '#10B981' }]}>{presentCount}</Text>
          <Text style={styles.statLabel}>Present</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: '#EF4444' }]}>{absentCount}</Text>
          <Text style={styles.statLabel}>Absent</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: '#F59E0B' }]}>{halfDayCount}</Text>
          <Text style={styles.statLabel}>Half Day</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: '#CBD5E1' }]}>{notMarkedCount}</Text>
          <Text style={styles.statLabel}>Not Marked</Text>
        </View>
      </Surface>

      {/* REGISTER LIST */}
      <View style={styles.listContainer}>
        <View style={styles.tableHeader}>
          <Text style={[styles.colHeader, { flex: 0.9 }]}>Date</Text>
          <Text style={[styles.colHeader, { flex: 1, textAlign: 'center' }]}>Status</Text>
          <Text style={[styles.colHeader, { flex: 1.2, textAlign: 'right' }]}>Time In / Out</Text>
        </View>

        <FlatList
          data={attendanceData}
          keyExtractor={(item) => item.isoDate}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#CF6679']} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={() => handleMarkStatus(item.isoDate, item.status)}>
              {/* DATE COL */}
              <View style={{ flex: 0.9 }}>
                <Text style={styles.dateText}>{item.date}</Text>
                <Text style={styles.dayText}>{item.day}</Text>
              </View>

              {/* STATUS COL */}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                    {item.status === 'N/A' ? 'Not Marked' : item.status}
                  </Text>
                </View>
              </View>

              {/* TIME COL */}
              <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                <Text style={styles.timeText}>
                  {item.status === 'N/A' ? '—' : `${item.inTime} - ${item.outTime}`}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    backgroundColor: '#CF6679',
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  monthSelector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 20,
  },
  monthText: { fontSize: 17, fontWeight: 'bold', color: '#1E293B', minWidth: 160, textAlign: 'center' },
  statsCard: {
    flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16,
    borderRadius: 16, paddingVertical: 16, elevation: 2,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: 'bold' },
  statLabel: { fontSize: 11, color: '#94A3B8', marginTop: 2, fontWeight: '600' },
  statDivider: { width: 1, backgroundColor: '#F1F5F9' },
  listContainer: { flex: 1, marginTop: 16, backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 16, overflow: 'hidden' },
  tableHeader: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  colHeader: { fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' },
  row: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  dateText: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  dayText: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '700' },
  timeText: { fontSize: 12, color: '#64748B', textAlign: 'right' },
});

export default StaffAttendanceHistory;