import React, { useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, FlatList, TouchableOpacity, StatusBar,
  ScrollView, Modal, Alert, RefreshControl
} from 'react-native';
import {
  Text, Surface, IconButton, Searchbar, FAB, Avatar,
  Badge, Chip, useTheme, TextInput as PaperInput, Button, Divider
} from 'react-native-paper';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { useStaffRoles, useSaveStaffRoles } from '../../hooks/useQueries';
import { Colors } from '../../theme/colors';

// The accent for staff management uses a distinct pink-rose color
const STAFF_COLOR = Colors.staffAccent;

const StaffManagement = ({ navigation }) => {
  const theme = useTheme();

  // --- STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [staffData, setStaffData] = useState([]);
  const [blocks, setBlocks] = useState(['All']);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [roleFilter, setRoleFilter] = useState('All');
  const [blockFilter, setBlockFilter] = useState('All');
  const [attendanceFilter, setAttendanceFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [takerFilter, setTakerFilter] = useState(false);

  // Modals
  const [isRoleModalVisible, setRoleModalVisible] = useState(false);
  const [isAttendanceModalVisible, setAttendanceModalVisible] = useState(false);
  const [isSalaryModalVisible, setSalaryModalVisible] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');

  // FIX 11: Load roles from Firestore instead of hardcoding them in state
  const { data: persistedRoles = [] } = useStaffRoles();
  const saveRolesMutation = useSaveStaffRoles();

  // Merge 'All' prefix with persisted roles
  const roles = persistedRoles.length > 0
    ? ['All', ...persistedRoles]
    : ['All', 'Warden', 'Security', 'Cook', 'Cleaning', 'Care Taker'];

  // --- REAL-TIME FIREBASE LISTENERS ---
  useEffect(() => {
    setLoading(true);
    const currentOwnerId = auth().currentUser?.uid;

    if (!currentOwnerId) {
      setLoading(false);
      return;
    }

    const unsubscribeBlocks = firestore().collection('blocks')
      .where('ownerId', '==', currentOwnerId)
      .onSnapshot(
        blockSnapshot => {
          if (blockSnapshot) {
            const fetchedBlocks = blockSnapshot.docs.map(doc => {
              const data = doc.data();
              return data.name || data.hostelName || data.blockName || `Block ${doc.id}`;
            });
            setBlocks(['All', 'Unassigned', ...fetchedBlocks]);
          }
        },
        error => console.error('Error fetching blocks:', error)
      );

    const unsubscribeStaff = firestore().collection('staff')
      .where('ownerId', '==', currentOwnerId)
      .onSnapshot(
        staffSnapshot => {
          if (staffSnapshot) {
            const fetchedStaff = staffSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setStaffData(fetchedStaff);
          }
          setLoading(false);
        },
        error => {
          console.error('Error fetching staff:', error);
          Alert.alert('Network Error', 'Could not fetch real-time data.');
          setLoading(false);
        }
      );

    return () => {
      unsubscribeBlocks();
      unsubscribeStaff();
    };
  }, []);

  /**
   * FIX 12: onRefresh — removed the redundant Firestore get() call.
   * The onSnapshot listener already keeps staffData current in real-time.
   * We just briefly show the spinner for UX feedback.
   */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // onSnapshot will auto-update staffData. Clear spinner after a brief moment.
    setTimeout(() => setRefreshing(false), 1200);
  }, []);

  const todayIso = new Date().toISOString().split('T')[0];

  // --- FILTERING LOGIC ---
  const filteredStaff = staffData.filter(staff => {
    const staffName = staff?.name || '';
    const staffIdStr = staff?.staffId || '';

    const matchesSearch =
      staffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staffIdStr.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'All'
      ? true
      : (Array.isArray(staff.roles) ? staff.roles.includes(roleFilter) : staff.role === roleFilter);

    const safeBlock = staff.block || 'Unassigned';
    const matchesBlock = takerFilter ? true : (blockFilter === 'All' ? true : safeBlock === blockFilter);
    const matchesTaker = takerFilter ? staff.isTaker === true : true;

    let matchesAttendance = true;
    const todayStatus = (staff.attendance && typeof staff.attendance === 'object' && staff.attendance[todayIso]) ? staff.attendance[todayIso] : 'N/A';
    if (attendanceFilter === 'Present') matchesAttendance = todayStatus === 'Present';
    if (attendanceFilter === 'Absent') matchesAttendance = todayStatus === 'Absent';

    let matchesStatus = true;
    if (statusFilter === 'Paid') matchesStatus = staff.status === 'Paid';
    if (statusFilter === 'Pending') matchesStatus = staff.status === 'Pending' || staff.status === 'Due';

    return matchesSearch && matchesRole && matchesBlock && matchesAttendance && matchesStatus && matchesTaker;
  });

  // --- STATS ---
  const totalStaff = staffData.length;
  const paidCount = staffData.filter(s => s.status === 'Paid').length;
  const pendingCount = staffData.filter(s => s.status === 'Pending' || s.status === 'Due').length;
  const presentCount = staffData.filter(s => s.attendance && typeof s.attendance === 'object' && s.attendance[todayIso] === 'Present').length;
  const absentCount = staffData.filter(s => s.attendance && typeof s.attendance === 'object' && s.attendance[todayIso] === 'Absent').length;
  const takerCount = staffData.filter(s => s.isTaker === true).length;

  const getStatusColor = (status) => (status === 'Paid' ? Colors.success : Colors.warning);

  /**
   * FIX 11: handleAddRole — now persists the new role to Firestore via useSaveStaffRoles.
   * Previously: only updated local state, so roles vanished on navigation.
   */
  const handleAddRole = async () => {
    if (!newRoleName.trim()) {
      setRoleModalVisible(false);
      return;
    }

    const currentRoles = persistedRoles.length > 0
      ? persistedRoles
      : ['Warden', 'Security', 'Cook', 'Cleaning', 'Care Taker'];

    if (currentRoles.includes(newRoleName.trim())) {
      Alert.alert('Duplicate', 'This role already exists.');
      return;
    }

    const updatedRoles = [...currentRoles, newRoleName.trim()];
    try {
      await saveRolesMutation.mutateAsync(updatedRoles);
    } catch {
      Alert.alert('Error', 'Could not save the new role. Check your connection.');
    }

    setRoleModalVisible(false);
    setNewRoleName('');
  };

  const handleLongPress = (staffId, name, currentStatus) => {
    Alert.alert('Manage Permissions', `Assign ${name} as Attendance Taker?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: currentStatus ? 'Remove' : 'Assign',
        onPress: async () => {
          try {
            await firestore().collection('staff').doc(staffId).update({ isTaker: !currentStatus });
          } catch {
            Alert.alert('Error', 'Could not update permissions.');
          }
        },
      },
    ]);
  };

  // UI helpers
  const isAbsentMode = attendanceFilter === 'Absent';
  const attCount = isAbsentMode ? absentCount : presentCount;
  const attLabel = isAbsentMode ? 'Absent' : 'Present';
  const attColor = isAbsentMode ? Colors.danger : Colors.success;
  const attIcon = isAbsentMode ? 'account-remove' : 'account-check';

  const salLabel = statusFilter === 'Pending' ? 'Salary Due' : (statusFilter === 'Paid' ? 'Paid Staff' : 'Salary');
  const salCount = statusFilter === 'Pending' ? pendingCount : paidCount;
  const salColor = statusFilter === 'Pending' ? Colors.warning : Colors.success;

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
      <StatusBar barStyle="light-content" backgroundColor={STAFF_COLOR} />

      <View style={styles.header}>
        <IconButton icon="arrow-left" iconColor="#fff" size={24} onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Staff Management</Text>
        <IconButton icon="bell-outline" iconColor="#fff" size={24} onPress={() => navigation.navigate('OwnerSupplyAlerts')} />
      </View>

      <View style={styles.contentContainer}>

        {/* Block Filters */}
        <View style={[styles.filterRow, takerFilter && { opacity: 0.3 }]}>
          <Text style={styles.filterLabel}>Block:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} scrollEnabled={!takerFilter}>
            {blocks.map(block => (
              <Chip
                key={block}
                mode="flat"
                selected={blockFilter === block}
                onPress={() => !takerFilter && setBlockFilter(block)}
                style={[styles.chip, blockFilter === block && { backgroundColor: Colors.primary }]}
                textStyle={{ color: blockFilter === block ? '#fff' : Colors.primary }}
              >
                {block}
              </Chip>
            ))}
          </ScrollView>
        </View>

        {/* Role Filters */}
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Role:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {roles.map(role => (
              <Chip
                key={role}
                mode="flat"
                selected={roleFilter === role}
                onPress={() => setRoleFilter(role)}
                style={[styles.chip, roleFilter === role && { backgroundColor: STAFF_COLOR }]}
                textStyle={{ color: roleFilter === role ? '#fff' : STAFF_COLOR }}
              >
                {role}
              </Chip>
            ))}
            <TouchableOpacity onPress={() => setRoleModalVisible(true)} style={styles.addRoleBtn}>
              <IconButton icon="plus" size={16} iconColor="#fff" />
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {renderStatCard('Total Staff', totalStaff, 'account-tie', STAFF_COLOR, () => {
            setTakerFilter(false); setStatusFilter('All'); setAttendanceFilter('All');
          }, !takerFilter && statusFilter === 'All' && attendanceFilter === 'All')}

          {renderStatCard(attLabel, attCount, attIcon, attColor, () => {
            setTakerFilter(false); setAttendanceModalVisible(true);
          }, attendanceFilter !== 'All')}
        </View>

        <View style={styles.statsRow}>
          {renderStatCard(salLabel, salCount, 'cash-multiple', salColor, () => {
            setTakerFilter(false); setSalaryModalVisible(true);
          }, statusFilter !== 'All')}

          {renderStatCard('Care Takers', takerCount, 'clipboard-account', '#8B5CF6', () => {
            setTakerFilter(!takerFilter);
          }, takerFilter)}
        </View>

        {/* Search */}
        <Searchbar
          placeholder="Search Name or ID..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
          iconColor={Colors.textMuted}
          elevation={1}
        />

        {/* Staff List */}
        <FlatList
          data={filteredStaff}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[STAFF_COLOR]} />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {loading ? 'Loading staff...' : 'No staff found. Tap the + button to add.'}
            </Text>
          }
          renderItem={({ item }) => {
            const roleDisplay = Array.isArray(item.roles) ? item.roles.join(', ') : item.role;

            let blockDisplay = item.block;
            if (!blockDisplay || blockDisplay === 'Unassigned') {
              blockDisplay = 'Unassigned';
            } else if (blockDisplay.length > 15) {
              blockDisplay = `Block ${blockDisplay.substring(0, 5)}...`;
            } else {
              blockDisplay = `Block ${blockDisplay}`;
            }

            return (
              <TouchableOpacity
                onPress={() => navigation.navigate('StaffDetails', { staff: item })}
                onLongPress={() => handleLongPress(item.id, item.name, item.isTaker)}
                activeOpacity={0.9}
              >
                <Surface style={styles.staffCard} elevation={1}>
                  <View style={styles.cardLeft}>
                    <View>
                      <Avatar.Text
                        size={48}
                        label={item.name.substring(0, 2).toUpperCase()}
                        style={{ backgroundColor: getStatusColor(item.status) + '20' }}
                        color={getStatusColor(item.status)}
                      />
                      {item.attendance && typeof item.attendance === 'object' && item.attendance[todayIso] && item.attendance[todayIso] !== 'N/A' && (
                        <View style={[styles.attendanceDot, { backgroundColor: item.attendance[todayIso] === 'Present' ? Colors.success : Colors.danger }]} />
                      )}
                    </View>
                    <View style={[styles.cardInfo, { flex: 1 }]}>
                      <Text style={styles.staffName}>{item.name}</Text>
                      <View style={styles.idContainer}>
                        <Text style={styles.idText}>{item.staffId}</Text>
                        {item.isTaker && (
                          <View style={styles.takerBadge}>
                            <Text style={styles.takerText}>Taker</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.roleText} numberOfLines={1} ellipsizeMode="tail">
                        {blockDisplay} • {roleDisplay}
                      </Text>
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
            );
          }}
        />
      </View>

      {/* --- ATTENDANCE MODAL --- */}
      <Modal visible={isAttendanceModalVisible} transparent={true} animationType="fade" onRequestClose={() => setAttendanceModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Surface style={styles.modalContent} elevation={5}>
            <Text style={styles.modalTitle}>Filter by Attendance</Text>
            <Divider style={{ marginBottom: 10 }} />
            {/* FIX 16: Corrected "Show Presenties" → "Show Present Staff" */}
            <TouchableOpacity style={styles.modalOption} onPress={() => { setAttendanceFilter('All'); setAttendanceModalVisible(false); }}>
              <Text style={[styles.optionText, attendanceFilter === 'All' && styles.activeOption]}>Show All</Text>
              {attendanceFilter === 'All' && <IconButton icon="check" size={20} iconColor={STAFF_COLOR} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => { setAttendanceFilter('Present'); setAttendanceModalVisible(false); }}>
              <Text style={[styles.optionText, attendanceFilter === 'Present' && styles.activeOption]}>Show Present Staff</Text>
              {attendanceFilter === 'Present' && <IconButton icon="check" size={20} iconColor={STAFF_COLOR} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => { setAttendanceFilter('Absent'); setAttendanceModalVisible(false); }}>
              <Text style={[styles.optionText, attendanceFilter === 'Absent' && styles.activeOption]}>Show Absent Staff</Text>
              {attendanceFilter === 'Absent' && <IconButton icon="check" size={20} iconColor={STAFF_COLOR} />}
            </TouchableOpacity>
            <Button mode="text" onPress={() => setAttendanceModalVisible(false)} style={{ marginTop: 10 }} textColor="#666">Close</Button>
          </Surface>
        </View>
      </Modal>

      {/* --- SALARY MODAL --- */}
      <Modal visible={isSalaryModalVisible} transparent={true} animationType="fade" onRequestClose={() => setSalaryModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Surface style={styles.modalContent} elevation={5}>
            <Text style={styles.modalTitle}>Filter by Salary</Text>
            <Divider style={{ marginBottom: 10 }} />
            <TouchableOpacity style={styles.modalOption} onPress={() => { setStatusFilter('All'); setSalaryModalVisible(false); }}>
              <Text style={[styles.optionText, statusFilter === 'All' && styles.activeOption]}>Show All</Text>
              {statusFilter === 'All' && <IconButton icon="check" size={20} iconColor={STAFF_COLOR} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => { setStatusFilter('Paid'); setSalaryModalVisible(false); }}>
              <Text style={[styles.optionText, statusFilter === 'Paid' && styles.activeOption]}>Show Paid Staff</Text>
              {statusFilter === 'Paid' && <IconButton icon="check" size={20} iconColor={STAFF_COLOR} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => { setStatusFilter('Pending'); setSalaryModalVisible(false); }}>
              <Text style={[styles.optionText, statusFilter === 'Pending' && styles.activeOption]}>Show Staff with Dues</Text>
              {statusFilter === 'Pending' && <IconButton icon="check" size={20} iconColor={STAFF_COLOR} />}
            </TouchableOpacity>
            <Button mode="text" onPress={() => setSalaryModalVisible(false)} style={{ marginTop: 10 }} textColor="#666">Close</Button>
          </Surface>
        </View>
      </Modal>

      {/* --- ADD ROLE MODAL --- */}
      <Modal visible={isRoleModalVisible} transparent={true} animationType="fade" onRequestClose={() => setRoleModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Surface style={styles.modalContent} elevation={5}>
            <Text style={styles.modalTitle}>Add New Job Role</Text>
            <PaperInput
              label="Role Name"
              value={newRoleName}
              onChangeText={setNewRoleName}
              mode="outlined"
              style={styles.modalInput}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Button mode="text" onPress={() => { setRoleModalVisible(false); setNewRoleName(''); }} textColor="#666">Cancel</Button>
              <Button mode="contained" onPress={handleAddRole} loading={saveRolesMutation.isPending} style={{ backgroundColor: STAFF_COLOR }}>
                Save Role
              </Button>
            </View>
          </Surface>
        </View>
      </Modal>

      {/* ADD STAFF FAB */}
      <FAB
        icon="plus"
        style={styles.fab}
        color="#fff"
        label="Add Staff"
        onPress={() => navigation.navigate('AddStaff')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: STAFF_COLOR,
    paddingTop: 40, paddingBottom: 20, paddingHorizontal: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24, elevation: 4,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  contentContainer: { flex: 1, padding: 20 },
  filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, height: 40 },
  filterLabel: { marginRight: 10, fontWeight: 'bold', color: Colors.textMedium },
  chip: { marginRight: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' },
  addRoleBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: STAFF_COLOR, justifyContent: 'center', alignItems: 'center', marginLeft: 5 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  statCard: { flex: 0.48, borderRadius: 16, borderWidth: 1, borderColor: 'transparent' },
  statInner: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, backgroundColor: '#fff', height: 70 },
  statIconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  statCount: { fontSize: 18, fontWeight: 'bold', color: Colors.textDark },
  statLabel: { fontSize: 12, color: Colors.textMuted },
  searchBar: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 20, height: 45 },
  searchInput: { fontSize: 14, alignSelf: 'center' },
  staffCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderRadius: 16, marginBottom: 12 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 },
  cardInfo: { marginLeft: 12 },
  staffName: { fontSize: 16, fontWeight: '700', color: Colors.textDark },
  idContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  idText: { fontSize: 13, fontWeight: 'bold', color: Colors.textMedium },
  roleText: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', minWidth: 60 },
  amountText: { fontSize: 16, fontWeight: '700', color: Colors.textDark, marginBottom: 4 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: Colors.textMuted, marginTop: 20 },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: STAFF_COLOR, borderRadius: 28 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', padding: 20, backgroundColor: '#fff', borderRadius: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333', textAlign: 'center' },
  modalInput: { marginBottom: 20, backgroundColor: '#fff' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  optionText: { fontSize: 16, color: '#333' },
  activeOption: { color: STAFF_COLOR, fontWeight: 'bold' },
  attendanceDot: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#fff' },
  takerBadge: { backgroundColor: STAFF_COLOR, borderRadius: 4, paddingHorizontal: 4, marginLeft: 6 },
  takerText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
});

// Expose constant for style reference
const STAFF_COLOR_EXPORT = STAFF_COLOR;

export default StaffManagement;