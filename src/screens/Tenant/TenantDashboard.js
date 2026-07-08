// src/screens/Tenant/TenantDashboard.js
// Root host for the Tenant Dashboard. Fetches the tenant's own profile once
// and distributes it to all child tabs via React Context, preventing redundant Firestore reads.

import React, { createContext, useContext, useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import auth from '@react-native-firebase/auth';

import { getMyTenantProfile } from '../../services/tenantService';
import { useTenantNotifications } from '../../services/notificationService';
import TenantHomeTab from './TenantHomeTab';
import TenantComplaintScreen from './TenantComplaintScreen';
import TenantNoticeBoardScreen from './TenantNoticeBoardScreen';
import TenantRentLedgerScreen from './TenantRentLedgerScreen';
import TenantMessMenuScreen from './TenantMessMenuScreen';
import SkeletonLoader from '../../components/common/SkeletonLoader';

const { width, height } = Dimensions.get('window');

// ── Tenant Context ─────────────────────────────────────────────────────────────
export const TenantContext = createContext(null);
export const useTenantContext = () => useContext(TenantContext);

const Tab = createBottomTabNavigator();

const TEAL = '#0D9488';
const TEAL_LIGHT = '#CCFBF1';

// Separate component so the hook only registers when profile exists
const NotificationEnabler = ({ profile }) => {
  useTenantNotifications(profile);
  return null;
};

export default function TenantDashboard() {
  const [tenantProfile, setTenantProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth().currentUser?.uid;
    if (!uid) { setLoading(false); return; }

    const unsubscribe = getMyTenantProfile(uid, (profile) => {
      setTenantProfile(profile);
      setLoading(false);
    });

    return () => unsubscribe && unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={styles.loader}>
        <SkeletonLoader width={width * 0.8} height={120} style={{ borderRadius: 20, marginBottom: 20 }} />
        <SkeletonLoader width={width * 0.9} height={200} style={{ borderRadius: 20, marginBottom: 20 }} />
        <SkeletonLoader width={width * 0.9} height={100} style={{ borderRadius: 20 }} />
      </View>
    );
  }

  if (!tenantProfile) {
    return (
      <View style={styles.loader}>
        <MaterialCommunityIcons name="account-question-outline" size={56} color={TEAL} />
        <Text style={styles.errorTitle}>Profile Not Found</Text>
        <Text style={styles.errorSub}>Contact your hostel owner to verify your account setup.</Text>
      </View>
    );
  }

  return (
    <TenantContext.Provider value={{ tenantProfile }}>
      <NotificationEnabler profile={tenantProfile} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: TEAL,
          tabBarInactiveTintColor: '#94A3B8',
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabLabel,
          tabBarIcon: ({ color, size, focused }) => {
            const icons = {
              Home: focused ? 'home' : 'home-outline',
              Complaints: focused ? 'alert-circle' : 'alert-circle-outline',
              Notices: focused ? 'bulletin-board' : 'clipboard-text-outline',
              Rent: focused ? 'cash-multiple' : 'cash',
              Mess: focused ? 'silverware-fork-knife' : 'silverware',
            };
            return <MaterialCommunityIcons name={icons[route.name]} size={26} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Home" component={TenantHomeTab} options={{ title: 'Home' }} />
        <Tab.Screen name="Complaints" component={TenantComplaintScreen} options={{ title: 'Complaints' }} />
        <Tab.Screen name="Notices" component={TenantNoticeBoardScreen} options={{ title: 'Notices' }} />
        <Tab.Screen name="Rent" component={TenantRentLedgerScreen} options={{ title: 'Rent' }} />
        <Tab.Screen name="Mess" component={TenantMessMenuScreen} options={{ title: 'Mess Menu' }} />
      </Tab.Navigator>
    </TenantContext.Provider>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0FDF4', padding: 32, gap: 12 },
  loaderText: { color: '#0D9488', fontWeight: '600', fontSize: 14 },
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
  tabLabel: { fontSize: 10, fontWeight: '700', marginTop: 2 },
});
