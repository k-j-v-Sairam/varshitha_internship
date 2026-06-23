import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, ActivityIndicator, Alert, Modal, Image, Linking, StatusBar, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, RefreshControl } from 'react-native';
import { Text, IconButton, Avatar, Divider, Button, TextInput } from 'react-native-paper';
import firestore from '@react-native-firebase/firestore'; 
import { pick, types } from '@react-native-documents/picker'; 
import { useHostel } from '../../context/HostelContext';

const colors = {
  primary: '#6366F1', primaryLight: '#EEF2FF', background: '#F8FAFC', cardBg: '#FFFFFF', 
  textDark: '#0F172A', textLight: '#64748B', textWhite: '#FFFFFF',
  success: '#10B981', warning: '#F59E0B', error: '#EF4444', border: '#E2E8F0'
};

const TenantProfile = ({ navigation, route }) => {
  const { tenantId } = route.params || {};
  const { reassignTenant, uploadTenantDocument, deleteTenantDocument } = useHostel();

  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); 
  const [error, setError] = useState(null);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [updating, setUpdating] = useState(false);

  const [newBlockInput, setNewBlockInput] = useState('');
  const [newRoomInput, setNewRoomInput] = useState('');

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    if (!tenantId) {
      setError("No Tenant ID provided.");
      setLoading(false);
      return;
    }

    const subscriber = firestore()
      .collection('tenants')
      .doc(tenantId)
      .onSnapshot(
        documentSnapshot => {
          if (documentSnapshot.exists) {
            setTenant({ id: documentSnapshot.id, ...documentSnapshot.data() });
          } else {
            setError("Tenant not found in database.");
          }
          setLoading(false);
        },
        err => {
          console.error("Error fetching tenant:", err);
          setError("Failed to sync data.");
          setLoading(false);
        }
      );
      
    return () => subscriber(); 
  }, [tenantId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const handleCall = (phone) => {
    if (phone) Linking.openURL(`tel:${phone}`);
    else Alert.alert("No Phone", "No phone number available for this tenant.");
  };

  const handleSMS = (phone) => {
    if (phone) Linking.openURL(`sms:${phone}`);
    else Alert.alert("No Phone", "No phone number available for this tenant.");
  };

  const handleUploadAadhaar = async () => {
    try {
      const result = await pick({
        type: [types.images],
      });
      const res = Array.isArray(result) ? result[0] : result;

      Alert.alert(
        "Confirm Upload",
        `Do you want to upload ${res.name}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Upload",
            onPress: async () => {
              setUpdating(true);
              try {
                await uploadTenantDocument(tenantId, res.uri, res.name);
                Alert.alert("Success", "Aadhaar Card uploaded securely to Firebase.");
              } catch (err) {
                Alert.alert("Upload Failed", "There was an issue saving to Firebase Storage.");
              } finally {
                setUpdating(false);
              }
            }
          }
        ]
      );
    } catch (err) {
      const errorMsg = err?.message?.toLowerCase() || '';
      const errorCode = err?.code?.toLowerCase() || '';
      if (!errorMsg.includes('cancel') && !errorCode.includes('cancel')) {
        Alert.alert("Error", "Could not open the file picker.");
      }
    }
  };

  const handleDeleteDocument = () => {
    Alert.alert(
      "Delete Document",
      "Are you sure you want to permanently delete this document from the cloud?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setUpdating(true);
            try {
              await deleteTenantDocument(tenantId, tenant.idDocumentPath);
              Alert.alert("Deleted", "The document has been removed.");
            } catch (err) {
              Alert.alert("Error", "Failed to delete the document.");
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
  };

  const handleExecuteTransfer = async () => {
    const cleanBlock = newBlockInput.trim();
    const cleanRoom = newRoomInput.trim();

    if (!cleanBlock || !cleanRoom) {
      Alert.alert("Error", "Please fill out both the target Block and Room fields.");
      return;
    }

    setUpdating(true);

    try {
      await reassignTenant(tenantId, tenant.roomNumber, cleanRoom, cleanBlock, tenant.blockId);
      setTransferModalVisible(false); 
      Alert.alert("Transfer Complete", `Tenant reassigned to Block ${cleanBlock} Room ${cleanRoom}!`);
      setNewBlockInput('');
      setNewRoomInput('');
    } catch (err) {
      Alert.alert("Error", "Could not complete the system transfer.");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteHistory = (historyItem) => {
    Alert.alert(
      "Delete Record",
      `Are you sure you want to remove the history for Room ${historyItem.room}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            setUpdating(true);
            try {
              const currentHistory = tenant.roomHistory || [];
              const newHistory = currentHistory.filter(h => 
                h.historyId ? h.historyId !== historyItem.historyId : (h.joined !== historyItem.joined || h.room !== historyItem.room)
              );
              
              await firestore().collection('tenants').doc(tenantId).update({
                roomHistory: newHistory
              });
            } catch (err) {
              Alert.alert("Error", "Could not delete history record.");
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 12, color: colors.textLight, fontWeight: '500' }}>Loading Profile...</Text>
      </View>
    );
  }

  if (error || !tenant) {
    return (
      <View style={styles.centerContainer}>
        <Text style={{ color: colors.error, fontSize: 16 }}>{error || "An unknown error occurred."}</Text>
        <Button mode="contained" onPress={() => navigation.goBack()} style={{ marginTop: 20 }} buttonColor={colors.primary}>
          Go Back
        </Button>
      </View>
    );
  }

  const historyList = tenant.roomHistory || [];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <View pointerEvents="none"><IconButton icon="arrow-left" size={24} iconColor={colors.textDark} style={{margin:0}} /></View>
        </TouchableOpacity>
        <Text variant="titleMedium" style={styles.headerTitle}>Profile Overview</Text>
        <TouchableOpacity style={styles.editBtn} onPress={() => setTransferModalVisible(true)}>
          <View pointerEvents="none"><IconButton icon="swap-horizontal" size={20} iconColor={colors.primary} style={{margin:0}} /></View>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scroll} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        
        <View style={styles.infoCard}>
          <View style={styles.avatarContainer}>
            {tenant.image ? (
              <Avatar.Image size={100} source={{ uri: tenant.image }} />
            ) : (
              <Avatar.Text size={100} label={(tenant.name || 'U').substring(0, 2).toUpperCase()} color={colors.primary} style={{ backgroundColor: colors.primaryLight }} />
            )}
            <View style={[styles.statusIndicator, { backgroundColor: tenant.rentStatus === 'Paid' ? colors.success : colors.error }]} />
          </View>
          
          <Text variant="headlineSmall" style={styles.name}>{tenant.name}</Text>
          <Text variant="bodyMedium" style={styles.roomText}>
            Block {tenant.blockId || 'Unassigned'}  •  Room {tenant.roomNumber || 'None'}
          </Text>
          
          <View style={styles.quickActionRow}>
            <TouchableOpacity style={styles.quickActionBtn} onPress={() => handleCall(tenant.phone)}>
              <View pointerEvents="none"><IconButton icon="phone" size={22} iconColor={colors.primary} style={{margin:4}} /></View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionBtn} onPress={() => handleSMS(tenant.phone)}>
              <View pointerEvents="none"><IconButton icon="message-text" size={22} iconColor={colors.success} style={{margin:4}} /></View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionBtn}>
              <View pointerEvents="none"><IconButton icon="email" size={22} iconColor={colors.warning} style={{margin:4}} /></View>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionHeader}>Identity & Documents</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.iconBox}><IconButton icon="card-account-details" size={20} iconColor={colors.primary} style={{margin:0}}/></View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>ID / Aadhaar Number</Text>
              <Text style={styles.infoValue}>{tenant.idProofNumber || 'Not Provided'}</Text>
            </View>
          </View>
          <Divider style={styles.divider} />
          
          <View style={styles.documentContainer}>
            <View style={styles.documentHeader}>
              <Text style={styles.infoLabel}>Uploaded Document</Text>
              <Text style={[styles.infoValue, { fontSize: 13, color: tenant.idDocumentUrl ? colors.success : colors.textLight }]}>
                {tenant.idDocumentUrl ? 'Verified & On File' : 'Pending Upload'}
              </Text>
            </View>

            {tenant.idDocumentUrl ? (
              <View style={styles.docActionsRow}>
                <TouchableOpacity style={styles.viewBtn} onPress={() => setModalVisible(true)}>
                  <Text style={styles.viewBtnText}>View Document</Text>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity style={styles.iconActionBtn} onPress={handleUploadAadhaar} disabled={updating}>
                    <View pointerEvents="none"><IconButton icon="upload" size={22} iconColor={colors.primary} style={{margin:0}} /></View>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconActionBtn} onPress={handleDeleteDocument} disabled={updating}>
                    <View pointerEvents="none"><IconButton icon="trash-can" size={22} iconColor={colors.error} style={{margin:0}} /></View>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadBtn} onPress={handleUploadAadhaar} disabled={updating}>
                <Text style={styles.uploadBtnText}>{updating ? 'Uploading...' : 'Pick File from Device'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Text style={styles.sectionHeader}>Contact & Lease</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.iconBox}><IconButton icon="phone-outline" size={20} iconColor={colors.textLight} style={{margin:0}}/></View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone Number</Text>
              <Text style={styles.infoValue}>{tenant.phone || 'Not Provided'}</Text>
            </View>
          </View>
          <Divider style={styles.divider} />
          
          <View style={styles.infoRow}>
            <View style={styles.iconBox}><IconButton icon="briefcase-outline" size={20} iconColor={colors.textLight} style={{margin:0}}/></View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Workplace / College</Text>
              <Text style={styles.infoValue}>{tenant.workplace || 'Not Provided'}</Text>
            </View>
          </View>
          <Divider style={styles.divider} />
          
          <View style={styles.infoRow}>
            <View style={styles.iconBox}><IconButton icon="cash-shield" size={20} iconColor={colors.textLight} style={{margin:0}}/></View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Security Deposit</Text>
              <Text style={styles.infoValue}>{tenant.deposit ? `₹${tenant.deposit}` : 'Not Provided'}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionHeader}>Room History Timeline</Text>
        <View style={styles.infoCard}>
          
          {tenant.roomNumber && (
             <View style={styles.timelineItem}>
               <View style={styles.timelineGraphic}>
                 <View style={[styles.timelineDot, { backgroundColor: colors.success }]} />
                 {historyList.length > 0 && <View style={styles.timelineLine} />}
               </View>
               <View style={styles.timelineContent}>
                 <View style={{ flex: 1 }}>
                   <Text style={styles.timelineRoom}>Block {tenant.blockId} - Room {tenant.roomNumber}</Text>
                   <Text style={styles.timelineDate}>{tenant.currentRoomJoinedDate || tenant.joined || 'Unknown'} to Present</Text>
                   <Text style={[styles.timelineDate, { color: colors.success, fontWeight: '700', marginTop: 4 }]}>Currently Active</Text>
                 </View>
               </View>
             </View>
          )}

          {historyList.length === 0 && !tenant.roomNumber ? (
            <Text style={styles.emptyText}>No room transitions on file.</Text>
          ) : (
            [...historyList].reverse().map((item, index) => (
              <View key={item.historyId || index} style={styles.timelineItem}>
                <View style={styles.timelineGraphic}>
                  <View style={styles.timelineDot} />
                  {index !== historyList.length - 1 && <View style={styles.timelineLine} />}
                </View>

                <View style={styles.timelineContent}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.timelineRoom}>Block {item.block || 'Unknown'} - Room {item.room || 'Unknown'}</Text>
                    <Text style={styles.timelineDate}>{item.joined} to {item.left || 'Present'}</Text>
                  </View>
                  
                  <TouchableOpacity 
                    style={{ padding: 8 }} 
                    onPress={() => handleDeleteHistory(item)} 
                    disabled={updating}
                  >
                    <View pointerEvents="none">
                      <IconButton icon="trash-can-outline" size={20} iconColor={colors.error} style={{margin:0}} />
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={transferModalVisible} transparent animationType="slide" onRequestClose={() => setTransferModalVisible(false)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ width: '100%', position: 'absolute', bottom: 0 }}>
              <View style={[styles.modalContent, { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 20 }]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Instant Room Reassignment</Text>
                  <IconButton icon="close" size={24} iconColor={colors.textDark} onPress={() => setTransferModalVisible(false)} />
                </View>
                <View style={{ gap: 12, paddingHorizontal: 4 }}>
                  <TextInput 
                    label="Target Block Name (e.g. A)" 
                    value={newBlockInput} 
                    onChangeText={setNewBlockInput} 
                    mode="outlined" 
                    activeOutlineColor={colors.primary} 
                    style={{ backgroundColor: '#FFF' }} 
                    textColor={colors.textDark} 
                    autoCapitalize="characters"
                  />
                  <TextInput 
                    label="Target Room Number (e.g. 203)" 
                    value={newRoomInput} 
                    onChangeText={setNewRoomInput} 
                    keyboardType="number-pad" 
                    mode="outlined" 
                    activeOutlineColor={colors.primary} 
                    style={{ backgroundColor: '#FFF' }} 
                    textColor={colors.textDark} 
                  />
                  <Button 
                    mode="contained" 
                    onPress={handleExecuteTransfer} 
                    buttonColor={colors.primary} 
                    style={{ marginTop: 10, borderRadius: 12 }} 
                    contentStyle={{ paddingVertical: 6 }} 
                    loading={updating}
                  >
                    Execute Secure Room Transfer
                  </Button>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal visible={modalVisible} transparent={true} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalCloseArea} onPress={() => setModalVisible(false)} />
          <View style={[styles.modalContent, { minHeight: '60%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Verified Tenant ID Document</Text>
              <IconButton icon="close" size={24} iconColor={colors.textDark} onPress={() => setModalVisible(false)} />
            </View>
            {tenant?.idDocumentUrl && (
              <Image source={{ uri: tenant.idDocumentUrl }} style={styles.documentImage} resizeMode="contain" />
            )}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  backBtn: { backgroundColor: colors.cardBg, borderRadius: 12, elevation: 1, padding: 4 },
  editBtn: { backgroundColor: colors.primaryLight, borderRadius: 12, padding: 4 },
  headerTitle: { fontWeight: '700', color: colors.textDark, fontSize: 18 },
  scroll: { padding: 16, paddingBottom: 60 },
  infoCard: { backgroundColor: colors.cardBg, borderRadius: 20, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 24, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  avatarContainer: { position: 'relative', marginBottom: 16 },
  statusIndicator: { position: 'absolute', bottom: 4, right: 4, width: 20, height: 20, borderRadius: 10, borderWidth: 3, borderColor: colors.cardBg },
  name: { fontWeight: '800', color: colors.textDark, marginBottom: 4, fontSize: 24 },
  roomText: { color: colors.textLight, fontWeight: '600', marginBottom: 20, fontSize: 15 },
  quickActionRow: { flexDirection: 'row', gap: 16 },
  quickActionBtn: { backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  sectionHeader: { fontSize: 13, fontWeight: '700', color: colors.textLight, marginBottom: 10, marginLeft: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, width: '100%' },
  documentContainer: { paddingVertical: 12, width: '100%' },
  documentHeader: { marginBottom: 8 },
  docActionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  
  viewBtn: { backgroundColor: colors.primaryLight, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, flex: 1, alignItems: 'center', marginRight: 12 },
  viewBtnText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  uploadBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary, paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  uploadBtnText: { color: colors.primary, fontWeight: '600' },
  iconActionBtn: { backgroundColor: '#F8FAFC', borderRadius: 8, padding: 2, borderWidth: 1, borderColor: colors.border },
  
  iconBox: { backgroundColor: colors.primaryLight, borderRadius: 12, marginRight: 16, padding: 4 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: colors.textLight, fontWeight: '500', marginBottom: 2 },
  infoValue: { fontSize: 15, color: colors.textDark, fontWeight: '600' },
  divider: { backgroundColor: colors.border, height: 1, marginLeft: 56, width: '100%' },
  emptyText: { padding: 16, textAlign: 'center', color: colors.textLight, fontStyle: 'italic', fontSize: 14 },
  timelineItem: { flexDirection: 'row', minHeight: 70, width: '100%' },
  timelineGraphic: { width: 30, alignItems: 'center', paddingTop: 14 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary, zIndex: 2 },
  timelineLine: { width: 2, flex: 1, backgroundColor: colors.primaryLight, marginTop: 4 },
  timelineContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, marginLeft: 12, paddingTop: 10 },
  timelineRoom: { fontSize: 16, fontWeight: '700', color: colors.textDark },
  timelineDate: { fontSize: 13, color: colors.textLight, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center' },
  modalCloseArea: { flex: 1 },
  modalContent: { backgroundColor: colors.cardBg, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textDark },
  documentImage: { width: '100%', height: 400, borderRadius: 16, backgroundColor: '#F1F5F9' }
});

export default TenantProfile;