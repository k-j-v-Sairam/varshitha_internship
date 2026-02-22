import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Appbar, Surface } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const ExpenditureScreen = ({ navigation }) => {
  
  // Reusable Option Button
  const OptionItem = ({ label, icon, color, subtitle, onPress }) => (
    <TouchableOpacity style={styles.optionCard} onPress={onPress}>
      <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
        <MaterialCommunityIcons name={icon} size={24} color={color} />
      </View>
      <View style={styles.optionText}>
        <Text style={styles.optionTitle}>{label}</Text>
        <Text style={styles.optionSubtitle}>{subtitle}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color="#BDBDBD" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Expenditure" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Recurring Section */}
        <Text style={styles.sectionHeader}>RECURRING EXPENSES</Text>
        <Surface style={styles.sectionSurface}>
            <OptionItem 
                label="Staff Salaries" 
                subtitle="Monthly payouts for Maids, Guards"
                icon="account-cash" 
                color="#6200EE" 
                onPress={() => console.log('Staff Salaries')}
            />
            <View style={styles.divider} />
            <OptionItem 
                label="Provisions" 
                subtitle="Groceries, Water, Supplies"
                icon="food-apple" 
                color="#FB8C00" 
                onPress={() => console.log('Provisions')}
            />
            <View style={styles.divider} />
            <OptionItem 
                label="Maintenance" 
                subtitle="Fixed monthly maintenance costs"
                icon="tools" 
                color="#03DAC6" 
                onPress={() => console.log('Maintenance')}
            />
        </Surface>

        {/* Non-Recurring Section */}
        <Text style={styles.sectionHeader}>NON-RECURRING (ONE-TIME)</Text>
        <Surface style={styles.sectionSurface}>
            <OptionItem 
                label="Current Month" 
                subtitle="Add ad-hoc bills for this month"
                icon="calendar-month" 
                color="#2196F3" 
                onPress={() => console.log('Current Month')}
            />
            <View style={styles.divider} />
            <OptionItem 
                label="Taxes & Govt Fees" 
                subtitle="Property tax, municipal charges"
                icon="bank" 
                color="#607D8B" 
                onPress={() => console.log('Taxes')}
            />
            <View style={styles.divider} />
            <OptionItem 
                label="History" 
                subtitle="View past one-time expenses"
                icon="history" 
                color="#9E9E9E" 
                onPress={() => console.log('History')}
            />
        </Surface>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { backgroundColor: '#F5F5F5', elevation: 0 },
  scrollContent: { padding: 16 },
  sectionHeader: { fontSize: 13, fontWeight: 'bold', color: '#757575', marginBottom: 8, marginTop: 16, marginLeft: 4 },
  sectionSurface: { backgroundColor: '#FFF', borderRadius: 12, elevation: 1, overflow: 'hidden' },
  
  optionCard: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  iconBox: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  optionText: { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  optionSubtitle: { fontSize: 12, color: '#9E9E9E', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginLeft: 80 }
});

export default ExpenditureScreen;