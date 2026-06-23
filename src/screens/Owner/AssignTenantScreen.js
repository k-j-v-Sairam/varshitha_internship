import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, SafeAreaView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Text, Surface, IconButton, Avatar, Searchbar, Button } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useHostel } from '../../context/HostelContext';

const colors = {
  primary: '#4F46E5', background: '#F5F7FA', cardBg: '#FFFFFF', textDark: '#1F2937', 
  textLight: '#6B7280', textWhite: '#FFFFFF', success: '#10B981', warning: '#FBBF24'
};

const AssignTenantScreen = ({ navigation, route }) => {
  const { roomId, blockId } = route.params || {};

  const [searchQuery, setSearchQuery] = useState('');
  const [allTenants, setAllTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);

  const { getAllTenants, reassignTenant } = useHostel();

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchTenants = async () => {
        setLoading(true);
        const fetched = await getAllTenants();
        if (isActive) {
          setAllTenants(fetched);
          setLoading(false);
        }
      };
      fetchTenants();
      return () => { isActive = false; };
    }, [])
  );

  const handleAssign = (tenant) => {
    // Prevent assigning if they are already in this exact room and block
    if (tenant.roomNumber === parseInt(roomId, 10) && tenant.blockId === blockId) {
      Alert.alert("Already Assigned", `${tenant.name} is already in Room ${blockId}-${roomId}.`);
      return;
    }

    Alert.alert(
      "Confirm Swap",
      `Move ${tenant.name} from ${tenant.roomNumber ? `${tenant.blockId || 'A'}-${tenant.roomNumber}` : 'Unassigned'} to ${blockId}-${roomId}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Confirm", 
          onPress: async () => {
            setIsAssigning(true);
            try {
              // FIX: We are now passing the Target blockId to context!
              await reassignTenant(tenant.id, tenant.roomNumber, roomId, blockId);
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
          <Avatar.Icon size={50} icon="account" style={{backgroundColor: '#E0E7FF'}} color={colors.primary} />
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
            {item.roomNumber ? `Current Room: ${item.blockId || 'A'}-${item.roomNumber}` : 'Status: Unassigned'}
          </Text>
        </View>
        <Button 
          mode="contained" 
          onPress={() => handleAssign(item)}
          buttonColor={colors.primary}
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
          <IconButton icon="arrow-left" size={24} iconColor={colors.textDark} />
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
          inputStyle={{color: colors.textDark}}
        />
        
        <Button 
          mode="contained-tonal" 
          icon="account-plus" 
          onPress={() => navigation.navigate('TenantOnboarding', { roomId, blockId })}
          style={styles.newTenantBtn}
          textColor={colors.primary}
        >
          Create New Admission
        </Button>
      </View>

      {loading || isAssigning ? (
        <View style={styles.centerLoad}>
          <ActivityIndicator size="large" color={colors.primary} />
          {isAssigning && <Text style={{marginTop: 10, color: colors.textLight}}>Moving Tenant...</Text>}
        </View>
      ) : (
        <FlatList
          data={filteredTenants}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyView}>
              <Text style={{color: colors.textLight}}>No tenants found.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { backgroundColor: colors.cardBg, borderRadius: 12, elevation: 1 },
  headerTitle: { fontWeight: '700', color: colors.textDark },
  searchContainer: { paddingHorizontal: 16, paddingBottom: 10 },
  searchBar: { backgroundColor: colors.cardBg, borderRadius: 12, elevation: 2, marginBottom: 16 },
  newTenantBtn: { backgroundColor: '#EDE9FE', borderRadius: 12, paddingVertical: 4 },
  list: { padding: 16, paddingBottom: 40 },
  tenantCard: { backgroundColor: colors.cardBg, borderRadius: 16, padding: 16, marginBottom: 12 },
  tenantHeader: { flexDirection: 'row', alignItems: 'center' },
  tenantInfo: { flex: 1, marginLeft: 16 },
  tenantName: { fontWeight: '700', color: colors.textDark, marginBottom: 2 },
  tenantDetails: { color: '#4B5563', fontSize: 12, marginBottom: 2 }, 
  tenantRoom: { color: colors.primary, fontSize: 12, fontWeight: '600', marginTop: 4 },
  centerLoad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyView: { alignItems: 'center', marginTop: 40 }
});

export default AssignTenantScreen;