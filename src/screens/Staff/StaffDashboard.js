// src/screens/Staff/StaffDashboard.js
// Root host for the Staff Dashboard. Fetches the staff's own profile once
// and shares it via React Context to all child tabs.

import React, { createContext, useContext, useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import auth from '@react-native-firebase/auth';

import { getMyStaffProfile } from '../../services/staffService';
import StaffHomeTab from './StaffHomeTab';
import StaffNoticeBoardScreen from './StaffNoticeBoardScreen';
import StaffSalaryScreen from './StaffSalaryScreen';
import StaffAttendanceTab from './StaffAttendanceTab';
import StaffMaintenanceBoardScreen from './StaffMaintenanceBoardScreen';
import StaffSupplyAlertsScreen from './StaffSupplyAlertsScreen';

// ── Staff Context ────────────────────────────────────────────────────────────
export const StaffContext = createContext(null);
export const useStaffContext = () => useContext(StaffContext);

const Tab = createBottomTabNavigator();

const ROSE = '#E11D48';
const ROSE_DARK = '#BE123C';

export default function StaffDashboard() {
  const [staffProfile, setStaffProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth().currentUser?.uid;
    if (!uid) { setLoading(false); return; }

    const unsubscribe = getMyStaffProfile(uid, (profile) => {
      setStaffProfile(profile);
      setLoading(false);
    });

    return () => unsubscribe && unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={ROSE} />
        <Text style={styles.loaderText}>Loading your profile...</Text>
      </View>
    );
  }

  if (!staffProfile) {
    return (
      <View style={styles.loader}>
        <MaterialCommunityIcons name="account-question-outline" size={56} color={ROSE} />
        <Text style={styles.errorTitle}>Profile Not Found</Text>
        <Text style={styles.errorSub}>Contact your hostel owner to verify your account setup.</Text>
      </View>
    );
  }

  return (
    <StaffContext.Provider value={{ staffProfile }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: ROSE,
          tabBarInactiveTintColor: '#94A3B8',
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabLabel,
          tabBarIcon: ({ color, focused }) => {
            const icons = {
              Home: focused ? 'home' : 'home-outline',
              Notices: focused ? 'bulletin-board' : 'clipboard-text-outline',
              Salary: focused ? 'cash' : 'cash-outline',
              Attendance: focused ? 'calendar-check' : 'calendar-check-outline',
              Tasks: focused ? 'clipboard-list' : 'clipboard-list-outline',
              Supplies: focused ? 'package-variant' : 'package-variant-closed',
            };
            return <MaterialCommunityIcons name={icons[route.name]} size={24} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Home" component={StaffHomeTab} options={{ title: 'Home' }} />
        <Tab.Screen name="Notices" component={StaffNoticeBoardScreen} options={{ title: 'Notices' }} />
        <Tab.Screen name="Salary" component={StaffSalaryScreen} options={{ title: 'Salary' }} />
        <Tab.Screen name="Attendance" component={StaffAttendanceTab} options={{ title: 'Attendance' }} />
        <Tab.Screen name="Tasks" component={StaffMaintenanceBoardScreen} options={{ title: 'Tasks' }} />
        <Tab.Screen name="Supplies" component={StaffSupplyAlertsScreen} options={{ title: 'Supplies' }} />
      </Tab.Navigator>
    </StaffContext.Provider>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF1F2', padding: 32, gap: 12 },
  loaderText: { color: ROSE, fontWeight: '600', fontSize: 14 },
  errorTitle: { fontSize: 20, fontWeight: 'bold', color: '#0F172A', marginTop: 8 },
  errorSub: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22 },
  tabBar: {
    height: 68,
    paddingBottom: 10,
    paddingTop: 8,
    backgroundColor: '#FFFFFF',
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    borderTopWidth: 0,
  },
  tabLabel: { fontSize: 9, fontWeight: '700', marginTop: 2 },
});
