import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Text, TextInput, Button, Avatar, Surface } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { Colors } from '../../theme/colors';

const EditProfile = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [hostelName, setHostelName] = useState('');

  // Auto-generate initials safely
  const initials = name && name.length >= 2 ? name.substring(0, 2).toUpperCase() : (name ? name.toUpperCase() : 'OP');

  useEffect(() => {
    const fetchUserData = async () => {
      const currentUser = auth().currentUser;
      if (currentUser) {
        setEmail(currentUser.email || '');
        try {
          const doc = await firestore().collection('users').doc(currentUser.uid).get();
          if (doc.exists) {
            const data = doc.data();
            setName(data.fullName || currentUser.displayName || '');
            setPhone(data.phone || '');
            setHostelName(data.hostelName || '');
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
          Alert.alert("Error", "Could not load profile details.");
        }
      }
      setLoading(false);
    };
    fetchUserData();
  }, []);

  const handleSave = async () => {
    if (!name.trim() || !phone.trim() || !hostelName.trim()) {
      Alert.alert("Missing Fields", "Please fill out all editable fields.");
      return;
    }

    setSaving(true);
    const currentUser = auth().currentUser;

    if (!currentUser) {
        Alert.alert("Error", "User not authenticated.");
        setSaving(false);
        return;
    }

    try {
      await currentUser.updateProfile({ displayName: name.trim() });
      await firestore().collection('users').doc(currentUser.uid).update({
        fullName: name.trim(),
        phone: phone.trim(),
        hostelName: hostelName.trim()
      });

      Alert.alert("Success", "Profile updated successfully!");
      navigation.navigate('OwnerDashboard', { openProfile: true });
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Could not save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePhoto = () => {
    Alert.alert("Coming Soon", "Photo upload functionality will be integrated soon.");
  };

  if (loading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background}}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

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

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          
          <View style={styles.avatarSection}>
            <View>
              <Avatar.Text size={100} label={initials} style={{backgroundColor: Colors.primaryLight}} color={Colors.primary} />
              <TouchableOpacity style={styles.cameraIcon} onPress={handleChangePhoto}>
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
                activeOutlineColor={Colors.primary}
                left={<TextInput.Icon icon="account-outline" color="#757575" />}
              />

              <TextInput
                label="Email Address"
                value={email}
                editable={false}
                mode="outlined"
                style={[styles.input, styles.disabledInput]}
                outlineColor="#E0E0E0"
                textColor="#A0A0A0"
                left={<TextInput.Icon icon="email-outline" color="#A0A0A0" />}
              />

              <TextInput
                label="Phone Number"
                value={phone}
                onChangeText={setPhone}
                mode="outlined"
                style={styles.input}
                outlineColor="#E0E0E0"
                activeOutlineColor={Colors.primary}
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
                activeOutlineColor={Colors.primary}
                left={<TextInput.Icon icon="office-building-outline" color="#757575" />}
              />
          </Surface>

          <Button 
            mode="contained" 
            onPress={handleSave} 
            loading={saving}
            disabled={saving}
            style={styles.saveButton}
            contentStyle={{height: 50}}
            labelStyle={{fontSize: 16, fontWeight: 'bold'}}
            buttonColor={Colors.primary}
          >
            Save Changes
          </Button>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: { padding: 5 },
  content: { padding: 20 },
  avatarSection: { alignItems: 'center', marginBottom: 30 },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    padding: 8,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: Colors.cardBg,
  },
  formContainer: { marginBottom: 20 },
  input: { backgroundColor: Colors.cardBg, marginBottom: 15 },
  disabledInput: { backgroundColor: Colors.inputBg },
  saveButton: { borderRadius: 12, marginTop: 10, elevation: 2 },
});

export default EditProfile;