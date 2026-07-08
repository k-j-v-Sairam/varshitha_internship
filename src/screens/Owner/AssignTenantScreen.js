import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, SafeAreaView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Text, Surface, IconButton, Avatar, Searchbar, Button } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useTenants, useReassignTenant } from '../../hooks/useQueries';
import SkeletonLoader from '../../components/common/SkeletonLoader';

import { Colors } from '../../theme/colors';

const AssignTenantScreen = ({ navigation, route }) => {
  const { roomId, blockId } = route.params || {};

  const [searchQuery, setSearchQuery] = useState('');
  const { data: allTenants = [], isLoading: loading, refetch } = useTenants();
  const reassignTenantMutation = useReassignTenant();
  
  const [isAssigning, setIsAssigning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleAssign = (tenant) => {
    // Prevent assigning if they are already in this exact room and block
    if (tenant.roomNumber === parseInt(roomId, 10) && tenant.blockId === blockId) {
      Alert.alert("Already Assigned", `${tenant.name} is already in Room ${blockId}-${roomId}.`);
      return;
    }

    Alert.alert(
      "Confirm Swap",
      `Move ${tenant.name} from ${tenant.roomNumber ? `${tenant.blockId || 'Unassigned'}-${tenant.roomNumber}` : 'Unassigned'} to ${blockId}-${roomId}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Confirm", 
          onPress: async () => {
            setIsAssigning(true);
            try {
              // FIX: We are now passing the Target blockId to context!
              await reassignTenantMutation.mutateAsync({ tenantId: tenant.id, oldRoomNumber: tenant.roomNumber, newRoomNumber: roomId, newBlockId: blockId, oldBlockId: tenant.blockId });
              Alert.alert("Success", "Tenant reassigned successfully!", [
                { text: "OK", onPress: () => navigation.goBack() }
              ]);
            } catch (error) {
              Alert.alert("Error", "Could not assign tenant.");
              setIsAssigning(false);
            }
          }
        }
      ]
    );
  };

  const filteredTenants = allTenants.filter(t => {
    const query = searchQuery.toLowerCase();
    const nameMatch = t.name?.toLowerCase().includes(query);
    const phoneMatch = t.phone?.includes(query);
    const idMatch = t.idProofNumber?.toLowerCase().includes(query);
    return nameMatch || phoneMatch || idMatch;
  });

  const renderItem = ({ item }) => (
    <Surface style={styles.tenantCard} elevation={1}>
      <View style={styles.tenantHeader}>
        {item.image ? (
          <Avatar.Image size={50} source={{ uri: item.image }} />
        ) : (
          <Avatar.Icon size={50} icon="account" style={{backgroundColor: '#E0E7FF'}} color={Colors.primary} />
        )}
        <View style={styles.tenantInfo}>
          <Text variant="titleMedium" style={styles.tenantName}>{item.name}</Text>
          
          <Text variant="bodySmall" style={styles.tenantDetails}>
            📞 {item.phone || 'No Phone'}
          </Text>
          <Text variant="bodySmall" style={styles.tenantDetails}>
            💳 ID: {item.idProofNumber || 'No ID Saved'}
          </Text>
          
          {/* FIX: Clearly display the block and room number */}
          <Text variant="bodySmall" style={styles.tenantRoom}>
            {item.roomNumber ? `Current Room: ${item.blockId || 'Unassigned'}-${item.roomNumber}` : 'Status: Unassigned'}
          </Text>
        </View>
        <Button 
          mode="contained" 
          onPress={() => handleAssign(item)}
          buttonColor={Colors.primary}
          style={{borderRadius: 8}}
        >
          Assign
        </Button>
      </View>
    </Surface>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <IconButton icon="arrow-left" size={24} iconColor={Colors.textDark} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center', marginRight: 40 }}>
            {/* FIX: Update header to show target block */}
            <Text variant="titleLarge" style={styles.headerTitle}>Assign to {blockId}-{roomId}</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search by name, phone, or ID..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={{color: Colors.textDark}}
        />
        
        <Button 
          mode="contained-tonal" 
          icon="account-plus" 
          onPress={() => navigation.navigate('TenantOnboarding', { roomId, blockId })}
          style={styles.newTenantBtn}
          textColor={Colors.primary}
        >
          Create New Admission
        </Button>
      </View>

      {loading && !refreshing ? (
        <View style={{ paddingHorizontal: 16 }}>
          {[...Array(4)].map((_, i) => (
             <SkeletonLoader key={i} width="100%" height={90} style={{ marginBottom: 12, borderRadius: 16 }} />
          ))}
        </View>
      ) : (
        <FlatList
          data={filteredTenants}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={onRefresh}
          refreshing={refreshing}
          ListEmptyComponent={
            <View style={styles.emptyView}>
              <Text style={{color: Colors.textLight}}>No tenants found.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { backgroundColor: Colors.cardBg, borderRadius: 12, elevation: 1 },
  headerTitle: { fontWeight: '700', color: Colors.textDark },
  searchContainer: { paddingHorizontal: 16, paddingBottom: 10 },
  searchBar: { backgroundColor: Colors.cardBg, borderRadius: 12, elevation: 2, marginBottom: 16 },
  newTenantBtn: { backgroundColor: '#EDE9FE', borderRadius: 12, paddingVertical: 4 },
  list: { padding: 16, paddingBottom: 40 },
  tenantCard: { backgroundColor: Colors.cardBg, borderRadius: 16, padding: 16, marginBottom: 12 },
  tenantHeader: { flexDirection: 'row', alignItems: 'center' },
  tenantInfo: { flex: 1, marginLeft: 16 },
  tenantName: { fontWeight: '700', color: Colors.textDark, marginBottom: 2 },
  tenantDetails: { color: '#4B5563', fontSize: 12, marginBottom: 2 }, 
  tenantRoom: { color: Colors.primary, fontSize: 12, fontWeight: '600', marginTop: 4 },
  centerLoad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyView: { alignItems: 'center', marginTop: 40 }
});

export default AssignTenantScreen;