import React, { useState, useLayoutEffect, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, FlatList, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { Text, Button, IconButton, Surface, Chip, Avatar, List, SegmentedButtons, Portal, Dialog, TextInput, Switch } from 'react-native-paper'; 

import { useRoomsForFloor, useAddRoom } from '../../hooks/useQueries';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import { Colors } from '../../theme/colors';
import auth from '@react-native-firebase/auth';
import { getComplaintsForOwner } from '../../services/complaintService';

const FloorDetails = ({ navigation, route }) => {
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const { floorId, blockName } = route.params || { floorId: 1, blockName: 'Block A' };
  
  const [activeFilter, setActiveFilter] = useState('All');
  const [maintenanceView, setMaintenanceView] = useState('pending');
  
  // React Query Hooks
  const { data: rooms = [], refetch, isLoading: loadingRooms } = useRoomsForFloor(blockName, floorId);
  const addRoomMutation = useAddRoom();

  const [refreshing, setRefreshing] = useState(false);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newRoomNum, setNewRoomNum] = useState('');
  const [newRoomSharing, setNewRoomSharing] = useState('2');
  const [newRoomAC, setNewRoomAC] = useState(false); 

  // Pull to refresh function
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleSaveRoom = async () => {
    if (!newRoomNum.trim()) {
      Alert.alert("Error", "Please enter a valid room number.");
      return;
    }

    setIsAdding(true);
    try {
      await addRoomMutation.mutateAsync({ blockName, floorId, roomNumber: newRoomNum, sharing: newRoomSharing, hasAC: newRoomAC });
      setIsModalVisible(false);
      setNewRoomNum(''); 
      setNewRoomSharing('2'); 
      setNewRoomAC(false); 
    } catch (error) {
      Alert.alert("Error", "Failed to add room.");
    } finally {
      setIsAdding(false);
    }
  };

  const [maintenanceRequests, setMaintenanceRequests] = useState([]);

  useEffect(() => {
    const ownerId = auth().currentUser?.uid;
    if (!ownerId) return;

    const unsubscribe = getComplaintsForOwner(ownerId, (allComplaints) => {
      const floorComplaints = allComplaints.filter(c => 
        c.blockId === blockName && 
        String(c.roomNumber).startsWith(String(floorId))
      );
      
      const formatted = floorComplaints.map(c => ({
        id: c.id,
        type: c.category || c.title,
        room: c.roomNumber,
        priority: 'Normal',
        status: c.status === 'Open' ? 'Pending' : (c.status === 'In Progress' ? 'In-Progress' : 'Completed'),
        staff: c.assignedToName || 'Unassigned',
        student: c.tenantName || 'Unknown',
        time: c.createdAt ? c.createdAt.toDate().toLocaleDateString() : 'Just now'
      }));
      setMaintenanceRequests(formatted);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [blockName, floorId]);

  const filteredRequests = maintenanceRequests.filter(req => 
    maintenanceView === 'pending' ? req.status !== 'Completed' : req.status === 'Completed'
  );

  const getStatusColor = (status) => {
    switch(status) {
      case 'vacant': return '#2E7D32'; 
      case 'partial': return '#EF6C00'; 
      case 'full': return '#D32F2F'; 
      default: return '#757575';
    }
  };

  const getProgressStyle = (status) => {
    switch(status) {
      case 'Pending': return { color: '#D32F2F', bg: '#FFEBEE' };
      case 'In-Progress': return { color: '#EF6C00', bg: '#FFF3E0' };
      case 'Completed': return { color: '#2E7D32', bg: '#E8F5E9' };
      default: return { color: '#757575', bg: '#F5F5F5' };
    }
  };

  const renderRoom = ({ item }) => (
    <TouchableOpacity 
      style={[styles.roomBox, { borderColor: getStatusColor(item.status) }]}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('RoomDetails', { 
        roomNumber: item.roomNumber, 
        sharingType: item.sharing,
        blockName: blockName 
      })}
    >
      <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
      
      {item.hasAC && (
        <View style={{ position: 'absolute', top: 4, left: 4 }}>
           <Avatar.Icon size={16} icon="snowflake" style={{backgroundColor: 'transparent'}} color="#00BCD4" />
        </View>
      )}

      <Text style={styles.roomText}>{item.roomNumber || item.id}</Text> 
      <Text style={[styles.sharingLabel, { color: '#212121' }]}>{item.sharing}S</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.modernHeader}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          activeOpacity={0.6}
        >
          <IconButton icon="arrow-left-thin" size={26} iconColor="#1A1A1A" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text variant="titleLarge" style={styles.boldText}>Floor {floorId} Center</Text>
          <Text variant="bodySmall" style={styles.subText}>{blockName} • Management</Text>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scroll} 
        showsVerticalScrollIndicator={false}
        // 🔥 NEW: Pull to refresh added
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        <Text variant="titleMedium" style={styles.sectionTitle}>Room Filters</Text>
        <View style={styles.filterRow}>
          {['All', '1 sharing', '2 sharing', '3 sharing'].map((filter) => (
            <Chip 
              key={filter}
              selected={activeFilter === filter}
              onPress={() => setActiveFilter(filter)}
              style={[styles.chip, activeFilter === filter ? styles.activeChip : styles.inactiveChip]}
              textStyle={[styles.chipText, { color: activeFilter === filter ? '#FFFFFF' : '#6200EE' }]}
              showSelectedCheck={false}
            >
              {filter}
            </Chip>
          ))}
        </View>

        <Surface style={styles.gridSurface} elevation={1}>
          <View style={styles.gridHeader}>
            <View>
              <Text variant="titleMedium" style={styles.boldText}>Live Occupancy</Text>
              <View style={styles.legend}>
                <View style={[styles.legendDot, {backgroundColor: '#2E7D32'}]} /><Text style={styles.legendText}>V</Text>
                <View style={[styles.legendDot, {backgroundColor: '#EF6C00'}]} /><Text style={styles.legendText}>P</Text>
                <View style={[styles.legendDot, {backgroundColor: '#D32F2F'}]} /><Text style={styles.legendText}>F</Text>
              </View>
            </View>
            <Button 
              mode="contained-tonal" 
              icon="plus" 
              onPress={() => setIsModalVisible(true)}
              buttonColor={Colors.primaryLight}
              textColor={Colors.primary}
            >
              Add Room
            </Button>
          </View>
          
          {loadingRooms && !refreshing ? (
             <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
               {[...Array(5)].map((_, i) => (
                 <SkeletonLoader key={i} width="18%" height={60} style={{ marginBottom: 12, borderRadius: 14 }} />
               ))}
             </View>
          ) : rooms.length > 0 ? (
            <FlatList
              data={activeFilter === 'All' ? rooms.sort((a, b) => a.roomNumber - b.roomNumber) : rooms.sort((a, b) => a.roomNumber - b.roomNumber).filter(r => r.sharing.toString() === activeFilter[0])}
              renderItem={renderRoom}
              keyExtractor={item => item.id.toString()}
              numColumns={5}
              scrollEnabled={false}
              columnWrapperStyle={styles.columnWrapper}
            />
          ) : (
             <View style={styles.emptyView}>
               <IconButton icon="bed-empty" size={40} iconColor="#DDD" />
               <Text style={styles.emptyText}>No rooms on this floor yet.</Text>
               <Text style={[styles.emptyText, {fontSize: 12, marginTop: 4}]}>Click 'Add Room' to create one.</Text>
             </View>
          )}
        </Surface>

        <Text variant="titleLarge" style={styles.sectionTitle}>Work Orders</Text>
        <SegmentedButtons
          value={maintenanceView}
          onValueChange={setMaintenanceView}
          buttons={[
            { value: 'pending', label: 'Active Issues', icon: 'clock-outline' },
            { value: 'resolved', label: 'Completed', icon: 'check-all' },
          ]}
          style={styles.toggle}
          theme={{ colors: { onSurface: Colors.textDark, secondaryContainer: Colors.primaryLight, onSecondaryContainer: Colors.primary } }}
        />

        <Surface style={styles.maintenanceSurface} elevation={1}>
          {filteredRequests.length > 0 ? (
            filteredRequests.map((req, index) => {
              const statusStyle = getProgressStyle(req.status);
              return (
                <View key={req.id}>
                  <List.Item
                    title={`Room ${req.room}: ${req.type}`}
                    description={`Assigned: ${req.staff}\nBy ${req.student} • ${req.time}`}
                    descriptionNumberOfLines={2}
                    left={props => (
                      <Avatar.Icon 
                        {...props} 
                        icon={req.status === 'Completed' ? 'shield-check' : 'hammer-wrench'} 
                        size={44} 
                        style={{backgroundColor: statusStyle.bg, borderRadius: 12}} 
                        color={statusStyle.color} 
                      />
                    )}
                    right={props => (
                      <View style={styles.rightContainer}>
                        <Chip textStyle={{fontSize: 9, fontWeight: 'bold', color: statusStyle.color}} style={{backgroundColor: statusStyle.bg, height: 22}}>
                          {req.status}
                        </Chip>
                      </View>
                    )}
                    // FORCED COLOR FIX FOR DARK MODE
                    titleStyle={{fontWeight: 'bold', fontSize: 14, color: '#1A1A1A'}}
                    descriptionStyle={{color: '#757575'}}
                  />
                  {index < filteredRequests.length - 1 && <View style={styles.listDivider} />}
                </View>
              );
            })
          ) : (
            <View style={styles.emptyView}>
              <IconButton icon="sparkles" size={40} iconColor="#DDD" />
              <Text style={styles.emptyText}>All clear for now!</Text>
            </View>
          )}
        </Surface>
      </ScrollView>

      {/* --- ADD SINGLE ROOM MODAL --- */}
      <Portal>
        <Dialog visible={isModalVisible} onDismiss={() => setIsModalVisible(false)} style={{ backgroundColor: '#FFF' }}>
          {/* FORCED COLOR FIX */}
          <Dialog.Title style={{color: '#1A1A1A', fontWeight: 'bold'}}>Add New Room</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Room Number (e.g. 101)"
              value={newRoomNum}
              onChangeText={setNewRoomNum}
              keyboardType="number-pad"
              mode="outlined"
              activeOutlineColor="#6200EE"
              textColor="#1A1A1A" // FORCED COLOR FIX
              style={{ marginBottom: 20, backgroundColor: '#FFF' }}
            />
            <Text style={{ marginBottom: 10, color: '#4B5563', fontWeight: '600' }}>Sharing Configuration</Text>
            <SegmentedButtons
              value={newRoomSharing}
              onValueChange={setNewRoomSharing}
              buttons={[
                { value: '1', label: '1 Share' },
                { value: '2', label: '2 Share' },
                { value: '3', label: '3 Share' },
                { value: '4', label: '4 Share' },
              ]}
          theme={{ colors: { onSurface: Colors.textDark, secondaryContainer: Colors.primaryLight, onSecondaryContainer: Colors.primary } }}
              style={{ marginBottom: 20 }}
            />

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8F9FB', padding: 12, borderRadius: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Avatar.Icon size={32} icon="air-conditioner" style={{ backgroundColor: '#E0F7FA', marginRight: 10 }} color="#00BCD4" />
                <Text style={{ fontWeight: '600', color: '#333' }}>Has AC?</Text>
              </View>
              <Switch value={newRoomAC} onValueChange={setNewRoomAC} color="#00BCD4" />
            </View>

          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setIsModalVisible(false)} textColor={Colors.textMedium}>Cancel</Button>
            <Button onPress={handleSaveRoom} mode="contained" buttonColor={Colors.primary} loading={isAdding}>Save Room</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FD' },
  scroll: { padding: 16, paddingBottom: 40 },
  modernHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 15, backgroundColor: '#F8F9FD' },
  backButton: { backgroundColor: '#FFF', borderRadius: 14, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, marginRight: 15 },
  headerTitleContainer: { flex: 1 },
  headerAction: { backgroundColor: '#FFF', borderRadius: 14, elevation: 1 },
  boldText: { fontWeight: 'bold', color: '#1A1A1A', letterSpacing: -0.5 }, // FORCED
  subText: { color: '#757575', marginTop: -2 }, // FORCED
  sectionTitle: { fontWeight: 'bold', color: '#1A1A1A', marginLeft: 4, marginVertical: 12 }, // FORCED
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 },
  chip: { marginRight: 8, marginBottom: 8, borderRadius: 10 },
  activeChip: { backgroundColor: Colors.primary },
  inactiveChip: { backgroundColor: Colors.cardBg, borderWidth: 1, borderColor: Colors.border },
  chipText: { fontWeight: '600', fontSize: 12 },
  gridSurface: { backgroundColor: Colors.cardBg, borderRadius: 24, padding: 16, marginBottom: 20, elevation: 1 },
  gridHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  legend: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
  legendText: { fontSize: 10, marginLeft: 3, color: '#424242', fontWeight: 'bold' },
  columnWrapper: { justifyContent: 'space-between', marginBottom: 12 },
  roomBox: { width: '18%', aspectRatio: 1, borderWidth: 1.5, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },  
  roomText: { fontWeight: 'bold', fontSize: 16, color: '#1A1A1A' }, // FORCED
  statusDot: { width: 7, height: 7, borderRadius: 3.5, position: 'absolute', top: 6, right: 6 },
  sharingLabel: { fontSize: 10, fontWeight: '900', position: 'absolute', bottom: 4 },
  toggle: { marginBottom: 16, marginHorizontal: 4, borderRadius: 12 },
  maintenanceSurface: { backgroundColor: '#FFF', borderRadius: 24, paddingVertical: 8, marginBottom: 20, elevation: 1 },
  listDivider: { height: 1, backgroundColor: '#F0F0F0', marginHorizontal: 20 },
  rightContainer: { alignItems: 'center', justifyContent: 'center' },
  emptyView: { alignItems: 'center', padding: 30 },
  emptyText: { color: '#757575', fontSize: 14, fontWeight: '500' } // FORCED
});

export default FloorDetails;