import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, ActivityIndicator, Alert, Modal, Image, Linking, StatusBar, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import FileViewer from 'react-native-file-viewer';
import { Text, IconButton, Avatar, Divider, Button, Surface, Switch, TextInput } from 'react-native-paper';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import storage from '@react-native-firebase/storage';
import { pick, types, keepLocalCopy } from '@react-native-documents/picker';
import { updateSalaryStatus } from '../../services/staffService';

const colors = {
  primary: '#6200EE', primaryLight: '#F3E5F5', background: '#F8FAFC', cardBg: '#FFFFFF', 
  textDark: '#1E293B', textLight: '#64748B',
  success: '#10B981', warning: '#F59E0B', error: '#EF4444', border: '#E2E8F0', pink: '#CF6679'
};

const StaffDetails = ({ navigation, route }) => {
  const { staff: initialStaff } = route.params || {};

  const [staff, setStaff] = useState(initialStaff);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  
  const [isBlockModalVisible, setBlockModalVisible] = useState(false);
  const [availableBlocks, setAvailableBlocks] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({
    salary: '',
    phone: '',
    shift: '',
    emergencyContact: '',
    address: '',
  });

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // --- 1. REAL-TIME DATA SYNC ---
  useEffect(() => {
    if (!initialStaff?.id) {
      setLoading(false);
      return;
    }

    const subscriber = firestore()
      .collection('staff')
      .doc(initialStaff.id)
      .onSnapshot(
        documentSnapshot => {
          if (documentSnapshot.exists) {
            const d = documentSnapshot.data();
            setStaff({ id: documentSnapshot.id, ...d });
            // Sync edit form with latest data
            setEditForm({
              salary: String(d.salary || ''),
              phone: d.phone || '',
              shift: d.shift || '',
              emergencyContact: d.emergencyContact || '',
              address: d.address || '',
            });
          }
          setLoading(false);
        },
        err => {
          console.error("Error fetching staff:", err);
          setLoading(false);
        }
      );
      
    return () => subscriber(); 
  }, [initialStaff?.id]);

  // --- FETCH BLOCKS (with ownerId filter to satisfy security rules) ---
  useEffect(() => {
    const fetchBlocks = async () => {
      try {
        const ownerId = auth().currentUser?.uid;
        if (!ownerId) return;
        const snap = await firestore().collection('blocks')
          .where('ownerId', '==', ownerId)
          .get();
        const fetched = snap.docs.map(doc => doc.data().name);
        setAvailableBlocks(['Unassigned', ...fetched]);
      } catch (e) {
        console.error("Error fetching blocks", e);
      }
    };
    fetchBlocks();
  }, []);

  // --- 2. KYC DOCUMENT UPLOAD (FIREBASE STORAGE) ---
  const handleUploadDocument = async () => {
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
                  destination: 'documentDirectory' // Store permanently on device
                });
                
                if (copyResult && copyResult[0] && copyResult[0].status === 'success') {
                  uploadUri = copyResult[0].localUri;
                } else {
                  throw new Error(copyResult[0]?.copyError || 'Failed to prepare local file for upload.');
                }
                
                await firestore().collection('staff').doc(staff.id).update({
                  idDocumentUrl: uploadUri,
                  idDocumentPath: `local_documents/${staff.id}/${res.name}`
                });
                Alert.alert("Success", "Document saved to local device.");
              } catch (err) {
                console.error('Save Error:', err);
                Alert.alert("Save Failed", "Issue saving the document locally.");
              } finally {
                setUpdating(false);
              }
            }
          }
        ]
      );
    } catch (err) {
      if (!err?.message?.toLowerCase().includes('cancel')) {
        Alert.alert("Error", "Could not open file picker.");
      }
    }
  };

  const handleDeleteDocument = () => {
    Alert.alert("Delete Document", "Permanently remove this ID proof?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          setUpdating(true);
          try {
            if (staff.idDocumentPath) {
              try {
                await storage().ref(staff.idDocumentPath).delete();
              } catch (e) {
                console.warn('Ignoring delete error:', e);
              }
            }
            await firestore().collection('staff').doc(staff.id).update({
              idDocumentUrl: firestore.FieldValue.delete(),
              idDocumentPath: firestore.FieldValue.delete()
            });
          } catch (err) {
            Alert.alert("Error", "Failed to delete document.");
          } finally {
            setUpdating(false);
          }
      }}
    ]);
  };

  const handlePasswordReset = (email) => {
    if (!email) {
      Alert.alert('No Email', 'This staff member does not have an email address on file.');
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

  // --- 3. BLOCK HISTORY TIMELINE LOGIC ---
  const handleReassignBlock = async (newBlock) => {
    if (!staff?.id) return;
    if (newBlock === staff.block) {
      setBlockModalVisible(false);
      return;
    }
    
    setUpdating(true);
    try {
      const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      let currentHistory = Array.isArray(staff.blockHistory) ? [...staff.blockHistory] : [];
      
      // Determine when they joined the current block
      let joinedDate = staff.currentBlockJoinedDate || staff.joinedDate || 'Unknown';

      // Push old block to history
      if (staff.block) {
        currentHistory.push({
          historyId: Date.now().toString(),
          block: staff.block,
          joined: joinedDate,
          left: today
        });
      }

      // Update Firebase
      await firestore().collection('staff').doc(staff.id).update({ 
        block: newBlock,
        blockHistory: currentHistory,
        currentBlockJoinedDate: today
      });
      
      setBlockModalVisible(false);
    } catch (error) {
      Alert.alert("Error", "Failed to reassign block.");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteHistory = (historyItem) => {
    Alert.alert("Delete Record", `Remove history for Block ${historyItem.block}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          setUpdating(true);
          try {
            const currentHistory = staff.blockHistory || [];
            const newHistory = currentHistory.filter(h => h.historyId !== historyItem.historyId);
            await firestore().collection('staff').doc(staff.id).update({ blockHistory: newHistory });
          } catch (err) {
            Alert.alert("Error", "Could not delete record.");
          } finally {
            setUpdating(false);
          }
      }}
    ]);
  };

  // --- 4. ATTENDANCE ENGINE ---
  const markTodayAttendance = async (statusStr) => {
    setUpdating(true);
    try {
      const todayIso = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const currentAttendance = staff.attendance || {};
      
      await firestore().collection('staff').doc(staff.id).update({
        [`attendance.${todayIso}`]: statusStr
      });
    } catch (error) {
      Alert.alert("Error", "Could not mark attendance.");
    } finally {
      setUpdating(false);
    }
  };

  const toggleTaker = async () => {
    if(!staff?.id) return;
    await firestore().collection('staff').doc(staff.id).update({ isTaker: !staff.isTaker });
  };

  const handleSalaryPayment = async (status) => {
    Alert.alert(
      "Confirm Action",
      `Mark salary as ${status}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Yes", 
          onPress: async () => {
            setUpdating(true);
            try {
              const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
              await updateSalaryStatus({
                staffDocId: staff.id,
                staffName: staff.name,
                ownerId: auth().currentUser.uid,
                salary: Number(staff.salary || 0),
                salaryMonth: currentMonth,
                newStatus: status
              });
              Alert.alert("Success", `Salary marked as ${status}`);
            } catch (error) {
              console.error("Salary update error:", error);
              Alert.alert("Error", "Could not update salary status.");
            } finally {
              setUpdating(false);
            }
          } 
        }
      ]
    );
  };

  // --- 5. SAVE EDITABLE PROFILE FIELDS ---
  const handleSaveEdits = async () => {
    if (!staff?.id) return;
    const salaryNum = Number(editForm.salary);
    if (editForm.salary && isNaN(salaryNum)) {
      Alert.alert('Invalid Input', 'Salary must be a valid number.');
      return;
    }
    setUpdating(true);
    try {
      const updates = {};
      if (editForm.salary !== '') updates.salary = salaryNum;
      if (editForm.phone !== '') updates.phone = editForm.phone.trim();
      if (editForm.shift !== '') updates.shift = editForm.shift.trim();
      if (editForm.emergencyContact !== '') updates.emergencyContact = editForm.emergencyContact.trim();
      if (editForm.address !== '') updates.address = editForm.address.trim();

      await firestore().collection('staff').doc(staff.id).update(updates);
      setEditModalVisible(false);
      Alert.alert('Saved', 'Staff details updated successfully.');
    } catch (err) {
      Alert.alert('Error', 'Could not save changes.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading || !staff) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 12, color: colors.textLight }}>Loading Staff Profile...</Text>
      </View>
    );
  }

  const statusColor = staff.status === 'Paid' ? colors.success : colors.warning;
  const blockHistoryList = staff.blockHistory || [];

  // Generate last 7 days for Attendance visualizer
  const todayIso = new Date().toISOString().split('T')[0];
  const last7Days = Array.from({length: 7}, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const iso = d.toISOString().split('T')[0];
    const status = (staff.attendance && staff.attendance[iso]) ? staff.attendance[iso] : 'N/A';
    return { dateStr: `${d.getDate()}/${d.getMonth()+1}`, status, isToday: iso === todayIso };
  });
  const todayStatus = (staff.attendance && staff.attendance[todayIso]) ? staff.attendance[todayIso] : null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <View pointerEvents="none"><IconButton icon="arrow-left" size={24} iconColor={colors.textDark} style={{margin:0}} /></View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Staff Profile</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.primaryLight }]} onPress={() => setBlockModalVisible(true)}>
            <View pointerEvents="none"><IconButton icon="swap-horizontal" size={20} iconColor={colors.primary} style={{margin:0}} /></View>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.primaryLight }]} onPress={() => setEditModalVisible(true)}>
            <View pointerEvents="none"><IconButton icon="pencil" size={20} iconColor={colors.primary} style={{margin:0}} /></View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Profile Card */}
        <Surface style={styles.profileCard} elevation={1}>
          <Avatar.Text size={80} label={(staff.name || 'U').substring(0, 2).toUpperCase()} style={{ backgroundColor: statusColor + '20', marginBottom: 12 }} color={statusColor} />
          <Text style={styles.profileName}>{staff.name}</Text>
          <Text style={styles.profileId}>ID: {staff.staffId || 'ST-000'}</Text>
          
          <View style={styles.tagRow}>
             <Text style={styles.profileRole}>{Array.isArray(staff.roles) ? staff.roles.join(', ') : staff.role}</Text>
             <Text style={styles.dot}>•</Text>
             
             <View style={[styles.reassignButton, { paddingRight: 10 }]}>
                <Text style={styles.profileBlock} numberOfLines={1} ellipsizeMode="tail">
                  {!staff.block || staff.block === 'Unassigned' ? 'Unassigned' : `Block ${staff.block}`}
                </Text>
             </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 16, marginTop: 16 }}>
            <TouchableOpacity style={styles.quickActionBtn} onPress={() => { if (staff.phone) Linking.openURL(`tel:${staff.phone}`); else Alert.alert('No Phone', 'No phone number available.'); }}>
              <View pointerEvents="none"><IconButton icon="phone" size={22} iconColor={colors.primary} style={{ margin: 4 }} /></View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionBtn} onPress={() => { if (staff.phone) Linking.openURL(`sms:${staff.phone}`); else Alert.alert('No Phone', 'No phone number available.'); }}>
              <View pointerEvents="none"><IconButton icon="message-text" size={22} iconColor={colors.success} style={{ margin: 4 }} /></View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionBtn} onPress={() => { if (staff.email) Linking.openURL(`mailto:${staff.email}`); else Alert.alert('No Email', 'No email available.'); }}>
              <View pointerEvents="none"><IconButton icon="email" size={22} iconColor={colors.warning} style={{ margin: 4 }} /></View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionBtn} onPress={() => handlePasswordReset(staff.email)}>
              <View pointerEvents="none"><IconButton icon="key-variant" size={22} iconColor={colors.error} style={{ margin: 4 }} /></View>
            </TouchableOpacity>
          </View>
        </Surface>

        {/* --- SALARY PAYMENT SYSTEM --- */}
        <Text style={styles.sectionHeader}>Salary & Payment</Text>
        <Surface style={styles.infoCard} elevation={1}>
          <View style={[styles.documentHeader, { marginBottom: 15 }]}>
            <Text style={styles.infoLabel}>Monthly Salary</Text>
            <Text style={[styles.infoValue, { fontSize: 16, color: colors.primary, fontWeight: 'bold' }]}>
              ₹{staff.salary || '0'}
            </Text>
          </View>
          <View style={styles.documentHeader}>
            <Text style={styles.infoLabel}>Payment Status</Text>
            <Text style={[styles.infoValue, { fontSize: 13, color: statusColor, fontWeight: 'bold' }]}>
              {staff.status === 'Paid' ? 'Cleared' : 'Pending / Due'}
            </Text>
          </View>
          
          <Divider style={{ marginVertical: 12 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
             <Text style={{fontWeight: '600', color: colors.textDark, fontSize: 13}}>Mark Action:</Text>
             <View style={{flexDirection: 'row', gap: 10}}>
                <Button 
                  mode={staff.status === 'Paid' ? "contained" : "outlined"} 
                  compact 
                  buttonColor={staff.status === 'Paid' ? colors.success : undefined} 
                  textColor={staff.status === 'Paid' ? '#FFF' : colors.success} 
                  onPress={() => handleSalaryPayment('Cleared')} 
                  disabled={updating}
                >
                  Paid
                </Button>
                <Button 
                  mode={staff.status !== 'Paid' ? "contained" : "outlined"} 
                  compact 
                  buttonColor={staff.status !== 'Paid' ? colors.error : undefined} 
                  textColor={staff.status !== 'Paid' ? '#FFF' : colors.error} 
                  onPress={() => handleSalaryPayment('Pending')} 
                  disabled={updating}
                >
                  Pending
                </Button>
             </View>
          </View>
        </Surface>

        {/* --- DYNAMIC ATTENDANCE SYSTEM --- */}
        <View style={styles.sectionHeaderRow}>
           <Text style={styles.sectionHeader}>Attendance (Last 7 Days)</Text>
           <TouchableOpacity onPress={() => navigation.navigate('StaffAttendanceHistory', { staff })}>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>View Register</Text>
           </TouchableOpacity>
        </View>

        <Surface style={styles.infoCard} elevation={1}>
           <View style={styles.daysRow}>
             {last7Days.map((day, index) => {
               let dotColor = '#E2E8F0';
               let label = '-';
               if (day.status === 'Present' || day.status === 'P') { dotColor = colors.success; label = 'P'; }
               else if (day.status === 'Absent' || day.status === 'A') { dotColor = colors.error; label = 'A'; }
               else if (day.status === 'Leave' || day.status === 'L') { dotColor = colors.warning; label = 'L'; }

               return (
                 <View key={index} style={styles.dayCol}>
                   <Text style={[styles.dayLabel, day.isToday && {fontWeight: 'bold', color: colors.primary}]}>{day.isToday ? 'Today' : day.dateStr}</Text>
                   <View style={[styles.dayDot, { backgroundColor: dotColor }, day.isToday && {borderWidth: 2, borderColor: colors.primary}]} />
                   <Text style={[styles.statusLabel, { color: dotColor === '#E2E8F0' ? colors.textLight : dotColor }]}>{label}</Text>
                 </View>
               );
             })}
           </View>

           {/* Quick Action for Today */}
           <Divider style={{ marginVertical: 12 }} />
           <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{fontWeight: '600', color: colors.textDark, fontSize: 13}}>Mark Today:</Text>
              <View style={{flexDirection: 'row', gap: 10}}>
                 <Button mode={todayStatus === 'Present' ? "contained" : "outlined"} compact buttonColor={todayStatus === 'Present' ? colors.success : undefined} textColor={todayStatus === 'Present' ? '#FFF' : colors.success} onPress={() => markTodayAttendance('Present')} disabled={updating}>Present</Button>
                 <Button mode={todayStatus === 'Absent' ? "contained" : "outlined"} compact buttonColor={todayStatus === 'Absent' ? colors.error : undefined} textColor={todayStatus === 'Absent' ? '#FFF' : colors.error} onPress={() => markTodayAttendance('Absent')} disabled={updating}>Absent</Button>
              </View>
           </View>
        </Surface>

        {/* --- DOCUMENTS & KYC --- */}
        <Text style={styles.sectionHeader}>Documents & Verification</Text>
        <Surface style={styles.infoCard} elevation={1}>
          <View style={styles.documentHeader}>
            <Text style={styles.infoLabel}>ID Document</Text>
            <Text style={[styles.infoValue, { fontSize: 13, color: staff.idDocumentUrl ? colors.success : colors.textLight }]}>
              {staff.idDocumentUrl ? 'Verified & On File' : 'Pending Upload'}
            </Text>
          </View>

          {staff.idDocumentUrl ? (
            <View>
              <View style={styles.docActionsRow}>
                <TouchableOpacity style={styles.viewBtn} onPress={async () => {
                  try {
                    const cleanPath = staff.idDocumentUrl.replace(/^file:\/\//, '');
                    await FileViewer.open(cleanPath, { showOpenWithDialog: true });
                  } catch (e) {
                  Alert.alert('Cannot Open', `Error: ${e.message || e}\nPath: ${staff.idDocumentUrl}`);
                  console.log(e);
                }  
                }}>
                  <Text style={styles.viewBtnText}>View Document</Text>
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity style={styles.iconActionBtn} onPress={handleUploadDocument} disabled={updating}>
                    <View pointerEvents="none"><IconButton icon="upload" size={22} iconColor={colors.primary} style={{margin:0}} /></View>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconActionBtn} onPress={handleDeleteDocument} disabled={updating}>
                    <View pointerEvents="none"><IconButton icon="trash-can" size={22} iconColor={colors.error} style={{margin:0}} /></View>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 8, fontStyle: 'italic', textAlign: 'center' }}>
                Note: This document is stored securely on this device's local storage to save cloud costs. It can only be viewed from this specific device. Other details remain synced everywhere.
              </Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.uploadBtn} onPress={handleUploadDocument} disabled={updating}>
              <Text style={styles.uploadBtnText}>{updating ? 'Uploading...' : 'Upload ID Proof'}</Text>
            </TouchableOpacity>
          )}
        </Surface>

        {/* --- BLOCK HISTORY TIMELINE --- */}
        <Text style={styles.sectionHeader}>Assignment History</Text>
        <Surface style={styles.infoCard} elevation={1}>
          {staff.block && staff.block !== 'Unassigned' && (
             <View style={styles.timelineItem}>
               <View style={styles.timelineGraphic}>
                 <View style={[styles.timelineDot, { backgroundColor: colors.success }]} />
                 {blockHistoryList.length > 0 && <View style={styles.timelineLine} />}
               </View>
               <View style={styles.timelineContent}>
                 <View style={{ flex: 1 }}>
                   <Text style={styles.timelineRoom}>Block {staff.block}</Text>
                   <Text style={styles.timelineDate}>{staff.currentBlockJoinedDate || staff.joinedDate || 'Unknown'} to Present</Text>
                   <Text style={[styles.timelineDate, { color: colors.success, fontWeight: '700', marginTop: 4 }]}>Currently Active</Text>
                 </View>
               </View>
             </View>
          )}

          {blockHistoryList.length === 0 && (!staff.block || staff.block === 'Unassigned') ? (
            <Text style={styles.emptyText}>No assignment history on file.</Text>
          ) : (
            [...blockHistoryList].reverse().map((item, index) => (
              <View key={item.historyId || index} style={styles.timelineItem}>
                <View style={styles.timelineGraphic}>
                  <View style={styles.timelineDot} />
                  {index !== blockHistoryList.length - 1 && <View style={styles.timelineLine} />}
                </View>
                <View style={styles.timelineContent}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.timelineRoom}>Block {item.block}</Text>
                    <Text style={styles.timelineDate}>{item.joined} to {item.left}</Text>
                  </View>
                  <TouchableOpacity style={{ padding: 8 }} onPress={() => handleDeleteHistory(item)} disabled={updating}>
                    <View pointerEvents="none"><IconButton icon="trash-can-outline" size={20} iconColor={colors.error} style={{margin:0}} /></View>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </Surface>

        {/* --- NON-EDITABLE INFO (Locked Fields) --- */}
        <Text style={styles.sectionHeader}>Personal Details</Text>
        <Surface style={styles.infoCard} elevation={1}>
          <View style={styles.infoRow}>
            <View style={{ flex: 1 }}><Text style={styles.infoLabel}>Full Name (Locked)</Text><Text style={styles.infoValue}>{staff.name}</Text></View>
            <View style={{ flex: 1 }}><Text style={styles.infoLabel}>Staff ID (Locked)</Text><Text style={styles.infoValue}>{staff.staffId || 'ST-000'}</Text></View>
          </View>
          <Divider style={{ marginVertical: 12 }} />
          <View style={styles.infoRow}>
            <View style={{ flex: 1 }}><Text style={styles.infoLabel}>Aadhaar / ID No. (Locked)</Text><Text style={styles.infoValue}>{staff.idNumber || 'Not Provided'}</Text></View>
            <View style={{ flex: 1 }}><Text style={styles.infoLabel}>Joined Date (Locked)</Text><Text style={styles.infoValue}>{staff.joinedDate || 'Unknown'}</Text></View>
          </View>
        </Surface>

        {/* --- EDITABLE INFO --- */}
        <Text style={styles.sectionHeader}>Job & Contact</Text>
        <Surface style={styles.infoCard} elevation={1}>
           <View style={styles.infoRow}>
             <View style={{ flex: 1 }}><Text style={styles.infoLabel}>Monthly Salary</Text><Text style={styles.infoValue}>₹{staff.salary || '—'}</Text></View>
             <View style={{ flex: 1 }}><Text style={styles.infoLabel}>Shift</Text><Text style={styles.infoValue}>{staff.shift || '—'} Shift</Text></View>
           </View>
           <Divider style={{ marginVertical: 12 }} />
           <View style={styles.infoRow}>
             <View style={{ flex: 1 }}><Text style={styles.infoLabel}>Phone</Text><Text style={styles.infoValue}>{staff.phone || 'Not set'}</Text></View>
             <View style={{ flex: 1 }}><Text style={styles.infoLabel}>Emergency Contact</Text><Text style={styles.infoValue}>{staff.emergencyContact || 'Not set'}</Text></View>
           </View>
           {staff.address ? (
             <>
               <Divider style={{ marginVertical: 12 }} />
               <View><Text style={styles.infoLabel}>Address</Text><Text style={styles.infoValue}>{staff.address}</Text></View>
             </>
           ) : null}
           <Divider style={{ marginVertical: 12 }} />
           <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
             <View style={{flex: 1}}>
                <Text style={styles.infoValue}>Attendance Taker</Text>
                <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 2, maxWidth: '90%' }}>Allow staff to mark attendance for their assigned block.</Text>
             </View>
             <Switch value={staff.isTaker || false} onValueChange={toggleTaker} color={colors.primary} />
           </View>
        </Surface>

      </ScrollView>

      {/* --- EDIT PROFILE MODAL --- */}
      <Modal visible={isEditModalVisible} transparent={true} animationType="slide" onRequestClose={() => setEditModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' }}>
              <View style={[styles.docModalContent, { paddingBottom: 30 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={styles.modalTitle}>Edit Staff Details</Text>
                  <IconButton icon="close" size={22} iconColor={colors.textDark} onPress={() => setEditModalVisible(false)} />
                </View>
                <Text style={{ color: colors.textLight, fontSize: 12, marginBottom: 16 }}>Fields like name, Aadhaar and Staff ID cannot be changed.</Text>

                <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                  <Text style={styles.editSectionLabel}>SALARY & SHIFT</Text>
                  <TextInput
                    label="Monthly Salary (₹)"
                    value={editForm.salary}
                    onChangeText={(v) => setEditForm(f => ({ ...f, salary: v }))}
                    keyboardType="numeric"
                    mode="outlined"
                    style={styles.editInput}
                    outlineColor={colors.border}
                    activeOutlineColor={colors.primary}
                    textColor={colors.textDark}
                  />
                  <TextInput
                    label="Shift (e.g. Morning, Night)"
                    value={editForm.shift}
                    onChangeText={(v) => setEditForm(f => ({ ...f, shift: v }))}
                    mode="outlined"
                    style={styles.editInput}
                    outlineColor={colors.border}
                    activeOutlineColor={colors.primary}
                    textColor={colors.textDark}
                  />
                  <Text style={[styles.editSectionLabel, { marginTop: 8 }]}>CONTACT INFO</Text>
                  <TextInput
                    label="Phone Number"
                    value={editForm.phone}
                    onChangeText={(v) => setEditForm(f => ({ ...f, phone: v }))}
                    keyboardType="phone-pad"
                    mode="outlined"
                    style={styles.editInput}
                    outlineColor={colors.border}
                    activeOutlineColor={colors.primary}
                    textColor={colors.textDark}
                  />
                  <TextInput
                    label="Emergency Contact"
                    value={editForm.emergencyContact}
                    onChangeText={(v) => setEditForm(f => ({ ...f, emergencyContact: v }))}
                    keyboardType="phone-pad"
                    mode="outlined"
                    style={styles.editInput}
                    outlineColor={colors.border}
                    activeOutlineColor={colors.primary}
                    textColor={colors.textDark}
                  />
                  <TextInput
                    label="Address"
                    value={editForm.address}
                    onChangeText={(v) => setEditForm(f => ({ ...f, address: v }))}
                    multiline
                    numberOfLines={3}
                    mode="outlined"
                    style={styles.editInput}
                    outlineColor={colors.border}
                    activeOutlineColor={colors.primary}
                    textColor={colors.textDark}
                  />

                  <Button
                    mode="contained"
                    onPress={handleSaveEdits}
                    loading={updating}
                    disabled={updating}
                    buttonColor={colors.primary}
                    style={{ borderRadius: 12, marginTop: 16 }}
                    contentStyle={{ paddingVertical: 6 }}
                  >
                    Save Changes
                  </Button>
                </ScrollView>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- REASSIGN BLOCK MODAL --- */}
      <Modal visible={isBlockModalVisible} transparent={true} animationType="fade" onRequestClose={() => setBlockModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Surface style={styles.modalContent} elevation={5}>
            <Text style={styles.modalTitle}>Assign to Block</Text>
            <Divider style={{marginBottom: 10}} />
            <ScrollView style={{maxHeight: 300}}>
              {availableBlocks.map((b) => (
                 <TouchableOpacity key={b} style={styles.modalOption} onPress={() => handleReassignBlock(b)}>
                    <Text style={[styles.optionText, staff.block === b && styles.activeOption]}>
                      {b === 'Unassigned' ? 'Unassigned' : `Block ${b}`}
                    </Text>
                    {staff.block === b && <IconButton icon="check" size={20} iconColor={colors.pink} style={{margin:0}}/>}
                 </TouchableOpacity>
              ))}
            </ScrollView>
            <Button mode="text" onPress={() => setBlockModalVisible(false)} style={{marginTop: 15}} textColor={colors.textLight}>Cancel</Button>
          </Surface>
        </View>
      </Modal>

      {/* --- DOCUMENT VIEW MODAL --- */}
      <Modal visible={modalVisible} transparent={true} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalCloseArea} onPress={() => setModalVisible(false)} />
          <View style={[styles.docModalContent, { minHeight: '60%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={styles.modalTitle}>Verified ID Document</Text>
              <IconButton icon="close" size={24} iconColor={colors.textDark} onPress={() => setModalVisible(false)} />
            </View>
            {staff?.idDocumentUrl && (
              <Image source={{ uri: staff.idDocumentUrl }} style={styles.documentImage} resizeMode="contain" />
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 15, paddingHorizontal: 16, paddingBottom: 10 },
  backBtn: { backgroundColor: colors.cardBg, borderRadius: 12, elevation: 1, padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.textDark },
  scrollContent: { padding: 16, paddingBottom: 60 },
  
  profileCard: { backgroundColor: colors.cardBg, borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: colors.border },
  profileName: { fontSize: 22, fontWeight: 'bold', color: colors.textDark },
  profileId: { fontSize: 13, color: colors.textLight, marginTop: 4 },
  tagRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, flexWrap: 'wrap', justifyContent: 'center' },
  dot: { marginHorizontal: 8, color: colors.textLight },
  profileRole: { fontSize: 14, fontWeight: '600', color: colors.textDark },
  profileBlock: { fontSize: 14, fontWeight: 'bold', color: colors.pink, flexShrink: 1 },
  reassignButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#CF667915', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, flexShrink: 1, maxWidth: '70%' },
  quickActionBtn: { backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1, borderColor: colors.border },

  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginLeft: 4, marginTop: 5 },
  sectionHeader: { fontSize: 14, fontWeight: '700', color: colors.textLight, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginLeft: 4, marginTop: 15 },
  
  infoCard: { backgroundColor: colors.cardBg, borderRadius: 16, padding: 16, marginBottom: 15, borderWidth: 1, borderColor: colors.border },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { fontSize: 11, color: colors.textLight, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  infoValue: { fontSize: 15, fontWeight: '700', color: colors.textDark },

  // Attendance specific
  daysRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center' },
  dayLabel: { fontSize: 10, color: colors.textLight, marginBottom: 6 },
  dayDot: { width: 16, height: 16, borderRadius: 8, marginBottom: 6 },
  statusLabel: { fontSize: 11, fontWeight: 'bold' },

  // Document UI
  documentHeader: { marginBottom: 12 },
  docActionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  viewBtn: { backgroundColor: colors.primaryLight, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, flex: 1, alignItems: 'center', marginRight: 12 },
  viewBtnText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  uploadBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  uploadBtnText: { color: colors.primary, fontWeight: '600' },
  iconActionBtn: { backgroundColor: '#F8FAFC', borderRadius: 8, padding: 2, borderWidth: 1, borderColor: colors.border },

  // Timeline UI
  emptyText: { padding: 16, textAlign: 'center', color: colors.textLight, fontStyle: 'italic', fontSize: 13 },
  timelineItem: { flexDirection: 'row', minHeight: 70, width: '100%' },
  timelineGraphic: { width: 30, alignItems: 'center', paddingTop: 14 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary, zIndex: 2 },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#E2E8F0', marginTop: 4 },
  timelineContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, marginLeft: 12, paddingTop: 10 },
  timelineRoom: { fontSize: 15, fontWeight: '700', color: colors.textDark },
  timelineDate: { fontSize: 12, color: colors.textLight, marginTop: 2 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center' },
  modalCloseArea: { flex: 1, width: '100%' },
  modalContent: { width: '80%', padding: 20, backgroundColor: '#fff', borderRadius: 16 },
  docModalContent: { backgroundColor: colors.cardBg, padding: 20, width: '100%', borderTopLeftRadius: 24, borderTopRightRadius: 24, position: 'absolute', bottom: 0 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textDark, textAlign:'center' },
  modalOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  optionText: { fontSize: 15, color: colors.textDark, fontWeight: '500' },
  activeOption: { color: colors.pink, fontWeight: 'bold' },
  documentImage: { width: '100%', height: 400, borderRadius: 12, backgroundColor: '#F1F5F9' },
  editInput: { backgroundColor: '#FFF', marginBottom: 12 },
  editSectionLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 4 },
});

export default StaffDetails;