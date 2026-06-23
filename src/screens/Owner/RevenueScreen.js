import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, RefreshControl } from 'react-native';
import { Text, Card, Avatar, IconButton, Surface, ProgressBar } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth'; // 🔥 IMPORT ADDED FOR SECURITY

const colors = {
  primary: '#6200EE', background: '#F8FAFC', cardBg: '#FFFFFF', 
  textDark: '#1E293B', textLight: '#64748B', success: '#10B981', 
  danger: '#EF4444', border: '#E2E8F0', warning: '#F59E0B'
};

const RevenueScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); 
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [globalStats, setGlobalStats] = useState({ revenue: 0, expense: 0, pending: 0, profit: 0 });
  const [blockStats, setBlockStats] = useState([]);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const displayMonth = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  const queryMonthYear = `${String(currentDate.getMonth() + 1).padStart(2, '0')}-${currentDate.getFullYear()}`;

  const loadMasterFinances = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    
    const currentOwnerId = auth().currentUser?.uid;
    if (!currentOwnerId) {
      setLoading(false);
      return;
    }

    try {
      // 🔥 ISOLATION: Fetch only THIS owner's tenants
      const tenantsSnap = await firestore().collection('tenants')
        .where('ownerId', '==', currentOwnerId)
        .get();
        
      let totalRev = 0;
      let totalPend = 0;
      let blockRevMap = {};

      tenantsSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.rentStatus !== 'Unassigned') {
          const rent = Number(data.agreedRent || 0);
          totalRev += rent;
          
          if (data.rentStatus === 'Pending') {
            totalPend += rent;
          }

          const bName = data.blockId || 'Unknown';
          blockRevMap[bName] = (blockRevMap[bName] || 0) + rent;
        }
      });

      // 🔥 ISOLATION: Fetch only THIS owner's block expenses
      const expensesSnap = await firestore().collection('block_expenses')
        .where('ownerId', '==', currentOwnerId)
        .where('monthYear', '==', queryMonthYear)
        .get();

      let totalExp = 0;
      let blockExpMap = {};

      expensesSnap.docs.forEach(doc => {
        const data = doc.data();
        const amt = Number(data.amount || 0);
        totalExp += amt;

        const bName = data.blockName || 'Unknown';
        blockExpMap[bName] = (blockExpMap[bName] || 0) + amt;
      });

      // 🔥 ISOLATION: Fetch only THIS owner's staff
      const staffSnap = await firestore().collection('staff')
        .where('ownerId', '==', currentOwnerId)
        .get();
        
      staffSnap.docs.forEach(doc => {
        const data = doc.data();
        const salary = Number(data.salary || 0);
        
        if (salary > 0) {
          totalExp += salary; 
          
          const bName = data.block || 'Unassigned';
          if (bName !== 'Unassigned') {
            blockExpMap[bName] = (blockExpMap[bName] || 0) + salary; 
          }
        }
      });

      const uniqueBlocks = Array.from(new Set([...Object.keys(blockRevMap), ...Object.keys(blockExpMap)]));
      
      const bStats = uniqueBlocks.map(bName => {
        const rev = blockRevMap[bName] || 0;
        const exp = blockExpMap[bName] || 0;
        return {
          name: bName,
          revenue: rev,
          expense: exp,
          profit: rev - exp
        };
      });

      bStats.sort((a, b) => b.revenue - a.revenue);

      setGlobalStats({
        revenue: totalRev,
        expense: totalExp,
        pending: totalPend,
        profit: totalRev - totalExp
      });
      
      setBlockStats(bStats);
    } catch (error) {
      console.error("Error loading master finances:", error);
    } finally {
      if (!isRefresh) setLoading(false);
      setRefreshing(false); // Ensure refreshing is turned off even if it fails
    }
  }, [queryMonthYear]);

  useEffect(() => {
    loadMasterFinances();
  }, [loadMasterFinances]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMasterFinances(true);
  }, [loadMasterFinances]);

  const changeMonth = (offset) => {
    const newDate = new Date(currentDate.setMonth(currentDate.getMonth() + offset));
    setCurrentDate(new Date(newDate));
  };

  const formatCurrency = (amount) => {
    return '₹' + amount.toLocaleString('en-IN');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Surface style={styles.header} elevation={2}>
        <View style={styles.headerRow}>
          <Text variant="titleLarge" style={styles.headerTitle}>Financial Hub</Text>
          <IconButton icon="bell-outline" size={24} iconColor={colors.textDark} />
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{marginTop: 50}} />
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
              <TouchableOpacity style={styles.halfCardContainer}>
                <Card style={[styles.statCard, { borderLeftColor: colors.danger }]}>
                  <Card.Content>
                    <View style={[styles.iconCircle, { backgroundColor: '#FEF2F2' }]}>
                      <MaterialCommunityIcons name="cash-minus" size={24} color={colors.danger} />
                    </View>
                    <Text style={styles.statLabel}>Total Expenditure</Text>
                    <Text style={styles.statAmount}>{formatCurrency(globalStats.expense)}</Text>
                  </Card.Content>
                </Card>
              </TouchableOpacity>

              <TouchableOpacity style={styles.halfCardContainer}>
                <Card style={[styles.statCard, { borderLeftColor: colors.success }]}>
                  <Card.Content>
                    <View style={[styles.iconCircle, { backgroundColor: '#ECFDF5' }]}>
                      <MaterialCommunityIcons name="cash-plus" size={24} color={colors.success} />
                    </View>
                    <Text style={styles.statLabel}>Total Expected</Text>
                    <Text style={[styles.statAmount, {color: colors.success}]}>{formatCurrency(globalStats.revenue)}</Text>
                  </Card.Content>
                </Card>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Quick Insights</Text>
            <Card style={styles.insightCard}>
              <Card.Content style={styles.insightContent}>
                <View style={[styles.iconCircle, { backgroundColor: '#FFFBEB', width: 48, height: 48, borderRadius: 24, marginBottom: 0 }]}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={26} color={colors.warning} />
                </View>
                <View style={{ marginLeft: 16, flex: 1 }}>
                  <Text style={styles.insightLabel}>Pending Rents across all blocks</Text>
                  <Text style={styles.insightAmount}>{formatCurrency(globalStats.pending)}</Text>
                </View>
                <IconButton icon="chevron-right" size={20} iconColor={colors.textLight} />
              </Card.Content>
            </Card>

            <Text style={[styles.sectionTitle, {marginTop: 10}]}>Block-wise Breakdown</Text>
            
            {blockStats.length === 0 ? (
              <Text style={{textAlign: 'center', color: colors.textLight, marginTop: 20}}>No financial data available for this month.</Text>
            ) : (
              blockStats.map((block, index) => {
                const expenseRatio = block.revenue > 0 ? Math.min(block.expense / block.revenue, 1) : 0;
                const barColor = expenseRatio > 0.8 ? colors.danger : expenseRatio > 0.5 ? colors.warning : colors.success;

                return (
                  <TouchableOpacity 
                    key={index} 
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('BlockRevenue', { blockName: block.name })} 
                  >
                    <Surface style={styles.blockRowCard} elevation={1}>
                      <View style={styles.blockRowHeader}>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                          <Avatar.Icon size={36} icon="office-building" style={{backgroundColor: '#EEF2FF', marginRight: 12}} color={colors.primary} />
                          <View>
                            <Text style={styles.blockName}>{block.name}</Text>
                            <Text style={styles.blockProfit}>Profit: <Text style={{color: block.profit >= 0 ? colors.success : colors.danger}}>{formatCurrency(block.profit)}</Text></Text>
                          </View>
                        </View>
                        <IconButton icon="chevron-right" size={20} iconColor={colors.textLight} />
                      </View>
                      
                      <View style={styles.blockStatsRow}>
                        <View>
                          <Text style={styles.miniLabel}>Revenue</Text>
                          <Text style={styles.miniValue}>{formatCurrency(block.revenue)}</Text>
                        </View>
                        <View style={{alignItems: 'flex-end'}}>
                          <Text style={styles.miniLabel}>Expenses (Inc. Payroll)</Text>
                          <Text style={[styles.miniValue, {color: colors.danger}]}>{formatCurrency(block.expense)}</Text>
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
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: '#fff', paddingTop: 40, paddingBottom: 10, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  headerTitle: { fontWeight: '800', color: colors.textDark },
  monthSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10 },
  monthText: { fontSize: 16, fontWeight: 'bold', color: colors.primary },
  content: { padding: 16 },
  
  heroCard: { backgroundColor: colors.primary, borderRadius: 20, marginBottom: 20, elevation: 4 },
  heroBackground: { padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel: { color: '#E0E7FF', fontSize: 13, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
  heroAmount: { color: '#FFF', fontSize: 36, fontWeight: 'bold', marginBottom: 8 },
  trendBadge: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', alignItems: 'center' },
  trendText: { color: '#FFF', fontSize: 12, fontWeight: 'bold', marginLeft: 4 },

  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  halfCardContainer: { width: '48%' },
  statCard: { backgroundColor: '#FFF', borderLeftWidth: 4, elevation: 1, borderRadius: 16 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statLabel: { color: colors.textLight, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  statAmount: { fontSize: 20, fontWeight: 'bold', color: colors.textDark, marginTop: 4 },

  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: colors.textDark, marginLeft: 4 },
  
  insightCard: { backgroundColor: '#FFF', borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.border, elevation: 0 },
  insightContent: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  insightLabel: { fontSize: 13, color: colors.textLight, fontWeight: '500' },
  insightAmount: { fontSize: 18, fontWeight: 'bold', color: colors.warning, marginTop: 2 },

  blockRowCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  blockRowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  blockName: { fontSize: 16, fontWeight: 'bold', color: colors.textDark },
  blockProfit: { fontSize: 13, color: colors.textLight, fontWeight: '500', marginTop: 2 },
  blockStatsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  miniLabel: { fontSize: 11, color: colors.textLight, textTransform: 'uppercase', fontWeight: '600' },
  miniValue: { fontSize: 15, fontWeight: 'bold', color: colors.textDark, marginTop: 2 }
});

export default RevenueScreen;