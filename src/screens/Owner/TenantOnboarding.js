import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { Text, TextInput, Button, Surface, IconButton, Divider, useTheme } from 'react-native-paper';

const TenantOnboarding = ({ navigation, route }) => {
  const theme = useTheme();

  // 1. State Management
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [deposit, setDeposit] = useState('');
  const [idProofNumber, setIdProofNumber] = useState('');
  const [workplace, setWorkplace] = useState('');
  const [permAddress, setPermAddress] = useState('');

  // 2. Document State (Simulating file objects)
  const [docs, setDocs] = useState({
    aadhaar: null,
    agreement: null,
    workId: null
  });

  // Get Room/Block context if passed
  const { roomId, blockId } = route.params || {};

  // Mock File Upload Function
  const handleUpload = (docType) => {
    // In a real app, you would use DocumentPicker.getDocumentAsync() here
    Alert.alert(
      "Select File",
      `Choose a PDF for ${docType}`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Select PDF", 
          onPress: () => {
            setDocs(prev => ({ ...prev, [docType]: { name: `${docType}_scan.pdf`, uri: '...' } }));
          } 
        }
      ]
    );
  };

  const handleOnboard = () => {
    if (!name || !phone || !deposit) {
      Alert.alert("Missing Details", "Please fill in at least Name, Phone, and Deposit.");
      return;
    }
    console.log("Onboarding Data:", { name, phone, deposit, docs });
    Alert.alert("Success", "Tenant onboarded successfully!");
    navigation.goBack();
  };

  // Helper Component for Upload Rows
  const UploadRow = ({ label, docKey }) => {
    const file = docs[docKey];
    return (
      <View style={styles.uploadRow}>
        <View style={styles.uploadInfo}>
          <Text style={styles.uploadLabel}>{label}</Text>
          <Text style={[styles.uploadStatus, file && { color: '#10B981' }]}>
            {file ? file.name : "No file chosen"}
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.uploadBtn, file && { backgroundColor: '#E0F2F1', borderColor: '#10B981' }]} 
          onPress={() => handleUpload(docKey)}
        >
          <IconButton 
            icon={file ? "check" : "cloud-upload"} 
            size={20} 
            iconColor={file ? "#10B981" : "#4F46E5"} 
          />
          {!file && <Text style={styles.uploadBtnText}>Upload</Text>}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4c669f" />
      
      {/* Header */}
      <Surface style={styles.header} elevation={4}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
           <IconButton icon="arrow-left" iconColor="#fff" size={24} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>New Tenant</Text>
          <Text style={styles.headerSubtitle}>
            {roomId ? `Adding to Block ${blockId || 'A'}, Room ${roomId}` : 'Enter tenant details'}
          </Text>
        </View>
      </Surface>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* --- SECTION 1: PERSONAL DETAILS --- */}
        <Text style={styles.sectionHeader}>Personal Details</Text>
        <Surface style={styles.sectionCard} elevation={1}>
          <TextInput
            label="Full Name"
            value={name}
            onChangeText={setName}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="account" />}
          />
          <TextInput
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            mode="outlined"
            keyboardType="phone-pad"
            style={styles.input}
            left={<TextInput.Icon icon="phone" />}
          />
          <TextInput
            label="Email Address (Optional)"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            style={styles.input}
            left={<TextInput.Icon icon="email" />}
          />
        </Surface>

        {/* --- SECTION 2: BACKGROUND & ADDRESS --- */}
        <Text style={styles.sectionHeader}>Background Info</Text>
        <Surface style={styles.sectionCard} elevation={1}>
           <TextInput
            label="Workplace / College"
            value={workplace}
            onChangeText={setWorkplace}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="briefcase" />}
          />
          <TextInput
            label="Permanent Address"
            value={permAddress}
            onChangeText={setPermAddress}
            mode="outlined"
            multiline
            style={[styles.input, { height: 70 }]}
            left={<TextInput.Icon icon="map-marker" />}
          />
        </Surface>

        {/* --- SECTION 3: DOCUMENTS & KYC (NEW) --- */}
        <Text style={styles.sectionHeader}>Documents & KYC</Text>
        <Surface style={styles.sectionCard} elevation={1}>
          <TextInput
            label="Aadhaar / Gov ID Number"
            value={idProofNumber}
            onChangeText={setIdProofNumber}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="card-account-details" />}
          />
          
          <Divider style={{ marginVertical: 10 }} />
          
          {/* File Upload Rows */}
          <UploadRow label="Aadhaar Card (PDF)" docKey="aadhaar" />
          <Divider style={{ marginVertical: 8 }} />
          <UploadRow label="Rental Agreement" docKey="agreement" />
          <Divider style={{ marginVertical: 8 }} />
          <UploadRow label="Work / College ID" docKey="workId" />
        </Surface>

        {/* --- SECTION 4: PAYMENT --- */}
        <Text style={styles.sectionHeader}>Initial Payment</Text>
        <Surface style={styles.sectionCard} elevation={1}>
          <TextInput
            label="Security Deposit Amount (₹)"
            value={deposit}
            onChangeText={setDeposit}
            mode="outlined"
            keyboardType="numeric"
            style={styles.input}
            left={<TextInput.Icon icon="cash" />}
          />
        </Surface>

        {/* --- SUBMIT BUTTON --- */}
        <Button 
          mode="contained" 
          onPress={handleOnboard} 
          contentStyle={styles.btnContent}
          style={styles.submitBtn}
          labelStyle={styles.btnLabel}
        >
          Confirm Onboarding
        </Button>
        <View style={{ height: 30 }} />

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA', 
  },
  header: {
    backgroundColor: '#4c669f', 
    paddingTop: 50, 
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    marginRight: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#E0E0E0',
  },
  scrollContent: {
    padding: 20,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 8,
    marginLeft: 4,
    marginTop: 10,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#fff',
    fontSize: 15,
  },
  
  // Upload Styles
  uploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  uploadInfo: {
    flex: 1,
  },
  uploadLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  uploadStatus: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4F46E5',
    borderRadius: 8,
    paddingRight: 12,
    paddingVertical: 0,
    height: 40,
  },
  uploadBtnText: {
    color: '#4F46E5',
    fontWeight: '600',
    fontSize: 12,
  },

  submitBtn: {
    marginTop: 20,
    borderRadius: 12,
    backgroundColor: '#4c669f',
    elevation: 4,
  },
  btnContent: {
    paddingVertical: 8,
  },
  btnLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default TenantOnboarding;