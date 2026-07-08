import React, { useLayoutEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native'; 
import { Text, Surface, IconButton, Avatar, Badge, Switch } from 'react-native-paper'; 
import { useRoomTenants, useRoomDetails, useRemoveTenant, useToggleRoomAC } from '../../hooks/useQueries';
import SkeletonLoader from '../../components/common/SkeletonLoader';

import { Colors } from '../../theme/colors';

const RoomDetails = ({ navigation, route }) => {
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // 🔥 FIX: Extract blockName from route params
  const { roomNumber, sharingType, blockName } = route.params || { roomNumber: '103', sharingType: 2, blockName: 'Block A' };
  
  const { data: tenants = [], isLoading: loadingTenants } = useRoomTenants(blockName, roomNumber);
  const { data: roomData, isLoading: loadingRoom } = useRoomDetails(blockName, roomNumber);
  const removeTenantMutation = useRemoveTenant();
  const toggleRoomACMutation = useToggleRoomAC();

  const handleRemoveTenant = (tenant) => {
    Alert.alert(
      "Remove Tenant",
      `Are you sure you want to remove ${tenant.name} from ${blockName} - Room ${roomNumber}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", style: "destructive",
          onPress: async () => {
            try {
              await removeTenantMutation.mutateAsync({ tenantId: tenant.id, blockName, roomNumber });
            } catch (error) {
              Alert.alert("Error", "Could not remove the tenant.");
            }
          }
        }
      ]
    );
  };

  const handleToggleAC = async () => {
    if (!roomData) return;
    const isCurrentlyAC = roomData.hasAC;
    await toggleRoomACMutation.mutateAsync({ blockName, roomNumber, currentACStatus: isCurrentlyAC });
  };

  const handleCall = (phone) => {
    if (phone) Linking.openURL(`tel:${phone}`);
    else Alert.alert("No Phone Number", "This tenant does not have a phone number saved.");
  };

  const handleMessage = (phone) => {
    if (phone) Linking.openURL(`sms:${phone}`); 
    else Alert.alert("No Phone Number", "This tenant does not have a phone number saved.");
  };

  const maxSlots = sharingType;
  const emptySlots = Math.max(0, maxSlots - tenants.length); 
  const isRoomFull = tenants.length >= maxSlots;

  const renderProfileIcon = (imageUri) => {
    if (imageUri) return <Avatar.Image size={60} source={{ uri: imageUri }} />;
    return <Avatar.Icon size={60} icon="account-circle" style={{ backgroundColor: '#E0E7FF' }} color={Colors.primary} />;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <IconButton icon="arrow-left" size={24} iconColor={Colors.textDark} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center', marginRight: 40 }}>
            {/* 🔥 FIX: Clearly show the Block and Room in the header */}
            <Text variant="headlineSmall" style={styles.headerTitle}>{blockName} • {roomNumber}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        <Surface style={styles.heroCard} elevation={4}>
          <View style={styles.heroHeader}>
            <View>
               <Text style={styles.heroLabel}>Room Status</Text>
               <Badge style={[styles.heroStatusBadge, { backgroundColor: isRoomFull ? Colors.success : Colors.warning }]} size={30}>
                 {isRoomFull ? 'Occupied' : `${emptySlots} Vacancy`}
               </Badge>
            </View>
            <IconButton icon="bed-outline" iconColor={Colors.textWhite} size={40} style={{opacity: 0.8}} />
          </View>
          <View style={styles.heroDetailsRow}>
            <View style={styles.heroDetailItem}>
              <Text style={styles.heroDetailValue}>{sharingType} Sharing</Text>
              <Text style={styles.heroDetailLabel}>Configuration</Text>
            </View>
            
            <View style={styles.heroDivider} />
            
            <View style={styles.heroDetailItem}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                {roomData?.hasAC && <Avatar.Icon size={24} icon="snowflake" color="#00BCD4" style={{backgroundColor: 'transparent', marginRight: -5, marginTop: -2}} />}
                <Text style={styles.heroDetailValue}>{roomData?.hasAC ? 'AC' : 'Non-AC'}</Text>
              </View>
              <Text style={styles.heroDetailLabel}>Amenity</Text>
            </View>

            <View style={styles.heroDivider} />
            <View style={styles.heroDetailItem}>
              <Text style={styles.heroDetailValue}>{tenants.length}/{maxSlots}</Text>
              <Text style={styles.heroDetailLabel}>Students</Text>
            </View>
          </View>
        </Surface>

        <Text variant="titleLarge" style={styles.sectionTitle}>Tenants</Text>

        {loadingTenants ? (
           <View>
             <SkeletonLoader width="100%" height={100} style={{ marginBottom: 16, borderRadius: 20 }} />
             <SkeletonLoader width="100%" height={100} style={{ marginBottom: 16, borderRadius: 20 }} />
           </View>
        ) : (
          <>
            {tenants.map((tenant) => (
              <Surface key={tenant.id} style={styles.tenantCard} elevation={1}>
                <View style={styles.tenantHeader}>
                  {renderProfileIcon(tenant.image)}
                  <View style={styles.tenantInfo}>
                    <Text variant="titleMedium" style={styles.tenantName}>{tenant.name}</Text>
                    <Text variant="bodySmall" style={styles.tenantJoined}>Joined {tenant.joined}</Text>
                  </View>
                  <Badge style={[styles.rentBadge, { backgroundColor: tenant.rentStatus === 'Paid' ? Colors.success : Colors.error }]} size={28}>
                    {tenant.rentStatus}
                  </Badge>
                </View>
                
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity style={styles.actionButton} activeOpacity={0.5} onPress={() => handleCall(tenant.phone)}>
                    <View pointerEvents="none" style={[styles.actionIconBox, { backgroundColor: '#E0F2FE' }]}><Avatar.Icon size={40} icon="phone" color="#0284C7" style={{backgroundColor: 'transparent'}} /></View>
                    <Text style={styles.actionText}>Call</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.actionButton} activeOpacity={0.5} onPress={() => handleMessage(tenant.phone)}>
                    <View pointerEvents="none" style={[styles.actionIconBox, { backgroundColor: '#F3E8FF' }]}>
                      <Avatar.Icon size={40} icon="chat" color="#9333EA" style={{backgroundColor: 'transparent'}} />
                    </View>
                    <Text style={styles.actionText}>Message</Text>
                  </TouchableOpacity>
                  
                  {/* UPDATED THIS LINE */}
                  <TouchableOpacity style={styles.actionButton} activeOpacity={0.5} onPress={() => navigation.navigate('TenantProfile', { tenantId: tenant.id })}>
                    <View pointerEvents="none" style={[styles.actionIconBox, { backgroundColor: '#F1F5F9' }]}>
                      <Avatar.Icon size={40} icon="account-details" color={Colors.textDark} style={{backgroundColor: 'transparent'}} />
                    </View>
                    <Text style={styles.actionText}>Profile</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.actionButton} activeOpacity={0.5} onPress={() => handleRemoveTenant(tenant)}>
                    <View pointerEvents="none" style={[styles.actionIconBox, { backgroundColor: '#FEE2E2' }]}>
                      <Avatar.Icon size={40} icon="account-remove" color={Colors.error} style={{backgroundColor: 'transparent'}} />
                    </View>
                    <Text style={[styles.actionText, {color: Colors.error}]}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </Surface>
            ))}

            {Array.from({ length: emptySlots }).map((_, i) => (
              <TouchableOpacity 
                key={`empty-${i}`} 
                style={styles.addTenantCard} 
                activeOpacity={0.7}
                // 🔥 FIX: Send Target Block down to Assign Screen securely
                onPress={() => navigation.navigate('AssignTenant', { roomId: roomNumber, blockId: blockName })}
              >
                 <View style={styles.addIconCircle}>
                   <IconButton icon="account-plus" size={28} iconColor={Colors.primary} />
                 </View>
                 <Text style={styles.addTenantText}>Add Tenant to Slot {tenants.length + i + 1}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        <Text variant="titleLarge" style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.managementActions}>
          
          <View style={[styles.actionCard, { justifyContent: 'space-between', paddingVertical: 8 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={[styles.actionCardIcon, { backgroundColor: '#E0F7FA', marginRight: 12 }]}>
                <IconButton icon="air-conditioner" size={24} iconColor="#00BCD4" />
              </View>
              <Text style={[styles.actionCardText, { flex: 1 }]} numberOfLines={1}>Air Conditioning</Text>
            </View>
            <Switch value={roomData?.hasAC || false} onValueChange={handleToggleAC} color="#00BCD4" />
          </View>

          <TouchableOpacity style={styles.actionCard} activeOpacity={0.7}>
            <View style={[styles.actionCardIcon, { backgroundColor: '#EDE9FE' }]}><IconButton icon="clipboard-text-clock" size={24} iconColor={Colors.primary} /></View>
            <Text style={styles.actionCardText}>View Room History logs</Text>
            <IconButton icon="chevron-right" size={24} iconColor={Colors.textLight} />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { backgroundColor: Colors.cardBg, borderRadius: 12, elevation: 2 },
  headerTitle: { fontWeight: '700', color: Colors.textDark },
  heroCard: { backgroundColor: Colors.primary, borderRadius: 24, marginBottom: 24, padding: 20 },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  heroLabel: { color: '#A5B4FC', fontSize: 12, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
  heroStatusBadge: { paddingHorizontal: 12, fontWeight: 'bold', fontSize: 14, color: Colors.textWhite },
  heroDetailsRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 15 },
  heroDetailItem: { alignItems: 'center' },
  heroDetailValue: { color: Colors.textWhite, fontSize: 18, fontWeight: 'bold' },
  heroDetailLabel: { color: '#C7D2FE', fontSize: 12, marginTop: 2 },
  heroDivider: { width: 1, height: '100%', backgroundColor: 'rgba(255,255,255,0.2)' },
  sectionTitle: { fontWeight: '700', color: Colors.textDark, marginBottom: 16 },
  tenantCard: { backgroundColor: Colors.cardBg, borderRadius: 20, marginBottom: 16, padding: 16 },
  tenantHeader: { flexDirection: 'row', alignItems: 'center' },
  tenantInfo: { flex: 1, marginLeft: 16 },
  tenantName: { fontWeight: '700', color: Colors.textDark },
  tenantJoined: { color: Colors.textLight, fontSize: 12 },
  rentBadge: { paddingHorizontal: 12, fontSize: 12, fontWeight: 'bold', height: 28, textAlignVertical: 'center', color: Colors.textWhite },
  actionButtonsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  actionButton: { alignItems: 'center', width: '22%' },
  actionIconBox: { borderRadius: 14, marginBottom: 8, alignSelf: 'center', width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  actionText: { color: Colors.textLight, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  addTenantCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F3FF', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1.5, borderColor: Colors.primary, borderStyle: 'dashed' },
  addIconCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#EDE9FE', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  addTenantText: { color: Colors.primary, fontSize: 16, fontWeight: '700' },
  managementActions: { marginBottom: 30 },
  actionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardBg, borderRadius: 16, padding: 12, marginBottom: 12, elevation: 1 },
  actionCardIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  actionCardText: { color: Colors.textDark, fontSize: 16, fontWeight: '600' }, 
});

export default RoomDetails;