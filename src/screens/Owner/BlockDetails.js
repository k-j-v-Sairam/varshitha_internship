import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { Text, Card, Button, IconButton, Surface, ProgressBar, Avatar, Portal, Dialog, TextInput, Switch } from 'react-native-paper'; 
import firestore from '@react-native-firebase/firestore'; 
import { useHostel } from '../../context/HostelContext';

// Master map to translate amenity IDs back to UI elements
const AMENITIES_MAP = {
  'wifi': { label: 'WiFi', icon: 'wifi' },
  'cctv': { label: 'CCTV', icon: 'cctv' },
  'security': { label: 'Security', icon: 'shield-check' },
  'mess': { label: 'Mess', icon: 'silverware-fork-knife' },
  'power': { label: 'Backup', icon: 'lightning-bolt' },
  'laundry': { label: 'Laundry', icon: 'washing-machine' },
  'parking': { label: 'Parking', icon: 'car' },
  'gym': { label: 'Gym', icon: 'dumbbell' },
};

const BlockDetails = ({ navigation, route }) => {
  const { blockName } = route.params || { blockName: 'Block A' };
  
  const { blocks, addFloorToBlock, deleteFloor, fetchPricing } = useHostel();
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [floorStats, setFloorStats] = useState([]);
  const [totals, setTotals] = useState({ totalBeds: 0, occupiedBeds: 0 });
  
  const [refreshing, setRefreshing] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [roomCountInput, setRoomCountInput] = useState('15'); 
  const [isACFloor, setIsACFloor] = useState(false); 
  
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [floorToDelete, setFloorToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const currentBlock = blocks.find(b => b.name === blockName);
  const floorCount = currentBlock?.floors || 0;
  const blockId = currentBlock?.id;

  const fetchStats = async () => {
    try {
      const roomsQuery = await firestore().collection('rooms').where('blockName', '==', blockName).get();
      const roomsData = roomsQuery.docs.map(doc => doc.data());
      
      const tenantsQuery = await firestore().collection('tenants').get();
      const tenantsData = tenantsQuery.docs.map(doc => doc.data());

      const blockRoomNumbers = roomsData.map(r => r.roomNumber);
      const tenantCounts = {};
      
      tenantsData.forEach(t => {
        if (t.roomNumber && blockRoomNumbers.includes(t.roomNumber)) {
          tenantCounts[t.roomNumber] = (tenantCounts[t.roomNumber] || 0) + 1;
        }
      });

      let totalBedsSum = 0;
      let occupiedBedsSum = 0;
      const statsMap = {};

      for (let i = 1; i <= floorCount; i++) {
        statsMap[i] = { id: i, oneSharing: 0, twoSharing: 0, threeSharing: 0, totalBeds: 0, occupiedBeds: 0 };
      }

      roomsData.forEach(room => {
        const f = room.floor;
        if (!statsMap[f]) {
          statsMap[f] = { id: f, oneSharing: 0, twoSharing: 0, threeSharing: 0, totalBeds: 0, occupiedBeds: 0 };
        }
        
        const capacity = room.sharing || 1;
        statsMap[f].totalBeds += capacity;
        
        if (capacity === 1) statsMap[f].oneSharing++;
        if (capacity === 2) statsMap[f].twoSharing++;
        if (capacity >= 3) statsMap[f].threeSharing++; 

        const occupants = tenantCounts[room.roomNumber] || 0;
        const validOccupants = Math.min(occupants, capacity); 
        statsMap[f].occupiedBeds += validOccupants;

        totalBedsSum += capacity;
        occupiedBedsSum += validOccupants;
      });

      setFloorStats(Object.values(statsMap).sort((a, b) => a.id - b.id));
      setTotals({ totalBeds: totalBedsSum, occupiedBeds: occupiedBedsSum });
    } catch (error) {
      console.error("Error fetching block stats:", error);
    }
  };

  useEffect(() => {
    fetchStats().then(() => setLoadingStats(false));
  }, [blockName, floorCount]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStats();
    await fetchPricing(); 
    setRefreshing(false);
  }, [blockName, floorCount, fetchPricing]);

  const handleConfirmAddFloor = async () => {
    if (!blockId) return;
    const numRooms = parseInt(roomCountInput, 10);
    
    if (isNaN(numRooms) || numRooms <= 0) {
      Alert.alert("Invalid Number", "Please enter a valid number of rooms.");
      return;
    }

    setModalVisible(false);
    setIsGenerating(true);
    
    try {
      await addFloorToBlock(blockId, blockName, floorCount, numRooms, isACFloor);
      setIsACFloor(false);
      await fetchStats(); 
    } catch (error) {
      Alert.alert("Error", "Could not generate floor.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLongPressFloor = (floorId) => {
    setFloorToDelete(floorId);
    setDeleteModalVisible(true);
  };

  const confirmDeleteFloor = async () => {
    setIsDeleting(true);
    try {
      await deleteFloor(blockId, blockName, floorToDelete, floorCount);
      setDeleteModalVisible(false);
      setFloorToDelete(null);
      await fetchStats(); 
    } catch (error) {
      Alert.alert("Error", "Could not delete floor.");
    } finally {
      setIsDeleting(false);
    }
  };

  const blockAmenities = currentBlock?.amenities || [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scroll} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6200EE']} />}
      >
        
        <Card style={styles.infoCard}>
          <Card.Content>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10}}>
              <View>
                <Text variant="headlineSmall" style={styles.boldText}>{blockName}</Text>
                <View style={styles.locationContainer}>
                   <IconButton icon="map-marker" size={16} iconColor="#E91E63" style={{margin:0}}/>
                   <Text variant="bodySmall" style={styles.locationText}>{currentBlock?.area ||             'Location not specified'}</Text>
                </View>
              </View>
              
              <View style={{flexDirection: 'row'}}>
                  {/* 🔥 NEW: Financial Dashboard Button */}
                  <IconButton 
                    icon="cash-multiple" 
                    size={24} 
                    iconColor="#10B981" 
                    style={{ backgroundColor: '#ECFDF5', margin: 0, marginRight: 8 }} 
                    onPress={() => navigation.navigate('BlockRevenue', { blockId: currentBlock?.id,             blockName: currentBlock?.name })} 
                  />
                  {/* Existing Edit Settings Button */}
                  <IconButton 
                    icon="cog-outline" 
                    size={24} 
                    iconColor="#6200EE" 
                    style={{ backgroundColor: '#F3E5F5', margin: 0 }} 
                    onPress={() => navigation.navigate('AddBlockScreen', { isEditMode: true, blockId:             currentBlock?.id, blockName: currentBlock?.name })} 
                  />
              </View>
            </View>

            <View style={styles.headerRow}>
              <Button 
                mode="contained" 
                icon="plus" 
                onPress={() => setModalVisible(true)}
                loading={isGenerating}
                disabled={isGenerating}
                style={[styles.addBtn, {flex: 1}]}
              >
                Add New Floor
              </Button>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text variant="labelSmall" style={styles.statLabel}>Total Occupancy</Text>
                {loadingStats ? (
                  <ActivityIndicator size="small" color="#6200EE" style={{marginVertical: 4}}/>
                ) : (
                  <Text variant="titleLarge" style={styles.statValue}>
                    {totals.occupiedBeds}/{totals.totalBeds}
                  </Text>
                )}
                <Text variant="labelSmall" style={{color: '#4CAF50'}}>Beds Occupied</Text>
              </View>
              <View style={styles.verticalDivider} />
              <View style={styles.statItem}>
                <Text variant="labelSmall" style={styles.statLabel}>Maintenance</Text>
                <Text variant="titleLarge" style={[styles.statValue, {color: '#FF9800'}]}>0</Text>
                <Text variant="labelSmall" style={{color: '#757575'}}>Open Issues</Text>
              </View>
            </View>

            {/* 🔥 Dynamic Amenities Horizontal Scroll */}
            <View style={{ marginTop: 20 }}>
              {blockAmenities.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 20, paddingHorizontal: 5}}>
                  {blockAmenities.map((item, index) => {
                    const amenity = AMENITIES_MAP[item];
                    if (!amenity) return null;
                    return (
                      <View key={index} style={styles.amenityItem}>
                        <Avatar.Icon size={34} icon={amenity.icon} style={styles.amenityIcon} color="#6200EE" />
                        <Text variant="labelSmall" style={{color: '#424242', marginTop: 4}}>{amenity.label}</Text>
                      </View>
                    );
                  })}
                </ScrollView>
              ) : (
                <Text style={{color: '#9E9E9E', fontStyle: 'italic', textAlign: 'center'}}>No amenities configured.</Text>
              )}
            </View>

          </Card.Content>
        </Card>

        <View style={styles.sectionHeader}>
          <Text variant="titleLarge" style={styles.sectionTitle}>Floors Overview</Text>
          <Text variant="bodySmall" style={{color: '#9CA3AF'}}>Long press a floor to delete</Text>
        </View>

        {loadingStats && !refreshing ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#6200EE" />
          </View>
        ) : floorStats.length > 0 ? (
          floorStats.map((floor) => {
            const occupancyRate = floor.totalBeds > 0 ? (floor.occupiedBeds / floor.totalBeds) : 0;
            const statusColor = occupancyRate > 0.8 ? '#F44336' : '#6200EE';

            return (
              <TouchableOpacity 
                key={floor.id} 
                activeOpacity={0.7} 
                onPress={() => navigation.navigate('FloorDetails', { floorId: floor.id, blockName })}
                onLongPress={() => handleLongPressFloor(floor.id)}
              >
                <Surface style={styles.floorSurface} elevation={1}>
                  <View style={styles.floorHeader}>
                    <View>
                      <Text variant="titleMedium" style={styles.boldText}>Floor {floor.id}</Text>
                      <Text variant="labelSmall" style={{color: '#757575'}}>
                        {floor.occupiedBeds} / {floor.totalBeds} Beds Filled
                      </Text>
                    </View>
                    <IconButton icon="chevron-right" mode="contained-tonal" size={20} />
                  </View>

                  <ProgressBar progress={occupancyRate} color={statusColor} style={styles.progressBar} />
                  
                  <View style={styles.sharingGrid}>
                    <View style={styles.sharingBox}>
                      <Text style={styles.shareLabel}>1 Share</Text>
                      <Text style={styles.shareValue}>{floor.oneSharing}</Text>
                    </View>
                    <View style={styles.sharingBox}>
                      <Text style={styles.shareLabel}>2 Share</Text>
                      <Text style={styles.shareValue}>{floor.twoSharing}</Text>
                    </View>
                    <View style={styles.sharingBox}>
                      <Text style={styles.shareLabel}>3+ Share</Text>
                      <Text style={styles.shareValue}>{floor.threeSharing}</Text>
                    </View>
                  </View>
                </Surface>
              </TouchableOpacity>
            );
          })
        ) : (
          <Text style={{ textAlign: 'center', color: '#757575', marginTop: 20 }}>
            No floors exist yet. Tap 'Add Floor' to generate them!
          </Text>
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={modalVisible} onDismiss={() => setModalVisible(false)} style={{ backgroundColor: '#FFF' }}>
          <Dialog.Title style={{color: '#1A1A1A', fontWeight: 'bold'}}>Generate New Floor</Dialog.Title>
          <Dialog.Content>
            <Text style={{ marginBottom: 15, color: '#616161' }}>
              How many rooms would you like to create for Floor {floorCount + 1}?
            </Text>
            <TextInput 
              label="Number of Rooms" 
              value={roomCountInput} 
              onChangeText={setRoomCountInput} 
              keyboardType="number-pad" 
              mode="outlined" 
              activeOutlineColor="#6200EE" 
              textColor="#1A1A1A"
              style={{ marginBottom: 20, backgroundColor: '#FFF' }} 
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8F9FB', padding: 12, borderRadius: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Avatar.Icon size={32} icon="air-conditioner" style={{ backgroundColor: '#E0F7FA', marginRight: 10 }} color="#00BCD4" />
                <Text style={{ fontWeight: '600', color: '#333' }}>Premium AC Floor</Text>
              </View>
              <Switch value={isACFloor} onValueChange={setIsACFloor} color="#00BCD4" />
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setModalVisible(false)} textColor="#757575">Cancel</Button>
            <Button onPress={handleConfirmAddFloor} mode="contained" buttonColor="#6200EE">Generate</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={deleteModalVisible} onDismiss={() => setDeleteModalVisible(false)} style={{ backgroundColor: '#FFF', borderRadius: 24 }}>
          <View style={{ alignItems: 'center', marginTop: 20 }}>
            <Avatar.Icon size={64} icon="alert-decagram" color="#EF4444" style={{ backgroundColor: '#FEE2E2' }} />
          </View>
          <Dialog.Title style={{ textAlign: 'center', fontWeight: 'bold', color: '#1F2937' }}>
            Delete Floor {floorToDelete}?
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ textAlign: 'center', color: '#6B7280', marginBottom: 16 }}>
              This will permanently destroy all rooms associated with this floor.
            </Text>
            <View style={{ backgroundColor: '#ECFDF5', padding: 12, borderRadius: 12 }}>
              <Text style={{ color: '#065F46', textAlign: 'center', fontSize: 13, fontWeight: '500' }}>
                🛡️ Don't worry! Any students living on this floor will not be deleted. They will simply be moved to "Unassigned" status.
              </Text>
            </View>
          </Dialog.Content>
          <Dialog.Actions style={{ paddingHorizontal: 20, paddingBottom: 20, justifyContent: 'space-between' }}>
            <Button onPress={() => setDeleteModalVisible(false)} textColor="#6B7280" style={{flex: 1}}>Cancel</Button>
            <Button onPress={confirmDeleteFloor} mode="contained" buttonColor="#EF4444" loading={isDeleting} style={{flex: 1, marginLeft: 10}}>Delete</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  scroll: { padding: 16, paddingBottom: 40 },
  infoCard: { backgroundColor: '#FFFFFF', borderRadius: 24, marginBottom: 24, elevation: 2 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  locationContainer: { flexDirection: 'row', alignItems: 'center', marginLeft: -8 },
  locationText: { color: '#616161' },
  addBtn: { borderRadius: 12, backgroundColor: '#6200EE' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  statItem: { alignItems: 'center' },
  statLabel: { color: '#757575', marginBottom: 4 },
  statValue: { fontWeight: 'bold', color: '#1A1A1A' },
  verticalDivider: { width: 1, height: 40, backgroundColor: '#EEE' },
  amenityItem: { alignItems: 'center' },
  amenityIcon: { backgroundColor: '#F3E5F5' },
  boldText: { fontWeight: 'bold', color: '#1A1A1A' }, 
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 12 },
  sectionTitle: { fontWeight: 'bold', color: '#1A1A1A' },
  floorSurface: { backgroundColor: '#FFF', borderRadius: 20, padding: 16, marginBottom: 16 },
  floorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  progressBar: { height: 6, borderRadius: 3, marginBottom: 16 },
  sharingGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  sharingBox: { backgroundColor: '#F8F9FB', padding: 10, borderRadius: 12, alignItems: 'center', width: '31%' },
  shareLabel: { fontSize: 11, color: '#757575' },
  shareValue: { fontSize: 16, fontWeight: 'bold', color: '#333' },
});

export default BlockDetails;