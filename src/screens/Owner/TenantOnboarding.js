import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Surface, IconButton, Divider, SegmentedButtons, ProgressBar } from 'react-native-paper';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import firebase from '@react-native-firebase/app';
import { sendCredentialEmail } from '../../services/emailService';
import { usePricing, useRoomDetails } from '../../hooks/useQueries';
import { Colors } from '../../theme/colors';



const TenantOnboarding = ({ navigation, route }) => {
  const { roomId, blockId } = route.params || {};
  
  const { data: pricingMatrix } = usePricing();
  const { data: roomData } = useRoomDetails(blockId, roomId);

  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});

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



  useEffect(() => {
    if (roomId && blockId && pricingMatrix && roomData) {
      const acKey = roomData.hasAC ? 'AC' : 'NonAC';
      const basePrice = pricingMatrix[blockId]?.[roomData.sharing]?.[acKey];
      
      if (basePrice) {
        setSuggestedRent(basePrice.toString());
        if (!rentAmount) setRentAmount(basePrice.toString());
      }
    }
  }, [roomId, blockId, pricingMatrix, roomData]);



  const generatePassword = () => 'Tenant' + Math.floor(100000 + Math.random() * 900000) + '!';

  const validateStep1 = () => {
    let valid = true;
    let newErrors = {};
    if (!name) { valid = false; newErrors.name = 'Name is required'; }
    if (!phone) { valid = false; newErrors.phone = 'Phone is required'; }
    if (!email) { valid = false; newErrors.email = 'Email is required'; }
    setErrors(newErrors);
    return valid;
  };

  const validateStep2 = () => {
    let valid = true;
    let newErrors = {};
    if (!idProofNumber) { valid = false; newErrors.idProofNumber = 'ID Proof is required'; }
    setErrors(newErrors);
    return valid;
  };

  const isPositiveNumeric = (val) => {
    if (!val) return false;
    const sanitized = val.toString().replace(/,/g, '').trim();
    if (isNaN(sanitized) || sanitized === '') return false;
    return Number(sanitized) >= 0;
  };

  const sanitizeNumeric = (val) => val ? val.toString().replace(/,/g, '').trim() : '';

  const validateStep3 = () => {
    let valid = true;
    let newErrors = {};
    if (!rentAmount) { valid = false; newErrors.rentAmount = 'Rent Amount is required'; }
    else if (!isPositiveNumeric(rentAmount)) { valid = false; newErrors.rentAmount = 'Must be a positive number'; }

    if (!deposit) { valid = false; newErrors.deposit = 'Deposit is required'; }
    else if (!isPositiveNumeric(deposit)) { valid = false; newErrors.deposit = 'Must be a positive number'; }

    setErrors(newErrors);
    return valid;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else navigation.goBack();
  };

  const handleOnboard = async () => {
    if (!validateStep3()) return;
    
    setLoading(true);

    try {
      const trimmedIdProof = idProofNumber.trim();
      const currentOwner = auth().currentUser;

      // Duplicate Check
      const duplicateCheck = await firestore().collection('tenants')
        .where('ownerId', '==', currentOwner.uid)
        .where('idProofNumber', '==', trimmedIdProof)
        .get();

      if (!duplicateCheck.empty) {
        Alert.alert("Duplicate Tenant Found", "A student with this ID Proof already exists.");
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
          Alert.alert("Error", "Room not found.");
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

      // Use Firebase REST API to create user without logging out current user
      const generatedPassword = generatePassword();
      const apiKey = firebase.app().options.apiKey;
      const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password: generatedPassword,
          returnSecureToken: true
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || 'Could not create account');
      }
      const newTenantUid = data.localId;

      // Save profiles
      await firestore().collection('users').doc(newTenantUid).set({
        role: 'Tenant',
        ownerId: currentOwner.uid,
        email: email.toLowerCase().trim(),
        createdAt: firestore.FieldValue.serverTimestamp()
      });

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
        rentAmount: Number(sanitizeNumeric(rentAmount)), 
        agreedRent: Number(sanitizeNumeric(rentAmount)), 
        deposit: Number(sanitizeNumeric(deposit)),
        balance: 0, 
        roomNumber: roomId ? parseInt(roomId, 10) : null, 
        blockId: blockId || null,
        rentStatus: roomId ? 'Pending' : 'Unassigned',
        joined: today,
        image: null, 
        createdAt: firestore.FieldValue.serverTimestamp(),
      };

      await firestore().collection('tenants').doc(newTenantUid).set(newTenant);

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

      // Trigger email dispatch via EmailJS REST API
      await sendCredentialEmail({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: generatedPassword,
        role: 'Tenant'
      });

      Alert.alert(
        "Success!", 
        `Credentials for ${name} have been emailed to ${email}.`,
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
      
    } catch (error) {
      console.error("Error onboarding tenant: ", error);
      Alert.alert("Error", `Could not save tenant: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <Animated.View entering={FadeInRight} exiting={FadeOutLeft}>
      <Text style={styles.sectionHeader}>Step 1: Personal Details</Text>
      <Surface style={styles.sectionCard} elevation={1}>
        <TextInput label="Full Name *" value={name} onChangeText={setName} mode="outlined" style={styles.input} left={<TextInput.Icon icon="account" />} textColor={Colors.textDark} activeOutlineColor={Colors.primary} error={!!errors.name} />
        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        
        <TextInput label="Email Address *" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" mode="outlined" style={styles.input} left={<TextInput.Icon icon="email" />} textColor={Colors.textDark} activeOutlineColor={Colors.primary} error={!!errors.email} />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        
        <TextInput label="Phone Number *" value={phone} onChangeText={setPhone} mode="outlined" keyboardType="phone-pad" style={styles.input} left={<TextInput.Icon icon="phone" />} textColor={Colors.textDark} activeOutlineColor={Colors.primary} error={!!errors.phone} />
        {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
        
        <Text style={styles.fieldLabel}>Gender</Text>
        <SegmentedButtons
          value={gender}
          onValueChange={setGender}
          buttons={[
            { value: 'Male', label: 'Male', icon: 'gender-male' },
            { value: 'Female', label: 'Female', icon: 'gender-female' },
          ]}
          theme={{ colors: { onSurface: Colors.textDark, secondaryContainer: Colors.primaryLight, onSecondaryContainer: Colors.primary } }}
          style={{marginTop: 5, marginBottom: 5}}
        />
      </Surface>
    </Animated.View>
  );

  const renderStep2 = () => (
    <Animated.View entering={FadeInRight} exiting={FadeOutLeft}>
      <Text style={styles.sectionHeader}>Step 2: Documents & KYC</Text>
      <Surface style={styles.sectionCard} elevation={1}>
        <TextInput label="ID Proof Number *" value={idProofNumber} onChangeText={setIdProofNumber} mode="outlined" style={styles.input} left={<TextInput.Icon icon="card-account-details" />} textColor={Colors.textDark} activeOutlineColor={Colors.primary} error={!!errors.idProofNumber} />
        {errors.idProofNumber && <Text style={styles.errorText}>{errors.idProofNumber}</Text>}
      </Surface>
      
      <Text style={styles.sectionHeader}>Background Info (Optional)</Text>
      <Surface style={styles.sectionCard} elevation={1}>
         <TextInput label="Workplace / College" value={workplace} onChangeText={setWorkplace} mode="outlined" style={styles.input} left={<TextInput.Icon icon="briefcase" />} textColor={Colors.textDark} activeOutlineColor={Colors.primary}/>
        <TextInput label="Permanent Address" value={permAddress} onChangeText={setPermAddress} mode="outlined" multiline style={[styles.input, { height: 70 }]} left={<TextInput.Icon icon="map-marker" />} textColor={Colors.textDark} activeOutlineColor={Colors.primary} />
      </Surface>
    </Animated.View>
  );

  const renderStep3 = () => (
    <Animated.View entering={FadeInRight} exiting={FadeOutLeft}>
      <Text style={styles.sectionHeader}>Step 3: Financials</Text>
      <Surface style={styles.sectionCard} elevation={1}>
        <TextInput label="Monthly Rent *" value={rentAmount} onChangeText={setRentAmount} mode="outlined" keyboardType="numeric" style={[styles.input, {marginBottom: suggestedRent ? 4 : 12}]} left={<TextInput.Icon icon="currency-inr" />} textColor={Colors.textDark} activeOutlineColor={Colors.primary} error={!!errors.rentAmount} />
        {errors.rentAmount && <Text style={styles.errorText}>{errors.rentAmount}</Text>}
        {suggestedRent && (
           <Text style={{fontSize: 11, color: Colors.success, fontWeight: '600', marginBottom: 8, paddingLeft: 4}}>
             Matrix Base: ₹{suggestedRent}
           </Text>
        )}
        <TextInput label="Security Deposit *" value={deposit} onChangeText={setDeposit} mode="outlined" keyboardType="numeric" style={[styles.input, {flex: 1}]} left={<TextInput.Icon icon="currency-inr" />} textColor={Colors.textDark} activeOutlineColor={Colors.primary} error={!!errors.deposit} />
        {errors.deposit && <Text style={styles.errorText}>{errors.deposit}</Text>}
      </Surface>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      <Surface style={styles.header} elevation={4}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
           <IconButton icon="arrow-left" iconColor="#fff" size={24} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>New Tenant</Text>
          <Text style={styles.headerSubtitle}>
            {roomId ? `Adding to Block ${blockId || 'Unassigned'}, Room ${roomId}` : 'Adding to Unassigned Pool'}
          </Text>
        </View>
      </Surface>

      <ProgressBar progress={step / 3} color={Colors.success} style={styles.progressBar} />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex: 1}}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}

          <View style={styles.btnContainer}>
            {step < 3 ? (
              <Button 
                mode="contained" 
                onPress={handleNext} 
                style={styles.submitBtn}
                contentStyle={styles.btnContent}
                buttonColor={Colors.primary}
              >
                Next Step
              </Button>
            ) : (
              <Button 
                mode="contained" 
                onPress={handleOnboard} 
                loading={loading}
                disabled={loading}
                contentStyle={styles.btnContent}
                style={styles.submitBtn}
                labelStyle={styles.btnLabel}
                buttonColor={Colors.success}
              >
                {loading ? "Saving..." : (roomId ? "Confirm Assignment" : "Save to Pool")}
              </Button>
            )}
          </View>
          <View style={{ height: 30 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.primary, paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 13, color: Colors.primaryLight, fontWeight: 'bold' },
  progressBar: { height: 6, backgroundColor: Colors.border },
  scrollContent: { padding: 20 },
  sectionHeader: { fontSize: 18, fontWeight: '700', color: Colors.textDark, marginBottom: 12, marginLeft: 4, marginTop: 10 },
  sectionCard: { backgroundColor: Colors.cardBg, borderRadius: 16, padding: 16, marginBottom: 16 },
  input: { marginBottom: 12, backgroundColor: Colors.inputBg, fontSize: 15, minHeight: 50 },
  fieldLabel: { color: Colors.textMedium, fontSize: 12, fontWeight: '600', marginTop: 5, marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },

  btnContainer: { marginTop: 20 },
  submitBtn: { borderRadius: 12, elevation: 4 },
  btnContent: { paddingVertical: 8 },
  btnLabel: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  errorText: { color: Colors.danger, fontSize: 12, marginTop: -8, marginBottom: 10, marginLeft: 4 },
});

export default TenantOnboarding;