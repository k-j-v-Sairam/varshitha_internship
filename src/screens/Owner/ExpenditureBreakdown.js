import React from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { Text, Surface, IconButton, Divider, Avatar } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import { getMasterFinances } from '../../services/financeService';
import { Colors } from '../../theme/colors';

const ExpenditureBreakdown = ({ route, navigation }) => {
  const { monthYear } = route.params || {};

  const { data, isLoading } = useQuery({
    queryKey: ['masterFinances', monthYear],
    queryFn: () => getMasterFinances(monthYear),
    staleTime: 0,
    enabled: !!monthYear,
  });

  const blockStats = data?.blockStats || [];
  const globalStats = data?.globalStats || { expense: 0 };

  const formatCurrency = (amount) => {
    return '₹' + Number(amount || 0).toLocaleString('en-IN');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Surface style={styles.header} elevation={2}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, marginLeft: -8 }}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.textDark} />
          </TouchableOpacity>
          <Text variant="titleLarge" style={styles.headerTitle}>Expenditure Breakdown</Text>
          <View style={{ width: 24 }} />
        </View>
        <Text style={styles.headerSubtitle}>For {monthYear}</Text>
      </Surface>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Surface style={styles.totalCard} elevation={1}>
          <View style={[styles.iconCircle, { backgroundColor: '#FEF2F2' }]}>
            <MaterialCommunityIcons name="cash-minus" size={28} color={Colors.danger} />
          </View>
          <View>
            <Text style={styles.totalLabel}>Total Expenditure</Text>
            <Text style={styles.totalAmount}>{formatCurrency(globalStats.expense)}</Text>
          </View>
        </Surface>

        {isLoading ? (
          <Text style={{ textAlign: 'center', marginTop: 40, color: Colors.textLight }}>Loading details...</Text>
        ) : blockStats.length === 0 ? (
          <Text style={{ textAlign: 'center', marginTop: 40, color: Colors.textLight }}>No data available.</Text>
        ) : (
          blockStats.map((block) => {
            if (block.expense === 0) return null;

            return (
              <Surface key={block.name} style={styles.blockCard} elevation={1}>
                <TouchableOpacity 
                  style={styles.blockHeader} 
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('BlockRevenue', { blockName: block.name })}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Avatar.Icon size={40} icon="office-building" style={{ backgroundColor: '#EEF2FF', marginRight: 12 }} color={Colors.primary} />
                    <View>
                      <Text style={styles.blockName}>{block.name}</Text>
                      <Text style={styles.blockTotal}>Total: {formatCurrency(block.expense)}</Text>
                    </View>
                  </View>
                  <IconButton icon="pencil-outline" size={20} iconColor={Colors.primary} />
                </TouchableOpacity>

                <Divider style={{ marginVertical: 10 }} />

                {/* Staff Salaries */}
                {block.staffDetails?.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Staff Salaries</Text>
                    {block.staffDetails.map((staff, idx) => (
                      <View key={`staff-${idx}`} style={styles.lineItem}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={[styles.itemIcon, { backgroundColor: '#F0F9FF' }]}>
                            <MaterialCommunityIcons name="account-tie" size={18} color="#0284C7" />
                          </View>
                          <View>
                            <Text style={styles.itemName}>{staff.name}</Text>
                            <Text style={styles.itemSub}>{staff.role}</Text>
                          </View>
                        </View>
                        <Text style={styles.itemAmount}>{formatCurrency(staff.salary)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Manual Expenses */}
                {block.expenseDetails?.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Other Expenses</Text>
                    {block.expenseDetails.map((exp, idx) => (
                      <View key={`exp-${idx}`} style={styles.lineItem}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={[styles.itemIcon, { backgroundColor: (exp.color || Colors.primary) + '20' }]}>
                            <MaterialCommunityIcons name={exp.icon || 'receipt'} size={18} color={exp.color || Colors.primary} />
                          </View>
                          <View>
                            <Text style={styles.itemName}>{exp.category || 'General'}</Text>
                            <Text style={styles.itemSub}>{exp.description || 'No description'}</Text>
                          </View>
                        </View>
                        <Text style={styles.itemAmount}>{formatCurrency(exp.amount)}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </Surface>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: '#fff', paddingTop: 40, paddingBottom: 15, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontWeight: '800', color: Colors.textDark },
  headerSubtitle: { color: Colors.textLight, marginTop: 4, textAlign: 'center', fontWeight: '600' },
  
  content: { padding: 16 },
  
  totalCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 20 },
  iconCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  totalLabel: { fontSize: 13, color: Colors.textLight, fontWeight: '600', textTransform: 'uppercase' },
  totalAmount: { fontSize: 24, fontWeight: 'bold', color: Colors.danger, marginTop: 2 },

  blockCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16 },
  blockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  blockName: { fontSize: 18, fontWeight: 'bold', color: Colors.textDark },
  blockTotal: { fontSize: 14, color: Colors.danger, fontWeight: '600', marginTop: 2 },
  
  section: { marginTop: 10 },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: Colors.textLight, textTransform: 'uppercase', marginBottom: 10, letterSpacing: 0.5 },
  
  lineItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  itemIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemName: { fontSize: 15, fontWeight: '600', color: Colors.textDark },
  itemSub: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  itemAmount: { fontSize: 16, fontWeight: 'bold', color: Colors.textDark }
});

export default ExpenditureBreakdown;
