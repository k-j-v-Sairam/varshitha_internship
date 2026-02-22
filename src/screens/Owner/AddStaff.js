import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { Text, TextInput, Button, Surface, IconButton, Switch, Chip, useTheme, Divider } from 'react-native-paper';

const AddStaff = ({ navigation }) => {
  const theme = useTheme();

  // --- STATE ---
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [block, setBlock] = useState('');
  const [salary, setSalary] = useState('');
  const [shift, setShift] = useState('');
  const [isTaker, setIsTaker] = useState(false);

  // Documents State
  const [docs, setDocs] = useState({
    aadhaar: null,
    policeVer: null,
    photo: null
  });

  // Pre-defined Options
  const roles = ['Warden', 'Security', 'Cook', 'Cleaning', 'Manager'];
  const blocks = ['A', 'B', 'C', 'General'];

  // --- HANDLERS ---
  
  const handleDocumentUpload = (docType) => {
    Alert.alert(
      "Upload Document",
      `Select a file for ${docType}`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Choose File", 
          onPress: () => setDocs(prev => ({ ...prev, [docType]: { name: `${docType}.pdf`, uri: 'uri' } })) 
        }
      ]
    );
  };

  const handleSubmit = () => {
    if (!name || !phone || !role || !salary) {
      Alert.alert("Missing Fields", "Please fill in Name, Phone, Role, and Salary.");
      return;
    }
    
    // In a real app, you would send this 'newStaff' object to your backend
    const newStaff = {
      name, phone, role, block, salary, shift, isTaker, docs
    };

    console.log("New Staff Created:", newStaff);
    Alert.alert("Success", "Staff member added successfully!", [
      { text: "OK", onPress: () => navigation.goBack() }
    ]);
  };

  // Helper for Upload Row
  const UploadRow = ({ label, docKey }) => {
    const file = docs[docKey];
    return (
      <View style={styles.uploadRow}>
        <View style={{flex: 1}}>
          <Text style={styles.uploadLabel}>{label}</Text>
          <Text style={[styles.uploadStatus, file && { color: '#10B981' }]}>
            {file ? "File Selected" : "No file chosen"}
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.uploadBtn, file && { borderColor: '#10B981', backgroundColor: '#E8F5E9' }]} 
          onPress={() => handleDocumentUpload(docKey)}
        >
          <IconButton 
            icon={file ? "check" : "upload"} 
            size={20} 
            iconColor={file ? "#10B981" : "#CF6679"} 
            style={{ margin: 0 }}
          />
          {!file && <Text style={{ color: '#CF6679', fontWeight: 'bold', fontSize: 12, marginRight: 8 }}>Upload</Text>}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#CF6679" />
      
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon="arrow-left" iconColor="#fff" size={24} onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Add New Staff</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* SECTION 1: PERSONAL INFO */}
        <Text style={styles.sectionTitle}>Personal Details</Text>
        <Surface style={styles.card} elevation={1}>
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
        </Surface>

        {/* SECTION 2: JOB ROLE */}
        <Text style={styles.sectionTitle}>Job Role & Assignment</Text>
        <Surface style={styles.card} elevation={1}>
          <Text style={styles.subLabel}>Select Role:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {roles.map((r) => (
              <Chip 
                key={r} 
                selected={role === r} 
                onPress={() => setRole(r)}
                style={[styles.chip, role === r && { backgroundColor: '#CF6679' }]}
                textStyle={{ color: role === r ? '#fff' : '#333' }}
              >
                {r}
              </Chip>
            ))}
          </ScrollView>

          <Text style={styles.subLabel}>Assign Block:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {blocks.map((b) => (
              <Chip 
                key={b} 
                selected={block === b} 
                onPress={() => setBlock(b)}
                style={[styles.chip, block === b && { backgroundColor: '#4F46E5' }]} // Blue for Blocks
                textStyle={{ color: block === b ? '#fff' : '#333' }}
              >
                Block {b}
              </Chip>
            ))}
          </ScrollView>
        </Surface>

        {/* SECTION 3: SALARY & SHIFT */}
        <Text style={styles.sectionTitle}>Compensation & Timing</Text>
        <Surface style={styles.card} elevation={1}>
          <View style={styles.row}>
            <TextInput
              label="Monthly Salary (₹)"
              value={salary}
              onChangeText={setSalary}
              mode="outlined"
              keyboardType="numeric"
              style={[styles.input, { flex: 1, marginRight: 10 }]}
              left={<TextInput.Icon icon="cash" />}
            />
            <TextInput
              label="Shift (e.g. 9am-5pm)"
              value={shift}
              onChangeText={setShift}
              mode="outlined"
              style={[styles.input, { flex: 1 }]}
              left={<TextInput.Icon icon="clock-outline" />}
            />
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
            <Switch 
              value={isTaker} 
              onValueChange={setIsTaker} 
              trackColor={{ false: "#E0E0E0", true: "#CF6679" }}
              thumbColor={"#fff"}
            />
          </View>
        </Surface>

        {/* SECTION 5: KYC DOCUMENTS */}
        <Text style={styles.sectionTitle}>KYC Documents</Text>
        <Surface style={styles.card} elevation={1}>
          <UploadRow label="Aadhaar Card (Front & Back)" docKey="aadhaar" />
          <Divider style={{ marginVertical: 8 }} />
          <UploadRow label="Police Verification Form" docKey="policeVer" />
          <Divider style={{ marginVertical: 8 }} />
          <UploadRow label="Staff Photograph" docKey="photo" />
        </Surface>

        {/* SUBMIT BUTTON */}
        <Button 
          mode="contained" 
          onPress={handleSubmit} 
          style={styles.submitBtn}
          contentStyle={{ paddingVertical: 5 }}
          labelStyle={{ fontSize: 18, fontWeight: 'bold' }}
        >
          Add Staff Member
        </Button>
        <View style={{ height: 30 }} />

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { 
    backgroundColor: '#CF6679', 
    paddingTop: 40, 
    paddingBottom: 20, 
    paddingHorizontal: 10, 
    flexDirection: 'row', 
    alignItems: 'center', 
    elevation: 4 
  },
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