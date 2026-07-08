import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; 
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- IMPORT OWNER SCREENS ---
import LoginScreen from '../screens/Auth/LoginScreen';
import OwnerDashboard from '../screens/Owner/OwnerDashboard';
import HostelManagement from '../screens/Owner/HostelManagement';
import BlockDetails from '../screens/Owner/BlockDetails';
import FloorDetails from '../screens/Owner/FloorDetails';
import RoomDetails from '../screens/Owner/RoomDetails';
import TenantOnboarding from '../screens/Owner/TenantOnboarding';
import TenantManagement from '../screens/Owner/TenantManagement';
// Removed TenantDetails
import StaffManagement from '../screens/Owner/StaffManagement';
import StaffDetails from '../screens/Owner/StaffDetails';
import StaffAttendanceHistory from '../screens/Owner/StaffAttendanceHistory';
import RevenueScreen from '../screens/Owner/RevenueScreen';
// Removed ExpenditureScreen
import NoticeBoardScreen from '../screens/Owner/NoticeBoardScreen';
import AddNotice from '../screens/Owner/AddNotice';
import EditProfile from '../screens/Owner/EditProfile';
// Removed SubscriptionScreen
import NotificationScreen from '../screens/Owner/NotificationScreen';
import TenantProfile from '../screens/Owner/TenantProfile'; 
import AssignTenantScreen from '../screens/Owner/AssignTenantScreen';
import AddStaff from '../screens/Owner/AddStaff';
import AddBlockScreen from '../screens/Owner/AddBlockScreen';
import BlockRevenue from '../screens/Owner/BlockRevenue';
import ExpenditureBreakdown from '../screens/Owner/ExpenditureBreakdown';
import RevenueBreakdown from '../screens/Owner/RevenueBreakdown';
import OwnerComplaintsScreen from '../screens/Owner/OwnerComplaintsScreen';
import OwnerMessMenuScreen from '../screens/Owner/OwnerMessMenuScreen';
import OwnerNoticeBoardScreen from '../screens/Owner/NoticeBoardScreen';
import OwnerSupplyAlertsScreen from '../screens/Owner/OwnerSupplyAlertsScreen';
import OwnerPendingPaymentsScreen from '../screens/Owner/OwnerPendingPaymentsScreen';

// --- IMPORT STAFF & TENANT SCREENS ---
import StaffDashboard from '../screens/Staff/StaffDashboard'; 
import TenantDashboard from '../screens/Tenant/TenantDashboard';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// --- THE BOTTOM TAB NAVIGATOR (Owner Strip) ---
function OwnerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#5D5FEF',
        tabBarInactiveTintColor: '#9e9e9e',
        tabBarStyle: {
          height: 65,
          paddingBottom: 10,
          paddingTop: 10,
          backgroundColor: '#ffffff',
          elevation: 15,
          borderTopWidth: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 5,
        },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Hostels') iconName = focused ? 'office-building' : 'office-building-outline';
          else if (route.name === 'Tenants') iconName = focused ? 'account-group' : 'account-group-outline';
          else if (route.name === 'Staff') iconName = focused ? 'id-card' : 'id-card-outline';
          else if (route.name === 'Finance') iconName = focused ? 'chart-box' : 'chart-box-outline';

          return <Icon name={iconName} size={28} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={OwnerDashboard} options={{ title: 'Overview' }} />
      <Tab.Screen name="Hostels" component={HostelManagement} />
      <Tab.Screen name="Tenants" component={TenantManagement} />
      <Tab.Screen name="Staff" component={StaffManagement} />
      <Tab.Screen name="Finance" component={RevenueScreen} />
    </Tab.Navigator>
  );
}

// --- THE MAIN APP NAVIGATION ---
export default function AppNavigator() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); 
  const [roleLoading, setRoleLoading] = useState(false);

  useEffect(() => {
    let roleSubscriber = null;

    const checkCacheAndAuth = async (currentUser) => {
      if (currentUser) {
        // Optimistically load role from cache for instant boot
        try {
          const cachedRole = await AsyncStorage.getItem(`user_role_${currentUser.uid}`);
          if (cachedRole) {
            setRole(cachedRole);
            setRoleLoading(false);
            if (initializing) setInitializing(false);
          } else {
            setRoleLoading(true);
          }
        } catch (e) {
          setRoleLoading(true);
        }

        // Always subscribe to Firestore for real-time updates and cache refreshing
        roleSubscriber = firestore()
          .collection('users')
          .doc(currentUser.uid)
          .onSnapshot(
            async (documentSnapshot) => {
              const data = documentSnapshot?.data();
              if (documentSnapshot?.exists && data && data.role) {
                setRole(data.role);
                try {
                  await AsyncStorage.setItem(`user_role_${currentUser.uid}`, data.role);
                } catch (e) {}
              } else {
                setRole(null);
                try {
                  await AsyncStorage.removeItem(`user_role_${currentUser.uid}`);
                } catch (e) {}
              }
              
              setRoleLoading(false);
              if (initializing) setInitializing(false);
            },
            (error) => {
              console.error("Error fetching role for navigator:", error);
              setRoleLoading(false);
              if (initializing) setInitializing(false);
            }
          );
      } else {
        // User is fully logged out
        setRole(null);
        if (roleSubscriber) roleSubscriber();
        if (initializing) setInitializing(false);
      }
    };

    const authSubscriber = auth().onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      checkCacheAndAuth(currentUser);
    });
    
    return () => {
      authSubscriber();
      if (roleSubscriber) roleSubscriber();
    }; 
  }, []);

  // Loading Screen
  if (initializing || roleLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FA' }}>
        <ActivityIndicator size="large" color="#5D5FEF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
          detachPreviousScreen: false 
        }}
      >
        {/* CONDITION 1: User is completely logged out OR role is still loading */}
        {!user || !role ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : 
        
        /* CONDITION 2: User is an Owner */
        role === 'Owner' ? (
          <>
            <Stack.Screen name="OwnerDashboard" component={OwnerTabs} />
            
            {/* Owner Drill-down Screens */}
            <Stack.Screen name="BlockDetails" component={BlockDetails} options={{ headerShown: true, title: 'Block Details', headerTintColor: '#5D5FEF' }} />
            <Stack.Screen name="FloorDetails" component={FloorDetails} options={{ headerShown: true, title: 'Floor Details', headerTintColor: '#5D5FEF' }} />
            <Stack.Screen name="RoomDetails" component={RoomDetails} options={{ headerShown: true, title: 'Room Details', headerTintColor: '#5D5FEF' }} />
            <Stack.Screen name="TenantOnboarding" component={TenantOnboarding} />
            <Stack.Screen name="TenantProfile" component={TenantProfile} options={{ headerShown: false }} />
            <Stack.Screen name="StaffDetails" component={StaffDetails} />
            <Stack.Screen name="StaffAttendanceHistory" component={StaffAttendanceHistory} />
            <Stack.Screen name="AddStaff" component={AddStaff} />
            <Stack.Screen name="Revenue" component={RevenueScreen} /> 
            <Stack.Screen name="NoticeBoard" component={NoticeBoardScreen} />
            <Stack.Screen name="AddNotice" component={AddNotice} />
            <Stack.Screen name="EditProfile" component={EditProfile} options={{ headerShown: false }} />
            <Stack.Screen name="Notifications" component={NotificationScreen} options={{ headerShown: false }} />
            <Stack.Screen name="AssignTenant" component={AssignTenantScreen} />
            <Stack.Screen name="AddBlockScreen" component={AddBlockScreen} />
            <Stack.Screen name="BlockRevenue" component={BlockRevenue} options={{ headerShown: false }} />
            <Stack.Screen name="ExpenditureBreakdown" component={ExpenditureBreakdown} />
            <Stack.Screen name="RevenueBreakdown" component={RevenueBreakdown} />
            <Stack.Screen name="OwnerComplaints" component={OwnerComplaintsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="OwnerMessMenu" component={OwnerMessMenuScreen} options={{ headerShown: false }} />
            <Stack.Screen name="OwnerNoticeBoard" component={OwnerNoticeBoardScreen} options={{ headerShown: false }} />
            <Stack.Screen name="OwnerSupplyAlerts" component={OwnerSupplyAlertsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="OwnerPendingPayments" component={OwnerPendingPaymentsScreen} options={{ headerShown: false }} />
          </>
        ) : 
        
        /* CONDITION 3: User is Staff */
        role === 'Staff' ? (
          <>
            <Stack.Screen name="StaffDashboard" component={StaffDashboard} />
          </>
        ) : 
        
        /* CONDITION 4: User is a Tenant */
        role === 'Tenant' ? (
          <>
            <Stack.Screen name="TenantDashboard" component={TenantDashboard} />
          </>
        ) : (
          
          /* FALLBACK: Failsafe */
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}