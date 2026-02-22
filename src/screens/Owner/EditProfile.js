import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { Text, TextInput, Button, Avatar, Surface } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const EditProfile = ({ navigation }) => {
  const [name, setName] = useState('Sairam Owner');
  const [email, setEmail] = useState('owner@hostelmanager.com');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [hostelName, setHostelName] = useState('Sairam Hostels');

  const handleSave = () => {
    Alert.alert("Success", "Profile updated successfully!");
    // Return to dashboard and OPEN the profile modal
    navigation.navigate('OwnerDashboard', { openProfile: true });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.navigate('OwnerDashboard', { openProfile: true })} 
          style={styles.backButton}
        >
           <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text variant="titleLarge" style={{fontWeight:'bold', color:'#333'}}>My Details</Text>
        <View style={{width: 24}} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        <View style={styles.avatarSection}>
          <View>
            <Avatar.Text size={100} label="OP" style={{backgroundColor: '#E3F2FD'}} color="#004B8D" />
            <TouchableOpacity style={styles.cameraIcon}>
              <Icon name="camera" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
          <Text variant="bodyMedium" style={{color: '#757575', marginTop: 10}}>Tap to change photo</Text>
        </View>

        <Surface style={styles.formContainer} elevation={0}>
            <TextInput
              label="Full Name"
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={styles.input}
              outlineColor="#E0E0E0"
              activeOutlineColor="#004B8D"
              left={<TextInput.Icon icon="account-outline" color="#757575" />}
            />

            <TextInput
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              style={styles.input}
              outlineColor="#E0E0E0"
              activeOutlineColor="#004B8D"
              keyboardType="email-address"
              left={<TextInput.Icon icon="email-outline" color="#757575" />}
            />

            <TextInput
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              mode="outlined"
              style={styles.input}
              outlineColor="#E0E0E0"
              activeOutlineColor="#004B8D"
              keyboardType="phone-pad"
              left={<TextInput.Icon icon="phone-outline" color="#757575" />}
            />

            <TextInput
              label="Hostel Name"
              value={hostelName}
              onChangeText={setHostelName}
              mode="outlined"
              style={styles.input}
              outlineColor="#E0E0E0"
              activeOutlineColor="#004B8D"
              left={<TextInput.Icon icon="office-building-outline" color="#757575" />}
            />
        </Surface>

        <Button 
          mode="contained" 
          onPress={handleSave} 
          style={styles.saveButton}
          contentStyle={{height: 50}}
          labelStyle={{fontSize: 16, fontWeight: 'bold'}}
          buttonColor="#004B8D"
        >
          Save Changes
        </Button>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  content: { padding: 20 },
  avatarSection: { alignItems: 'center', marginBottom: 30 },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#004B8D',
    padding: 8,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#FFF',
  },
  formContainer: { marginBottom: 20 },
  input: { backgroundColor: '#FFF', marginBottom: 15 },
  saveButton: { borderRadius: 12, marginTop: 10, elevation: 2 },
});

export default EditProfile;