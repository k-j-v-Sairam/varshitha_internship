import React, { useState, useLayoutEffect } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, FlatList } from 'react-native';
import { Text, Card, Button, IconButton, Surface, Chip, Avatar, List, SegmentedButtons } from 'react-native-paper';

const FloorDetails = ({ navigation, route }) => {
  // 1. Hide the old purple navigation header
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // Hooks and State
  const { floorId, blockName } = route.params || { floorId: 1, blockName: 'Block A' };
  const [activeFilter, setActiveFilter] = useState('All');
  const [maintenanceView, setMaintenanceView] = useState('pending');

  // Mock Room Data
  const rooms = Array.from({ length: 30 }, (_, i) => ({
    id: i + 1,
    roomNumber: (floorId * 100) + (i + 1), 
    sharing: (i % 3) + 1, 
    status: i % 5 === 0 ? 'full' : i % 3 === 0 ? 'vacant' : 'partial',
  }));

  // Mock Maintenance Data
  const maintenanceRequests = [
    { id: '1', type: 'Plumbing', room: '104', priority: 'High', status: 'Pending', staff: 'Unassigned', student: 'Rahul S.', time: '2h ago' },
    { id: '2', type: 'Electrical', room: '112', priority: 'Medium', status: 'In-Progress', staff: 'Kumar (Electrician)', student: 'Amit K.', time: '5h ago' },
    { id: '3', type: 'Cleaning', room: '108', priority: 'Low', status: 'Completed', staff: 'Suresh', student: 'Vijay P.', time: 'Yesterday' },
  ];

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
        sharingType: item.sharing 
      })}
    >
      <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
      <Text style={styles.roomText}>{item.id}</Text> 
      <Text style={[styles.sharingLabel, { color: '#212121' }]}>{item.sharing}S</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* FIXED MODERN HEADER */}
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
        <TouchableOpacity style={styles.headerAction}>
           <IconButton icon="dots-horizontal" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
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
            <Text variant="titleMedium" style={styles.boldText}>Live Occupancy</Text>
            {/* CORRECTED: Replaced <div> with <View> below */}
            <View style={styles.legend}>
              <View style={[styles.legendDot, {backgroundColor: '#2E7D32'}]} /><Text style={styles.legendText}>V</Text>
              <View style={[styles.legendDot, {backgroundColor: '#EF6C00'}]} /><Text style={styles.legendText}>P</Text>
              <View style={[styles.legendDot, {backgroundColor: '#D32F2F'}]} /><Text style={styles.legendText}>F</Text>
            </View>
          </View>
          <FlatList
            data={activeFilter === 'All' ? rooms : rooms.filter(r => r.sharing.toString() === activeFilter[0])}
            renderItem={renderRoom}
            keyExtractor={item => item.id.toString()}
            numColumns={5}
            scrollEnabled={false}
            columnWrapperStyle={styles.columnWrapper}
          />
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
          theme={{ colors: { secondaryContainer: '#F0E7FF' } }}
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
                        {maintenanceView === 'pending' && (
                          <IconButton icon="account-plus-outline" size={20} iconColor="#6200EE" onPress={() => {}} />
                        )}
                      </View>
                    )}
                    titleStyle={{fontWeight: 'bold', fontSize: 14}}
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
          
          {maintenanceView === 'pending' && filteredRequests.length > 0 && (
            <Button 
              mode="contained" 
              onPress={() => {}} 
              style={styles.manageBtn} 
              buttonColor="#6200EE" 
              icon="account-hard-hat"
            >
              Assign Staff
            </Button>
          )}
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FD' },
  scroll: { padding: 16, paddingBottom: 40 },
  modernHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingTop: 10, 
    paddingBottom: 15,
    backgroundColor: '#F8F9FD' 
  },
  backButton: { 
    backgroundColor: '#FFF', 
    borderRadius: 14, 
    elevation: 3, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4,
    marginRight: 15
  },
  headerTitleContainer: { flex: 1 },
  headerAction: { backgroundColor: '#FFF', borderRadius: 14, elevation: 1 },
  boldText: { fontWeight: 'bold', color: '#1A1A1A', letterSpacing: -0.5 },
  subText: { color: '#757575', marginTop: -2 },
  sectionTitle: { fontWeight: 'bold', color: '#1A1A1A', marginLeft: 4, marginVertical: 12 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 },
  chip: { marginRight: 8, marginBottom: 8, borderRadius: 10 },
  activeChip: { backgroundColor: '#6200EE' },
  inactiveChip: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EEE' },
  chipText: { fontWeight: '600', fontSize: 12 },
  gridSurface: { backgroundColor: '#FFF', borderRadius: 24, padding: 16, marginBottom: 20, elevation: 1 },
  gridHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  legend: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
  legendText: { fontSize: 10, marginLeft: 3, color: '#424242', fontWeight: 'bold' },
  columnWrapper: { justifyContent: 'space-between', marginBottom: 12 },
  roomBox: { width: '18%', aspectRatio: 1, borderWidth: 1.5, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  roomText: { fontWeight: 'bold', fontSize: 16, color: '#1A1A1A' },
  statusDot: { width: 7, height: 7, borderRadius: 3.5, position: 'absolute', top: 6, right: 6 },
  sharingLabel: { fontSize: 10, fontWeight: '900', position: 'absolute', bottom: 4 },
  toggle: { marginBottom: 16, marginHorizontal: 4, borderRadius: 12 },
  maintenanceSurface: { backgroundColor: '#FFF', borderRadius: 24, paddingVertical: 8, marginBottom: 20, elevation: 1 },
  listDivider: { height: 1, backgroundColor: '#F0F0F0', marginHorizontal: 20 },
  rightContainer: { alignItems: 'center', justifyContent: 'center' },
  manageBtn: { margin: 16, borderRadius: 12, height: 48, justifyContent: 'center' },
  emptyView: { alignItems: 'center', padding: 30 },
  emptyText: { color: '#AAA', fontSize: 14, fontWeight: '500' }
});

export default FloorDetails;