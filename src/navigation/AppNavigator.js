import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; 

// Import screens
import LoginScreen from '../screens/Auth/LoginScreen';
import OwnerDashboard from '../screens/Owner/OwnerDashboard';
import HostelManagement from '../screens/Owner/HostelManagement';
import BlockDetails from '../screens/Owner/BlockDetails';
import FloorDetails from '../screens/Owner/FloorDetails';
import RoomDetails from '../screens/Owner/RoomDetails';
import TenantOnboarding from '../screens/Owner/TenantOnboarding';
import TenantManagement from '../screens/Owner/TenantManagement';
import TenantDetails from '../screens/Owner/TenantDetails';
import StaffManagement from '../screens/Owner/StaffManagement';
import StaffDetails from '../screens/Owner/StaffDetails';
import StaffAttendanceHistory from '../screens/Owner/StaffAttendanceHistory';
import RevenueScreen from '../screens/Owner/RevenueScreen';
import ExpenditureScreen from '../screens/Owner/ExpenditureScreen';
import NoticeBoardScreen from '../screens/Owner/NoticeBoardScreen';
import AddNotice from '../screens/Owner/AddNotice';
import EditProfile from '../screens/Owner/EditProfile';
import SubscriptionScreen from '../screens/Owner/SubscriptionScreen';
import NotificationScreen from '../screens/Owner/NotificationScreen'; // Import at the top

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// --- THE NEW BOTTOM TAB NAVIGATOR (The "Strip" at the bottom) ---
function OwnerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#6200EE',
        tabBarInactiveTintColor: '#9e9e9e',
        tabBarStyle: {
          height: 65,
          paddingBottom: 10,
          paddingTop: 10,
          backgroundColor: '#ffffff',
          elevation: 15, // Shadow for Android
          borderTopWidth: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 5,
        },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Hostels') {
            iconName = focused ? 'office-building' : 'office-building-outline';
          } else if (route.name === 'Tenants') {
            iconName = focused ? 'account-group' : 'account-group-outline';
          } else if (route.name === 'Staff') {
            iconName = focused ? 'id-card' : 'id-card-outline';
          } else if (route.name === 'Finance') {
            iconName = focused ? 'chart-box' : 'chart-box-outline';
          }

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
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Login"
        screenOptions={{ 
          headerShown: false,
          detachPreviousScreen: false 
        }}
      >
        {/* Auth */}
        <Stack.Screen name="Login" component={LoginScreen} />

        {/* MAIN TABS (Replaces the old Dashboard route) */}
        {/* CRITICAL: This MUST load OwnerTabs, not OwnerDashboard directly */}
        <Stack.Screen name="OwnerDashboard" component={OwnerTabs} />

        {/* --- DRILL DOWN SCREENS (These hide the tab bar when opened) --- */}
        
        {/* Hostel Drill-downs */}
        <Stack.Screen 
          name="BlockDetails" 
          component={BlockDetails} 
          options={{ headerShown: true, title: 'Block Details', headerTintColor: '#6200EE' }} 
        />
        <Stack.Screen 
          name="FloorDetails" 
          component={FloorDetails} 
          options={{ headerShown: true, title: 'Floor Details', headerTintColor: '#6200EE' }} 
        />
        <Stack.Screen 
          name="RoomDetails" 
          component={RoomDetails} 
          options={{ headerShown: true, title: 'Room Details', headerTintColor: '#6200EE' }} 
        />

        {/* Tenant Drill-downs */}
        <Stack.Screen name="TenantOnboarding" component={TenantOnboarding} />
        <Stack.Screen name="TenantDetails" component={TenantDetails} />

        {/* Staff Drill-downs */}
        <Stack.Screen name="StaffDetails" component={StaffDetails} />
        <Stack.Screen name="StaffAttendanceHistory" component={StaffAttendanceHistory} />

        {/* Finance & Misc Drill-downs */}
        <Stack.Screen name="Revenue" component={RevenueScreen} /> 
        <Stack.Screen name="Expenditure" component={ExpenditureScreen} />
        <Stack.Screen name="NoticeBoard" component={NoticeBoardScreen} />
        <Stack.Screen name="AddNotice" component={AddNotice} />
        <Stack.Screen name="EditProfile" component={EditProfile} options={{ headerShown: false }} />
        <Stack.Screen name="Subscription" component={SubscriptionScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Notifications" component={NotificationScreen} options={{ headerShown: false }} />
        
      </Stack.Navigator>
    </NavigationContainer>
  );
}