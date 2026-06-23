import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { Text, TextInput, Button, Surface, IconButton, Switch, Chip, useTheme, Divider } from 'react-native-paper';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import firebase from '@react-native-firebase/app';

const UploadRow = ({ label, file, onUpload }) => {
  return (
    <View style={styles.uploadRow}>
      <View style={{flex: 1}}>
        <Text style={styles.uploadLabel}>{label}</Text>
        <Text style={[styles.uploadStatus, file && { color: '#10B981' }]}>{file ? "File Selected" : "No file chosen"}</Text>
      </View>
      <TouchableOpacity style={[styles.uploadBtn, file && { borderColor: '#10B981', backgroundColor: '#E8F5E9' }]} onPress={onUpload}>
        <IconButton icon={file ? "check" : "upload"} size={20} iconColor={file ? "#10B981" : "#CF6679"} style={{ margin: 0 }} />
        {!file && <Text style={{ color: '#CF6679', fontWeight: 'bold', fontSize: 12, marginRight: 8 }}>Upload</Text>}
      </TouchableOpacity>
    </View>
  );
};

const AddStaff = ({ navigation }) => {
  const theme = useTheme();

  // --- STATE ---
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [gender, setGender] = useState('');
  
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [block, setBlock] = useState('');
  const [blocks, setBlocks] = useState([]);
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [salary, setSalary] = useState('');
  const [shift, setShift] = useState('');
  const [isTaker, setIsTaker] = useState(false);
  const [loading, setLoading] = useState(false);

  const [docs, setDocs] = useState({
    aadhaar: null,
    policeVer: null,
    photo: null
  });

  const genders = ['Male', 'Female', 'Other'];
  const availableRoles = ['Warden', 'Security', 'Cook', 'Cleaning', 'Manager'];

  // --- DATABASE FETCHING LOGIC ---
  const fetchBlocksFromDatabase = async () => {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) return; // Safety check

      // ISOLATED TO CURRENT OWNER
      const snapshot = await firestore().collection('blocks')
        .where('ownerId', '==', currentUser.uid)
        .get();

      const fetchedBlocks = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || data.hostelName || data.blockName || `Block ${doc.id}`
        };
      });
      setBlocks(fetchedBlocks);
    } catch (error) {
      console.error("Firebase fetch error:", error);
      Alert.alert("Error", "Could not load real hostel names from database.");
    } finally {
      setIsLoadingBlocks(false);
    }
  };

  useEffect(() => {
    fetchBlocksFromDatabase();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBlocksFromDatabase();
    setRefreshing(false);
  }, []);

  // --- HANDLERS ---
  const toggleRole = (role) => {
    setSelectedRoles((prevRoles) => {
      if (prevRoles.includes(role)) return prevRoles.filter((r) => r !== role);
      return [...prevRoles, role];
    });
  };

  const handleDocumentUpload = (docType) => {
    Alert.alert("Upload Document", `Select a file for ${docType}`, [
      { text: "Cancel", style: "cancel" },
      { text: "Choose File", onPress: () => setDocs(prev => ({ ...prev, [docType]: { name: `${docType}.pdf`, uri: 'dummy-uri' } })) }
    ]);
  };

  const generatePassword = () => 'Staff' + Math.floor(100000 + Math.random() * 900000) + '!';

  const handleSubmit = async () => {
    if (!name || !email || !phone || !gender || selectedRoles.length === 0 || !salary) {
      Alert.alert("Missing Fields", "Please fill in all required fields including Email.");
      return;
    }
    
    setLoading(true);
    const primaryRole = selectedRoles[0];
    const generatedStaffId = `${primaryRole.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const generatedPassword = generatePassword();
    const currentOwner = auth().currentUser;

    try {
      // 1. Secondary App Trick for Auth Creation
      let secondaryApp;
      try {
        secondaryApp = firebase.app('SecondaryApp');
      } catch (e) {
        // Grab the current options
        const currentOptions = firebase.app().options;
        
        // Initialize with a fallback databaseURL to bypass strict validation
        secondaryApp = await firebase.initializeApp({
          ...currentOptions,
          databaseURL: currentOptions.databaseURL || 'https://dummy-url.firebaseio.com'
        }, 'SecondaryApp');
      }
      
      const secondaryAuth = auth(secondaryApp);
      const userCredential = await secondaryAuth.createUserWithEmailAndPassword(email.toLowerCase().trim(), generatedPassword);
      const newStaffUid = userCredential.user.uid;

      await secondaryAuth.signOut();
      await secondaryApp.delete();

      // 2. Setup Routing Doc in 'users' collection
      await firestore().collection('users').doc(newStaffUid).set({
        role: 'Staff',
        ownerId: currentOwner.uid,
        email: email.toLowerCase().trim(),
        createdAt: firestore.FieldValue.serverTimestamp()
      });

      // 3. Setup Full Profile in 'staff' collection
      const newStaff = {
        uid: newStaffUid,
        ownerId: currentOwner.uid,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        emergencyContact: emergencyContact.trim(),
        gender,
        roles: selectedRoles,
        block: block || 'Unassigned',
        salary: Number(salary),
        shift: shift.trim(),
        isTaker,
        staffId: generatedStaffId,
        status: 'Active',
        attendance: 'Absent',
        createdAt: firestore.FieldValue.serverTimestamp()
      };

      await firestore().collection('staff').doc(newStaffUid).set(newStaff);

      Alert.alert(
        "Staff Created Successfully!",
        `Give these login details to ${name}:\n\nEmail: ${email}\nPassword: ${generatedPassword}`,
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error("Error adding staff to Firebase:", error);
      Alert.alert("Error", error.message || "Could not save staff.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#CF6679" />
      
      <View style={styles.header}>
        <IconButton icon="arrow-left" iconColor="#fff" size={24} onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Add New Staff</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#CF6679"]} />
        }
      >
        
        {/* SECTION 1: PERSONAL INFO */}
        <Text style={styles.sectionTitle}>Personal Details</Text>
        <Surface style={styles.card} elevation={1}>
          <TextInput label="Full Name *" value={name} onChangeText={setName} mode="outlined" style={styles.input} left={<TextInput.Icon icon="account" />} />
          <TextInput label="Email Address *" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" mode="outlined" style={styles.input} left={<TextInput.Icon icon="email" />} />
          <TextInput label="Phone Number *" value={phone} onChangeText={setPhone} mode="outlined" keyboardType="phone-pad" style={styles.input} left={<TextInput.Icon icon="phone" />} />
          <TextInput label="Emergency Contact Number" value={emergencyContact} onChangeText={setEmergencyContact} mode="outlined" keyboardType="phone-pad" style={styles.input} left={<TextInput.Icon icon="phone-alert" />} />

          <Text style={[styles.subLabel, { marginTop: 10 }]}>Gender *:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {genders.map((g) => (
              <Chip key={g} selected={gender === g} onPress={() => setGender(g)} style={[styles.chip, gender === g && { backgroundColor: '#CF6679' }]} textStyle={{ color: gender === g ? '#fff' : '#333' }}>
                {g}
              </Chip>
            ))}
          </ScrollView>
        </Surface>

        {/* SECTION 2: JOB ROLE */}
        <Text style={styles.sectionTitle}>Job Role & Assignment</Text>
        <Surface style={styles.card} elevation={1}>
          <Text style={styles.subLabel}>Select Role (Multiple allowed) *:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {availableRoles.map((r) => {
              const isSelected = selectedRoles.includes(r);
              return (
                <Chip key={r} selected={isSelected} onPress={() => toggleRole(r)} style={[styles.chip, isSelected && { backgroundColor: '#CF6679' }]} textStyle={{ color: isSelected ? '#fff' : '#333' }}>
                  {r}
                </Chip>
              );
            })}
          </ScrollView>

          <Text style={styles.subLabel}>Assign Block:</Text>
          {isLoadingBlocks ? (
             <ActivityIndicator size="small" color="#CF6679" style={{ alignSelf: 'flex-start', marginVertical: 10 }} />
          ) : blocks.length === 0 ? (
             <Text style={{color: '#999', fontSize: 12, marginBottom: 10}}>No blocks found in DB. Pull down to refresh.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {blocks.map((b) => (
                <Chip key={b.id} selected={block === b.name} onPress={() => setBlock(b.name)} style={[styles.chip, block === b.name && { backgroundColor: '#4F46E5' }]} textStyle={{ color: block === b.name ? '#fff' : '#333' }}>
                  {b.name}
                </Chip>
              ))}
            </ScrollView>
          )}
        </Surface>

        {/* SECTION 3: SALARY & SHIFT */}
        <Text style={styles.sectionTitle}>Compensation & Timing</Text>
        <Surface style={styles.card} elevation={1}>
          <View style={styles.row}>
            <TextInput label="Monthly Salary (₹) *" value={salary} onChangeText={setSalary} mode="outlined" keyboardType="numeric" style={[styles.input, { flex: 1, marginRight: 10 }]} left={<TextInput.Icon icon="cash" />} />
            <TextInput label="Shift (e.g. 9am-5pm)" value={shift} onChangeText={setShift} mode="outlined" style={[styles.input, { flex: 1 }]} left={<TextInput.Icon icon="clock-outline" />} />
          </View>
        </Surface>

        {/* SECTION 4: PERMISSIONS */}
        <Text style={styles.sectionTitle}>Permissions</Text>
        <Surface style={styles.card} elevation={1}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>Attendance Taker</Text>
              <Text style={styles.switchDesc}>Allow this staff member to mark attendance for their assigned block.</Text>
            </View>
            <Switch value={isTaker} onValueChange={setIsTaker} trackColor={{ false: "#E0E0E0", true: "#CF6679" }} thumbColor={"#fff"} />
          </View>
        </Surface>

        {/* SECTION 5: KYC DOCUMENTS */}
        <Text style={styles.sectionTitle}>KYC Documents</Text>
        <Surface style={styles.card} elevation={1}>
          <UploadRow label="ID Card (Front & Back)" file={docs.aadhaar} onUpload={() => handleDocumentUpload('aadhaar')} />
          <Divider style={{ marginVertical: 8 }} />
          <UploadRow label="Police Verification Form" file={docs.policeVer} onUpload={() => handleDocumentUpload('policeVer')} />
          <Divider style={{ marginVertical: 8 }} />
          <UploadRow label="Staff Photograph" file={docs.photo} onUpload={() => handleDocumentUpload('photo')} />
        </Surface>

        <Button mode="contained" onPress={handleSubmit} loading={loading} disabled={loading} style={styles.submitBtn} contentStyle={{ paddingVertical: 5 }} labelStyle={{ fontSize: 18, fontWeight: 'bold' }}>
          {loading ? "Saving Staff..." : "Add Staff Member"}
        </Button>
        <View style={{ height: 30 }} />

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { backgroundColor: '#CF6679', paddingTop: 40, paddingBottom: 20, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', elevation: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginLeft: 10 },
  scrollContent: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#555', marginBottom: 10, marginTop: 5, marginLeft: 5 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 20 },
  input: { backgroundColor: '#fff', marginBottom: 12 },
  subLabel: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 8 },
  chipRow: { flexDirection: 'row', marginBottom: 15 },
  chip: { marginRight: 8, backgroundColor: '#f0f0f0' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  switchDesc: { fontSize: 12, color: '#888', marginTop: 2 },
  uploadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 5 },
  uploadLabel: { fontSize: 14, fontWeight: '600', color: '#333' },
  uploadStatus: { fontSize: 12, color: '#999' },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#CF6679', borderRadius: 8, paddingHorizontal: 0 },
  submitBtn: { backgroundColor: '#CF6679', borderRadius: 12, marginTop: 10, elevation: 4 },
});

export default AddStaff;