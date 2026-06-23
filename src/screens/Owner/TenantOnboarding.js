import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Surface, IconButton, Divider, SegmentedButtons } from 'react-native-paper';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import firebase from '@react-native-firebase/app';
import { useHostel } from '../../context/HostelContext';

const colors = {
  primary: '#4c669f', background: '#F5F7FA', cardBg: '#FFFFFF',
  textDark: '#1F2937', textLight: '#6B7280', border: '#E5E7EB',
  success: '#10B981', uploadBg: '#EEF2FF', uploadBorder: '#6366F1'
};

const UploadRow = ({ label, file, onUpload }) => {
  return (
    <View style={styles.uploadRow}>
      <View style={styles.uploadInfo}>
        <Text style={styles.uploadLabel}>{label}</Text>
        <Text style={[styles.uploadStatus, file && { color: colors.success }]}>
          {file ? file.name : "No file chosen"}
        </Text>
      </View>
      <TouchableOpacity 
        style={[styles.uploadBtn, file && { backgroundColor: '#E0F2F1', borderColor: colors.success }]} 
        onPress={onUpload}
      >
        <IconButton 
          icon={file ? "check" : "cloud-upload"} 
          size={20} 
          iconColor={file ? colors.success : colors.primary} 
        />
        {!file && <Text style={styles.uploadBtnText}>Upload</Text>}
      </TouchableOpacity>
    </View>
  );
};

const TenantOnboarding = ({ navigation, route }) => {
  const { roomId, blockId } = route.params || {};
  const { pricingMatrix, getRoomDetails } = useHostel();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('Male');
  
  const [workplace, setWorkplace] = useState('');
  const [permAddress, setPermAddress] = useState('');
  
  const [idProofNumber, setIdProofNumber] = useState('');
  const [rentAmount, setRentAmount] = useState('');
  const [suggestedRent, setSuggestedRent] = useState(null);
  const [deposit, setDeposit] = useState('');

  const [loading, setLoading] = useState(false);

  const [docs, setDocs] = useState({
    aadhaar: null,
    agreement: null,
    workId: null
  });

  useEffect(() => {
    const fetchSuggestedRent = async () => {
      if (roomId && blockId && pricingMatrix) {
        const roomData = await getRoomDetails(blockId, roomId);
        if (roomData) {
          const acKey = roomData.hasAC ? 'AC' : 'NonAC';
          const basePrice = pricingMatrix[blockId]?.[roomData.sharing]?.[acKey];
          
          if (basePrice) {
            setSuggestedRent(basePrice.toString());
            if (!rentAmount) setRentAmount(basePrice.toString());
          }
        }
      }
    };
    fetchSuggestedRent();
  }, [roomId, blockId, pricingMatrix, getRoomDetails]);

  const handleUpload = (docType) => {
    Alert.alert(
      "Select File", `Choose a PDF for ${docType}`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Select PDF", onPress: () => setDocs(prev => ({ ...prev, [docType]: { name: `${docType}_scan.pdf`, uri: '...' } })) }
      ]
    );
  };

  const generatePassword = () => 'Tenant' + Math.floor(100000 + Math.random() * 900000) + '!';

  const handleOnboard = async () => {
    if (!name || !phone || !email || !rentAmount || !deposit || !idProofNumber) {
      Alert.alert("Missing Details", "Please fill in Name, Phone, Email, Rent, Deposit, and ID Proof.");
      return;
    }
    
    setLoading(true);

    try {
      const trimmedIdProof = idProofNumber.trim();
      const currentOwner = auth().currentUser;

      // 1. Perform Duplicate & Room Capacity Checks (ISOLATED TO CURRENT OWNER)
      const duplicateCheck = await firestore().collection('tenants')
        .where('ownerId', '==', currentOwner.uid)
        .where('idProofNumber', '==', trimmedIdProof)
        .get();

      if (!duplicateCheck.empty) {
        Alert.alert("Duplicate Tenant Found", "A student with this ID Proof already exists in your hostels.");
        setLoading(false);
        return;
      }

      if (roomId) {
        const parsedRoomId = parseInt(roomId, 10);
        const roomQuery = await firestore().collection('rooms')
          .where('ownerId', '==', currentOwner.uid)
          .where('blockName', '==', blockId)
          .where('roomNumber', '==', parsedRoomId)
          .get();

        if (roomQuery.empty) {
          Alert.alert("Error", "Room not found in database.");
          setLoading(false); return;
        }
        
        const roomDoc = roomQuery.docs[0];
        const maxSharing = roomDoc.data().sharing || 1;
        
        const tenantsQuery = await firestore().collection('tenants')
          .where('ownerId', '==', currentOwner.uid)
          .where('blockId', '==', blockId)
          .where('roomNumber', '==', parsedRoomId)
          .get();

        if (tenantsQuery.size >= maxSharing) {
          Alert.alert("Room is Full", `This room only allows ${maxSharing} student(s).`);
          setLoading(false); return;
        }
      }

      // 2. Secondary App Trick for Auth Creation
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
      const generatedPassword = generatePassword();
      const userCredential = await secondaryAuth.createUserWithEmailAndPassword(email.toLowerCase().trim(), generatedPassword);
      
      const newTenantUid = userCredential.user.uid;

      // Clean up the secondary app instance
      await secondaryAuth.signOut();
      await secondaryApp.delete()

      // 3. Save Routing Profile to 'users' collection
      await firestore().collection('users').doc(newTenantUid).set({
        role: 'Tenant',
        ownerId: currentOwner.uid,
        email: email.toLowerCase().trim(),
        createdAt: firestore.FieldValue.serverTimestamp()
      });

      // 4. Save Full Profile to 'tenants' collection
      const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

      const newTenant = {
        uid: newTenantUid,
        ownerId: currentOwner.uid,
        name: name.trim(),
        phone: phone.trim(),
        email: email.toLowerCase().trim(),
        gender: gender, 
        workplace: workplace.trim(),
        permAddress: permAddress.trim(),
        idProofNumber: trimmedIdProof, 
        rentAmount: Number(rentAmount), 
        agreedRent: Number(rentAmount), 
        deposit: Number(deposit),
        balance: 0, 
        roomNumber: roomId ? parseInt(roomId, 10) : null, 
        blockId: blockId || 'A',
        rentStatus: roomId ? 'Pending' : 'Unassigned',
        joined: today,
        image: null, 
        createdAt: firestore.FieldValue.serverTimestamp(),
      };

      await firestore().collection('tenants').doc(newTenantUid).set(newTenant);

      // 5. Update Room Status if applicable (ISOLATED TO CURRENT OWNER)
      if (roomId) {
        const parsedRoomId = parseInt(roomId, 10);
        const roomQuery = await firestore().collection('rooms')
          .where('ownerId', '==', currentOwner.uid)
          .where('blockName', '==', blockId)
          .where('roomNumber', '==', parsedRoomId)
          .get();

        const roomDoc = roomQuery.docs[0];
        const maxSharing = roomDoc.data().sharing || 1;

        const tenantsQuery = await firestore().collection('tenants')
          .where('ownerId', '==', currentOwner.uid)
          .where('blockId', '==', blockId)
          .where('roomNumber', '==', parsedRoomId)
          .get();
        
        let newStatus = 'partial'; 
        if (tenantsQuery.size >= maxSharing) newStatus = 'full'; 
        await roomDoc.ref.update({ status: newStatus });
      }

      Alert.alert(
        "Tenant Onboarded Successfully!", 
        `Give these login details to ${name}:\n\nEmail: ${email}\nPassword: ${generatedPassword}`,
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
      
    } catch (error) {
      console.error("Error onboarding tenant: ", error);
      Alert.alert("Error", `Could not save tenant: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      <Surface style={styles.header} elevation={4}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
           <IconButton icon="arrow-left" iconColor="#fff" size={24} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>New Tenant</Text>
          <Text style={styles.headerSubtitle}>
            {roomId ? `Adding to Block ${blockId || 'A'}, Room ${roomId}` : 'Adding to Unassigned Pool'}
          </Text>
        </View>
      </Surface>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex: 1}}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <Text style={styles.sectionHeader}>Personal Details</Text>
          <Surface style={styles.sectionCard} elevation={1}>
            <TextInput label="Full Name *" value={name} onChangeText={setName} mode="outlined" style={styles.input} left={<TextInput.Icon icon="account" />} textColor={colors.textDark} activeOutlineColor={colors.primary} />
            <TextInput label="Email Address *" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" mode="outlined" style={styles.input} left={<TextInput.Icon icon="email" />} textColor={colors.textDark} activeOutlineColor={colors.primary} />
            <TextInput label="Phone Number *" value={phone} onChangeText={setPhone} mode="outlined" keyboardType="phone-pad" style={styles.input} left={<TextInput.Icon icon="phone" />} textColor={colors.textDark} activeOutlineColor={colors.primary} />
            
            <Text style={styles.fieldLabel}>Gender</Text>
            <SegmentedButtons
              value={gender}
              onValueChange={setGender}
              buttons={[
                { value: 'Male', label: 'Male', icon: 'gender-male' },
                { value: 'Female', label: 'Female', icon: 'gender-female' },
              ]}
              theme={{ colors: { onSurface: colors.textDark, secondaryContainer: '#E8EAF6', onSecondaryContainer: colors.primary } }}
              style={{marginTop: 5, marginBottom: 5}}
            />
          </Surface>

          <Text style={styles.sectionHeader}>Background Info</Text>
          <Surface style={styles.sectionCard} elevation={1}>
             <TextInput label="Workplace / College" value={workplace} onChangeText={setWorkplace} mode="outlined" style={styles.input} left={<TextInput.Icon icon="briefcase" />} textColor={colors.textDark} activeOutlineColor={colors.primary}/>
            <TextInput label="Permanent Address" value={permAddress} onChangeText={setPermAddress} mode="outlined" multiline style={[styles.input, { height: 70 }]} left={<TextInput.Icon icon="map-marker" />} textColor={colors.textDark} activeOutlineColor={colors.primary} />
          </Surface>

          <Text style={styles.sectionHeader}>Documents & KYC</Text>
          <Surface style={styles.sectionCard} elevation={1}>
            <TextInput label="ID Proof Number *" value={idProofNumber} onChangeText={setIdProofNumber} mode="outlined" style={styles.input} left={<TextInput.Icon icon="card-account-details" />} textColor={colors.textDark} activeOutlineColor={colors.primary} />
            <Divider style={{ marginVertical: 10 }} />
            <UploadRow label="ID Card (PDF)" file={docs.aadhaar} onUpload={() => handleUpload('aadhaar')} />
            <Divider style={{ marginVertical: 8 }} />
            <UploadRow label="Rental Agreement" file={docs.agreement} onUpload={() => handleUpload('agreement')} />
            <Divider style={{ marginVertical: 8 }} />
            <UploadRow label="Work / College ID" file={docs.workId} onUpload={() => handleUpload('workId')} />
          </Surface>

          <Text style={styles.sectionHeader}>Financials</Text>
          <Surface style={styles.sectionCard} elevation={1}>
            <View style={styles.row}>
              <View style={{flex: 1, marginRight: 10}}>
                <TextInput label="Monthly Rent *" value={rentAmount} onChangeText={setRentAmount} mode="outlined" keyboardType="numeric" style={[styles.input, {marginBottom: suggestedRent ? 4 : 12}]} left={<TextInput.Icon icon="currency-inr" />} textColor={colors.textDark} activeOutlineColor={colors.primary} />
                {suggestedRent && (
                   <Text style={{fontSize: 11, color: colors.success, fontWeight: '600', marginBottom: 8, paddingLeft: 4}}>
                     Matrix Base: ₹{suggestedRent}
                   </Text>
                )}
              </View>
              
              <TextInput label="Security Deposit *" value={deposit} onChangeText={setDeposit} mode="outlined" keyboardType="numeric" style={[styles.input, {flex: 1}]} left={<TextInput.Icon icon="currency-inr" />} textColor={colors.textDark} activeOutlineColor={colors.primary} />
            </View>
          </Surface>

          <Button 
            mode="contained" 
            onPress={handleOnboard} 
            loading={loading}
            disabled={loading}
            contentStyle={styles.btnContent}
            style={styles.submitBtn}
            labelStyle={styles.btnLabel}
          >
            {loading ? "Saving Tenant..." : (roomId ? "Confirm Assignment" : "Save to Pool")}
          </Button>
          <View style={{ height: 30 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.primary, paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 13, color: '#E0E0E0', fontWeight: 'bold' },
  scrollContent: { padding: 20 },
  sectionHeader: { fontSize: 16, fontWeight: '700', color: '#4B5563', marginBottom: 8, marginLeft: 4, marginTop: 10 },
  sectionCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10 },
  input: { marginBottom: 12, backgroundColor: '#fff', fontSize: 15 },
  fieldLabel: { color: colors.textLight, fontSize: 12, fontWeight: '600', marginTop: 5, marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  uploadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  uploadInfo: { flex: 1 },
  uploadLabel: { fontSize: 14, fontWeight: '600', color: colors.textDark },
  uploadStatus: { fontSize: 12, color: colors.textLight },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.primary, borderRadius: 8, paddingRight: 12, paddingVertical: 0, height: 40 },
  uploadBtnText: { color: colors.primary, fontWeight: '600', fontSize: 12 },
  submitBtn: { marginTop: 20, borderRadius: 12, backgroundColor: colors.primary, elevation: 4 },
  btnContent: { paddingVertical: 8 },
  btnLabel: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
});

export default TenantOnboarding;