import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import {
  View, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity,
  ActivityIndicator, Alert, Modal, Image, Linking, StatusBar,
  Animated, Dimensions, RefreshControl
} from 'react-native';
import FileViewer from 'react-native-file-viewer';
import { Text, IconButton, Avatar, Divider, Button, Chip } from 'react-native-paper';
import firestore from '@react-native-firebase/firestore';
import { pick, types, keepLocalCopy } from '@react-native-documents/picker';
import auth from '@react-native-firebase/auth';
import {
  useReassignTenant,
  useUploadTenantDocument,
  useDeleteTenantDocument,
  useDeleteTenantHistory,
  useRecordRentPayment,
  useTenantTransactions,
} from '../../hooks/useQueries';
import { Colors } from '../../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TenantProfile = ({ navigation, route }) => {
  const { tenantId } = route.params || {};
  const reassignTenantMutation = useReassignTenant();
  const uploadDocumentMutation = useUploadTenantDocument();
  const deleteDocumentMutation = useDeleteTenantDocument();
  const deleteHistoryMutation = useDeleteTenantHistory();
  const recordRentPaymentMutation = useRecordRentPayment();

  const { data: transactions = [] } = useTenantTransactions(tenantId);

  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [transferModalVisible, setTransferModalVisible] = useState(false);

  // --- Animated Transfer Wizard State ---
  const [transferStep, setTransferStep] = useState(1); // 1=Block, 2=Floor, 3=Room
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [availableBlocks, setAvailableBlocks] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loadingWizard, setLoadingWizard] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // Real-time listener
  useEffect(() => {
    if (!tenantId) {
      setError('No Tenant ID provided.');
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
            setError('Tenant not found in database.');
          }
          setLoading(false);
          setRefreshing(false);
        },
        err => {
          console.error('Error fetching tenant:', err);
          setError('Failed to sync data.');
          setLoading(false);
          setRefreshing(false);
        }
      );

    return () => subscriber();
  }, [tenantId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 2000);
  }, []);

  // --- Animated Wizard Helpers ---
  const animateToStep = (step) => {
    Animated.spring(slideAnim, {
      toValue: -(step - 1) * SCREEN_WIDTH,
      useNativeDriver: true,
      tension: 60,
      friction: 10,
    }).start();
    setTransferStep(step);
  };

  const openTransferModal = async () => {
    // Reset wizard
    setTransferStep(1);
    setSelectedBlock(null);
    setSelectedFloor(null);
    setSelectedRoom(null);
    setAvailableRooms([]);
    slideAnim.setValue(0);
    setTransferModalVisible(true);
    // Fetch blocks
    setLoadingWizard(true);
    try {
      const ownerId = auth().currentUser?.uid;
      if (!ownerId) return;
      const snap = await firestore().collection('blocks')
        .where('ownerId', '==', ownerId)
        .get();
      setAvailableBlocks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      Alert.alert('Error', 'Could not load blocks.');
    } finally {
      setLoadingWizard(false);
    }
  };

  const handleSelectBlock = (block) => {
    setSelectedBlock(block);
    animateToStep(2);
  };

  const handleSelectFloor = async (floor) => {
    setSelectedFloor(floor);
    setLoadingWizard(true);
    try {
      const ownerId = auth().currentUser?.uid;
      if (!ownerId) return;
      const snap = await firestore().collection('rooms')
        .where('ownerId', '==', ownerId)
        .where('blockName', '==', selectedBlock.name)
        .where('floor', '==', floor)
        .get();
      setAvailableRooms(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      Alert.alert('Error', 'Could not load rooms for this floor.');
    } finally {
      setLoadingWizard(false);
    }
    animateToStep(3);
  };

  const handleExecuteTransfer = async () => {
    if (!selectedBlock || !selectedRoom) {
      Alert.alert('Error', 'Please select a block and room to transfer.');
      return;
    }
    setUpdating(true);
    try {
      await reassignTenantMutation.mutateAsync({
        tenantId,
        oldRoomNumber: tenant.roomNumber,
        newRoomNumber: selectedRoom.roomNumber,
        newBlockId: selectedBlock.name,
        oldBlockId: tenant.blockId,
      });
      setTransferModalVisible(false);
      Alert.alert('Transfer Complete', `Tenant reassigned to Block ${selectedBlock.name}, Room ${selectedRoom.roomNumber}!`);
    } catch {
      Alert.alert('Error', 'Could not complete the room transfer. Verify the block and room exist.');
    } finally {
      setUpdating(false);
    }
  };

  const handleCall = (phone) => {
    if (phone) Linking.openURL(`tel:${phone}`);
    else Alert.alert('No Phone', 'No phone number available for this tenant.');
  };

  const handleSMS = (phone) => {
    if (phone) Linking.openURL(`sms:${phone}`);
    else Alert.alert('No Phone', 'No phone number available for this tenant.');
  };

  const handlePasswordReset = (email) => {
    if (!email) {
      Alert.alert('No Email', 'This tenant does not have an email address on file.');
      return;
    }
    Alert.alert(
      'Reset Password',
      `Send a password reset email to ${email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              await auth().sendPasswordResetEmail(email);
              Alert.alert('Success', `Password reset link sent to ${email}`);
            } catch (err) {
              Alert.alert('Error', err.message || 'Could not send reset email.');
            }
          },
        },
      ]
    );
  };

  // --- Generate list of months since joined ---
  const getMonthsSinceJoined = () => {
    if (!tenant?.joined) return [];
    
    // Parse 'joined' which is "DD MMM YYYY"
    const parsedJoin = new Date(tenant.joined);
    const joinDate = isNaN(parsedJoin) ? new Date() : parsedJoin;
    const currentDate = new Date();
    
    const months = [];
    // Start one month before the join date
    let d = new Date(joinDate.getFullYear(), joinDate.getMonth() - 1, 1);
    const joinMonthStart = new Date(joinDate.getFullYear(), joinDate.getMonth(), 1);
    
    while (d <= currentDate) {
      const monthYear = `${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
      const display = `${d.toLocaleString('default', { month: 'long' })} ${d.getFullYear()}`;
      const isPaid = transactions.some(tx => tx.monthYear === monthYear);
      const isBeforeJoin = d < joinMonthStart;

      months.unshift({ monthYear, display, isPaid, isBeforeJoin }); // Newest first
      d.setMonth(d.getMonth() + 1);
    }
    return months;
  };

  const paymentHistory = getMonthsSinceJoined();

  const handleToggleMonthlyRent = (monthItem) => {
    const newStatus = monthItem.isPaid ? 'Pending' : 'Paid';
    const amount = tenant.agreedRent || 0;
    const currentOwnerId = auth().currentUser?.uid;

    Alert.alert(
      newStatus === 'Paid' ? `Mark Paid for ${monthItem.display}` : `Mark Pending for ${monthItem.display}`,
      newStatus === 'Paid'
        ? `Record payment of ₹${amount} for ${monthItem.display}?`
        : `Remove payment record for ${monthItem.display}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setUpdating(true);
            try {
              await recordRentPaymentMutation.mutateAsync({
                tenantId,
                ownerId: currentOwnerId,
                amount,
                newStatus,
                monthYear: monthItem.monthYear,
              });
            } catch (err) {
              Alert.alert('Error', err.message || 'Could not update rent status.');
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  const handleUploadAadhaar = async () => {
    try {
      const result = await pick({ type: [types.pdf] });
      const res = Array.isArray(result) ? result[0] : result;

      Alert.alert(
        'Confirm Upload',
        `Are you sure you want to upload "${res.name}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Upload',
            onPress: async () => {
              setUpdating(true);
              try {
                let uploadUri = res.uri;
                const copyResult = await keepLocalCopy({
                  files: [{ uri: res.uri, fileName: res.name }],
                  destination: 'documentDirectory'
                });
                
                if (copyResult && copyResult[0] && copyResult[0].status === 'success') {
                  uploadUri = copyResult[0].localUri;
                } else {
                  throw new Error(copyResult[0]?.copyError || 'Failed to prepare local file for upload.');
                }
                
                await uploadDocumentMutation.mutateAsync({ tenantId, fileUri: uploadUri, fileName: res.name });
                Alert.alert('Success', 'Aadhaar Card uploaded securely.');
              } catch (err) {
                console.error('Upload Error:', err);
                Alert.alert('Upload Failed', 'There was an issue saving to Firebase Storage.');
              } finally {
                setUpdating(false);
              }
            },
          },
        ]
      );
    } catch (err) {
      const errorMsg = err?.message?.toLowerCase() || '';
      const errorCode = err?.code?.toLowerCase() || '';
      if (!errorMsg.includes('cancel') && !errorCode.includes('cancel')) {
        Alert.alert('Error', 'Could not open the file picker.');
      }
    }
  };

  const handleDeleteDocument = () => {
    Alert.alert(
      'Delete Document',
      'Are you sure you want to permanently delete this document from the cloud?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setUpdating(true);
            try {
              await deleteDocumentMutation.mutateAsync({ tenantId, documentPath: tenant.idDocumentPath });
              Alert.alert('Deleted', 'The document has been removed.');
            } catch {
              Alert.alert('Error', 'Failed to delete the document.');
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteHistory = (historyItem) => {
    Alert.alert(
      'Delete Record',
      `Remove the history entry for Room ${historyItem.room}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setUpdating(true);
            try {
              await deleteHistoryMutation.mutateAsync({
                tenantId,
                historyId: historyItem.historyId,
                currentHistory: tenant.roomHistory || [],
              });
            } catch {
              Alert.alert('Error', 'Could not delete history record.');
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ marginTop: 12, color: Colors.textLight, fontWeight: '500' }}>Loading Profile...</Text>
      </View>
    );
  }

  if (error || !tenant) {
    return (
      <View style={styles.centerContainer}>
        <Text style={{ color: Colors.danger, fontSize: 16 }}>{error || 'An unknown error occurred.'}</Text>
        <Button mode="contained" onPress={() => navigation.goBack()} style={{ marginTop: 20 }} buttonColor={Colors.primary}>
          Go Back
        </Button>
      </View>
    );
  }

  const historyList = tenant.roomHistory || [];
  const isPaid = tenant.rentStatus === 'Paid';
  const rentStatusColor = isPaid ? Colors.success : tenant.rentStatus === 'Overdue' ? Colors.danger : Colors.warning;

  // Floor array derived from selectedBlock
  const floorArray = selectedBlock
    ? Array.from({ length: selectedBlock.floors || 0 }, (_, i) => i + 1)
    : [];

  // Room status colour helper
  const getRoomStatusColor = (status) => {
    if (status === 'full') return Colors.danger;
    if (status === 'partial') return '#F59E0B';
    return Colors.success;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <View pointerEvents="none"><IconButton icon="arrow-left" size={24} iconColor={Colors.textDark} style={{ margin: 0 }} /></View>
        </TouchableOpacity>
        <Text variant="titleMedium" style={styles.headerTitle}>Profile Overview</Text>
        <TouchableOpacity style={styles.editBtn} onPress={openTransferModal}>
          <View pointerEvents="none"><IconButton icon="swap-horizontal" size={20} iconColor={Colors.primary} style={{ margin: 0 }} /></View>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >

        {/* --- Profile Card --- */}
        <View style={styles.infoCard}>
          <View style={styles.avatarContainer}>
            {tenant.image ? (
              <Avatar.Image size={100} source={{ uri: tenant.image }} />
            ) : (
              <Avatar.Text size={100} label={(tenant.name || 'U').substring(0, 2).toUpperCase()} color={Colors.primary} style={{ backgroundColor: Colors.primaryLight }} />
            )}
            <View style={[styles.statusIndicator, { backgroundColor: isPaid ? Colors.success : Colors.danger }]} />
          </View>

          <Text variant="headlineSmall" style={styles.name}>{tenant.name}</Text>
          <Text variant="bodyMedium" style={styles.roomText}>
            Block {tenant.blockId || 'Unassigned'}  •  Room {tenant.roomNumber || 'None'}
          </Text>

          <View style={styles.quickActionRow}>
            <TouchableOpacity style={styles.quickActionBtn} onPress={() => handleCall(tenant.phone)}>
              <View pointerEvents="none"><IconButton icon="phone" size={22} iconColor={Colors.primary} style={{ margin: 4 }} /></View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionBtn} onPress={() => handleSMS(tenant.phone)}>
              <View pointerEvents="none"><IconButton icon="message-text" size={22} iconColor={Colors.success} style={{ margin: 4 }} /></View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionBtn} onPress={() => tenant.email ? Linking.openURL(`mailto:${tenant.email}`) : Alert.alert('No Email', 'No email address available.')}>
              <View pointerEvents="none"><IconButton icon="email" size={22} iconColor={Colors.warning} style={{ margin: 4 }} /></View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionBtn} onPress={() => handlePasswordReset(tenant.email)}>
              <View pointerEvents="none"><IconButton icon="key-variant" size={22} iconColor={Colors.danger} style={{ margin: 4 }} /></View>
            </TouchableOpacity>
          </View>
        </View>

        {/* --- Rent Payment History --- */}
        {tenant.roomNumber && paymentHistory.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>Monthly Payment History</Text>
            <View style={styles.infoCard}>
              <View style={{ width: '100%' }}>
                <Text style={styles.infoLabel}>Agreed Monthly Rent</Text>
                <Text style={[styles.infoValue, { fontSize: 20, color: Colors.textDark, marginBottom: 12 }]}>
                  ₹{tenant.agreedRent || '—'}
                </Text>
              </View>

              {paymentHistory.map((item, index) => (
                <View key={item.monthYear} style={{ width: '100%' }}>
                  <View style={[styles.infoRow, { justifyContent: 'space-between' }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.infoValue, { fontSize: 16 }]}>{item.display}</Text>
                      <Chip
                        style={{ backgroundColor: (item.isBeforeJoin ? Colors.border : item.isPaid ? Colors.success : Colors.warning) + '20', marginTop: 4, alignSelf: 'flex-start' }}
                        textStyle={{ color: item.isBeforeJoin ? Colors.textLight : item.isPaid ? Colors.success : Colors.warning, fontWeight: '700', fontSize: 12 }}
                      >
                        {item.isBeforeJoin ? 'Not Joined' : item.isPaid ? 'Paid' : 'Pending'}
                      </Chip>
                    </View>
                    <Button
                      mode="contained"
                      onPress={() => handleToggleMonthlyRent(item)}
                      loading={updating}
                      disabled={updating || item.isBeforeJoin}
                      buttonColor={item.isBeforeJoin ? Colors.background : item.isPaid ? Colors.border : Colors.primary}
                      textColor={item.isBeforeJoin ? Colors.textLight : item.isPaid ? Colors.textDark : Colors.white}
                      style={{ borderRadius: 12, elevation: item.isBeforeJoin ? 0 : 2 }}
                      contentStyle={{ paddingVertical: 2, paddingHorizontal: 4 }}
                    >
                      {item.isBeforeJoin ? 'N/A' : item.isPaid ? 'Revert' : 'Mark Paid'}
                    </Button>
                  </View>
                  {index < paymentHistory.length - 1 && <Divider style={{ width: '100%', backgroundColor: Colors.border }} />}
                </View>
              ))}
            </View>
          </>
        )}

        {/* --- Identity & Documents --- */}
        <Text style={styles.sectionHeader}>Identity & Documents</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.iconBox}><IconButton icon="card-account-details" size={20} iconColor={Colors.primary} style={{ margin: 0 }} /></View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>ID / Aadhaar Number</Text>
              <Text style={styles.infoValue}>{tenant.idProofNumber || 'Not Provided'}</Text>
            </View>
          </View>
          <Divider style={styles.divider} />

          <View style={styles.documentContainer}>
            <View style={styles.documentHeader}>
              <Text style={styles.infoLabel}>Uploaded Document</Text>
              <Text style={[styles.infoValue, { fontSize: 13, color: tenant.idDocumentUrl ? Colors.success : Colors.textLight }]}>
                {tenant.idDocumentUrl ? 'Verified & On File' : 'Pending Upload'}
              </Text>
            </View>

            {tenant.idDocumentUrl ? (
              <View>
                <View style={styles.docActionsRow}>
                  <TouchableOpacity style={styles.viewBtn} onPress={async () => {
                    try {
                      const cleanPath = tenant.idDocumentUrl.replace(/^file:\/\//, '');
                      await FileViewer.open(cleanPath, { showOpenWithDialog: true });
                    } catch (e) {
                      Alert.alert('Cannot Open', `Error: ${e.message || e}\nPath: ${tenant.idDocumentUrl}`);
                      console.log(e);
                    }
                  }}>
                    <Text style={styles.viewBtnText}>View Document</Text>
                  </TouchableOpacity>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity style={styles.iconActionBtn} onPress={handleUploadAadhaar} disabled={updating}>
                      <View pointerEvents="none"><IconButton icon="upload" size={22} iconColor={Colors.primary} style={{ margin: 0 }} /></View>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconActionBtn} onPress={handleDeleteDocument} disabled={updating}>
                      <View pointerEvents="none"><IconButton icon="trash-can" size={22} iconColor={Colors.danger} style={{ margin: 0 }} /></View>
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={{ fontSize: 11, color: Colors.textLight, marginTop: 8, fontStyle: 'italic', textAlign: 'center' }}>
                  Note: This document is stored securely on this device's local storage to save cloud costs. It can only be viewed from this specific device. Other details remain synced everywhere.
                </Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadBtn} onPress={handleUploadAadhaar} disabled={updating}>
                <Text style={styles.uploadBtnText}>{updating ? 'Uploading...' : 'Pick File from Device'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* --- Contact & Lease --- */}
        <Text style={styles.sectionHeader}>Contact & Lease</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.iconBox}><IconButton icon="phone-outline" size={20} iconColor={Colors.textLight} style={{ margin: 0 }} /></View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone Number</Text>
              <Text style={styles.infoValue}>{tenant.phone || 'Not Provided'}</Text>
            </View>
          </View>
          <Divider style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.iconBox}><IconButton icon="briefcase-outline" size={20} iconColor={Colors.textLight} style={{ margin: 0 }} /></View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Workplace / College</Text>
              <Text style={styles.infoValue}>{tenant.workplace || 'Not Provided'}</Text>
            </View>
          </View>
          <Divider style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.iconBox}><IconButton icon="cash-shield" size={20} iconColor={Colors.textLight} style={{ margin: 0 }} /></View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Security Deposit</Text>
              <Text style={styles.infoValue}>{tenant.deposit ? `₹${tenant.deposit}` : 'Not Provided'}</Text>
            </View>
          </View>
        </View>

        {/* --- Room History Timeline --- */}
        <Text style={styles.sectionHeader}>Room History Timeline</Text>
        <View style={styles.infoCard}>
          {tenant.roomNumber && (
            <View style={styles.timelineItem}>
              <View style={styles.timelineGraphic}>
                <View style={[styles.timelineDot, { backgroundColor: Colors.success }]} />
                {historyList.length > 0 && <View style={styles.timelineLine} />}
              </View>
              <View style={styles.timelineContent}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.timelineRoom}>Block {tenant.blockId} - Room {tenant.roomNumber}</Text>
                  <Text style={styles.timelineDate}>{tenant.currentRoomJoinedDate || tenant.joined || 'Unknown'} to Present</Text>
                  <Text style={[styles.timelineDate, { color: Colors.success, fontWeight: '700', marginTop: 4 }]}>Currently Active</Text>
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
                  <TouchableOpacity style={{ padding: 8 }} onPress={() => handleDeleteHistory(item)} disabled={updating}>
                    <View pointerEvents="none">
                      <IconButton icon="trash-can-outline" size={20} iconColor={Colors.danger} style={{ margin: 0 }} />
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* ============================================================
          ANIMATED ROOM TRANSFER WIZARD MODAL
          Step 1 → Block  |  Step 2 → Floor  |  Step 3 → Room
      ============================================================ */}
      <Modal
        visible={transferModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTransferModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.wizardSheet}>
            {/* Header */}
            <View style={styles.wizardHeader}>
              {transferStep > 1 ? (
                <TouchableOpacity onPress={() => animateToStep(transferStep - 1)} style={styles.wizardBackBtn}>
                  <IconButton icon="arrow-left" size={20} iconColor={Colors.primary} style={{ margin: 0 }} />
                </TouchableOpacity>
              ) : (
                <View style={{ width: 40 }} />
              )}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={styles.wizardTitle}>
                  {transferStep === 1 ? '🏢  Select Block' : transferStep === 2 ? `🏗️  Select Floor` : '🚪  Select Room'}
                </Text>
                {transferStep >= 2 && (
                  <Text style={styles.wizardSubtitle}>
                    {selectedBlock?.name}{transferStep === 3 ? ` · Floor ${selectedFloor}` : ''}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setTransferModalVisible(false)} style={styles.wizardBackBtn}>
                <IconButton icon="close" size={20} iconColor={Colors.textLight} style={{ margin: 0 }} />
              </TouchableOpacity>
            </View>

            {/* Step indicator dots */}
            <View style={styles.stepDots}>
              {[1, 2, 3].map(s => (
                <View
                  key={s}
                  style={[
                    styles.dot,
                    { backgroundColor: s <= transferStep ? Colors.primary : Colors.border },
                    s === transferStep && { width: 24 },
                  ]}
                />
              ))}
            </View>

            {/* Sliding panels */}
            <View style={{ overflow: 'hidden', flex: 1 }}>
              <Animated.View
                style={{
                  flexDirection: 'row',
                  width: SCREEN_WIDTH * 3,
                  flex: 1,
                  transform: [{ translateX: slideAnim }],
                }}
              >
                {/* ─── PANEL 1: BLOCKS ─── */}
                <ScrollView style={{ width: SCREEN_WIDTH }} contentContainerStyle={styles.wizardScroll}>
                  {loadingWizard && transferStep === 1 ? (
                    <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
                  ) : availableBlocks.length === 0 ? (
                    <Text style={styles.wizardEmpty}>No blocks found. Add a block first.</Text>
                  ) : (
                    availableBlocks.map(block => (
                      <TouchableOpacity
                        key={block.id}
                        style={styles.wizardCard}
                        onPress={() => handleSelectBlock(block)}
                        activeOpacity={0.75}
                      >
                        <View style={styles.wizardCardIcon}>
                          <Avatar.Icon size={44} icon="office-building" style={{ backgroundColor: Colors.primaryLight }} color={Colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.wizardCardTitle}>Block {block.name}</Text>
                          <Text style={styles.wizardCardSub}>{block.floors || 0} Floors · {block.area || 'No area set'}</Text>
                        </View>
                        <IconButton icon="chevron-right" size={20} iconColor={Colors.textLight} style={{ margin: 0 }} />
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>

                {/* ─── PANEL 2: FLOORS ─── */}
                <ScrollView style={{ width: SCREEN_WIDTH }} contentContainerStyle={styles.wizardScroll}>
                  {floorArray.length === 0 ? (
                    <Text style={styles.wizardEmpty}>This block has no floors yet.</Text>
                  ) : (
                    floorArray.map(floor => (
                      <TouchableOpacity
                        key={floor}
                        style={styles.wizardCard}
                        onPress={() => handleSelectFloor(floor)}
                        activeOpacity={0.75}
                      >
                        <View style={styles.wizardCardIcon}>
                          <Avatar.Icon size={44} icon="layers" style={{ backgroundColor: '#EEF2FF' }} color="#6366F1" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.wizardCardTitle}>Floor {floor}</Text>
                          <Text style={styles.wizardCardSub}>Tap to see available rooms</Text>
                        </View>
                        <IconButton icon="chevron-right" size={20} iconColor={Colors.textLight} style={{ margin: 0 }} />
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>

                {/* ─── PANEL 3: ROOMS ─── */}
                <ScrollView style={{ width: SCREEN_WIDTH }} contentContainerStyle={styles.wizardScroll}>
                  {loadingWizard && transferStep === 3 ? (
                    <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
                  ) : availableRooms.length === 0 ? (
                    <Text style={styles.wizardEmpty}>No rooms found on this floor.</Text>
                  ) : (
                    <>
                      {availableRooms.map(room => {
                        const statusColor = getRoomStatusColor(room.status);
                        const isSelected = selectedRoom?.id === room.id;
                        return (
                          <TouchableOpacity
                            key={room.id}
                            style={[
                              styles.wizardCard,
                              isSelected && { borderColor: Colors.primary, borderWidth: 2, backgroundColor: Colors.primaryLight + '30' },
                            ]}
                            onPress={() => setSelectedRoom(isSelected ? null : room)}
                            activeOpacity={0.75}
                          >
                            <View style={styles.wizardCardIcon}>
                              <Avatar.Icon size={44} icon="door" style={{ backgroundColor: statusColor + '20' }} color={statusColor} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.wizardCardTitle}>Room {room.roomNumber}</Text>
                              <Text style={styles.wizardCardSub}>{room.sharing}-Sharing · {room.hasAC ? 'AC' : 'Non-AC'}</Text>
                            </View>
                            <Chip
                              style={{ backgroundColor: statusColor + '20' }}
                              textStyle={{ color: statusColor, fontSize: 11, fontWeight: '700' }}
                            >
                              {room.status === 'full' ? 'Full' : room.status === 'partial' ? 'Partial' : 'Vacant'}
                            </Chip>
                          </TouchableOpacity>
                        );
                      })}
                      {selectedRoom && (
                        <Button
                          mode="contained"
                          onPress={handleExecuteTransfer}
                          buttonColor={Colors.primary}
                          style={{ margin: 16, borderRadius: 14 }}
                          contentStyle={{ paddingVertical: 8 }}
                          loading={updating}
                          disabled={updating}
                          icon="swap-horizontal"
                        >
                          Move to Room {selectedRoom.roomNumber}
                        </Button>
                      )}
                    </>
                  )}
                </ScrollView>
              </Animated.View>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- Document Viewer Modal --- */}
      <Modal visible={modalVisible} transparent={true} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalCloseArea} onPress={() => setModalVisible(false)} />
          <View style={[styles.modalContent, { minHeight: '60%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Verified Tenant ID Document</Text>
              <IconButton icon="close" size={24} iconColor={Colors.textDark} onPress={() => setModalVisible(false)} />
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
  container: { flex: 1, backgroundColor: Colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  backBtn: { backgroundColor: Colors.cardBg, borderRadius: 12, elevation: 1, padding: 4 },
  editBtn: { backgroundColor: Colors.primaryLight, borderRadius: 12, padding: 4 },
  headerTitle: { fontWeight: '700', color: Colors.textDark, fontSize: 18 },
  scroll: { padding: 16, paddingBottom: 60 },
  infoCard: { backgroundColor: Colors.cardBg, borderRadius: 20, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 24, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  avatarContainer: { position: 'relative', marginBottom: 16 },
  statusIndicator: { position: 'absolute', bottom: 4, right: 4, width: 20, height: 20, borderRadius: 10, borderWidth: 3, borderColor: Colors.cardBg },
  name: { fontWeight: '800', color: Colors.textDark, marginBottom: 4, fontSize: 24 },
  roomText: { color: Colors.textLight, fontWeight: '600', marginBottom: 20, fontSize: 15 },
  quickActionRow: { flexDirection: 'row', gap: 16 },
  quickActionBtn: { backgroundColor: Colors.inputBg, borderRadius: 16, borderWidth: 1, borderColor: Colors.border },
  sectionHeader: { fontSize: 13, fontWeight: '700', color: Colors.textLight, marginBottom: 10, marginLeft: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, width: '100%' },
  documentContainer: { paddingVertical: 12, width: '100%' },
  documentHeader: { marginBottom: 8 },
  docActionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  viewBtn: { backgroundColor: Colors.primaryLight, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, flex: 1, alignItems: 'center', marginRight: 12 },
  viewBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },
  uploadBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.primary, paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  uploadBtnText: { color: Colors.primary, fontWeight: '600' },
  iconActionBtn: { backgroundColor: Colors.inputBg, borderRadius: 8, padding: 2, borderWidth: 1, borderColor: Colors.border },
  iconBox: { backgroundColor: Colors.primaryLight, borderRadius: 12, marginRight: 16, padding: 4 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: Colors.textLight, fontWeight: '500', marginBottom: 2 },
  infoValue: { fontSize: 15, color: Colors.textDark, fontWeight: '600' },
  divider: { backgroundColor: Colors.border, height: 1, marginLeft: 56, width: '100%' },
  emptyText: { padding: 16, textAlign: 'center', color: Colors.textLight, fontStyle: 'italic', fontSize: 14 },
  timelineItem: { flexDirection: 'row', minHeight: 70, width: '100%' },
  timelineGraphic: { width: 30, alignItems: 'center', paddingTop: 14 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary, zIndex: 2 },
  timelineLine: { width: 2, flex: 1, backgroundColor: Colors.primaryLight, marginTop: 4 },
  timelineContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, marginLeft: 12, paddingTop: 10 },
  timelineRoom: { fontSize: 16, fontWeight: '700', color: Colors.textDark },
  timelineDate: { fontSize: 13, color: Colors.textLight, marginTop: 2 },
  // Document viewer modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center' },
  modalCloseArea: { flex: 1 },
  modalContent: { backgroundColor: Colors.cardBg, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textDark },
  documentImage: { width: '100%', height: 400, borderRadius: 16, backgroundColor: Colors.inputBg },
  // ─── Wizard styles ───
  wizardSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.cardBg,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    height: '80%',
    paddingTop: 8,
    overflow: 'hidden',
  },
  wizardHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  wizardBackBtn: { padding: 4 },
  wizardTitle: { fontSize: 17, fontWeight: '800', color: Colors.textDark, textAlign: 'center' },
  wizardSubtitle: { fontSize: 12, color: Colors.textLight, fontWeight: '500', marginTop: 2 },
  stepDots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 12 },
  dot: { height: 6, width: 6, borderRadius: 3, backgroundColor: Colors.border },
  wizardScroll: { paddingHorizontal: 16, paddingBottom: 40 },
  wizardEmpty: { textAlign: 'center', color: Colors.textLight, marginTop: 40, fontStyle: 'italic', fontSize: 15 },
  wizardCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.background, borderRadius: 16,
    padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  wizardCardIcon: { marginRight: 14 },
  wizardCardTitle: { fontSize: 16, fontWeight: '700', color: Colors.textDark },
  wizardCardSub: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
});

export default TenantProfile;
