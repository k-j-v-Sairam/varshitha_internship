import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, Avatar, Surface, IconButton, Divider, useTheme } from 'react-native-paper';

const TenantDetails = ({ navigation, route }) => {
  const theme = useTheme();
  
  // Get tenant data passed from the previous screen
  const { tenant } = route.params || { 
    tenant: { 
      name: 'Unknown', 
      room: '101', 
      block: 'A', 
      phone: '', 
      email: '', 
      id: '0',
      address: '12-3-456, MG Road, Hyderabad, Telangana',
      workplace: 'Tech Mahindra, Hitech City',
      status: 'Pending' // Default for testing
    } 
  };

  // State for all fields
  const [name, setName] = useState(tenant.name);
  const [phone, setPhone] = useState(tenant.phone || '+91 98765 43210');
  const [room, setRoom] = useState(tenant.room);
  const [block, setBlock] = useState(tenant.block || 'A'); 
  const [email, setEmail] = useState('tenant@example.com');
  const [address, setAddress] = useState(tenant.address || '12-3-456, MG Road, Hyderabad');
  const [workplace, setWorkplace] = useState(tenant.workplace || 'Tech Mahindra, Hitech City');

  // Helper to determine status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Paid': return '#10B981'; // Green
      case 'Pending': return '#F59E0B'; // Amber
      case 'Overdue': return '#EF4444'; // Red
      default: return '#6B7280'; // Grey
    }
  };

  const statusColor = getStatusColor(tenant.status || 'Pending');

  // Logic to Remove Tenant
  const handleRemoveTenant = () => {
    Alert.alert(
      "Remove Tenant",
      `Are you sure you want to remove ${name}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive", 
          onPress: () => {
            console.log("Deleted Tenant:", tenant.id);
            navigation.goBack(); 
          }
        }
      ]
    );
  };

  const handleSave = () => {
    Alert.alert("Success", "Tenant details updated successfully!");
  };

  const handleDownload = (docName) => {
    Alert.alert("Download", `Downloading ${docName}... \n(Mock functionality)`);
  };

  // Helper Component for Document Rows
  const DocumentRow = ({ title, status }) => (
    <Surface style={styles.docRow} elevation={0}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <IconButton icon="file-document-outline" size={24} iconColor="#4F46E5" />
        <View>
          <Text style={styles.docTitle}>{title}</Text>
          <Text style={styles.docStatus}>{status}</Text>
        </View>
      </View>
      <TouchableOpacity onPress={() => handleDownload(title)}>
        <IconButton icon="download-circle-outline" size={28} iconColor="#10B981" />
      </TouchableOpacity>
    </Surface>
  );

  return (
    <View style={styles.container}>
      
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon="arrow-left" size={24} onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Tenant Details</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Profile Image Section */}
        <View style={styles.profileContainer}>
          <Surface style={styles.avatarSurface} elevation={4}>
            <Avatar.Text 
              size={100} 
              label={name.substring(0, 2).toUpperCase()} 
              style={{ backgroundColor: statusColor + '20' }} // Light background of status color
              color={statusColor} // Text matches status color
            />
          </Surface>
          <Text style={styles.profileName}>{name}</Text>
          
          {/* NEW: Colored Status Badge */}
          <View style={styles.statusRow}>
             <Text style={styles.profileId}>ID: #2024-{tenant.id}</Text>
             <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                <Text style={styles.statusText}>{tenant.status || 'Pending'}</Text>
             </View>
          </View>
        </View>

        {/* --- SECTION 1: ACCOMMODATION --- */}
        <Text style={styles.sectionHeader}>Accommodation Info</Text>
        <View style={styles.formRow}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <TextInput
              label="Block"
              value={block}
              onChangeText={setBlock}
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="office-building" />}
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextInput
              label="Room Number"
              value={room}
              onChangeText={setRoom}
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="door" />}
            />
          </View>
        </View>

        {/* --- SECTION 2: PERSONAL CONTACT --- */}
        <Text style={styles.sectionHeader}>Contact Details</Text>
        <View style={styles.formContainer}>
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
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            style={styles.input}
            left={<TextInput.Icon icon="email" />}
          />
        </View>

        {/* --- SECTION 3: BACKGROUND INFO --- */}
        <Text style={styles.sectionHeader}>Background & Address</Text>
        <View style={styles.formContainer}>
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
            value={address}
            onChangeText={setAddress}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={[styles.input, { height: 80 }]}
            left={<TextInput.Icon icon="map-marker" />}
          />
        </View>

        {/* --- SECTION 4: DOCUMENTS & KYC --- */}
        <Text style={styles.sectionHeader}>Documents</Text>
        <Surface style={styles.docContainer} elevation={1}>
          <DocumentRow title="Aadhaar Card" status="Verified • PDF" />
          <Divider />
          <DocumentRow title="Rental Agreement" status="Signed • 2024" />
          <Divider />
          <DocumentRow title="Work ID / College ID" status="Uploaded • JPG" />
        </Surface>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Button 
            mode="contained" 
            onPress={handleSave} 
            style={styles.saveButton}
            contentStyle={{ height: 50 }}
          >
            Save Changes
          </Button>

          <TouchableOpacity 
            style={styles.removeButton} 
            onPress={handleRemoveTenant}
            activeOpacity={0.8}
          >
            <Text style={styles.removeButtonText}>- Remove Tenant</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 40,
    paddingHorizontal: 10,
    paddingBottom: 10,
    backgroundColor: '#fff',
    elevation: 2, 
    zIndex: 10,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  scrollContent: { paddingBottom: 40 },
  
  // Profile Section
  profileContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  avatarSurface: {
    borderRadius: 50,
    elevation: 4,
    marginBottom: 10,
  },
  profileName: { fontSize: 22, fontWeight: 'bold', color: '#1F2937' },
  
  // NEW STATUS ROW STYLES
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  profileId: { fontSize: 14, color: '#6B7280', marginRight: 10 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },

  // Section Headers
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginLeft: 25,
    marginBottom: 10,
    marginTop: 10,
  },

  // Form Section
  formContainer: { paddingHorizontal: 25 },
  formRow: { flexDirection: 'row', paddingHorizontal: 25 },
  input: {
    marginBottom: 12,
    backgroundColor: '#fff',
    fontSize: 15,
  },

  // Document Section
  docContainer: {
    marginHorizontal: 25,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
    overflow: 'hidden',
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    paddingHorizontal: 15,
    backgroundColor: 'transparent',
  },
  docTitle: { fontSize: 14, fontWeight: '600', color: '#333' },
  docStatus: { fontSize: 12, color: '#6B7280' },

  // Buttons
  buttonContainer: {
    marginTop: 10,
    paddingHorizontal: 25,
  },
  saveButton: {
    backgroundColor: '#4F46E5', 
    borderRadius: 12,
    marginBottom: 15,
  },
  removeButton: {
    backgroundColor: '#000', 
    borderRadius: 30,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default TenantDetails;