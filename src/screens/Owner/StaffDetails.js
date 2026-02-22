import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Switch, Linking } from 'react-native';
import { Text, TextInput, Button, Avatar, Surface, IconButton, Divider, useTheme } from 'react-native-paper';

const StaffDetails = ({ navigation, route }) => {
  const theme = useTheme();
  
  const { staff } = route.params || { 
    staff: { 
      name: 'Unknown', role: 'Staff', staffId: 'ST-000', 
      phone: '', salary: '0', status: 'Pending', shift: 'Day', 
      isTaker: false 
    } 
  };

  const [salaryStatus, setSalaryStatus] = useState(staff.status);
  const [isTaker, setIsTaker] = useState(staff.isTaker || false);

  const getStatusColor = (status) => (status === 'Paid' ? '#10B981' : '#F59E0B');
  const statusColor = getStatusColor(salaryStatus);
  const attendanceHistory = ['P', 'P', 'A', 'P', 'P', 'P', 'P']; 

  // --- PAYMENT LOGIC ---
  const handlePayment = async () => {
    if (salaryStatus === 'Paid') {
      Alert.alert("Already Paid", "This staff member has already received their salary for this month.");
      return;
    }

    // Construct UPI URL (Replace placeholders with real data in production)
    const upiUrl = `upi://pay?pa=staff_placeholder@upi&pn=${staff.name}&am=${staff.salary}&cu=INR`;

    try {
      const supported = await Linking.canOpenURL(upiUrl);
      if (supported) {
        await Linking.openURL(upiUrl);
        Alert.alert(
          "Payment Initiated",
          "Did the payment complete successfully?",
          [
            { text: "No", style: "cancel" },
            { text: "Yes", onPress: () => setSalaryStatus('Paid') }
          ]
        );
      } else {
        Alert.alert("Error", "No UPI apps (GPay, PhonePe) found on this device.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not open payment app.");
    }
  };

  const toggleTaker = () => {
    const newState = !isTaker;
    setIsTaker(newState);
    Alert.alert("Permission Updated", newState ? `${staff.name} can now take attendance.` : `${staff.name} removed as attendance taker.`);
  };

  const DocumentRow = ({ title, status }) => (
    <Surface style={styles.docRow} elevation={0}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <IconButton icon="file-document-outline" size={24} iconColor="#CF6679" />
        <View>
          <Text style={styles.docTitle}>{title}</Text>
          <Text style={styles.docStatus}>{status}</Text>
        </View>
      </View>
      <IconButton icon="download-circle-outline" size={28} iconColor="#10B981" />
    </Surface>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" size={24} onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Staff Profile</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Profile Section */}
        <View style={styles.profileContainer}>
          <Surface style={styles.avatarSurface} elevation={4}>
            <Avatar.Text 
              size={100} 
              label={staff.name.substring(0, 2).toUpperCase()} 
              style={{ backgroundColor: statusColor + '20' }}
              color={statusColor}
            />
          </Surface>
          <Text style={styles.profileName}>{staff.name}</Text>
          <View style={styles.tagRow}>
             <Text style={styles.profileId}>{staff.staffId}</Text>
             <Text style={styles.dot}>•</Text>
             <Text style={styles.profileRole}>{staff.role}</Text>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
             <Text style={styles.statusText}>Salary: {salaryStatus}</Text>
          </View>
        </View>

        {/* --- ATTENDANCE SECTION --- */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginRight: 20, marginTop: 10 }}>
           <Text style={styles.sectionHeader}>Attendance (7 Days)</Text>
           <TouchableOpacity onPress={() => navigation.navigate('StaffAttendanceHistory', { staff })}>
              <Text style={{ color: '#CF6679', fontWeight: 'bold', fontSize: 13 }}>View Register</Text>
           </TouchableOpacity>
        </View>

        <Surface style={styles.attendanceCard} elevation={1}>
           <View style={styles.daysRow}>
             {attendanceHistory.map((status, index) => (
               <View key={index} style={styles.dayCol}>
                 <Text style={styles.dayLabel}>D-{index+1}</Text>
                 <View style={[
                   styles.dayDot, 
                   { backgroundColor: status === 'P' ? '#10B981' : '#EF4444' }
                 ]} />
                 <Text style={[styles.statusLabel, { color: status === 'P' ? '#10B981' : '#EF4444' }]}>{status}</Text>
               </View>
             ))}
           </View>
        </Surface>

        {/* --- PERMISSIONS --- */}
        <Text style={styles.sectionHeader}>Permissions</Text>
        <Surface style={styles.permCard} elevation={1}>
           <View style={styles.permRow}>
             <View style={{flex: 1}}>
                <Text style={styles.permTitle}>Attendance Taker</Text>
                <Text style={styles.permDesc}>Allow this staff to mark attendance for their block.</Text>
             </View>
             <Switch 
               value={isTaker} 
               onValueChange={toggleTaker} 
               trackColor={{ false: "#767577", true: "#CF6679" }}
               thumbColor={isTaker ? "#fff" : "#f4f3f4"}
             />
           </View>
        </Surface>

        {/* --- JOB DETAILS (RESTORED) --- */}
        <Text style={styles.sectionHeader}>Job & Salary</Text>
        <Surface style={styles.infoCard} elevation={1}>
           <View style={styles.infoRow}>
              <View style={{ flex: 1 }}>
                 <Text style={styles.label}>Monthly Salary</Text>
                 <Text style={styles.value}>₹{staff.salary}</Text>
              </View>
              <View style={{ flex: 1 }}>
                 <Text style={styles.label}>Shift Timing</Text>
                 <Text style={styles.value}>{staff.shift} Shift</Text>
              </View>
           </View>
           <Divider style={{ marginVertical: 10 }} />
           <View style={styles.infoRow}>
              <View style={{ flex: 1 }}>
                 <Text style={styles.label}>Attendance (Avg)</Text>
                 <Text style={styles.value}>92% Present</Text>
              </View>
              <View style={{ flex: 1 }}>
                 <Text style={styles.label}>Joined Date</Text>
                 <Text style={styles.value}>12 Jan 2024</Text>
              </View>
           </View>
        </Surface>

        {/* --- CONTACT INFO (RESTORED) --- */}
        <Text style={styles.sectionHeader}>Contact Information</Text>
        <View style={styles.formContainer}>
          <TextInput
             label="Phone Number"
             value={staff.phone}
             mode="outlined"
             style={styles.input}
             left={<TextInput.Icon icon="phone" />}
             editable={false} 
          />
          <TextInput
             label="Home Address"
             value="H-12, Cyber Village, Hyderabad"
             mode="outlined"
             style={styles.input}
             left={<TextInput.Icon icon="home" />}
             editable={false}
          />
        </View>

        {/* --- DOCUMENTS --- */}
        <Text style={styles.sectionHeader}>Documents & Verification</Text>
        <Surface style={styles.docContainer} elevation={1}>
          <DocumentRow title="Aadhaar Card" status="Verified" />
          <Divider />
          <DocumentRow title="Police Verification" status="Cleared • PDF" />
        </Surface>

        {/* --- ACTIONS --- */}
        <View style={styles.buttonContainer}>
          {/* PAY BUTTON: Opens UPI if pending */}
          <Button 
            mode="contained" 
            onPress={handlePayment} 
            style={[styles.payButton, salaryStatus === 'Paid' && { backgroundColor: '#BDBDBD' }]}
            icon={salaryStatus === 'Paid' ? "check" : "cash"}
          >
             {salaryStatus === 'Paid' ? "Salary Paid" : "Pay Salary via UPI"}
          </Button>
          
          <Button mode="outlined" textColor="#D32F2F" onPress={() => Alert.alert("Remove", "Delete staff?")} style={styles.removeButton}>
             Remove Staff
          </Button>
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 40, paddingHorizontal: 10, paddingBottom: 10 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  scrollContent: { paddingBottom: 40 },
  
  profileContainer: { alignItems: 'center', marginTop: 20, marginBottom: 20 },
  avatarSurface: { borderRadius: 50, elevation: 4, marginBottom: 10 },
  profileName: { fontSize: 22, fontWeight: 'bold', color: '#1F2937' },
  tagRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  profileId: { fontSize: 14, fontWeight: 'bold', color: '#6B7280' },
  dot: { marginHorizontal: 6, color: '#9CA3AF' },
  profileRole: { fontSize: 14, color: '#6B7280' },
  statusBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginTop: 10 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },

  sectionHeader: { fontSize: 16, fontWeight: '700', color: '#374151', marginLeft: 20, marginBottom: 10, marginTop: 15 },
  
  attendanceCard: { marginHorizontal: 20, padding: 16, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center' },
  dayLabel: { fontSize: 10, color: '#9CA3AF', marginBottom: 4 },
  dayDot: { width: 24, height: 24, borderRadius: 12, marginBottom: 4 },
  statusLabel: { fontSize: 12, fontWeight: 'bold' },

  permCard: { marginHorizontal: 20, padding: 16, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
  permRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  permTitle: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  permDesc: { fontSize: 12, color: '#6B7280', marginTop: 2, maxWidth: '80%' },

  infoCard: { marginHorizontal: 20, padding: 16, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
  infoRow: { flexDirection: 'row' },
  label: { fontSize: 12, color: '#9CA3AF' },
  value: { fontSize: 16, fontWeight: '600', color: '#333' },

  formContainer: { paddingHorizontal: 20 },
  input: { marginBottom: 12, backgroundColor: '#fff' },

  docContainer: { marginHorizontal: 20, backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20 },
  docRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, paddingHorizontal: 15 },
  docTitle: { fontSize: 14, fontWeight: '600', color: '#333' },
  docStatus: { fontSize: 12, color: '#6B7280' },

  buttonContainer: { paddingHorizontal: 20, marginTop: 25 },
  payButton: { backgroundColor: '#10B981', borderRadius: 12, marginBottom: 12, paddingVertical: 4 },
  removeButton: { borderColor: '#D32F2F', borderRadius: 12 },
});

export default StaffDetails;