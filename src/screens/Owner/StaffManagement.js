import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, StatusBar, ScrollView, Modal, Alert } from 'react-native';
import { Text, Surface, IconButton, Searchbar, FAB, Avatar, Badge, Chip, useTheme, TextInput as PaperInput, Button, Divider } from 'react-native-paper';

// 1. Mock Data
const initialStaff = [
  { id: '1', name: 'Ramesh Kumar', role: 'Warden', block: 'A', staffId: 'WRD-001', status: 'Paid', attendance: 'Present', isTaker: true, salary: '18000', shift: 'Day', phone: '9876543210' },
  { id: '2', name: 'Sunita Devi', role: 'Cleaning', block: 'B', staffId: 'CLN-102', status: 'Pending', attendance: 'Absent', isTaker: false, salary: '8000', shift: 'Morning', phone: '9876543211' },
  { id: '3', name: 'Bahadur Singh', role: 'Security', block: 'General', staffId: 'SEC-201', status: 'Paid', attendance: 'Present', isTaker: false, salary: '12000', shift: 'Night', phone: '9876543212' },
  { id: '4', name: 'Rajesh', role: 'Cook', block: 'A', staffId: 'CK-301', status: 'Pending', attendance: 'Present', isTaker: false, salary: '15000', shift: 'Day', phone: '9876543213' },
  { id: '5', name: 'Lakshmi', role: 'Cleaning', block: 'C', staffId: 'CLN-103', status: 'Paid', attendance: 'Present', isTaker: false, salary: '8500', shift: 'Evening', phone: '9876543214' },
];

const StaffManagement = ({ navigation }) => {
  const theme = useTheme();
  
  // --- STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [staffData, setStaffData] = useState(initialStaff);
  const [roles, setRoles] = useState(['All', 'Warden', 'Security', 'Cook', 'Cleaning']);
  
  // Filters
  const [roleFilter, setRoleFilter] = useState('All'); 
  const [blockFilter, setBlockFilter] = useState('All'); 
  const [attendanceFilter, setAttendanceFilter] = useState('All'); // 'All', 'Present', 'Absent'
  const [statusFilter, setStatusFilter] = useState('All'); // 'All', 'Paid', 'Pending'
  
  // NEW: Care Taker Filter State
  const [takerFilter, setTakerFilter] = useState(false); 

  // Modals
  const [isRoleModalVisible, setRoleModalVisible] = useState(false);
  const [isAttendanceModalVisible, setAttendanceModalVisible] = useState(false);
  const [isSalaryModalVisible, setSalaryModalVisible] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');

  // --- LOGIC: FILTERING ---
  const filteredStaff = staffData.filter(staff => {
    const matchesSearch = staff.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          staff.staffId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'All' ? true : staff.role === roleFilter;
    
    // IF Taker Filter is ON, ignore Block Filter (show takers from all blocks)
    // ELSE apply Block Filter normally
    const matchesBlock = takerFilter ? true : (blockFilter === 'All' ? true : staff.block === blockFilter);

    // Taker Filter
    const matchesTaker = takerFilter ? staff.isTaker === true : true;

    // Attendance Filter
    let matchesAttendance = true;
    if (attendanceFilter === 'Present') matchesAttendance = staff.attendance === 'Present';
    if (attendanceFilter === 'Absent') matchesAttendance = staff.attendance === 'Absent';

    // Salary Filter
    let matchesStatus = true;
    if (statusFilter === 'Paid') matchesStatus = staff.status === 'Paid';
    if (statusFilter === 'Pending') matchesStatus = staff.status === 'Pending';

    return matchesSearch && matchesRole && matchesBlock && matchesAttendance && matchesStatus && matchesTaker;
  });

  // Calculate Stats
  const totalStaff = staffData.length;
  const paidCount = staffData.filter(s => s.status === 'Paid').length;
  const pendingCount = staffData.filter(s => s.status === 'Pending').length; // Kept for Salary Modal calculation
  const presentCount = staffData.filter(s => s.attendance === 'Present').length;
  const absentCount = staffData.filter(s => s.attendance === 'Absent').length;
  const takerCount = staffData.filter(s => s.isTaker === true).length; // Count of Care Takers

  const getStatusColor = (status) => (status === 'Paid' ? '#10B981' : '#F59E0B');

  // --- GENERIC HELPER FUNCTIONS ---
  const handleAddRole = () => {
    if (newRoleName.trim() && !roles.includes(newRoleName)) setRoles([...roles, newRoleName]);
    setRoleModalVisible(false); setNewRoleName('');
  };

  const handleLongPress = (staffId, name, currentStatus, block) => {
    Alert.alert("Manage Permissions", `Assign ${name} as Attendance Taker?`, [
        { text: "Cancel", style: "cancel" },
        { text: currentStatus ? "Remove" : "Assign", onPress: () => {
             setStaffData(prev => prev.map(s => s.id === staffId ? { ...s, isTaker: !s.isTaker } : s));
        }}
    ]);
  };

  // Helper variables for UI
  const isAbsentMode = attendanceFilter === 'Absent';
  const attCount = isAbsentMode ? absentCount : presentCount;
  const attLabel = isAbsentMode ? 'Absent' : 'Present';
  const attColor = isAbsentMode ? '#EF4444' : '#4CAF50'; 
  const attIcon = isAbsentMode ? 'account-remove' : 'account-check';

  // Salary UI
  const salLabel = statusFilter === 'Pending' ? 'Salary Due' : (statusFilter === 'Paid' ? 'Paid Staff' : 'Salary');
  const salCount = statusFilter === 'Pending' ? pendingCount : (statusFilter === 'Paid' ? paidCount : paidCount); // Default to paid count or total if preferred
  const salColor = statusFilter === 'Pending' ? '#F59E0B' : '#10B981';

  const renderStatCard = (title, count, icon, color, onPress, isActive) => (
    <TouchableOpacity 
      style={[styles.statCard, isActive && { borderColor: color, borderWidth: 2 }]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Surface style={styles.statInner} elevation={2}>
        <View style={[styles.statIconBox, { backgroundColor: `${color}20` }]}>
           <IconButton icon={icon} iconColor={color} size={24} />
        </View>
        <View>
          <Text style={styles.statCount}>{count}</Text>
          <Text style={styles.statLabel}>{title}</Text>
        </View>
      </Surface>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#CF6679" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <IconButton icon="arrow-left" iconColor="#fff" size={24} onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Staff Management</Text>
        <IconButton icon="bell-outline" iconColor="#fff" size={24} />
      </View>

      <View style={styles.contentContainer}>
        
        {/* FILTERS - Block Filter FADES when Taker Filter is Active */}
        <View style={[styles.filterRow, takerFilter && { opacity: 0.3 }]}> 
          <Text style={styles.filterLabel}>Block:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} scrollEnabled={!takerFilter}>
            {['All', 'A', 'B', 'C', 'General'].map((block) => (
              <Chip 
                key={block} mode="flat" selected={blockFilter === block} 
                onPress={() => !takerFilter && setBlockFilter(block)} // Disable press if taker filter is on
                style={[styles.chip, blockFilter === block && { backgroundColor: '#4F46E5' }]}
                textStyle={{ color: blockFilter === block ? '#fff' : '#4F46E5' }}
              >
                {block}
              </Chip>
            ))}
          </ScrollView>
        </View>

        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Role:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {roles.map((role) => (
              <Chip 
                key={role} mode="flat" selected={roleFilter === role} onPress={() => setRoleFilter(role)}
                style={[styles.chip, roleFilter === role && { backgroundColor: '#CF6679' }]}
                textStyle={{ color: roleFilter === role ? '#fff' : '#CF6679' }}
              >
                {role}
              </Chip>
            ))}
            <TouchableOpacity onPress={() => setRoleModalVisible(true)} style={styles.addRoleBtn}>
               <IconButton icon="plus" size={16} iconColor="#fff" />
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* STATS ROW */}
        <View style={styles.statsRow}>
          {renderStatCard('Total Staff', totalStaff, 'account-tie', '#CF6679', () => {
             // Reset all specific filters
             setTakerFilter(false); setStatusFilter('All'); setAttendanceFilter('All');
          }, !takerFilter && statusFilter === 'All' && attendanceFilter === 'All')}
          
          {/* Attendance Card */}
          {renderStatCard(attLabel, attCount, attIcon, attColor, () => {
             setTakerFilter(false); // Reset taker filter if active
             setAttendanceModalVisible(true);
          }, attendanceFilter !== 'All')}
        </View>
        
        <View style={styles.statsRow}>
          {/* Salary Card (Combined Paid/Due logic from previous request) */}
          {renderStatCard(salLabel, salCount, 'cash-multiple', salColor, () => {
             setTakerFilter(false); // Reset taker filter if active
             setSalaryModalVisible(true);
          }, statusFilter !== 'All')}

          {/* NEW: CARE TAKERS FILTER (Replaced the old 4th card) */}
          {renderStatCard('Care Takers', takerCount, 'clipboard-account', '#9C27B0', () => {
             setTakerFilter(!takerFilter); // Toggle logic
             // Optional: Reset other filters to avoid confusion? 
             // For now, let's just enable this mode.
          }, takerFilter)}
        </View>

        {/* SEARCH BAR */}
        <Searchbar
          placeholder="Search Name or ID..." onChangeText={setSearchQuery} value={searchQuery}
          style={styles.searchBar} inputStyle={styles.searchInput} iconColor="#6B7280" elevation={1}
        />

        {/* LIST */}
        <FlatList
          data={filteredStaff}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.emptyText}>No staff found.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity 
              onPress={() => navigation.navigate('StaffDetails', { staff: item })}
              onLongPress={() => handleLongPress(item.id, item.name, item.isTaker, item.block)}
              activeOpacity={0.9}
            >
              <Surface style={styles.staffCard} elevation={1}>
                <View style={styles.cardLeft}>
                  <View>
                    <Avatar.Text 
                      size={48} label={item.name.substring(0, 2).toUpperCase()} 
                      style={{ backgroundColor: getStatusColor(item.status) + '20' }}
                      color={getStatusColor(item.status)}
                    />
                    <View style={[styles.attendanceDot, { backgroundColor: item.attendance === 'Present' ? '#10B981' : '#EF4444' }]} />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.staffName}>{item.name}</Text>
                    <View style={styles.idContainer}>
                       <Text style={styles.idText}>{item.staffId}</Text>
                       {item.isTaker && (
                         <View style={styles.takerBadge}>
                           <Text style={styles.takerText}>Taker</Text>
                         </View>
                       )}
                    </View>
                    <Text style={styles.roleText}>Block {item.block} • {item.role}</Text>
                  </View>
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.amountText}>₹{item.salary}</Text>
                  <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                    {item.status === 'Paid' ? 'Paid' : 'Due'}
                  </Text>
                </View>
              </Surface>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* --- ATTENDANCE MODAL --- */}
      <Modal visible={isAttendanceModalVisible} transparent={true} animationType="fade" onRequestClose={() => setAttendanceModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Surface style={styles.modalContent} elevation={5}>
            <Text style={styles.modalTitle}>Filter by Attendance</Text>
            <Divider style={{marginBottom: 10}} />
            <TouchableOpacity style={styles.modalOption} onPress={() => { setAttendanceFilter('All'); setAttendanceModalVisible(false); }}>
               <Text style={[styles.optionText, attendanceFilter === 'All' && styles.activeOption]}>Show All</Text>
               {attendanceFilter === 'All' && <IconButton icon="check" size={20} iconColor="#CF6679" />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => { setAttendanceFilter('Present'); setAttendanceModalVisible(false); }}>
               <Text style={[styles.optionText, attendanceFilter === 'Present' && styles.activeOption]}>Show Presenties</Text>
               {attendanceFilter === 'Present' && <IconButton icon="check" size={20} iconColor="#CF6679" />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => { setAttendanceFilter('Absent'); setAttendanceModalVisible(false); }}>
               <Text style={[styles.optionText, attendanceFilter === 'Absent' && styles.activeOption]}>Show Absenties</Text>
               {attendanceFilter === 'Absent' && <IconButton icon="check" size={20} iconColor="#CF6679" />}
            </TouchableOpacity>
            <Button mode="text" onPress={() => setAttendanceModalVisible(false)} style={{marginTop: 10}} textColor="#666">Close</Button>
          </Surface>
        </View>
      </Modal>

      {/* --- SALARY MODAL --- */}
      <Modal visible={isSalaryModalVisible} transparent={true} animationType="fade" onRequestClose={() => setSalaryModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Surface style={styles.modalContent} elevation={5}>
            <Text style={styles.modalTitle}>Filter by Salary</Text>
            <Divider style={{marginBottom: 10}} />
            <TouchableOpacity style={styles.modalOption} onPress={() => { setStatusFilter('All'); setSalaryModalVisible(false); }}>
               <Text style={[styles.optionText, statusFilter === 'All' && styles.activeOption]}>Show All</Text>
               {statusFilter === 'All' && <IconButton icon="check" size={20} iconColor="#CF6679" />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => { setStatusFilter('Paid'); setSalaryModalVisible(false); }}>
               <Text style={[styles.optionText, statusFilter === 'Paid' && styles.activeOption]}>Show Paid Staff</Text>
               {statusFilter === 'Paid' && <IconButton icon="check" size={20} iconColor="#CF6679" />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => { setStatusFilter('Pending'); setSalaryModalVisible(false); }}>
               <Text style={[styles.optionText, statusFilter === 'Pending' && styles.activeOption]}>Show Staff with Dues</Text>
               {statusFilter === 'Pending' && <IconButton icon="check" size={20} iconColor="#CF6679" />}
            </TouchableOpacity>
            <Button mode="text" onPress={() => setSalaryModalVisible(false)} style={{marginTop: 10}} textColor="#666">Close</Button>
          </Surface>
        </View>
      </Modal>

      {/* --- ROLE MODAL --- */}
      <Modal visible={isRoleModalVisible} transparent={true} animationType="fade" onRequestClose={() => setRoleModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Surface style={styles.modalContent} elevation={5}>
            <Text style={styles.modalTitle}>Add New Job Role</Text>
            <PaperInput label="Role Name" value={newRoleName} onChangeText={setNewRoleName} mode="outlined" style={styles.modalInput} autoFocus />
            <View style={styles.modalButtons}>
              <Button mode="text" onPress={() => setRoleModalVisible(false)} color="#666">Cancel</Button>
              <Button mode="contained" onPress={handleAddRole} style={{ backgroundColor: '#CF6679' }}>Add</Button>
            </View>
          </Surface>
        </View>
      </Modal>

      <FAB icon="plus" style={styles.fab} color="#fff" label="Add Staff" onPress={() => {}} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { backgroundColor: '#CF6679', paddingTop: 40, paddingBottom: 20, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, elevation: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  contentContainer: { flex: 1, padding: 20 },
  filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, height: 40 },
  filterLabel: { marginRight: 10, fontWeight: 'bold', color: '#555' },
  chip: { marginRight: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' },
  addRoleBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#CF6679', justifyContent: 'center', alignItems: 'center', marginLeft: 5 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  statCard: { flex: 0.48, borderRadius: 16, borderWidth: 1, borderColor: 'transparent' }, 
  statInner: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, backgroundColor: '#fff', height: 70 },
  statIconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  statCount: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  statLabel: { fontSize: 12, color: '#6B7280' },
  searchBar: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 20, height: 45 },
  searchInput: { fontSize: 14, alignSelf: 'center' },
  staffCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderRadius: 16, marginBottom: 12 },
  cardLeft: { flexDirection: 'row', alignItems: 'center' },
  cardInfo: { marginLeft: 12 },
  staffName: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  idContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  idText: { fontSize: 13, fontWeight: 'bold', color: '#4B5563' },
  roleText: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  cardRight: { alignItems: 'flex-end' },
  amountText: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  statusText: { fontSize: 12, fontWeight: 'bold' }, 
  emptyText: { textAlign: 'center', color: '#9CA3AF', marginTop: 20 },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: '#CF6679', borderRadius: 28 },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', padding: 20, backgroundColor: '#fff', borderRadius: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333', textAlign:'center' },
  modalInput: { marginBottom: 20, backgroundColor: '#fff' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  optionText: { fontSize: 16, color: '#333' },
  activeOption: { color: '#CF6679', fontWeight: 'bold' },

  attendanceDot: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#fff' },
  takerBadge: { backgroundColor: '#CF6679', borderRadius: 4, paddingHorizontal: 4, marginLeft: 6 },
  takerText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
});

export default StaffManagement;