import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  ImageBackground,
  StatusBar,
  Alert,
  LayoutAnimation,
  UIManager,
  Image
} from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { Colors } from '../../theme/colors';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

// THEME: Using global colors
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const LoginScreen = ({ navigation }) => {
  // --- STATE ---
  const [isRegisterMode, setIsRegisterMode] = useState(false); // 🔥 Toggles form mode
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // 🔥 NEW: Extra Registration Fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [hostelName, setHostelName] = useState('');

  // --- LIFECYCLE ---
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '113753128245-1jhmmudti76vhk5ggul7dl8s8447k5sj.apps.googleusercontent.com', 
    });
  }, []);

  // --- AUTH METHODS ---
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPhone = (phone) => /^\d{10,15}$/.test(phone);

  const routeUserByRole = async (uid) => {
    try {
      const userDoc = await firestore().collection('users').doc(uid).get();
      
      if (!userDoc.exists) {
        Alert.alert("Account Not Found", "Your account is authenticated, but not registered in the database.");
        auth().signOut();
      }
    } catch (error) {
      console.error("Routing Error:", error);
      Alert.alert("Error", "Failed to retrieve user profile.");
    } finally {
      setLoading(false);
    }
  };

  // --- EMAIL/PASSWORD REGISTRATION (OWNERS ONLY) ---
  const handleRegister = async () => {
    if (!email || !password || !fullName || !phone || !hostelName) {
      Alert.alert("Missing Information", "Please fill in all details to create your account.");
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }
    if (!isValidPhone(phone)) {
      Alert.alert("Invalid Phone", "Please enter a valid phone number (10-15 digits).");
      return;
    }
    setLoading(true);
    try {
      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
      const uid = userCredential.user.uid;
      
      // 🔥 Update Firebase Auth Profile with Name for quick access
      await userCredential.user.updateProfile({ displayName: fullName.trim() });

      // 🔥 Save all details to Firestore
      await firestore().collection('users').doc(uid).set({
        role: 'Owner',
        ownerId: uid, 
        email: email.toLowerCase().trim(),
        fullName: fullName.trim(),
        phone: phone.trim(),
        hostelName: hostelName.trim(),
        createdAt: firestore.FieldValue.serverTimestamp()
      });
      
      await routeUserByRole(uid);
    } catch (error) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert("Registration Error", "That email address is already in use.");
      } else if (error.code === 'auth/invalid-email') {
        Alert.alert("Registration Error", "That email address is invalid.");
      } else {
        Alert.alert("Registration Error", error.message);
      }
      setLoading(false);
    } 
  };

  // --- EMAIL/PASSWORD LOGIN ---
  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing Information", "Please enter your email and password.");
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const userCredential = await auth().signInWithEmailAndPassword(email, password);
      await routeUserByRole(userCredential.user.uid);
    } catch (error) {
      console.error(error);
      Alert.alert("Login Failed", "Invalid email or password. Please try again.");
      setLoading(false);
    }
  };

  // --- GOOGLE LOGIN ---
  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.idToken || userInfo.data?.idToken; 
      
      if (!idToken) throw new Error("No ID token found.");

      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      const userCredential = await auth().signInWithCredential(googleCredential);
      const uid = userCredential.user.uid;
      
      if (userCredential.user) {
        const userDoc = await firestore().collection('users').doc(uid).get();
        
        if (!userDoc.exists) {
          // If new Google user, save default placeholders that they can edit later
          await firestore().collection('users').doc(uid).set({
            role: 'Owner',
            ownerId: uid,
            email: userCredential.user.email,
            fullName: userCredential.user.displayName || 'New Owner',
            phone: '',
            hostelName: 'My Hostel',
            createdAt: firestore.FieldValue.serverTimestamp()
          });
        }

        await routeUserByRole(uid);
      }
    } catch (error) {
      console.error("Google Auth Error:", error);
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log("User cancelled Google Login");
      } else {
        Alert.alert("Google Sign-In Error", error.message);
      }
      setLoading(false);
    } 
  };

  const handleSocialLogin = (platform) => {
    if (platform === 'Google') {
      handleGoogleLogin();
    } else if (platform === 'Apple') {
      Alert.alert("Coming Soon", "Apple Sign-In will be available shortly.");
    }
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
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent} 
            showsVerticalScrollIndicator={false}
          >
            
            {/* Header Section */}
            <View style={styles.headerSection}>
              <Image 
                source={require('../../assets/logo.png')} 
                style={styles.logoImage} 
                resizeMode="contain" 
              />
              <Text style={styles.appTitle}>HOSTRO</Text>
              <Text style={styles.appTagline}>Smart Campus Living</Text>
            </View>

            {/* White Card */}
            <View style={styles.whiteCard}>
              
              <Text style={styles.welcomeText}>
                {isRegisterMode ? 'Create Account' : 'Welcome Back!'}
              </Text>

              {/* 🔥 Conditional Registration Fields */}
              {isRegisterMode && (
                <>
                  <TextInput
                    placeholder="Full Name"
                    value={fullName}
                    onChangeText={setFullName}
                    maxLength={50}
                    mode="outlined"
                    style={styles.input}
                    textColor={Colors.textDark}
                    outlineColor="transparent"
                    activeOutlineColor={Colors.primary}
                    left={<TextInput.Icon icon="account-outline" color={Colors.textMedium} />}
                    theme={{ roundness: 15 }} 
                  />
                  <TextInput
                    placeholder="Phone Number"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    mode="outlined"
                    style={styles.input}
                    textColor={Colors.textDark}
                    outlineColor="transparent"
                    activeOutlineColor={Colors.primary}
                    left={<TextInput.Icon icon="phone-outline" color={Colors.textMedium} />}
                    theme={{ roundness: 15 }} 
                  />
                  <TextInput
                    placeholder="Hostel / Business Name"
                    value={hostelName}
                    onChangeText={setHostelName}
                    maxLength={50}
                    mode="outlined"
                    style={styles.input}
                    textColor={Colors.textDark}
                    outlineColor="transparent"
                    activeOutlineColor={Colors.primary}
                    left={<TextInput.Icon icon="office-building-outline" color={Colors.textMedium} />}
                    theme={{ roundness: 15 }} 
                  />
                </>
              )}
              
              {/* Email Input */}
              <TextInput
                placeholder="Email Address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                mode="outlined"
                style={styles.input}
                textColor={Colors.textDark}
                outlineColor="transparent"
                activeOutlineColor={Colors.primary}
                left={<TextInput.Icon icon="email-outline" color={Colors.textMedium} />}
                theme={{ roundness: 15, colors: { onSurfaceVariant: Colors.textMedium } }} 
              />

              {/* Password Input */}
              <TextInput
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                mode="outlined"
                style={styles.input}
                textColor={Colors.textDark}
                outlineColor="transparent"
                activeOutlineColor={Colors.primary}
                left={<TextInput.Icon icon="lock-outline" color={Colors.textMedium} />}
                right={
                  <TextInput.Icon 
                    icon={showPassword ? "eye-off" : "eye"} 
                    color={Colors.textMedium} 
                    onPress={() => setShowPassword(!showPassword)} 
                  />
                }
                theme={{ roundness: 15, colors: { onSurfaceVariant: Colors.textMedium } }}
              />

              {!isRegisterMode && (
                <TouchableOpacity 
                  style={styles.forgotPassContainer} 
                  onPress={() => Alert.alert("Reset Password", "Password reset flow coming soon.")}
                  disabled={loading}
                >
                  <Text style={styles.forgotPassText}>Forgot Password?</Text>
                </TouchableOpacity>
              )}

              {/* Toggle Buttons */}
              <View style={styles.actionRow}>
                {isRegisterMode ? (
                  <Button 
                    mode="contained" 
                    onPress={handleRegister} 
                    loading={loading}
                    disabled={loading}
                    style={[styles.actionBtn, styles.loginBtn]}
                    contentStyle={styles.btnContent}
                    labelStyle={styles.btnLabel}
                    buttonColor={Colors.primary}
                  >
                    Create Account
                  </Button>
                ) : (
                  <Button 
                    mode="contained" 
                    onPress={handleEmailLogin} 
                    loading={loading}
                    disabled={loading}
                    style={[styles.actionBtn, styles.loginBtn]}
                    contentStyle={styles.btnContent}
                    labelStyle={styles.btnLabel}
                    buttonColor={Colors.primary}
                  >
                    Login
                  </Button>
                )}
              </View>

              <TouchableOpacity 
                style={styles.toggleModeBtn} 
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setIsRegisterMode(!isRegisterMode);
                }}
              >
                <Text style={styles.toggleModeText}>
                  {isRegisterMode ? "Already have an account? Login" : "New here? Create an Account"}
                </Text>
              </TouchableOpacity>

              {/* Social Login */}
              {!isRegisterMode && (
                <View style={styles.socialSection}>
                  <Text style={styles.socialText}>Or continue with</Text>
                  <View style={styles.socialRow}>
                    <TouchableOpacity style={styles.socialBtn} onPress={() => handleSocialLogin('Google')}>
                      <MaterialCommunityIcons name="google" size={24} color="#DB4437" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.socialBtn} onPress={() => handleSocialLogin('Apple')}>
                      <MaterialCommunityIcons name="apple" size={24} color="#000000" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

            </View>
          </ScrollView>
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>Need help? </Text>
            <TouchableOpacity onPress={() => console.log('Contact Admin Pressed')}>
              <Text style={styles.footerLink}>Contact Admin</Text>
            </TouchableOpacity>
          </View>

        </KeyboardAvoidingView>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, width: '100%', height: '100%' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.15)' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  headerSection: { alignItems: 'center', marginBottom: 30, marginTop: 40 },
  appTitle: { fontSize: 28, fontWeight: 'bold', color: Colors.primary, letterSpacing: 0.5 },
  appTagline: { fontSize: 14, color: Colors.textMedium, marginTop: 5, fontWeight: '600' },
  whiteCard: { backgroundColor: Colors.cardBg, borderRadius: 24, padding: 24, elevation: 5, shadowColor: Colors.primaryDark, shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } },
  welcomeText: { fontSize: 22, fontWeight: 'bold', color: Colors.textDark, marginBottom: 24, textAlign: 'center' },
  logoImage: { width: 80, height: 80, marginBottom: 10 },
  input: { backgroundColor: Colors.inputBg, marginBottom: 14 },
  forgotPassContainer: { alignItems: 'flex-end', marginBottom: 20, marginTop: -5 },
  forgotPassText: { color: Colors.primary, fontWeight: '600', fontSize: 13 },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  actionBtn: { flex: 1, borderRadius: 30, elevation: 2, marginBottom: 0 },
  loginBtn: { },
  btnContent: { height: 50 },
  btnLabel: { fontSize: 16, fontWeight: 'bold' },
  toggleModeBtn: { alignItems: 'center', marginBottom: 25 },
  toggleModeText: { color: Colors.primary, fontWeight: '600', fontSize: 14 },
  socialSection: { alignItems: 'center' },
  socialText: { color: Colors.textMedium, fontWeight: '500', marginBottom: 15, fontSize: 13 },
  socialRow: { flexDirection: 'row', width: '100%', justifyContent: 'center', gap: 20 },
  socialBtn: { backgroundColor: '#fff', width: 45, height: 45, borderRadius: 25, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  footer: { flexDirection: 'row', justifyContent: 'center', padding: 20 },
  footerText: { fontSize: 14, color: '#FFF', fontWeight: '500', textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: {width: -1, height: 1}, textShadowRadius: 10 },
  footerLink: { fontSize: 14, fontWeight: 'bold', color: Colors.primaryLight, textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: {width: -1, height: 1}, textShadowRadius: 10 },
});

export default LoginScreen;