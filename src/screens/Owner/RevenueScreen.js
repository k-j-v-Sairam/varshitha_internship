import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, RefreshControl } from 'react-native';
import { Text, Card, Avatar, IconButton, Surface, ProgressBar } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import auth from '@react-native-firebase/auth';
import { useQuery } from '@tanstack/react-query';
import { getMasterFinances } from '../../services/financeService';
import SkeletonLoader from '../../components/common/SkeletonLoader';

import { Colors } from '../../theme/colors';

const RevenueScreen = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false); 
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const displayMonth = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  const queryMonthYear = `${String(currentDate.getMonth() + 1).padStart(2, '0')}-${currentDate.getFullYear()}`;

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['masterFinances', queryMonthYear],
    queryFn: () => getMasterFinances(queryMonthYear),
    staleTime: 0, // Always fetch fresh data — critical for rent payment reflection
  });

  const globalStats = data?.globalStats || { revenue: 0, paidRevenue: 0, expense: 0, pending: 0, profit: 0 };
  const blockStats = data?.blockStats || [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const changeMonth = (offset) => {
    // FIX: Create a fresh Date object — never mutate state directly
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  const formatCurrency = (amount) => {
    return '₹' + amount.toLocaleString('en-IN');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Surface style={styles.header} elevation={2}>
        <View style={styles.headerRow}>
          <Text variant="titleLarge" style={styles.headerTitle}>Financial Hub</Text>
          <IconButton icon="bell-outline" size={24} iconColor={Colors.textDark} onPress={() => navigation.navigate('OwnerPendingPayments')} />
        </View>
        
        <View style={styles.monthSelector}>
          <IconButton icon="chevron-left" size={24} onPress={() => changeMonth(-1)} />
          <Text style={styles.monthText}>{displayMonth}</Text>
          <IconButton icon="chevron-right" size={24} onPress={() => changeMonth(1)} />
        </View>
      </Surface>

      <ScrollView 
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        {((isLoading || isFetching) && !refreshing) ? (
          <View style={{ gap: 20 }}>
            <SkeletonLoader width="100%" height={140} borderRadius={20} />
            <View style={styles.row}>
              <SkeletonLoader width="48%" height={100} borderRadius={16} />
              <SkeletonLoader width="48%" height={100} borderRadius={16} />
            </View>
            <SkeletonLoader width="100%" height={70} borderRadius={16} />
            <Text style={[styles.sectionTitle, {marginTop: 10}]}>Block-wise Breakdown</Text>
            <SkeletonLoader width="100%" height={120} borderRadius={16} style={{ marginBottom: 12 }} />
            <SkeletonLoader width="100%" height={120} borderRadius={16} style={{ marginBottom: 12 }} />
          </View>
        ) : (
          <>
            <Card style={styles.heroCard}>
              <View style={styles.heroBackground}>
                <View>
                  <Text style={styles.heroLabel}>Net Profit (Projected)</Text>
                  <Text style={styles.heroAmount}>{formatCurrency(globalStats.profit)}</Text>
                  <View style={styles.trendBadge}>
                    <MaterialCommunityIcons name="trending-up" size={16} color="#4CAF50" />
                    <Text style={styles.trendText}> Across all blocks</Text>
                  </View>
                </View>
                <Avatar.Icon size={56} icon="chart-line" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
              </View>
            </Card>

            <View style={styles.row}>
              <TouchableOpacity 
                style={styles.halfCardContainer}
                onPress={() => navigation.navigate('ExpenditureBreakdown', { monthYear: queryMonthYear })}
              >
                <Card style={[styles.statCard, { borderLeftColor: Colors.danger }]}>
                  <Card.Content>
                    <View style={[styles.iconCircle, { backgroundColor: '#FEF2F2' }]}>
                      <MaterialCommunityIcons name="cash-minus" size={24} color={Colors.danger} />
                    </View>
                    <Text style={styles.statLabel}>Total Expenditure</Text>
                    <Text style={styles.statAmount}>{formatCurrency(globalStats.expense)}</Text>
                  </Card.Content>
                </Card>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.halfCardContainer}
                onPress={() => navigation.navigate('RevenueBreakdown', { monthYear: queryMonthYear, type: 'Collected' })}
              >
                <Card style={[styles.statCard, { borderLeftColor: Colors.success }]}>
                  <Card.Content>
                    <View style={[styles.iconCircle, { backgroundColor: '#ECFDF5' }]}>
                      <MaterialCommunityIcons name="cash-check" size={24} color={Colors.success} />
                    </View>
                    <Text style={styles.statLabel}>Total Collected</Text>
                    <Text style={[styles.statAmount, {color: Colors.success}]}>{formatCurrency(globalStats.paidRevenue)}</Text>
                  </Card.Content>
                </Card>
              </TouchableOpacity>
            </View>

            <View style={styles.row}>
              <TouchableOpacity 
                style={[styles.halfCardContainer, { width: '100%' }]}
                onPress={() => navigation.navigate('RevenueBreakdown', { monthYear: queryMonthYear, type: 'Expected' })}
              >
                <Card style={[styles.statCard, { borderLeftColor: Colors.warning }]}>
                  <Card.Content style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <View style={[styles.iconCircle, { backgroundColor: '#FFFBEB', marginBottom: 8 }]}>
                        <MaterialCommunityIcons name="cash-clock" size={24} color={Colors.warning} />
                      </View>
                      <Text style={styles.statLabel}>Total Expected</Text>
                      <Text style={[styles.statAmount, { color: Colors.warning }]}>{formatCurrency(globalStats.revenue)}</Text>
                    </View>
                  </Card.Content>
                </Card>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Quick Insights</Text>
            <TouchableOpacity onPress={() => navigation.navigate('RevenueBreakdown', { monthYear: queryMonthYear, type: 'Pending' })}>
              <Card style={styles.insightCard}>
                <Card.Content style={styles.insightContent}>
                <View style={[styles.iconCircle, { backgroundColor: '#FFFBEB', width: 48, height: 48, borderRadius: 24, marginBottom: 0 }]}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={26} color={Colors.warning} />
                </View>
                <View style={{ marginLeft: 16, flex: 1 }}>
                  <Text style={styles.insightLabel}>Pending Rents across all blocks</Text>
                  <Text style={styles.insightAmount}>{formatCurrency(globalStats.pending)}</Text>
                </View>
                <IconButton icon="chevron-right" size={20} iconColor={Colors.textLight} />
              </Card.Content>
              </Card>
            </TouchableOpacity>

            <Text style={[styles.sectionTitle, {marginTop: 10}]}>Block-wise Breakdown</Text>
            
            {blockStats.length === 0 ? (
              <Text style={{textAlign: 'center', color: Colors.textLight, marginTop: 20}}>No financial data available for this month.</Text>
            ) : (
              blockStats.map((block, index) => {
                const expenseRatio = block.revenue > 0 ? Math.min(block.expense / block.revenue, 1) : 0;
                const barColor = expenseRatio > 0.8 ? Colors.danger : expenseRatio > 0.5 ? Colors.warning : Colors.success;

                return (
                  <TouchableOpacity 
                    key={index} 
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('BlockRevenue', { blockName: block.name })} 
                  >
                    <Surface style={styles.blockRowCard} elevation={1}>
                      <View style={styles.blockRowHeader}>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                          <Avatar.Icon size={36} icon="office-building" style={{backgroundColor: '#EEF2FF', marginRight: 12}} color={Colors.primary} />
                          <View>
                            <Text style={styles.blockName}>{block.name}</Text>
                            <Text style={styles.blockProfit}>Profit: <Text style={{color: block.profit >= 0 ? Colors.success : Colors.danger}}>{formatCurrency(block.profit)}</Text></Text>
                          </View>
                        </View>
                        <IconButton icon="chevron-right" size={20} iconColor={Colors.textLight} />
                      </View>
                      
                      <View style={styles.blockStatsRow}>
                        <View>
                          <Text style={styles.miniLabel}>Revenue</Text>
                          <Text style={styles.miniValue}>{formatCurrency(block.revenue)}</Text>
                        </View>
                        <View style={{alignItems: 'flex-end'}}>
                          <Text style={styles.miniLabel}>Expenses (Inc. Payroll)</Text>
                          <Text style={[styles.miniValue, {color: Colors.danger}]}>{formatCurrency(block.expense)}</Text>
                        </View>
                      </View>
                      
                      <ProgressBar progress={expenseRatio} color={barColor} style={{height: 6, borderRadius: 3, marginTop: 10, backgroundColor: '#F1F5F9'}} />
                    </Surface>
                  </TouchableOpacity>
                );
              })
            )}

            <View style={{height: 40}} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: '#fff', paddingTop: 40, paddingBottom: 10, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  headerTitle: { fontWeight: '800', color: Colors.textDark },
  monthSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10 },
  monthText: { fontSize: 16, fontWeight: 'bold', color: Colors.primary },
  content: { padding: 16 },
  
  heroCard: { backgroundColor: Colors.primary, borderRadius: 20, marginBottom: 20, elevation: 4 },
  heroBackground: { padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel: { color: '#E0E7FF', fontSize: 13, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
  heroAmount: { color: '#FFF', fontSize: 36, fontWeight: 'bold', marginBottom: 8 },
  trendBadge: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', alignItems: 'center' },
  trendText: { color: '#FFF', fontSize: 12, fontWeight: 'bold', marginLeft: 4 },

  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  halfCardContainer: { width: '48%' },
  statCard: { backgroundColor: '#FFF', borderLeftWidth: 4, elevation: 1, borderRadius: 16 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statLabel: { color: Colors.textLight, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  statAmount: { fontSize: 20, fontWeight: 'bold', color: Colors.textDark, marginTop: 4 },

  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: Colors.textDark, marginLeft: 4 },
  
  insightCard: { backgroundColor: '#FFF', borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: Colors.border, elevation: 0 },
  insightContent: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  insightLabel: { fontSize: 13, color: Colors.textLight, fontWeight: '500' },
  insightAmount: { fontSize: 18, fontWeight: 'bold', color: Colors.warning, marginTop: 2 },

  blockRowCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  blockRowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  blockName: { fontSize: 16, fontWeight: 'bold', color: Colors.textDark },
  blockProfit: { fontSize: 13, color: Colors.textLight, fontWeight: '500', marginTop: 2 },
  blockStatsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  miniLabel: { fontSize: 11, color: Colors.textLight, textTransform: 'uppercase', fontWeight: '600' },
  miniValue: { fontSize: 15, fontWeight: 'bold', color: Colors.textDark, marginTop: 2 }
});

export default RevenueScreen;