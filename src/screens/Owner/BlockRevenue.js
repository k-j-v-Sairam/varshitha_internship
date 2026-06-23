import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Alert, ActivityIndicator, Dimensions, RefreshControl } from 'react-native';
import { Text, Surface, IconButton, Button, Portal, Dialog, TextInput, Menu, SegmentedButtons } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import { useHostel } from '../../context/HostelContext';

const { width } = Dimensions.get('window');
const colors = { primary: '#6200EE', background: '#F8FAFC', cardBg: '#FFFFFF', textDark: '#1E293B', textLight: '#64748B', success: '#10B981', danger: '#EF4444', border: '#E2E8F0', warning: '#F59E0B' };

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
  const { fetchBlockExpenses, addBlockExpense, deleteBlockExpense, saveBatchExpenses } = useHostel();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // 🔥 NEW: Refresh state
  const [expenses, setExpenses] = useState([]);
  
  const [expectedRent, setExpectedRent] = useState(0);
  const [activeTenantsCount, setActiveTenantsCount] = useState(0);
  
  const [staffExpenses, setStaffExpenses] = useState(0);
  const [staffCount, setStaffCount] = useState(0);

  const [currentDate, setCurrentDate] = useState(new Date());

  const [modalVisible, setModalVisible] = useState(false);
  const [entryMode, setEntryMode] = useState('Checklist'); 
  const [isSaving, setIsSaving] = useState(false);

  const [batchInputs, setBatchInputs] = useState({});

  const [menuVisible, setMenuVisible] = useState(false);
  const [customCategory, setCustomCategory] = useState({ label: 'Miscellaneous', icon: 'dots-horizontal', color: '#64748B' });
  const [customAmount, setCustomAmount] = useState('');
  const [customDesc, setCustomDesc] = useState('');

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const displayMonth = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  const queryMonthYear = `${String(currentDate.getMonth() + 1).padStart(2, '0')}-${currentDate.getFullYear()}`;

  // 🔥 UPDATED: Added isRefresh flag for smooth background loading
  const loadFinancialData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const tenantsSnap = await firestore().collection('tenants')
        .where('blockId', '==', blockName)
        .get();

      let rentSum = 0;
      let activeCount = 0;
      tenantsSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.rentStatus !== 'Unassigned') {
          rentSum += Number(data.agreedRent || 0);
          activeCount++;
        }
      });
      setExpectedRent(rentSum);
      setActiveTenantsCount(activeCount);

      const staffSnap = await firestore().collection('staff')
        .where('block', '==', blockName)
        .get();

      let staffSum = 0;
      staffSnap.docs.forEach(doc => {
        const data = doc.data();
        staffSum += Number(data.salary || 0);
      });
      setStaffExpenses(staffSum);
      setStaffCount(staffSnap.size);

      const monthlyExpenses = await fetchBlockExpenses(blockName, queryMonthYear);
      setExpenses(monthlyExpenses);
    } catch (error) {
      console.error("Error loading finances:", error);
    } finally {
      if (!isRefresh) setLoading(false);
    }
  }, [blockName, queryMonthYear, fetchBlockExpenses]);

  useEffect(() => {
    loadFinancialData();
  }, [loadFinancialData]);

  // 🔥 NEW: Pull to refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFinancialData(true);
    setRefreshing(false);
  }, [loadFinancialData]);

  const changeMonth = (offset) => {
    const newDate = new Date(currentDate.setMonth(currentDate.getMonth() + offset));
    setCurrentDate(new Date(newDate));
  };

  const manualExpensesSum = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalExpenses = manualExpensesSum + staffExpenses; 
  const projectedProfit = expectedRent - totalExpenses;

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
      await saveBatchExpenses(expensesToSave);
      setModalVisible(false);
      setBatchInputs({}); 
      await loadFinancialData(); 
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
      await addBlockExpense({
        blockName, monthYear: queryMonthYear, amount: Number(customAmount), category: customCategory.label,
        icon: customCategory.icon, color: customCategory.color, description: customDesc.trim() || 'One-off Expense',
      });
      setModalVisible(false);
      setCustomAmount('');
      setCustomDesc('');
      await loadFinancialData();
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
          await deleteBlockExpense(id);
          await loadFinancialData();
      }}
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Surface style={styles.header} elevation={2}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <IconButton icon="arrow-left" iconColor={colors.textDark} size={24} style={{margin:0}} />
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{marginTop: 50}} />
        ) : (
          <>
            <View style={styles.summaryGrid}>
              <Surface style={[styles.summaryCard, { borderColor: colors.success }]} elevation={1}>
                <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
                  <Icon name="cash-plus" size={24} color={colors.success} />
                </View>
                <Text style={styles.cardLabel}>Expected Revenue</Text>
                <Text style={[styles.cardValue, { color: colors.success }]}>₹{expectedRent.toLocaleString()}</Text>
                <Text style={styles.cardSubtext}>From {activeTenantsCount} active tenants</Text>
              </Surface>

              <Surface style={[styles.summaryCard, { borderColor: colors.danger }]} elevation={1}>
                <View style={[styles.iconBox, { backgroundColor: '#FEF2F2' }]}>
                  <Icon name="cash-minus" size={24} color={colors.danger} />
                </View>
                <Text style={styles.cardLabel}>Total Expenses</Text>
                <Text style={[styles.cardValue, { color: colors.danger }]}>₹{totalExpenses.toLocaleString()}</Text>
                <Text style={styles.cardSubtext}>Automated & Manual</Text>
              </Surface>
            </View>

            <Surface style={styles.profitCard} elevation={2}>
              <View>
                <Text style={{color: '#E2E8F0', fontSize: 13, fontWeight: '600', textTransform: 'uppercase'}}>Projected Savings</Text>
                <Text style={{color: '#FFF', fontSize: 28, fontWeight: 'bold'}}>₹{projectedProfit.toLocaleString()}</Text>
              </View>
              <Icon name="trending-up" size={40} color="rgba(255,255,255,0.4)" />
            </Surface>

            <View style={styles.listHeader}>
              <Text style={styles.sectionTitle}>Expenditure Ledger</Text>
              <Button mode="contained" onPress={() => setModalVisible(true)} buttonColor={colors.primary} icon="plus" compact>
                Add Cost
              </Button>
            </View>

            {staffExpenses > 0 && (
              <Surface style={[styles.expenseItem, { borderColor: colors.primary, borderWidth: 1 }]} elevation={1}>
                <View style={[styles.expenseIconBox, { backgroundColor: `${colors.primary}20` }]}>
                  <Icon name="account-group" size={24} color={colors.primary} />
                </View>
                <View style={styles.expenseDetails}>
                  <Text style={styles.expenseCategory}>Automated Payroll</Text>
                  <Text style={styles.expenseDesc}>Fixed salary for {staffCount} assigned staff</Text>
                </View>
                <View style={{alignItems: 'flex-end'}}>
                  <Text style={[styles.expenseAmount, {color: colors.textDark}]}>-₹{staffExpenses.toLocaleString()}</Text>
                  <View style={{padding: 4}}><Text style={{color: colors.primary, fontSize: 10, fontWeight: '700'}}>AUTO-CALCULATED</Text></View>
                </View>
              </Surface>
            )}

            {expenses.length === 0 && staffExpenses === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="receipt" size={40} color={colors.border} />
                <Text style={{color: colors.textLight, marginTop: 10}}>No expenses recorded for this month.</Text>
              </View>
            ) : (
              expenses.map((item) => (
                <Surface key={item.id} style={styles.expenseItem} elevation={1}>
                  <View style={[styles.expenseIconBox, { backgroundColor: `${item.color}20` }]}>
                    <Icon name={item.icon || 'cash'} size={24} color={item.color || colors.textDark} />
                  </View>
                  <View style={styles.expenseDetails}>
                    <Text style={styles.expenseCategory}>{item.category}</Text>
                    {item.description ? <Text style={styles.expenseDesc}>{item.description}</Text> : null}
                  </View>
                  <View style={{alignItems: 'flex-end'}}>
                    <Text style={styles.expenseAmount}>-₹{Number(item.amount).toLocaleString()}</Text>
                    <TouchableOpacity onPress={() => handleRemoveExpense(item.id)} style={{padding: 4}}>
                      <Text style={{color: colors.danger, fontSize: 12, fontWeight: '600'}}>Remove</Text>
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
          <Dialog.Title style={{fontWeight: 'bold', color: colors.textDark, textAlign: 'center'}}>Record Expenditure</Dialog.Title>
          
          <View style={{paddingHorizontal: 20, marginBottom: 10}}>
            <SegmentedButtons
              value={entryMode}
              onValueChange={setEntryMode}
              buttons={[
                { value: 'Checklist', label: 'Monthly Checklist' },
                { value: 'Custom', label: 'One-off Cost' },
              ]}
              theme={{ colors: { secondaryContainer: '#E0E7FF' } }}
            />
          </View>

          <Dialog.Content>
            {entryMode === 'Checklist' ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={{color: colors.textLight, fontSize: 12, marginBottom: 15, textAlign: 'center'}}>
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
                      style={styles.batchInput} activeOutlineColor={colors.primary}
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
                        <Text style={{color: colors.textDark, fontSize: 16}}>{customCategory.label}</Text>
                      </View>
                      <Icon name="chevron-down" size={20} color={colors.textLight} />
                    </TouchableOpacity>
                  }>
                  {EXPENSE_CATEGORIES.map((cat, i) => (
                    <Menu.Item key={i} onPress={() => { setCustomCategory(cat); setMenuVisible(false); }} title={cat.label} leadingIcon={cat.icon} />
                  ))}
                  <Menu.Item onPress={() => { setCustomCategory({label: 'Miscellaneous', icon: 'dots-horizontal', color: '#64748B'}); setMenuVisible(false); }} title="Miscellaneous" leadingIcon="dots-horizontal" />
                </Menu>

                <TextInput label="Amount (₹)" value={customAmount} onChangeText={setCustomAmount} keyboardType="number-pad" mode="outlined" activeOutlineColor={colors.primary} style={{ backgroundColor: '#FFF', marginBottom: 12, marginTop: 10 }} />
                <TextInput label="Description / Notes" value={customDesc} onChangeText={setCustomDesc} mode="outlined" activeOutlineColor={colors.primary} style={{ backgroundColor: '#FFF' }} />
              </View>
            )}
          </Dialog.Content>

          <Dialog.Actions style={{paddingHorizontal: 20, paddingBottom: 15, justifyContent: 'space-between'}}>
            <Button onPress={() => setModalVisible(false)} textColor={colors.textLight}>Cancel</Button>
            <Button onPress={entryMode === 'Checklist' ? handleSaveBatch : handleSaveCustom} mode="contained" buttonColor={colors.primary} loading={isSaving} style={{paddingHorizontal: 15}}>
              {entryMode === 'Checklist' ? 'Save All' : 'Save Expense'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.cardBg, paddingTop: 45, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15 },
  backBtn: { backgroundColor: '#F1F5F9', borderRadius: 12, marginRight: 10 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.textDark },
  headerSubtitle: { fontSize: 13, color: colors.textLight, fontWeight: '500' },
  monthSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingHorizontal: 10, paddingBottom: 5 },
  monthText: { fontSize: 16, fontWeight: 'bold', color: colors.primary },
  scrollContent: { padding: 15, paddingBottom: 40 },
  
  summaryGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  summaryCard: { width: '48%', backgroundColor: '#FFF', padding: 15, borderRadius: 16, borderWidth: 1 },
  iconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  cardLabel: { fontSize: 12, color: colors.textLight, fontWeight: '600', textTransform: 'uppercase' },
  cardValue: { fontSize: 22, fontWeight: 'bold', marginVertical: 4 },
  cardSubtext: { fontSize: 11, color: colors.textLight },
  
  profitCard: { backgroundColor: '#1E293B', borderRadius: 16, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textDark },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  
  expenseItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 16, marginBottom: 10 },
  expenseIconBox: { width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  expenseDetails: { flex: 1 },
  expenseCategory: { fontSize: 16, fontWeight: 'bold', color: colors.textDark },
  expenseDesc: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  expenseAmount: { fontSize: 16, fontWeight: 'bold', color: colors.danger, marginBottom: 4 },

  dropdownAnchor: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: colors.border, padding: 15, borderRadius: 8, backgroundColor: '#F8FAFC' },

  batchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  miniIconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  batchLabel: { fontSize: 14, fontWeight: '600', color: colors.textDark, flexShrink: 1, paddingRight: 10 },
  batchInput: { width: 90, height: 40, backgroundColor: '#FFF', fontSize: 14 }
});

export default BlockRevenue;