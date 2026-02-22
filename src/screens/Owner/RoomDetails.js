import React, { useLayoutEffect } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { Text, Surface, IconButton, Avatar, Badge } from 'react-native-paper';

// Define a modern color palette
const colors = {
  primary: '#4F46E5',   // Modern Violet-Blue
  background: '#F5F7FA', // Clean Light Gray
  cardBg: '#FFFFFF',
  textDark: '#1F2937',   // Dark Charcoal
  textLight: '#6B7280',  // Medium Gray
  textWhite: '#FFFFFF',
  success: '#10B981',    // Mint Green (for Paid/Full)
  warning: '#FBBF24',    // Amber (for Vacant)
  error: '#EF4444',      // Soft Red
  iconBg: '#EEF2FF',     // Light primary shade for icon backgrounds
};

const RoomDetails = ({ navigation, route }) => {
  // Hide system header
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // Extract params or use defaults for preview
  const { roomNumber, sharingType } = route.params || { roomNumber: '103', sharingType: 2 };

  // Mock Tenant Data (Adding one without an image to test fallback)
  const tenants = [
    { 
      id: '1', 
      name: 'Rahul Sharma', 
      joined: '12 Oct 2025', 
      rentStatus: 'Paid', 
      image: 'https://i.pravatar.cc/150?u=rahul' // Has image
    },
    { 
      id: '2', 
      name: 'Amit Verma', 
      joined: '05 Jan 2026', 
      rentStatus: 'Pending', 
      image: null // No image set
    }
  ];

  const maxSlots = sharingType;
  const emptySlots = maxSlots - tenants.length;
  const isRoomFull = emptySlots <= 0;

  // Helper to render profile image or fallback icon
  const renderProfileIcon = (imageUri) => {
    if (imageUri) {
      return <Avatar.Image size={60} source={{ uri: imageUri }} />;
    } else {
      // Fallback generic icon
      return (
        <Avatar.Icon 
          size={60} 
          icon="account-circle" 
          style={{ backgroundColor: '#E0E7FF' }} 
          color={colors.primary} 
        />
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* CUSTOM HEADER - Removed three dots */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backBtn} 
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <IconButton icon="arrow-left" size={24} iconColor={colors.textDark} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center', marginRight: 40 }}>
            <Text variant="headlineSmall" style={styles.headerTitle}>Room {roomNumber}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        {/* REDESIGNED HERO SUMMARY CARD */}
        <Surface style={styles.heroCard} elevation={4}>
          <View style={styles.heroHeader}>
            <View>
               <Text style={styles.heroLabel}>Room Status</Text>
               <Badge 
                 style={[styles.heroStatusBadge, { backgroundColor: isRoomFull ? colors.success : colors.warning }]} 
                 size={30}
               >
                 {isRoomFull ? 'Occupied' : `${emptySlots} Vacancy`}
               </Badge>
            </View>
            <IconButton icon="bed-outline" iconColor={colors.textWhite} size={40} style={{opacity: 0.8}} />
          </View>
          
          <View style={styles.heroDetailsRow}>
            <View style={styles.heroDetailItem}>
              <Text style={styles.heroDetailValue}>{sharingType} Sharing</Text>
              <Text style={styles.heroDetailLabel}>Configuration</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroDetailItem}>
              <Text style={styles.heroDetailValue}>{tenants.length}/{maxSlots}</Text>
              <Text style={styles.heroDetailLabel}>Students</Text>
            </View>
          </View>
        </Surface>

        <Text variant="titleLarge" style={styles.sectionTitle}>Tenants</Text>

        {/* TENANT CARDS */}
        {tenants.map((tenant) => (
          <Surface key={tenant.id} style={styles.tenantCard} elevation={1}>
            <View style={styles.tenantHeader}>
              {/* Use helper function for profile icon */}
              {renderProfileIcon(tenant.image)}
              
              <View style={styles.tenantInfo}>
                <Text variant="titleMedium" style={styles.tenantName}>{tenant.name}</Text>
                <Text variant="bodySmall" style={styles.tenantJoined}>Joined {tenant.joined}</Text>
              </View>
              <Badge 
                style={[styles.rentBadge, { backgroundColor: tenant.rentStatus === 'Paid' ? colors.success : colors.error }]}
                size={28}
              >
                {tenant.rentStatus}
              </Badge>
            </View>
            
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                <View style={[styles.actionIconBox, { backgroundColor: '#E0F2FE' }]}>
                  <IconButton icon="phone" size={22} iconColor="#0284C7" />
                </View>
                <Text style={styles.actionText}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                <View style={[styles.actionIconBox, { backgroundColor: '#F3E8FF' }]}>
                  <IconButton icon="chat" size={22} iconColor="#9333EA" />
                </View>
                <Text style={styles.actionText}>Message</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                <View style={[styles.actionIconBox, { backgroundColor: '#F1F5F9' }]}>
                  <IconButton icon="account-details" size={22} iconColor={colors.textDark} />
                </View>
                <Text style={styles.actionText}>Profile</Text>
              </TouchableOpacity>
            </View>
          </Surface>
        ))}

        {/* EMPTY SLOTS - ADD TENANT ACTION */}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <TouchableOpacity 
            key={`empty-${i}`} 
            style={styles.addTenantCard} 
            activeOpacity={0.7}
            // Navigate to Onboarding form with Room ID context
            onPress={() => navigation.navigate('TenantOnboarding', { roomId: roomNumber })}
          >
             <View style={styles.addIconCircle}>
               <IconButton icon="account-plus" size={28} iconColor={colors.primary} />
             </View>
             <Text style={styles.addTenantText}>Add Tenant to Slot {tenants.length + i + 1}</Text>
          </TouchableOpacity>
        ))}

        <Text variant="titleLarge" style={styles.sectionTitle}>Quick Actions</Text>
        
        {/* MANAGEMENT ACTION BUTTONS - Removed "Report Issue" */}
        <View style={styles.managementActions}>
          <TouchableOpacity style={styles.actionCard} activeOpacity={0.7}>
            <View style={[styles.actionCardIcon, { backgroundColor: '#EDE9FE' }]}>
              <IconButton icon="clipboard-text-clock" size={24} iconColor={colors.primary} />
            </View>
            <Text style={styles.actionCardText}>View Room History logs</Text>
            <IconButton icon="chevron-right" size={24} iconColor={colors.textLight} />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20 },
  
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { backgroundColor: colors.cardBg, borderRadius: 12, elevation: 2 },
  headerTitle: { fontWeight: '700', color: colors.textDark },

  // New Hero Card Design
  heroCard: { backgroundColor: colors.primary, borderRadius: 24, marginBottom: 24, padding: 20 },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  heroLabel: { color: '#A5B4FC', fontSize: 12, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
  heroStatusBadge: { paddingHorizontal: 12, fontWeight: 'bold', fontSize: 14, color: colors.textWhite },
  heroDetailsRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 15 },
  heroDetailItem: { alignItems: 'center' },
  heroDetailValue: { color: colors.textWhite, fontSize: 18, fontWeight: 'bold' },
  heroDetailLabel: { color: '#C7D2FE', fontSize: 12, marginTop: 2 },
  heroDivider: { width: 1, height: '100%', backgroundColor: 'rgba(255,255,255,0.2)' },

  // Section Titles
  sectionTitle: { fontWeight: '700', color: colors.textDark, marginBottom: 16 },

  // Tenant Card
  tenantCard: { backgroundColor: colors.cardBg, borderRadius: 20, marginBottom: 16, padding: 16 },
  tenantHeader: { flexDirection: 'row', alignItems: 'center' },
  // Removed specific avatar style to allow fallback logic to work
  tenantInfo: { flex: 1, marginLeft: 16 },
  tenantName: { fontWeight: '700', color: colors.textDark },
  tenantJoined: { color: colors.textLight, fontSize: 12 },
  rentBadge: { paddingHorizontal: 12, fontSize: 12, fontWeight: 'bold', height: 28, textAlignVertical: 'center', color: colors.textWhite },
  
  // Tenant Actions
  actionButtonsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  actionButton: { alignItems: 'center' },
  actionIconBox: { borderRadius: 14, marginBottom: 8 },
  actionText: { color: colors.textLight, fontSize: 12, fontWeight: '600' },

  // Add Tenant Card
  addTenantCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F3FF', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1.5, borderColor: colors.primary, borderStyle: 'dashed' },
  addIconCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#EDE9FE', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  addTenantText: { color: colors.primary, fontSize: 16, fontWeight: '700' },

  // Management Actions
  managementActions: { marginBottom: 30 },
  actionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBg, borderRadius: 16, padding: 12, marginBottom: 12, elevation: 1 },
  actionCardIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  actionCardText: { flex: 1, color: colors.textDark, fontSize: 16, fontWeight: '600' },
});

export default RoomDetails;