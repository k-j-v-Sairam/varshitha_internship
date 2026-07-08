import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, SafeAreaView, TouchableOpacity, StatusBar } from 'react-native';
import { Text, IconButton, Surface, ActivityIndicator, Avatar } from 'react-native-paper';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { Colors } from '../../theme/colors';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export default function OwnerPendingPaymentsScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('Tenants'); // 'Tenants' or 'Staff'
  const [tenants, setTenants] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ownerId = auth().currentUser?.uid;
    if (!ownerId) return;

    // Listen to tenants with pending rent
    const unsubscribeTenants = firestore()
      .collection('tenants')
      .where('ownerId', '==', ownerId)
      .where('rentStatus', '==', 'Pending')
      .onSnapshot(snap => {
        if (snap) {
          const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setTenants(list);
        }
      }, err => console.log('Tenant pending error', err));

    // Listen to staff with pending/due salary
    const unsubscribeStaff = firestore()
      .collection('staff')
      .where('ownerId', '==', ownerId)
      .onSnapshot(snap => {
        if (snap) {
          const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(d => d.status === 'Pending' || d.status === 'Due');
          setStaff(list);
        }
        setLoading(false);
      }, err => {
        console.log('Staff pending error', err);
        setLoading(false);
      });

    return () => {
      unsubscribeTenants();
      unsubscribeStaff();
    };
  }, []);

  const renderTenantItem = ({ item }) => (
    <Surface style={styles.card} elevation={1}>
      <View style={styles.cardHeader}>
        <Avatar.Text size={40} label={item.name ? item.name.substring(0, 2).toUpperCase() : 'T'} style={{ backgroundColor: Colors.primary }} />
        <View style={styles.cardInfo}>
          <Text style={styles.name}>{item.name || 'Unknown'}</Text>
          <Text style={styles.subtext}>Room {item.roomNumber || 'N/A'} • {item.block || 'N/A'}</Text>
        </View>
        <View style={styles.amountBox}>
          <Text style={styles.amountText}>₹{item.rentAmount || 0}</Text>
          <Text style={styles.dueText}>Due</Text>
        </View>
      </View>
    </Surface>
  );

  const renderStaffItem = ({ item }) => (
    <Surface style={styles.card} elevation={1}>
      <View style={styles.cardHeader}>
        <Avatar.Text size={40} label={item.name ? item.name.substring(0, 2).toUpperCase() : 'S'} style={{ backgroundColor: Colors.warning }} />
        <View style={styles.cardInfo}>
          <Text style={styles.name}>{item.name || 'Unknown'}</Text>
          <Text style={styles.subtext}>{item.role || 'Staff'} • {item.block || 'N/A'}</Text>
        </View>
        <View style={styles.amountBox}>
          <Text style={[styles.amountText, { color: Colors.warning }]}>₹{item.salary || 0}</Text>
          <Text style={[styles.dueText, { color: Colors.warning }]}>Due</Text>
        </View>
      </View>
    </Surface>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon="arrow-left" iconColor="#fff" size={24} onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Pending Payments</Text>
        <View style={{ width: 48 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'Tenants' && styles.activeTab]} 
          onPress={() => setActiveTab('Tenants')}
        >
          <MaterialCommunityIcons name="account-group" size={20} color={activeTab === 'Tenants' ? Colors.primary : Colors.textLight} />
          <Text style={[styles.tabText, activeTab === 'Tenants' && styles.activeTabText]}>Tenants ({tenants.length})</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'Staff' && styles.activeTab]} 
          onPress={() => setActiveTab('Staff')}
        >
          <MaterialCommunityIcons name="account-tie" size={20} color={activeTab === 'Staff' ? Colors.primary : Colors.textLight} />
          <Text style={[styles.tabText, activeTab === 'Staff' && styles.activeTabText]}>Staff ({staff.length})</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={activeTab === 'Tenants' ? tenants : staff}
            keyExtractor={item => item.id}
            renderItem={activeTab === 'Tenants' ? renderTenantItem : renderStaffItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons 
                  name="check-circle-outline" 
                  size={60} 
                  color={Colors.success} 
                />
                <Text style={styles.emptyText}>All Clear!</Text>
                <Text style={styles.emptySubtext}>
                  No pending payments for {activeTab.toLowerCase()}.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 5,
    elevation: 4,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 16,
    color: Colors.textLight,
    fontWeight: '500',
  },
  activeTabText: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  content: { flex: 1 },
  listContent: { padding: 15, gap: 15 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 15,
  },
  name: { fontSize: 16, fontWeight: 'bold', color: Colors.textDark },
  subtext: { fontSize: 13, color: Colors.textLight, marginTop: 4 },
  amountBox: {
    alignItems: 'flex-end',
  },
  amountText: { fontSize: 18, fontWeight: 'bold', color: Colors.primary },
  dueText: { fontSize: 12, color: Colors.danger, fontWeight: '600', marginTop: 2 },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 5,
  },
});
