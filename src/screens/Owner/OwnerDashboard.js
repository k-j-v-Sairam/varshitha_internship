import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Modal, InteractionManager, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { 
  Text, 
  Card, 
  Avatar, 
  IconButton, 
  Surface,
  Divider,
  Button
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Svg, { Circle, G } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native'; 
import auth from '@react-native-firebase/auth'; // 🔥 AUTH IMPORT

import { useHostel } from '../../context/HostelContext';

const OwnerDashboard = ({ navigation, route }) => {
  const [profileVisible, setProfileVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Hook Live Data (🔥 SECURE: Pulled from our locked-down Context)
  const { stats, blocks, refreshDashboard, loading } = useHostel();

  // 🔥 NEW: Get real current user data
  const currentUser = auth().currentUser;
  const userEmail = currentUser?.email || 'Unknown User';
  // Extract the name from the email (e.g. "admin" from "admin@test.com")
  const userName = currentUser?.displayName || userEmail.split('@')[0];
  // Create 2-letter initials
  const userInitials = userName.substring(0, 2).toUpperCase();

  // Handle Swipe-To-Refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshDashboard(); 
    setRefreshing(false);
  }, [refreshDashboard]);

  // Prevent white screen on profile open
  useFocusEffect(
    useCallback(() => {
      if (route.params?.openProfile) {
        const task = InteractionManager.runAfterInteractions(() => {
            setProfileVisible(true);
        });
        return () => task.cancel();
      }
    }, [route.params])
  );

  const handleCloseProfile = () => {
    setProfileVisible(false);
    navigation.setParams({ openProfile: null });
  };

  // --- Chart Configuration ---
  const totalRooms = (stats?.vacantRooms || 0) + (stats?.totalOccupiedRooms || 0);
  const percentage = totalRooms > 0 ? Math.round(((stats.totalOccupiedRooms || 0) / totalRooms) * 100) : 0; 
  
  const radius = 65;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  // --- COLOR THEME ---
  const cardBackground = "#E3F2FD"; 
  const mainBrandColor = "#004B8D"; 
  const trackColor = "#E1E1E1";    
  const textColorDark = "#333333";  
  const textColorGrey = "#757575"; 

  // --- Dynamic Block Stats ---
  const blockColors = ['#4CAF50', '#FF9800', '#F44336'];
  const blockStats = blocks && blocks.length > 0
    ? blocks.slice(0, 3).map((block, index) => ({
        label: block.name,
        status: `${block.floors} Floors`,
        color: blockColors[index % 3] 
      }))
    : [
        { label: 'No Blocks', status: 'Add block below', color: '#9e9e9e' }
      ];

  const menuItems = [
    { icon: 'account-edit-outline', label: 'My Details', nav: 'EditProfile' },
    { icon: 'credit-card-outline', label: 'Subscription & Payments', nav: 'Subscription' },
    { icon: 'bell-outline', label: 'Notifications', nav: 'Notifications' },
    { icon: 'shield-check-outline', label: 'Privacy & Security', nav: 'Privacy' }, // Ensure this screen exists or change nav
    { icon: 'help-circle-outline', label: 'Help & Support', nav: 'Help' }, // Ensure this screen exists or change nav
  ];

  return (
    <SafeAreaView style={styles.container}>
      
      {/* Header */}
      <Surface style={styles.header} elevation={1}>
        <TouchableOpacity 
          style={styles.headerLeft} 
          onPress={() => setProfileVisible(true)}
          activeOpacity={0.7}
        >
          <Avatar.Text size={40} label={userInitials} style={styles.avatar} labelStyle={{lineHeight:22}} />
          <View>
            <Text variant="bodySmall" style={styles.welcomeText}>Good Morning,</Text>
            <Text variant="titleMedium" style={styles.ownerName}>{userName}</Text>
          </View>
        </TouchableOpacity>
        
        <IconButton 
          icon="bell-outline" 
          size={24} 
          iconColor="#424242"
          onPress={() => navigation.navigate('NoticeBoard')} 
        />
      </Surface>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[mainBrandColor]} />
        }
      >
        
        {/* Hero Card */}
        <TouchableOpacity onPress={() => navigation.navigate('Hostels')} activeOpacity={0.95}>
          <Surface style={[styles.heroCard, { backgroundColor: cardBackground }]} elevation={4}>
            
            <View style={styles.heroContentRow}>
              <View style={styles.chartContainer}>
                {loading && !refreshing ? (
                  <ActivityIndicator size="large" color={mainBrandColor} style={{position: 'absolute'}} />
                ) : (
                  <>
                    <Svg height="150" width="150" viewBox="0 0 150 150">
                      <G rotation="-90" origin="75, 75">
                        <Circle
                          cx="75" cy="75" r={radius}
                          stroke={trackColor} strokeWidth={strokeWidth}
                          fill="transparent"
                        />
                        <Circle
                          cx="75" cy="75" r={radius}
                          stroke={mainBrandColor} strokeWidth={strokeWidth}
                          fill="transparent"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                        />
                      </G>
                    </Svg>
                    <View style={styles.chartTextAbsolute}>
                      <Text variant="headlineMedium" style={{color: mainBrandColor, fontWeight:'bold'}}>{percentage}%</Text>
                      <Text variant="labelSmall" style={{color: textColorGrey}}>Occupied</Text>
                    </View>
                  </>
                )}
              </View>

              <View style={styles.heroInfo}>
                <Text variant="titleMedium" style={{color: mainBrandColor, fontWeight:'bold', marginBottom:4}}>
                  Hostel Status
                </Text>
                <Text variant="bodySmall" style={{color: textColorDark, lineHeight: 18}}>
                  You have <Text style={{fontWeight:'bold', color: mainBrandColor}}>{100 - percentage}% vacancy</Text> this month. Fill {stats?.vacantRooms || 0} beds to reach 100%.
                </Text>
                <View style={[styles.actionPill, { backgroundColor: mainBrandColor }]}>
                    <Text style={styles.actionText}>View Details →</Text>
                </View>
              </View>
            </View>

            <View style={styles.blockStrip}>
               {blockStats.map((block, index) => (
                 <View key={index} style={styles.blockItem}>
                    <View style={[styles.dot, {backgroundColor: block.color}]} />
                    <View>
                      <Text style={styles.blockLabel}>{block.label}</Text>
                      <Text style={[styles.blockStatus, {color: block.color}]}>{block.status}</Text>
                    </View>
                    {index < blockStats.length - 1 && <View style={styles.verticalDiv} />} 
                 </View>
               ))}
            </View>
          </Surface>
        </TouchableOpacity>

        {/* Quick Stats */}
        <Text variant="titleMedium" style={styles.sectionHeader}>Quick Stats</Text>
        <View style={styles.statsRow}>
          <Card style={[styles.statCard, {backgroundColor: '#e3f2fd'}]} onPress={() => navigation.navigate('Hostels')}>
            <View style={styles.statContent}>
               <Icon name="bed-empty" size={24} color="#1565c0" />
               <Text style={[styles.statNumber, {color:'#1565c0'}]}>{stats?.vacantRooms || 0}</Text>
               <Text style={styles.statLabel}>Vacant</Text>
            </View>
          </Card>
          <Card style={[styles.statCard, {backgroundColor: '#fff3e0'}]} onPress={() => navigation.navigate('Tenants')}>
             <View style={styles.statContent}>
               <Icon name="cash-clock" size={24} color="#ef6c00" />
               <Text style={[styles.statNumber, {color:'#ef6c00'}]}>{stats?.unpaidTenants || 0}</Text>
               <Text style={styles.statLabel}>Unpaid</Text>
            </View>
          </Card>
           <Card style={[styles.statCard, {backgroundColor: '#fce4ec'}]} onPress={() => navigation.navigate('NoticeBoard')}>
             <View style={styles.statContent}>
               <Icon name="alert-circle-outline" size={24} color="#c2185b" />
               <Text style={[styles.statNumber, {color:'#c2185b'}]}>0</Text>
               <Text style={styles.statLabel}>Issues</Text>
            </View>
          </Card>
        </View>

        {/* Recent Notices */}
        <View style={styles.noticeSectionHeader}>
           <Text variant="titleMedium" style={styles.sectionHeader}>Recent Notices</Text>
           <TouchableOpacity onPress={() => navigation.navigate('NoticeBoard')}>
              <Text style={styles.seeAll}>See All</Text>
           </TouchableOpacity>
        </View>
        
        {/* Note: These are hardcoded UI cards. If you want dynamic notices, map over a fetched array here */}
        <Card style={styles.noticeCard} mode="elevated">
          <Card.Content style={styles.noticeContent}>
            <View style={styles.noticeIconBox}>
              <Icon name="wrench-clock" size={20} color="#fff" />
            </View>
            <View style={{flex:1}}>
              <Text variant="titleSmall" style={{fontWeight:'bold'}}>Water Tank Cleaning</Text>
              <Text variant="bodySmall" style={{color:'#757575'}}>Sunday at 10 AM.</Text>
            </View>
            <Text variant="labelSmall" style={{color:'#9e9e9e'}}>2h ago</Text>
          </Card.Content>
        </Card>

        <Card style={styles.noticeCard} mode="elevated">
          <Card.Content style={styles.noticeContent}>
            <View style={[styles.noticeIconBox, {backgroundColor:'#4caf50'}]}>
              <Icon name="party-popper" size={20} color="#fff" />
            </View>
            <View style={{flex:1}}>
              <Text variant="titleSmall" style={{fontWeight:'bold'}}>New Year Event</Text>
              <Text variant="bodySmall" style={{color:'#757575'}}>Menu updated.</Text>
            </View>
            <Text variant="labelSmall" style={{color:'#9e9e9e'}}>5h ago</Text>
          </Card.Content>
        </Card>

      </ScrollView>

      {/* --- PROFILE MODAL --- */}
      <Modal
        animationType="slide"
        visible={profileVisible}
        onRequestClose={handleCloseProfile} 
        presentationStyle="pageSheet" 
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text variant="titleLarge" style={{fontWeight:'bold'}}>Account</Text>
            <IconButton icon="close" size={24} onPress={handleCloseProfile} />
          </View>

          <ScrollView contentContainerStyle={{padding: 20}}>
            <View style={styles.profileSection}>
              <View style={styles.profileImageContainer}>
                <Avatar.Text size={80} label={userInitials} style={{backgroundColor: '#E3F2FD'}} color={mainBrandColor} />
                <TouchableOpacity style={styles.editIconBadge}>
                  <Icon name="pencil" size={14} color="#FFF" />
                </TouchableOpacity>
              </View>
              <Text variant="headlineSmall" style={styles.profileName}>{userName}</Text>
              <Text variant="bodyMedium" style={styles.profileEmail}>{userEmail}</Text>
            </View>

            <Divider style={{marginVertical: 20}} />

            {menuItems.map((item, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.menuItem} 
                onPress={() => {
                   setProfileVisible(false);
                   navigation.setParams({ openProfile: null }); 
                   // Added try-catch wrapper in case the screen doesn't exist yet
                   try {
                     navigation.navigate(item.nav);
                   } catch (e) {
                     Alert.alert("Coming Soon", "This feature is under development.");
                   }
                }}
              >
                <View style={styles.menuItemLeft}>
                  <Icon name={item.icon} size={24} color="#555" style={{marginRight: 15}} />
                  <Text variant="bodyLarge" style={{fontWeight:'500'}}>{item.label}</Text>
                </View>
                <Icon name="chevron-right" size={24} color="#CCC" />
              </TouchableOpacity>
            ))}

            {/* FIXED LOGOUT ACTION */}
            <TouchableOpacity style={styles.logoutButton} onPress={async () => {
                try {
                  setProfileVisible(false);
                  navigation.setParams({ openProfile: null });
                  await auth().signOut(); 
                } catch (error) {
                  console.error("Logout Error:", error);
                  Alert.alert("Error", "Could not complete logout. Please try again.");
                }
            }}>
               <Icon name="logout" size={20} color="#FF5252" style={{marginRight: 10}} />
               <Text style={{color: '#FF5252', fontWeight: 'bold', fontSize: 16}}>Log Out</Text>
            </TouchableOpacity>

          </ScrollView>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    marginBottom: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  avatar: { marginRight: 12, backgroundColor: '#E0E0E0' },
  welcomeText: { color: '#757575' },
  ownerName: { fontWeight: 'bold', fontSize: 18, color: '#333', textTransform: 'capitalize' },
  scrollContent: { padding: 16, paddingBottom: 50 },
  
  // Hero Card
  heroCard: {
    borderRadius: 24,
    marginBottom: 25,
    overflow: 'hidden',
  },
  heroContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 15,
  },
  chartContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
    width: 150,
    height: 150,
  },
  chartTextAbsolute: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  actionPill: {
    marginTop: 15,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Block Strip
  blockStrip: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.03)', 
    paddingVertical: 12,
    paddingHorizontal: 15,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)'
  },
  blockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  blockLabel: {
    color: '#757575',
    fontSize: 10,
    fontWeight: '600',
  },
  blockStatus: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  verticalDiv: {
    width: 1,
    height: 20,
    backgroundColor: '#E0E0E0', 
    position: 'absolute',
    right: 0,
  },

  // Stats
  sectionHeader: { marginBottom: 15, fontWeight: 'bold', color: '#37474F' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  statCard: { width: '31%', borderRadius: 16, elevation: 0 },
  statContent: { alignItems: 'center', padding: 12 },
  statNumber: { fontSize: 20, fontWeight: 'bold', marginVertical: 4 },
  statLabel: { fontSize: 11, color: '#616161', fontWeight:'600' },

  // Notices
  noticeSectionHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:10 },
  seeAll: { color: '#004B8D', fontWeight: '600', marginBottom: 15 },
  noticeCard: { marginBottom: 12, backgroundColor:'#fff', borderRadius:16, elevation: 1 },
  noticeContent: { flexDirection: 'row', alignItems: 'center' },
  noticeIconBox: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#f59e0b', justifyContent: 'center', alignItems: 'center', marginRight: 15 },

  // --- MODAL STYLES ---
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  profileSection: { alignItems: 'center', marginTop: 10 },
  profileImageContainer: { position: 'relative', marginBottom: 15 },
  editIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#004B8D',
    padding: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  profileName: { fontWeight: 'bold', marginBottom: 5, color: '#333', textTransform: 'capitalize' },
  profileEmail: { color: '#757575' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    marginTop: 40,
    marginBottom: 20,
  }
});

export default OwnerDashboard;