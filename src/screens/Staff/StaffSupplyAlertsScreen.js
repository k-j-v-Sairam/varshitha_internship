// src/screens/Staff/StaffSupplyAlertsScreen.js
// Quick-tap supply alert grid for staff to instantly notify the owner.

import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert, ActivityIndicator, Modal
} from 'react-native';
import { Text, Surface, TextInput, Button } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import auth from '@react-native-firebase/auth';
import { useStaffContext } from './StaffDashboard';
import { sendSupplyAlert, getMySupplyAlerts, deleteSupplyAlert } from '../../services/supplyAlertService';

const ROSE = '#E11D48';

const SUPPLY_ITEMS = [
  { key: 'Cleaning Supplies', icon: 'spray-bottle', color: '#10B981', bg: '#D1FAE5' },
  { key: 'Water Cans', icon: 'water', color: '#3B82F6', bg: '#DBEAFE' },
  { key: 'Kitchen Supplies', icon: 'pot-steam', color: '#F59E0B', bg: '#FEF3C7' },
  { key: 'Electrical/Bulbs', icon: 'lightbulb-on', color: '#EAB308', bg: '#FEF9C3' },
  { key: 'Bathroom Supplies', icon: 'shower-head', color: '#8B5CF6', bg: '#EDE9FE' },
  { key: 'General Inventory', icon: 'package-variant', color: '#0D9488', bg: '#CCFBF1' },
  { key: 'Electrical Issue', icon: 'lightning-bolt', color: '#EF4444', bg: '#FEE2E2' },
  { key: 'Plumbing Issue', icon: 'pipe-leak', color: '#64748B', bg: '#F1F5F9' },
  { key: 'Gas/LPG', icon: 'gas-cylinder', color: '#F97316', bg: '#FFEDD5' },
  { key: 'First Aid Kit', icon: 'medical-bag', color: '#EF4444', bg: '#FEE2E2' },
  { key: 'Bed/Mattress Issue', icon: 'bed', color: '#6366F1', bg: '#EEF2FF' },
  { key: 'Pest Control', icon: 'bug', color: '#92400E', bg: '#FEF3C7' },
  { key: 'Miscellaneous', icon: 'dots-horizontal-circle-outline', color: '#475569', bg: '#F8FAFC' },
];

const formatDate = (ts) => {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

export default function StaffSupplyAlertsScreen() {
  const { staffProfile } = useStaffContext();
  const [myAlerts, setMyAlerts] = useState([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [sendingItem, setSendingItem] = useState(null);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState('1');
  const [description, setDescription] = useState('');

  useEffect(() => {
    const uid = auth().currentUser?.uid;
    if (!uid) return;

    const unsub = getMySupplyAlerts(uid, (data) => {
      setMyAlerts(data);
      setLoadingAlerts(false);
    });
    return () => unsub();
  }, []);

  const handleItemPress = (item) => {
    setSelectedItem(item);
    setQuantity('1');
    setDescription('');
    setModalVisible(true);
  };

  const handleAlert = async () => {
    const uid = auth().currentUser?.uid;
    const qtyNum = parseInt(quantity) || 1;
    
    setModalVisible(false);
    setSendingItem(selectedItem.key);
    try {
      await sendSupplyAlert({
        item: selectedItem.key,
        itemIcon: selectedItem.icon,
        quantity: qtyNum,
        description: description.trim(),
        staffUid: uid,
        staffName: staffProfile?.name || 'Staff',
        blockId: staffProfile?.block || 'Unknown',
        ownerId: staffProfile?.ownerId,
      });
      Alert.alert('✅ Alert Sent!', `The owner has been notified about ${qtyNum}x "${selectedItem.key}".`);
    } catch (err) {
      Alert.alert('Error', 'Could not send alert. Please try again.');
    } finally {
      setSendingItem(null);
      setSelectedItem(null);
    }
  };

  const handleDelete = (alertId) => {
    Alert.alert(
      'Delete Alert',
      'Are you sure you want to delete this alert?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSupplyAlert(alertId);
            } catch (err) {
              Alert.alert('Error', 'Could not delete alert.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#BE123C" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Supply Alerts 🚨</Text>
        <Text style={styles.headerSub}>One-tap to notify the owner about shortages</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Alert Grid */}
        <Text style={styles.sectionTitle}>Tap to Send Alert</Text>
        <View style={styles.grid}>
          {SUPPLY_ITEMS.map(item => {
            const isSending = sendingItem === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.gridItem, { backgroundColor: item.bg }]}
                onPress={() => handleItemPress(item)}
                disabled={!!sendingItem}
                activeOpacity={0.75}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color={item.color} />
                ) : (
                  <MaterialCommunityIcons name={item.icon} size={32} color={item.color} />
                )}
                <Text style={[styles.gridLabel, { color: item.color }]} numberOfLines={2}>
                  {item.key}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Recent Alerts */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>History</Text>

        {loadingAlerts ? (
          <ActivityIndicator size="small" color={ROSE} />
        ) : myAlerts.length === 0 ? (
          <View style={styles.emptyAlerts}>
            <MaterialCommunityIcons name="bell-off-outline" size={36} color="#CBD5E1" />
            <Text style={styles.emptyAlertsText}>No alerts sent yet.</Text>
          </View>
        ) : (
          myAlerts.map(alert => {
            const itemCfg = SUPPLY_ITEMS.find(i => i.key === alert.item) || SUPPLY_ITEMS[5];
            const isAck = alert.status === 'Resolved' || alert.status === 'Acknowledged';
            return (
              <Surface key={alert.id} style={styles.alertCard} elevation={1}>
                <View style={[styles.alertIcon, { backgroundColor: itemCfg.bg }]}>
                  <MaterialCommunityIcons name={itemCfg.icon} size={20} color={itemCfg.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertItem}>{alert.quantity || 1}x {alert.item}</Text>
                  {alert.description ? <Text style={styles.alertDesc}>{alert.description}</Text> : null}
                  <Text style={styles.alertDate}>{formatDate(alert.createdAt)}</Text>
                </View>
                <View style={[styles.alertStatus, { backgroundColor: isAck ? '#D1FAE5' : '#FEF3C7' }]}>
                  <Text style={[styles.alertStatusText, { color: isAck ? '#10B981' : '#F59E0B' }]}>
                    {isAck ? '✓ Resolved' : 'Pending'}
                  </Text>
                </View>
                {!isAck && (
                  <TouchableOpacity onPress={() => handleDelete(alert.id)} style={{ padding: 4, marginLeft: 8 }}>
                    <MaterialCommunityIcons name="trash-can-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </Surface>
            );
          })
        )}
      </ScrollView>

      {/* Quantity Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Surface style={styles.modalContent} elevation={5}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name={selectedItem?.icon} size={28} color={selectedItem?.color} />
              <Text style={styles.modalTitle}>{selectedItem?.key}</Text>
            </View>
            <Text style={styles.modalLabel}>Select Quantity Needed:</Text>
            
            <View style={styles.stepperContainer}>
              <TouchableOpacity style={styles.stepperBtn} onPress={() => setQuantity(String(Math.max(1, parseInt(quantity || 0) - 1)))}>
                <MaterialCommunityIcons name="minus" size={24} color={ROSE} />
              </TouchableOpacity>
              <TextInput
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                style={styles.quantityInput}
                mode="outlined"
                outlineColor="#CBD5E1"
                activeOutlineColor={ROSE}
                contentStyle={{textAlign: 'center'}}
              />
              <TouchableOpacity style={styles.stepperBtn} onPress={() => setQuantity(String(parseInt(quantity || 0) + 1))}>
                <MaterialCommunityIcons name="plus" size={24} color={ROSE} />
              </TouchableOpacity>
            </View>

            <TextInput
              label="Description (Optional)"
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              outlineColor="#CBD5E1"
              activeOutlineColor={ROSE}
              placeholder="e.g. Aloo, Rice, 20L cans"
              style={{ marginBottom: 24, backgroundColor: '#fff' }}
            />

            <View style={styles.modalActions}>
              <Button mode="text" textColor="#64748B" onPress={() => setModalVisible(false)} style={{flex: 1}}>Cancel</Button>
              <Button mode="contained" buttonColor={ROSE} onPress={handleAlert} style={{flex: 1, borderRadius: 10}}>Send Alert</Button>
            </View>
          </Surface>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF1F2' },
  header: { backgroundColor: ROSE, paddingTop: 52, paddingBottom: 24, paddingHorizontal: 20 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  scroll: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: {
    width: '30.5%',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 8,
    minHeight: 90,
    justifyContent: 'center',
  },
  gridLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center', lineHeight: 15 },
  emptyAlerts: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyAlertsText: { fontSize: 14, color: '#94A3B8' },
  alertCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
  alertIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  alertItem: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  alertDesc: { fontSize: 12, color: '#64748B', marginTop: 2, fontStyle: 'italic' },
  alertDate: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  alertStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 },
  alertStatusText: { fontSize: 11, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },
  modalLabel: { fontSize: 14, color: '#64748B', marginBottom: 16 },
  stepperContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 24 },
  stepperBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF1F2', justifyContent: 'center', alignItems: 'center' },
  quantityInput: { width: 80, height: 50, backgroundColor: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalActions: { flexDirection: 'row', gap: 12 },
});
