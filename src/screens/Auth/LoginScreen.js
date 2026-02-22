import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  ImageBackground,
  StatusBar,
  Alert
} from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const { width, height } = Dimensions.get('window');

// THEME: Bright & Clean
const THEME = {
  primary: '#5D5FEF',      // Violet-Blue
  textMain: '#2D2D2D',     
  textSec: '#888888',      
  cardBg: '#FFFFFF',       
  inputBg: '#F5F5F5',      
  google: '#DB4437',
  apple: '#000000',
  phone: '#28C4D9'
};

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Role Selection State
  const [selectedRole, setSelectedRole] = useState('Owner'); 

  const handleLogin = () => {
    // FIX APPLIED: Matches line 88 in your AppNavigator.js
    // <Stack.Screen name="OwnerDashboard" component={OwnerTabs} />
    try {
      navigation.replace('OwnerDashboard'); 
    } catch (error) {
      console.error("Navigation Error:", error);
      Alert.alert("Error", "Could not navigate to Dashboard.");
    }
  };
  
  const handleSocialLogin = (platform) => {
    console.log(`Login with ${platform} pressed`);
  };

  const renderRoleTab = (role) => {
    const isActive = selectedRole === role;
    return (
      <TouchableOpacity 
        style={[styles.roleTab, isActive && styles.roleTabActive]}
        onPress={() => setSelectedRole(role)}
      >
        <Text style={[styles.roleText, isActive && styles.roleTextActive]}>
          {role}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <ImageBackground
      source={require('../../assets/login_bg.jpg')} 
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <View style={styles.overlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent} 
            showsVerticalScrollIndicator={false}
          >
            
            {/* Header Section */}
            <View style={styles.headerSection}>
              <Text style={styles.appTitle}>Hostel Manager</Text>
              <Text style={styles.appTagline}>Smart Campus Living</Text>
            </View>

            {/* White Card */}
            <View style={styles.whiteCard}>
              
              <Text style={styles.welcomeText}>Welcome Back!</Text>

              {/* Role Selection Tabs */}
              <View style={styles.roleContainer}>
                {renderRoleTab('Owner')}
                {renderRoleTab('Tenant')}
                {renderRoleTab('Staff')}
              </View>
              
              {/* Inputs */}
              <TextInput
                placeholder={`${selectedRole} ID or Email`}
                value={email}
                onChangeText={setEmail}
                mode="outlined"
                style={styles.input}
                textColor={THEME.textMain}
                outlineColor="transparent"
                activeOutlineColor={THEME.primary}
                left={<TextInput.Icon icon="account-outline" color={THEME.textSec} />}
                theme={{ roundness: 15, colors: { onSurfaceVariant: THEME.textSec } }} 
              />

              <TextInput
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                mode="outlined"
                secureTextEntry={!showPassword}
                style={styles.input}
                textColor={THEME.textMain}
                outlineColor="transparent"
                activeOutlineColor={THEME.primary}
                left={<TextInput.Icon icon="lock-outline" color={THEME.textSec} />}
                right={
                  <TextInput.Icon 
                    icon={showPassword ? "eye-off" : "eye"} 
                    color={THEME.textSec} 
                    onPress={() => setShowPassword(!showPassword)} 
                  />
                }
                theme={{ roundness: 15, colors: { onSurfaceVariant: THEME.textSec } }}
              />

              <TouchableOpacity style={styles.forgotPassContainer}>
                <Text style={styles.forgotPassText}>Forgot Password?</Text>
              </TouchableOpacity>

              {/* Login Button */}
              <Button 
                mode="contained" 
                onPress={handleLogin} 
                style={styles.loginBtn}
                contentStyle={{ height: 50 }}
                labelStyle={{ fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5 }}
                buttonColor={THEME.primary}
              >
                Login as {selectedRole}
              </Button>

              {/* Social Section */}
              <View style={styles.socialSection}>
                <Text style={styles.socialText}>Or login with</Text>
                <View style={styles.socialRow}>
                  <TouchableOpacity style={styles.socialBtn} onPress={() => handleSocialLogin('Google')}>
                    <MaterialCommunityIcons name="google" size={22} color={THEME.google} />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.socialBtn} onPress={() => handleSocialLogin('Apple')}>
                    <MaterialCommunityIcons name="apple" size={22} color={THEME.apple} />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.socialBtn} onPress={() => handleSocialLogin('Phone')}>
                    <MaterialCommunityIcons name="cellphone" size={22} color={THEME.phone} />
                  </TouchableOpacity>
                </View>
              </View>

            </View>
          </ScrollView>
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>New here? </Text>
            <TouchableOpacity onPress={() => console.log('Register Pressed')}>
              <Text style={styles.footerLink}>Create Account</Text>
            </TouchableOpacity>
          </View>

        </KeyboardAvoidingView>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent', 
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 50,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: THEME.primary, 
    letterSpacing: 0.5,
  },
  appTagline: {
    fontSize: 14,
    color: THEME.textSec,
    marginTop: 5,
    fontWeight: '600',
  },
  whiteCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
    borderRadius: 24,
    padding: 24,
    elevation: 5, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: THEME.textMain, 
    marginBottom: 20,
    textAlign: 'center',
  },
  roleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  roleTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  roleTabActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.textSec,
  },
  roleTextActive: {
    color: THEME.primary,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: THEME.inputBg, 
    marginBottom: 16,
    height: 50,
  },
  forgotPassContainer: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  forgotPassText: {
    color: THEME.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  loginBtn: {
    borderRadius: 30, 
    marginBottom: 25,
    elevation: 2,
  },
  socialSection: {
    alignItems: 'center',
  },
  socialText: {
    color: THEME.textSec,
    fontWeight: '500',
    marginBottom: 15,
    fontSize: 13,
  },
  socialRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
    gap: 20,
  },
  socialBtn: {
    backgroundColor: '#fff',
    width: 45,
    height: 45,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 20,
  },
  footerText: {
    fontSize: 14,
    color: THEME.textMain,
    fontWeight: '500',
  },
  footerLink: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.primary,
  },
});

export default LoginScreen;