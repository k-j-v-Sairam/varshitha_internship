import React from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { Text, Card, Button, IconButton, Surface, ProgressBar, Avatar } from 'react-native-paper';

const BlockDetails = ({ navigation, route }) => {
  const { blockName } = route.params || { blockName: 'Block A' };

  // Enhanced Data: Added occupancy for logic
  const floors = [
    { id: 1, oneSharing: 5, twoSharing: 8, threeSharing: 4, totalBeds: 33, occupiedBeds: 28 },
    { id: 2, oneSharing: 2, twoSharing: 10, threeSharing: 6, totalBeds: 40, occupiedBeds: 15 },
  ];

  const amenities = [
    { icon: 'wifi', label: 'WiFi' },
    { icon: 'air-conditioner', label: 'AC' },
    { icon: 'silverware-fork-knife', label: 'Mess' },
    { icon: 'shield-check', label: 'Security' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        {/* TOP SUMMARY CARD */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <View style={styles.headerRow}>
              <View>
                <Text variant="headlineSmall" style={styles.boldText}>{blockName}</Text>
                <View style={styles.locationContainer}>
                   <IconButton icon="map-marker" size={16} iconColor="#E91E63" style={{margin:0}}/>
                   <Text variant="bodySmall" style={styles.locationText}>Madhapur, Hyderabad</Text>
                </View>
              </View>
              <Button 
                mode="contained" 
                icon="plus" 
                onPress={() => console.log('Add Floor')}
                style={styles.addBtn}
                contentStyle={{flexDirection: 'row-reverse'}}
              >
                Add Floor
              </Button>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text variant="labelSmall" style={styles.statLabel}>Total Occupancy</Text>
                <Text variant="titleLarge" style={styles.statValue}>185/246</Text>
                <Text variant="labelSmall" style={{color: '#4CAF50'}}>Beds Occupied</Text>
              </View>
              <View style={styles.verticalDivider} />
              <View style={styles.statItem}>
                <Text variant="labelSmall" style={styles.statLabel}>Maintenance</Text>
                <Text variant="titleLarge" style={[styles.statValue, {color: '#FF9800'}]}>04</Text>
                <Text variant="labelSmall">Open Issues</Text>
              </View>
            </View>

            <View style={styles.amenitiesContainer}>
              {amenities.map((item, index) => (
                <View key={index} style={styles.amenityItem}>
                  <Avatar.Icon size={30} icon={item.icon} style={styles.amenityIcon} color="#6200EE" />
                  <Text variant="labelSmall">{item.label}</Text>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* FLOORS OVERVIEW */}
        <View style={styles.sectionHeader}>
          <Text variant="titleLarge" style={styles.sectionTitle}>Floors Overview</Text>
          <TouchableOpacity><Text style={{color: '#6200EE'}}>View All</Text></TouchableOpacity>
        </View>

        {floors.map((floor) => {
          const occupancyRate = floor.occupiedBeds / floor.totalBeds;
          const statusColor = occupancyRate > 0.8 ? '#F44336' : '#6200EE';

          return (
            <Surface key={floor.id} style={styles.floorSurface} elevation={1}>
              <View style={styles.floorHeader}>
                <View>
                  <Text variant="titleMedium" style={styles.boldText}>Floor {floor.id}</Text>
                  <Text variant="labelSmall" style={{color: '#757575'}}>
                    {floor.occupiedBeds} / {floor.totalBeds} Beds Filled
                  </Text>
                </View>
                <IconButton 
                  icon="chevron-right" 
                  mode="contained-tonal"
                  size={20}
                  onPress={() => navigation.navigate('FloorDetails', { floorId: floor.id, blockName })} 
                />
              </View>

              <ProgressBar 
                progress={occupancyRate} 
                color={statusColor} 
                style={styles.progressBar} 
              />
              
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
                  <Text style={styles.shareLabel}>3 Share</Text>
                  <Text style={styles.shareValue}>{floor.threeSharing}</Text>
                </View>
              </View>
            </Surface>
          );
        })}

        {/* MESS SECTION */}
        <Text variant="titleLarge" style={styles.sectionTitle}>Dining & Support</Text>
        <View style={styles.messGrid}>
          <Card style={styles.messCard} mode="contained">
            <Card.Content style={styles.centeredContent}>
              <Avatar.Icon size={40} icon="food" style={{backgroundColor: '#E8EAF6'}} color="#3F51B5" />
              <Text variant="titleSmall" style={{marginTop: 8}}>Mess Menu</Text>
              <Text variant="labelSmall" style={{color: '#757575'}}>Today: Paneer</Text>
            </Card.Content>
          </Card>
          <Card style={styles.messCard} mode="contained">
            <Card.Content style={styles.centeredContent}>
              <Avatar.Icon size={40} icon="bullhorn-variant" style={{backgroundColor: '#FFF3E0'}} color="#EF6C00" />
              <Text variant="titleSmall" style={{marginTop: 8}}>Notice Board</Text>
              <Text variant="labelSmall" style={{color: '#757575'}}>2 New Updates</Text>
            </Card.Content>
          </Card>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  scroll: { padding: 16, paddingBottom: 40 },
  infoCard: { backgroundColor: '#FFFFFF', borderRadius: 24, marginBottom: 24, elevation: 2 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  locationContainer: { flexDirection: 'row', alignItems: 'center', marginLeft: -8 },
  locationText: { color: '#616161' },
  addBtn: { borderRadius: 12, backgroundColor: '#6200EE' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  statItem: { alignItems: 'center' },
  statLabel: { color: '#757575', marginBottom: 4 },
  statValue: { fontWeight: 'bold', color: '#1A1A1A' },
  verticalDivider: { width: 1, height: 40, backgroundColor: '#EEE' },
  amenitiesContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  amenityItem: { alignItems: 'center' },
  amenityIcon: { backgroundColor: '#F3E5F5' },
  boldText: { fontWeight: 'bold' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 12 },
  sectionTitle: { fontWeight: 'bold', color: '#1A1A1A' },
  floorSurface: { backgroundColor: '#FFF', borderRadius: 20, padding: 16, marginBottom: 16 },
  floorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  progressBar: { height: 6, borderRadius: 3, marginBottom: 16 },
  sharingGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  sharingBox: { backgroundColor: '#F8F9FB', padding: 10, borderRadius: 12, alignItems: 'center', width: '31%' },
  shareLabel: { fontSize: 11, color: '#757575' },
  shareValue: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  messGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  messCard: { width: '48%', borderRadius: 20, backgroundColor: '#FFF' },
  centeredContent: { alignItems: 'center', padding: 12 }
});

export default BlockDetails;