import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert, ActivityIndicator, RefreshControl, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Surface, IconButton, Switch, Chip, useTheme, Divider, SegmentedButtons, ProgressBar } from 'react-native-paper';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import firebase from '@react-native-firebase/app';
import { sendCredentialEmail } from '../../services/emailService';
import { Colors } from '../../theme/colors';

const AddStaff = ({ navigation }) => {
  const theme = useTheme();

  // --- STATE ---
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [gender, setGender] = useState('Male');
  
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [block, setBlock] = useState('');
  const [blocks, setBlocks] = useState([]);
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [salary, setSalary] = useState('');
  const [shift, setShift] = useState('');
  const [isTaker, setIsTaker] = useState(false);
  const [loading, setLoading] = useState(false);

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

  const generatePassword = () => 'Staff' + Math.floor(100000 + Math.random() * 900000) + '!';

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
    if (selectedRoles.length === 0) { valid = false; newErrors.roles = 'At least one role is required'; }
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
    if (!salary) { valid = false; newErrors.salary = 'Salary is required'; }
    else if (!isPositiveNumeric(salary)) { valid = false; newErrors.salary = 'Must be a positive number'; }
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

  const handleSubmit = async () => {
    if (!validateStep3()) return;
    
    setLoading(true);
    const primaryRole = selectedRoles[0];
    const generatedStaffId = `${primaryRole.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const generatedPassword = generatePassword();
    const currentOwner = auth().currentUser;

    try {
      // Use Firebase REST API to create user without logging out current user
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
      const newStaffUid = data.localId;

      // 2. Setup Routing Doc in 'users' collection
      await firestore().collection('users').doc(newStaffUid).set({
        role: 'Staff',
        ownerId: currentOwner.uid,
        email: email.toLowerCase().trim(),
        createdAt: firestore.FieldValue.serverTimestamp()
      });

      const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

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
        salary: Number(sanitizeNumeric(salary)),
        shift: shift.trim(),
        isTaker,
        staffId: generatedStaffId,
        status: 'Active',
        attendance: 'Absent',
        joinedDate: today,
        currentBlockJoinedDate: block ? today : null,
        createdAt: firestore.FieldValue.serverTimestamp()
      };

      await firestore().collection('staff').doc(newStaffUid).set(newStaff);

      // Trigger email dispatch via EmailJS REST API
      await sendCredentialEmail({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: generatedPassword,
        role: 'Staff'
      });

      Alert.alert(
        "Staff Created Successfully!",
        `Login details for ${name} have been emailed to ${email}.`,
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error("Error adding staff to Firebase:", error);
      Alert.alert("Error", error.message || "Could not save staff.");
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
        
        <TextInput label="Emergency Contact Number" value={emergencyContact} onChangeText={setEmergencyContact} mode="outlined" keyboardType="phone-pad" style={styles.input} left={<TextInput.Icon icon="phone-alert" />} textColor={Colors.textDark} activeOutlineColor={Colors.primary} />

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
      <Text style={styles.sectionHeader}>Step 2: Job Role & Assignment</Text>
      <Surface style={styles.sectionCard} elevation={1}>
        <Text style={styles.subLabel}>Select Role (Multiple allowed) *:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {availableRoles.map((r) => {
            const isSelected = selectedRoles.includes(r);
            return (
              <Chip key={r} selected={isSelected} onPress={() => toggleRole(r)} style={[styles.chip, isSelected && { backgroundColor: Colors.primary }]} textStyle={{ color: isSelected ? '#fff' : Colors.textDark }}>
                {r}
              </Chip>
            );
          })}
        </ScrollView>
        {errors.roles && <Text style={styles.errorText}>{errors.roles}</Text>}

        <Text style={[styles.subLabel, { marginTop: 15 }]}>Assign Block:</Text>
        {isLoadingBlocks ? (
           <ActivityIndicator size="small" color={Colors.primary} style={{ alignSelf: 'flex-start', marginVertical: 10 }} />
        ) : blocks.length === 0 ? (
           <Text style={{color: Colors.textMedium, fontSize: 12, marginBottom: 10}}>No blocks found in DB. Pull down to refresh.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {blocks.map((b) => (
              <Chip key={b.id} selected={block === b.name} onPress={() => setBlock(b.name)} style={[styles.chip, block === b.name && { backgroundColor: Colors.success }]} textStyle={{ color: block === b.name ? '#fff' : Colors.textDark }}>
                {b.name}
              </Chip>
            ))}
          </ScrollView>
        )}
      </Surface>
    </Animated.View>
  );

  const renderStep3 = () => (
    <Animated.View entering={FadeInRight} exiting={FadeOutLeft}>
      <Text style={styles.sectionHeader}>Step 3: Compensation & Timing</Text>
      <Surface style={styles.sectionCard} elevation={1}>
        <TextInput label="Monthly Salary (₹) *" value={salary} onChangeText={setSalary} mode="outlined" keyboardType="numeric" style={styles.input} left={<TextInput.Icon icon="cash" />} textColor={Colors.textDark} activeOutlineColor={Colors.primary} error={!!errors.salary} />
        {errors.salary && <Text style={styles.errorText}>{errors.salary}</Text>}
        
        <TextInput label="Shift (e.g. 9am-5pm)" value={shift} onChangeText={setShift} mode="outlined" style={styles.input} left={<TextInput.Icon icon="clock-outline" />} textColor={Colors.textDark} activeOutlineColor={Colors.primary} />
      </Surface>
      
      <Text style={styles.sectionHeader}>Permissions</Text>
      <Surface style={styles.sectionCard} elevation={1}>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>Attendance Taker</Text>
            <Text style={styles.switchDesc}>Allow this staff member to mark attendance for their assigned block.</Text>
          </View>
          <Switch value={isTaker} onValueChange={setIsTaker} color={Colors.primary} />
        </View>
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
          <Text style={styles.headerTitle}>Add New Staff</Text>
          <Text style={styles.headerSubtitle}>
            {block ? `Assigning to Block ${block}` : 'Adding to Unassigned Pool'}
          </Text>
        </View>
      </Surface>

      <ProgressBar progress={step / 3} color={Colors.success} style={styles.progressBar} />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex: 1}}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
          }
        >
          
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
                onPress={handleSubmit} 
                loading={loading}
                disabled={loading}
                contentStyle={styles.btnContent}
                style={styles.submitBtn}
                labelStyle={styles.btnLabel}
                buttonColor={Colors.success}
              >
                {loading ? "Saving Staff..." : "Add Staff Member"}
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
  subLabel: { fontSize: 14, fontWeight: '600', color: Colors.textMedium, marginBottom: 8 },
  chipRow: { flexDirection: 'row', marginBottom: 5 },
  chip: { marginRight: 8, backgroundColor: '#f0f0f0' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.textDark },
  switchDesc: { fontSize: 12, color: Colors.textMedium, marginTop: 2, marginRight: 10 },
  btnContainer: { marginTop: 20 },
  submitBtn: { borderRadius: 12, elevation: 4 },
  btnContent: { paddingVertical: 8 },
  btnLabel: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  errorText: { color: Colors.danger, fontSize: 12, marginTop: -8, marginBottom: 10, marginLeft: 4 },
});

export default AddStaff;