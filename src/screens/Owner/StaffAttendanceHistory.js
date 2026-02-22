import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, StatusBar } from 'react-native';
import { Text, Surface, IconButton, Button, Divider, Avatar, useTheme } from 'react-native-paper';

const StaffAttendanceHistory = ({ navigation, route }) => {
  const { staff } = route.params || { staff: { name: 'Unknown', role: 'Staff' } };
  
  // Mock Date State (Current Month: Jan 2026)
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 0, 1)); // Jan 2026

  // Helper to change months
  const changeMonth = (direction) => {
    const newDate = new Date(currentMonth.setMonth(currentMonth.getMonth() + direction));
    setCurrentMonth(new Date(newDate));
  };

  // Generate Mock Attendance Data for the Month
  const generateHistory = (date) => {
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const history = [];
    
    for (let i = 1; i <= daysInMonth; i++) {
      // Create random status for demo
      const dayVal = i % 7;
      let status = 'Present';
      let inTime = '09:00 AM';
      let outTime = '06:00 PM';

      if (dayVal === 0) { status = 'Holiday'; inTime = '-'; outTime = '-'; } // Sundays
      else if (i === 5 || i === 18) { status = 'Absent'; inTime = '-'; outTime = '-'; }
      else if (i === 12) { status = 'Half Day'; inTime = '09:00 AM'; outTime = '01:00 PM'; }

      history.push({
        date: `${i} ${date.toLocaleString('default', { month: 'short' })}`,
        day: new Date(date.getFullYear(), date.getMonth(), i).toLocaleDateString('en-US', { weekday: 'short' }),
        status,
        inTime,
        outTime
      });
    }
    return history.reverse(); // Show latest first
  };

  const attendanceData = generateHistory(currentMonth);

  // Stats
  const presentCount = attendanceData.filter(d => d.status === 'Present').length;
  const absentCount = attendanceData.filter(d => d.status === 'Absent').length;
  const holidayCount = attendanceData.filter(d => d.status === 'Holiday').length;

  const getStatusColor = (status) => {
    switch (status) {
      case 'Present': return '#10B981'; // Green
      case 'Absent': return '#EF4444';  // Red
      case 'Half Day': return '#F59E0B'; // Amber
      default: return '#9CA3AF'; // Grey for Holiday
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#CF6679" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <IconButton icon="arrow-left" iconColor="#fff" size={24} onPress={() => navigation.goBack()} />
        <View style={{ alignItems: 'center' }}>
           <Text style={styles.headerTitle}>Attendance Register</Text>
           <Text style={styles.headerSubtitle}>{staff.name} • {staff.role}</Text>
        </View>
        <IconButton icon="download" iconColor="#fff" size={24} onPress={() => alert('Downloading PDF...')} />
      </View>

      {/* MONTH SELECTOR */}
      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={() => changeMonth(-1)}>
          <IconButton icon="chevron-left" size={24} iconColor="#333" />
        </TouchableOpacity>
        <Text style={styles.monthText}>
           {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </Text>
        <TouchableOpacity onPress={() => changeMonth(1)}>
          <IconButton icon="chevron-right" size={24} iconColor="#333" />
        </TouchableOpacity>
      </View>

      {/* STATS SUMMARY */}
      <View style={styles.statsContainer}>
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
          <Text style={[styles.statNum, { color: '#9CA3AF' }]}>{holidayCount}</Text>
          <Text style={styles.statLabel}>Holidays</Text>
        </View>
      </View>

      {/* REGISTER LIST */}
      <View style={styles.listContainer}>
        <View style={styles.tableHeader}>
           <Text style={[styles.colHeader, { flex: 0.8 }]}>Date</Text>
           <Text style={[styles.colHeader, { flex: 1, textAlign: 'center' }]}>Status</Text>
           <Text style={[styles.colHeader, { flex: 1.2, textAlign: 'right' }]}>Time In / Out</Text>
        </View>
        
        <FlatList
          data={attendanceData}
          keyExtractor={(item, index) => index.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <View style={styles.row}>
              {/* DATE COL */}
              <View style={{ flex: 0.8 }}>
                 <Text style={styles.dateText}>{item.date}</Text>
                 <Text style={styles.dayText}>{item.day}</Text>
              </View>
              
              {/* STATUS COL */}
              <View style={{ flex: 1, alignItems: 'center' }}>
                 <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                 </View>
              </View>

              {/* TIME COL */}
              <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                 <Text style={styles.timeText}>{item.inTime} - {item.outTime}</Text>
              </View>
            </View>
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
    paddingHorizontal: 10, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    elevation: 4
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 13, color: '#FFEBEE', marginTop: 2 },
  
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 5,
    paddingHorizontal: 10,
    elevation: 2
  },
  monthText: { fontSize: 16, fontWeight: 'bold', color: '#333' },

  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    justifyContent: 'space-between'
  },
  statBox: { alignItems: 'center', flex: 1 },
  statNum: { fontSize: 18, fontWeight: 'bold' },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#E5E7EB', height: '100%' },

  listContainer: {
    flex: 1,
    marginTop: 16,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    elevation: 4
  },
  tableHeader: {
    flexDirection: 'row',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  colHeader: { fontSize: 13, fontWeight: '700', color: '#9CA3AF' },
  
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  dateText: { fontSize: 15, fontWeight: 'bold', color: '#374151' },
  dayText: { fontSize: 12, color: '#9CA3AF' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  timeText: { fontSize: 13, color: '#4B5563', fontWeight: '500' }
});

export default StaffAttendanceHistory;