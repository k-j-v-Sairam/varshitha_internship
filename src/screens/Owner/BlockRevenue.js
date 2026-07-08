import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Alert, ActivityIndicator, Dimensions, RefreshControl } from 'react-native';
import { Text, Surface, IconButton, Button, Portal, Dialog, TextInput, Menu, SegmentedButtons } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { useBlockExpenses, useAddBlockExpense, useDeleteBlockExpense, useSaveBatchExpenses } from '../../hooks/useQueries';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import { Colors } from '../../theme/colors';

const EXPENSE_CATEGORIES = [
  { label: 'Electricity / Current', icon: 'lightning-bolt', color: '#F59E0B' },
  { label: 'Water Supply', icon: 'water', color: '#3B82F6' },
  { label: 'Mess / Groceries', icon: 'silverware-fork-knife', color: '#EC4899' },
  { label: 'Maintenance & Repairs', icon: 'tools', color: '#8B5CF6' },
  { label: 'WiFi & Internet', icon: 'wifi', color: '#14B8A6' },
  { label: 'Staff Wages (Extra)', icon: 'account-hard-hat', color: '#6366F1' },
];

const BlockRevenue = ({ navigation, route }) => {
  const { blockName } = route.params || {};
  const [currentDate, setCurrentDate] = useState(new Date());
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const displayMonth = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  const queryMonthYear = `${String(currentDate.getMonth() + 1).padStart(2, '0')}-${currentDate.getFullYear()}`;

  const { data: expenses = [], isLoading: loadingExpenses, refetch: refetchExpenses } = useBlockExpenses(blockName, queryMonthYear);
  const addBlockExpenseMutation = useAddBlockExpense();
  const deleteBlockExpenseMutation = useDeleteBlockExpense();
  const saveBatchExpensesMutation = useSaveBatchExpenses();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // 🔥 NEW: Refresh state
  
  const [expectedRent, setExpectedRent] = useState(0);
  const [activeTenantsCount, setActiveTenantsCount] = useState(0);
  
  const [staffExpenses, setStaffExpenses] = useState(0);
  const [staffCount, setStaffCount] = useState(0);


  const [modalVisible, setModalVisible] = useState(false);
  const [entryMode, setEntryMode] = useState('Checklist'); 
  const [isSaving, setIsSaving] = useState(false);

  const [batchInputs, setBatchInputs] = useState({});

  const [menuVisible, setMenuVisible] = useState(false);
  const [customCategory, setCustomCategory] = useState({ label: 'Miscellaneous', icon: 'dots-horizontal', color: '#64748B' });
  const [customAmount, setCustomAmount] = useState('');
  const [customDesc, setCustomDesc] = useState('');


  const [collectedRent, setCollectedRent] = useState(0);

  // Updated: Added ownerId filter and monthYear logic for accurate historical tracking
  const loadFinancialData = useCallback(async (isRefresh = false) => {
    const ownerId = auth().currentUser?.uid;
    if (!ownerId) return;
    if (!isRefresh) setLoading(true);
    try {
      const [tenantsSnap, staffSnap, txSnap] = await Promise.all([
        firestore().collection('tenants')
          .where('ownerId', '==', ownerId)
          .where('blockId', '==', blockName)
          .get(),
        firestore().collection('staff')
          .where('ownerId', '==', ownerId)
          .where('block', '==', blockName)
          .get(),
        firestore().collection('transactions')
          .where('ownerId', '==', ownerId)
          .where('monthYear', '==', queryMonthYear)
          .where('type', '==', 'Payment')
          .get()
      ]);

      const [mStr, yStr] = queryMonthYear.split('-');
      const queryMonth = parseInt(mStr, 10) - 1;
      const queryYear = parseInt(yStr, 10);
      const queryDateEnd = new Date(queryYear, queryMonth + 1, 0);

      const parseJoinDate = (dateStr) => {
        if (!dateStr) return new Date(2000, 0, 1);
        const d = new Date(dateStr);
        return isNaN(d) ? new Date() : d;
      };

      let rentSum = 0;
      let activeCount = 0;
      tenantsSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.rentStatus !== 'Unassigned') {
          const joinD = parseJoinDate(data.joined);
          if (joinD <= queryDateEnd) {
            rentSum += Number(data.agreedRent || 0);
            activeCount++;
          }
        }
      });
      setExpectedRent(rentSum);
      setActiveTenantsCount(activeCount);

      // Map transactions to block tenants
      let collectedSum = 0;
      txSnap.docs.forEach(txDoc => {
        const txData = txDoc.data();
        // Check if this transaction belongs to a tenant in this block
        const isBlockTenant = tenantsSnap.docs.some(tDoc => tDoc.id === txData.tenantId);
        if (isBlockTenant) {
          collectedSum += Number(txData.amount || 0);
        }
      });
      setCollectedRent(collectedSum);

      let staffSum = 0;
      staffSnap.docs.forEach(doc => {
        const data = doc.data();
        staffSum += Number(data.salary || 0);
      });
      setStaffExpenses(staffSum);
      setStaffCount(staffSnap.size);

    } catch (error) {
      console.error("Error loading finances:", error);
    } finally {
      if (!isRefresh) setLoading(false);
    }
  }, [blockName, queryMonthYear]);

  useEffect(() => {
    loadFinancialData();
  }, [loadFinancialData]);

  // 🔥 NEW: Pull to refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadFinancialData(true), refetchExpenses()]);
    setRefreshing(false);
  }, [loadFinancialData, refetchExpenses]);

  const changeMonth = (offset) => {
    // Create a fresh Date object — never mutate state directly
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  const manualExpensesSum = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalExpenses = manualExpensesSum + staffExpenses; 
  const projectedProfit = collectedRent - totalExpenses; // Profit based on actual collected rent

  const handleSaveBatch = async () => {
    const expensesToSave = [];
    EXPENSE_CATEGORIES.forEach(cat => {
      const amt = Number(batchInputs[cat.label]);
      if (amt && amt > 0) {
        expensesToSave.push({
          blockName, monthYear: queryMonthYear, amount: amt, category: cat.label,
          icon: cat.icon, color: cat.color, description: 'Standard Monthly Cost', 
        });
      }
    });

    if (expensesToSave.length === 0) {
      Alert.alert("No Data", "Please enter an amount for at least one category.");
      return;
    }

    setIsSaving(true);
    try {
      await saveBatchExpensesMutation.mutateAsync(expensesToSave);
      setModalVisible(false);
      setBatchInputs({});
      // Refetch both local finance stats AND the React Query expenses cache
      await Promise.all([loadFinancialData(), refetchExpenses()]);
    } catch (error) {
      Alert.alert("Error", "Could not save monthly costs.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCustom = async () => {
    if (!customAmount || isNaN(customAmount)) {
      Alert.alert("Invalid Input", "Please enter a valid amount.");
      return;
    }
    setIsSaving(true);
    try {
      await addBlockExpenseMutation.mutateAsync({
        blockName, monthYear: queryMonthYear, amount: Number(customAmount), category: customCategory.label,
        icon: customCategory.icon, color: customCategory.color, description: customDesc.trim() || 'One-off Expense',
      });
      setModalVisible(false);
      setCustomAmount('');
      setCustomDesc('');
      // Refetch both local finance stats AND the React Query expenses cache
      await Promise.all([loadFinancialData(), refetchExpenses()]);
    } catch (error) {
      Alert.alert("Error", "Could not save custom expense.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveExpense = (id) => {
    Alert.alert("Delete Expense", "Are you sure you want to remove this record?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          await deleteBlockExpenseMutation.mutateAsync(id);
      }}
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Surface style={styles.header} elevation={2}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <IconButton icon="arrow-left" iconColor={Colors.textDark} size={24} style={{margin:0}} />
          </TouchableOpacity>
          <View style={{flex: 1}}>
            <Text style={styles.headerTitle}>{blockName} Finances</Text>
            <Text style={styles.headerSubtitle}>Revenue & Expenditure Ledger</Text>
          </View>
        </View>

        <View style={styles.monthSelector}>
          <IconButton icon="chevron-left" size={24} onPress={() => changeMonth(-1)} />
          <Text style={styles.monthText}>{displayMonth}</Text>
          <IconButton icon="chevron-right" size={24} onPress={() => changeMonth(1)} />
        </View>
      </Surface>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        // 🔥 NEW: Added RefreshControl
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        {loading || (loadingExpenses && !refreshing) ? (
          <View>
            <SkeletonLoader width="100%" height={100} style={{ marginBottom: 16, borderRadius: 16 }} />
            <SkeletonLoader width="100%" height={100} style={{ marginBottom: 16, borderRadius: 16 }} />
            <SkeletonLoader width="100%" height={100} style={{ marginBottom: 16, borderRadius: 16 }} />
          </View>
        ) : (
          <>
            <View style={styles.summaryGrid}>
              <Surface style={[styles.summaryCard, { borderColor: Colors.success }]} elevation={1}>
                <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
                  <Icon name="cash-plus" size={24} color={Colors.success} />
                </View>
                <Text style={styles.cardLabel}>Collected Revenue</Text>
                <Text style={[styles.cardValue, { color: Colors.success }]}>₹{collectedRent.toLocaleString()}</Text>
                <Text style={styles.cardSubtext}>Expected: ₹{expectedRent.toLocaleString()}</Text>
              </Surface>

              <Surface style={[styles.summaryCard, { borderColor: Colors.danger }]} elevation={1}>
                <View style={[styles.iconBox, { backgroundColor: '#FEF2F2' }]}>
                  <Icon name="cash-minus" size={24} color={Colors.danger} />
                </View>
                <Text style={styles.cardLabel}>Total Expenses</Text>
                <Text style={[styles.cardValue, { color: Colors.danger }]}>₹{totalExpenses.toLocaleString()}</Text>
                <Text style={styles.cardSubtext}>Automated & Manual</Text>
              </Surface>
            </View>

            <Surface style={styles.profitCard} elevation={2}>
              <View>
                <Text style={{color: '#E2E8F0', fontSize: 13, fontWeight: '600', textTransform: 'uppercase'}}>Actual Profit</Text>
                <Text style={{color: '#FFF', fontSize: 28, fontWeight: 'bold'}}>₹{projectedProfit.toLocaleString()}</Text>
              </View>
              <Icon name="trending-up" size={40} color="rgba(255,255,255,0.4)" />
            </Surface>

            <View style={styles.listHeader}>
              <Text style={styles.sectionTitle}>Expenditure Ledger</Text>
              <Button mode="contained" onPress={() => setModalVisible(true)} buttonColor={Colors.primary} icon="plus" compact>
                Add Cost
              </Button>
            </View>

            {staffExpenses > 0 && (
              <Surface style={[styles.expenseItem, { borderColor: Colors.primary, borderWidth: 1 }]} elevation={1}>
                <View style={[styles.expenseIconBox, { backgroundColor: `${Colors.primary}20` }]}>
                  <Icon name="account-group" size={24} color={Colors.primary} />
                </View>
                <View style={styles.expenseDetails}>
                  <Text style={styles.expenseCategory}>Automated Payroll</Text>
                  <Text style={styles.expenseDesc}>Fixed salary for {staffCount} assigned staff</Text>
                </View>
                <View style={{alignItems: 'flex-end'}}>
                  <Text style={[styles.expenseAmount, {color: Colors.textDark}]}>-₹{staffExpenses.toLocaleString()}</Text>
                  <View style={{padding: 4}}><Text style={{color: Colors.primary, fontSize: 10, fontWeight: '700'}}>AUTO-CALCULATED</Text></View>
                </View>
              </Surface>
            )}

            {expenses.length === 0 && staffExpenses === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="receipt" size={40} color={Colors.border} />
                <Text style={{color: Colors.textLight, marginTop: 10}}>No expenses recorded for this month.</Text>
              </View>
            ) : (
              expenses.map((item) => (
                <Surface key={item.id} style={styles.expenseItem} elevation={1}>
                  <View style={[styles.expenseIconBox, { backgroundColor: `${item.color}20` }]}>
                    <Icon name={item.icon || 'cash'} size={24} color={item.color || Colors.textDark} />
                  </View>
                  <View style={styles.expenseDetails}>
                    <Text style={styles.expenseCategory}>{item.category}</Text>
                    {item.description ? <Text style={styles.expenseDesc}>{item.description}</Text> : null}
                  </View>
                  <View style={{alignItems: 'flex-end'}}>
                    <Text style={styles.expenseAmount}>-₹{Number(item.amount).toLocaleString()}</Text>
                    <TouchableOpacity onPress={() => handleRemoveExpense(item.id)} style={{padding: 4}}>
                      <Text style={{color: Colors.danger, fontSize: 12, fontWeight: '600'}}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </Surface>
              ))
            )}
          </>
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={modalVisible} onDismiss={() => setModalVisible(false)} style={{ backgroundColor: '#FFF', borderRadius: 16, maxHeight: '85%' }}>
          <Dialog.Title style={{fontWeight: 'bold', color: Colors.textDark, textAlign: 'center'}}>Record Expenditure</Dialog.Title>
          
          <View style={{paddingHorizontal: 20, marginBottom: 10}}>
            <SegmentedButtons
              value={entryMode}
              onValueChange={setEntryMode}
              buttons={[
                { value: 'Checklist', label: 'Monthly Checklist' },
                { value: 'Custom', label: 'One-off Cost' },
              ]}
              theme={{ colors: { secondaryContainer: '#E0E7FF', onSecondaryContainer: '#1E293B', onSurface: '#64748B', outline: '#E2E8F0' } }}
            />
          </View>

          <Dialog.Content>
            {entryMode === 'Checklist' ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={{color: Colors.textLight, fontSize: 12, marginBottom: 15, textAlign: 'center'}}>
                  Fill in the amounts for this month. Leave blank if not applicable.
                </Text>
                {EXPENSE_CATEGORIES.map(cat => (
                  <View key={cat.label} style={styles.batchRow}>
                    <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
                      <View style={[styles.miniIconBox, { backgroundColor: `${cat.color}20` }]}>
                        <Icon name={cat.icon} size={18} color={cat.color} />
                      </View>
                      <Text style={styles.batchLabel} numberOfLines={2}>{cat.label}</Text>
                    </View>
                    <TextInput 
                      mode="outlined" keyboardType="numeric" placeholder="₹0"
                      value={batchInputs[cat.label] || ''}
                      onChangeText={(val) => setBatchInputs(prev => ({...prev, [cat.label]: val}))}
                      style={styles.batchInput} activeOutlineColor={Colors.primary}
                    />
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View>
                <Menu
                  visible={menuVisible}
                  onDismiss={() => setMenuVisible(false)}
                  anchor={
                    <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.dropdownAnchor}>
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Icon name={customCategory.icon} size={20} color={customCategory.color} style={{marginRight: 10}} />
                        <Text style={{color: Colors.textDark, fontSize: 16}}>{customCategory.label}</Text>
                      </View>
                      <Icon name="chevron-down" size={20} color={Colors.textLight} />
                    </TouchableOpacity>
                  }>
                  {EXPENSE_CATEGORIES.map((cat, i) => (
                    <Menu.Item key={i} onPress={() => { setCustomCategory(cat); setMenuVisible(false); }} title={cat.label} leadingIcon={cat.icon} />
                  ))}
                  <Menu.Item onPress={() => { setCustomCategory({label: 'Miscellaneous', icon: 'dots-horizontal', color: '#64748B'}); setMenuVisible(false); }} title="Miscellaneous" leadingIcon="dots-horizontal" />
                </Menu>

                <TextInput label="Amount (₹)" value={customAmount} onChangeText={setCustomAmount} keyboardType="number-pad" mode="outlined" activeOutlineColor={Colors.primary} style={{ backgroundColor: '#FFF', marginBottom: 12, marginTop: 10 }} />
                <TextInput label="Description / Notes" value={customDesc} onChangeText={setCustomDesc} mode="outlined" activeOutlineColor={Colors.primary} style={{ backgroundColor: '#FFF' }} />
              </View>
            )}
          </Dialog.Content>

          <Dialog.Actions style={{paddingHorizontal: 20, paddingBottom: 15, justifyContent: 'space-between'}}>
            <Button onPress={() => setModalVisible(false)} textColor={Colors.textLight}>Cancel</Button>
            <Button onPress={entryMode === 'Checklist' ? handleSaveBatch : handleSaveCustom} mode="contained" buttonColor={Colors.primary} loading={isSaving} style={{paddingHorizontal: 15}}>
              {entryMode === 'Checklist' ? 'Save All' : 'Save Expense'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.cardBg, paddingTop: 45, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15 },
  backBtn: { backgroundColor: Colors.inputBg, borderRadius: 12, marginRight: 10 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.textDark },
  headerSubtitle: { fontSize: 13, color: Colors.textLight, fontWeight: '500' },
  monthSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingHorizontal: 10, paddingBottom: 5 },
  monthText: { fontSize: 16, fontWeight: 'bold', color: Colors.primary },
  scrollContent: { padding: 15, paddingBottom: 40 },
  summaryGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  summaryCard: { width: '48%', backgroundColor: Colors.cardBg, padding: 15, borderRadius: 16, borderWidth: 1 },
  iconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  cardLabel: { fontSize: 12, color: Colors.textLight, fontWeight: '600', textTransform: 'uppercase' },
  cardValue: { fontSize: 22, fontWeight: 'bold', marginVertical: 4 },
  cardSubtext: { fontSize: 11, color: Colors.textLight },
  profitCard: { backgroundColor: '#1E293B', borderRadius: 16, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.textDark },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, backgroundColor: Colors.cardBg, borderRadius: 16, borderWidth: 1, borderColor: Colors.border },
  expenseItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardBg, padding: 15, borderRadius: 16, marginBottom: 10 },
  expenseIconBox: { width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  expenseDetails: { flex: 1 },
  expenseCategory: { fontSize: 16, fontWeight: 'bold', color: Colors.textDark },
  expenseDesc: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  expenseAmount: { fontSize: 16, fontWeight: 'bold', color: Colors.danger, marginBottom: 4 },
  dropdownAnchor: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, padding: 15, borderRadius: 8, backgroundColor: Colors.background },
  batchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  miniIconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  batchLabel: { fontSize: 14, fontWeight: '600', color: Colors.textDark, flexShrink: 1, paddingRight: 10 },
  batchInput: { width: 90, height: 40, backgroundColor: Colors.cardBg, fontSize: 14 }
});

export default BlockRevenue;