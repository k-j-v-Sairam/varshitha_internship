import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Modal, InteractionManager, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { 
  Text, 
  Avatar, 
  IconButton, 
  Surface,
  Divider,
  Button,
  Card
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Svg, { Circle, G } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withTiming } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native'; 
import auth from '@react-native-firebase/auth'; // 🔥 AUTH IMPORT

import { useBlocks, useDashboardStats, useNotices } from '../../hooks/useQueries';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import AnimatedCard from '../../components/common/AnimatedCard';
import { Colors } from '../../theme/colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const OwnerDashboard = ({ navigation, route }) => {
  const [profileVisible, setProfileVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // React Query Hooks
  const { data: blocks, refetch: refetchBlocks, isLoading: loadingBlocks } = useBlocks();
  const { data: stats, refetch: refetchStats, isLoading: loadingStats } = useDashboardStats();
  const { data: notices, refetch: refetchNotices, isLoading: loadingNotices } = useNotices();

  const loading = loadingBlocks || loadingStats;

  // FIX 17: Dynamic time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning,';
    if (hour < 17) return 'Good Afternoon,';
    return 'Good Evening,';
  };

  // Current user display info
  const currentUser = auth().currentUser;
  const userEmail = currentUser?.email || 'Unknown User';
  const userName = currentUser?.displayName || userEmail.split('@')[0];
  const userInitials = userName.substring(0, 2).toUpperCase();

  // FIX 18: Issues count — wired to real data (unpaid tenants + high-priority notices)
  const issuesCount = (stats?.unpaidTenants || 0) + (notices?.filter(n => n.priority === 'High' || n.priority === 'Urgent').length || 0);



  // Handle Swipe-To-Refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchBlocks(), refetchStats(), refetchNotices()]);
    setRefreshing(false);
  }, [refetchBlocks, refetchStats, refetchNotices]);

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
  
  // SVG Animation
  const animatedProgress = useSharedValue(0);
  useEffect(() => {
    animatedProgress.value = withTiming(percentage, {
      duration: 1500,
    });
  }, [percentage]);

  const animatedCircleProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference - (animatedProgress.value / 100) * circumference;
    return {
      strokeDashoffset,
    };
  }); 

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
    { icon: 'bell-outline', label: 'Notifications', nav: 'Notifications' },
    { icon: 'shield-check-outline', label: 'Privacy & Security', action: 'privacy' },
    { icon: 'help-circle-outline', label: 'Help & Support', action: 'support' },
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
            <Text variant="bodySmall" style={styles.welcomeText}>{getGreeting()}</Text>
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        
        {/* Hero Card */}
        <TouchableOpacity onPress={() => navigation.navigate('Hostels')} activeOpacity={0.95}>
          <Surface style={[styles.heroCard, { backgroundColor: Colors.surface }]} elevation={4}>
            
            <View style={styles.heroContentRow}>
              <View style={styles.chartContainer}>
                {loading && !refreshing ? (
                  <ActivityIndicator size="large" color={Colors.primary} style={{position: 'absolute'}} />
                ) : (
                  <>
                    <Svg height="150" width="150" viewBox="0 0 150 150">
                      <G rotation="-90" origin="75, 75">
                        <Circle
                          cx="75" cy="75" r={radius}
                          stroke={Colors.border} strokeWidth={strokeWidth}
                          fill="transparent"
                        />
                        <AnimatedCircle
                          cx="75" cy="75" r={radius}
                          stroke={Colors.primary} strokeWidth={strokeWidth}
                          fill="transparent"
                          strokeDasharray={circumference}
                          animatedProps={animatedCircleProps}
                          strokeLinecap="round"
                        />
                      </G>
                    </Svg>
                    <View style={styles.chartTextAbsolute}>
                      <Text variant="headlineMedium" style={{color: Colors.primary, fontWeight:'bold'}}>{percentage}%</Text>
                      <Text variant="labelSmall" style={{color: Colors.textMedium}}>Occupied</Text>
                    </View>
                  </>
                )}
              </View>

              <View style={styles.heroInfo}>
                <Text variant="titleMedium" style={{color: Colors.primary, fontWeight:'bold', marginBottom:4}}>
                  Hostel Status
                </Text>
                {loading && !refreshing ? (
                  <SkeletonLoader width={120} height={40} />
                ) : (
                  <Text variant="bodySmall" style={{color: Colors.textDark, lineHeight: 18}}>
                    You have <Text style={{fontWeight:'bold', color: Colors.primary}}>{100 - percentage}% vacancy</Text> this month. Fill {stats?.vacantRooms || 0} beds to reach 100%.
                  </Text>
                )}
                <View style={[styles.actionPill, { backgroundColor: Colors.primary }]}>
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
          <AnimatedCard style={[styles.statCard, {backgroundColor: Colors.infoLight}]} onPress={() => navigation.navigate('Hostels')}>
            <View style={styles.statContent}>
               <Icon name="bed-empty" size={24} color={Colors.info} />
               {loading && !refreshing ? <SkeletonLoader width={30} height={20} style={{ marginVertical: 4 }} /> : <Text style={[styles.statNumber, {color:Colors.info}]}>{stats?.vacantRooms || 0}</Text>}
               <Text style={styles.statLabel}>Vacant</Text>
            </View>
          </AnimatedCard>
          <AnimatedCard style={[styles.statCard, {backgroundColor: Colors.warningLight}]} onPress={() => navigation.navigate('Tenants')}>
             <View style={styles.statContent}>
               <Icon name="cash-clock" size={24} color={Colors.warning} />
               {loading && !refreshing ? <SkeletonLoader width={30} height={20} style={{ marginVertical: 4 }} /> : <Text style={[styles.statNumber, {color:Colors.warning}]}>{stats?.unpaidTenants || 0}</Text>}
               <Text style={styles.statLabel}>Unpaid</Text>
            </View>
          </AnimatedCard>
           <AnimatedCard style={[styles.statCard, {backgroundColor: Colors.dangerLight}]} onPress={() => navigation.navigate('Tenants')}>
             <View style={styles.statContent}>
               <Icon name="alert-circle-outline" size={24} color={Colors.danger} />
               {loading && !refreshing ? <SkeletonLoader width={30} height={20} style={{ marginVertical: 4 }} /> : <Text style={[styles.statNumber, {color:Colors.danger}]}>{issuesCount}</Text>}
               <Text style={styles.statLabel}>Issues</Text>
            </View>
          </AnimatedCard>
        </View>

        {/* Quick Management Links */}
        <Text variant="titleMedium" style={styles.sectionHeader}>Quick Manage</Text>
        <View style={styles.statsRow}>
          <AnimatedCard style={[styles.statCard, {backgroundColor: '#EEF2FF'}]} onPress={() => navigation.navigate('OwnerComplaints')}>
            <View style={styles.statContent}>
               <Icon name="clipboard-alert-outline" size={24} color="#4338CA" />
               <Text style={[styles.statNumber, {color:'#4338CA', fontSize: 13}]}>Complaints</Text>
               <Text style={styles.statLabel}>Manage</Text>
            </View>
          </AnimatedCard>
          <AnimatedCard style={[styles.statCard, {backgroundColor: '#FFEDD5'}]} onPress={() => navigation.navigate('OwnerSupplyAlerts')}>
            <View style={styles.statContent}>
               <Icon name="package-variant-closed-alert" size={24} color="#EA580C" />
               <Text style={[styles.statNumber, {color:'#EA580C', fontSize: 13}]}>Supplies</Text>
               <Text style={styles.statLabel}>Alerts</Text>
            </View>
          </AnimatedCard>
          <AnimatedCard style={[styles.statCard, {backgroundColor: '#D1FAE5'}]} onPress={() => navigation.navigate('NoticeBoard')}>
            <View style={styles.statContent}>
               <Icon name="bulletin-board" size={24} color="#059669" />
               <Text style={[styles.statNumber, {color:'#059669', fontSize: 13}]}>Notices</Text>
               <Text style={styles.statLabel}>Board</Text>
            </View>
          </AnimatedCard>
        </View>

        {/* Recent Notices */}
        <View style={styles.noticeSectionHeader}>
           <Text variant="titleMedium" style={styles.sectionHeader}>Recent Notices</Text>
           <TouchableOpacity onPress={() => navigation.navigate('NoticeBoard')}>
              <Text style={styles.seeAll}>See All</Text>
           </TouchableOpacity>
        </View>
        
        {loadingNotices && !refreshing ? (
          <>
            <SkeletonLoader width="100%" height={80} style={{ marginBottom: 12, borderRadius: 16 }} />
            <SkeletonLoader width="100%" height={80} style={{ marginBottom: 12, borderRadius: 16 }} />
          </>
        ) : notices && notices.length > 0 ? (
          notices.slice(0, 3).map((notice, index) => (
            <Card key={notice.id || index} style={styles.noticeCard} mode="elevated">
              <Card.Content style={styles.noticeContent}>
                <View style={[styles.noticeIconBox, {backgroundColor: index % 2 === 0 ? '#f59e0b' : '#4caf50'}]}>
                  <Icon name={index % 2 === 0 ? "bell-ring" : "alert-circle"} size={20} color="#fff" />
                </View>
                <View style={{flex:1}}>
                  <Text variant="titleSmall" style={{fontWeight:'bold', color: '#333'}}>{notice.title}</Text>
                  <Text variant="bodySmall" style={{color:'#757575'}} numberOfLines={1}>{notice.description}</Text>
                </View>
              </Card.Content>
            </Card>
          ))
        ) : (
          <Text style={{ textAlign: 'center', color: '#9e9e9e', marginVertical: 10 }}>No recent notices.</Text>
        )}

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
            <Text variant="titleLarge" style={{fontWeight:'bold', color: '#1A1A1A'}}>Account</Text>
            <IconButton icon="close" size={24} iconColor="#1A1A1A" onPress={handleCloseProfile} />
          </View>

          <ScrollView contentContainerStyle={{padding: 20}}>
            <View style={styles.profileSection}>
              <View style={styles.profileImageContainer}>
                <Avatar.Text size={80} label={userInitials} style={{backgroundColor: '#E3F2FD'}} color={Colors.primary} />
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
                   if (item.action === 'support') {
                     Alert.alert("Contact Support", "Phone: 9392973985\nEmail: kjayavenkatasairam@gmail.com");
                     return;
                   }
                   if (item.action === 'privacy') {
                     Alert.alert("Privacy & Security", "Your data is fully encrypted and securely stored. We prioritize your privacy and ensure your information is never shared without your explicit consent.");
                     return;
                   }
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
                  <Text variant="bodyLarge" style={{fontWeight:'500', color: '#333'}}>{item.label}</Text>
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