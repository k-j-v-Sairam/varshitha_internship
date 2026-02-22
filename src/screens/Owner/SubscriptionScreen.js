import React from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { Text, Card, Button, Divider, Chip } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const SubscriptionScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('OwnerDashboard', { openProfile: true })}>
           <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text variant="titleLarge" style={{fontWeight:'bold', marginLeft: 20}}>Subscription</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        <Card style={styles.planCard} mode="elevated">
            <View style={styles.planHeader}>
                <View>
                    <Text variant="titleMedium" style={{color:'#FFF', opacity:0.9}}>Current Plan</Text>
                    <Text variant="headlineMedium" style={{color:'#FFF', fontWeight:'bold'}}>Premium Owner</Text>
                </View>
                <Chip icon="star" style={{backgroundColor:'#FFD700'}}>Pro</Chip>
            </View>
            <Divider style={{backgroundColor:'rgba(255,255,255,0.2)', marginVertical:15}} />
            <View style={styles.planDetails}>
                <Text style={styles.planText}>• Unlimited Tenants</Text>
                <Text style={styles.planText}>• Advanced Financial Reports</Text>
                <Text style={styles.planText}>• Priority Support</Text>
            </View>
            <Button 
                mode="contained" 
                style={styles.renewButton} 
                textColor="#004B8D"
                onPress={() => console.log('Renew Clicked')}
            >
                Renew Plan
            </Button>
            <Text style={styles.expiryText}>Expires on Jan 20, 2027</Text>
        </Card>

        <Text variant="titleMedium" style={styles.sectionTitle}>Payment History</Text>
        
        {[1, 2].map((item, index) => (
            <View key={index} style={styles.invoiceItem}>
                <View style={styles.invoiceIcon}>
                    <Icon name="file-document-outline" size={24} color="#004B8D" />
                </View>
                <View style={{flex:1}}>
                    <Text variant="titleSmall" style={{fontWeight:'bold'}}>Monthly Subscription</Text>
                    <Text variant="bodySmall" style={{color:'#757575'}}>Jan 21, 2026</Text>
                </View>
                <View style={{alignItems:'flex-end'}}>
                    <Text variant="titleSmall" style={{fontWeight:'bold'}}>₹499</Text>
                    <Text variant="labelSmall" style={{color:'#4CAF50'}}>Paid</Text>
                </View>
            </View>
        ))}

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  content: { padding: 20 },
  planCard: {
    backgroundColor: '#004B8D',
    padding: 20,
    borderRadius: 20,
    marginBottom: 30,
  },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  planDetails: { marginBottom: 20 },
  planText: { color: '#FFF', marginBottom: 5, fontSize: 14 },
  renewButton: { backgroundColor: '#FFF', borderRadius: 8 },
  expiryText: { color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 12, fontSize: 12 },
  sectionTitle: { fontWeight: 'bold', marginBottom: 15, color: '#333' },
  invoiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  invoiceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
});

export default SubscriptionScreen;