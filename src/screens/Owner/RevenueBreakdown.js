import React from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { Text, Surface, IconButton, Avatar, Divider, Chip } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import { getMasterFinances } from '../../services/financeService';
import { Colors } from '../../theme/colors';

const RevenueBreakdown = ({ route, navigation }) => {
  const { monthYear, type } = route.params || {};
  // type can be 'Collected', 'Expected', 'Pending'

  const { data, isLoading } = useQuery({
    queryKey: ['masterFinances', monthYear],
    queryFn: () => getMasterFinances(monthYear),
    staleTime: 0,
    enabled: !!monthYear,
  });

  const blockStats = data?.blockStats || [];
  const globalStats = data?.globalStats || {};

  const formatCurrency = (amount) => {
    return '₹' + Number(amount || 0).toLocaleString('en-IN');
  };

  let headerColor = Colors.primary;
  let headerIcon = 'cash';
  let totalAmount = 0;

  if (type === 'Collected') {
    headerColor = Colors.success;
    headerIcon = 'cash-check';
    totalAmount = globalStats.paidRevenue || 0;
  } else if (type === 'Expected') {
    headerColor = Colors.warning;
    headerIcon = 'cash-clock';
    totalAmount = globalStats.revenue || 0;
  } else if (type === 'Pending') {
    headerColor = Colors.danger;
    headerIcon = 'alert-circle-outline';
    totalAmount = globalStats.pending || 0;
  }

  // Helper to get items for a block based on type
  const getItemsForBlock = (block) => {
    const activeTenants = block.tenantDetails || [];
    const transactions = block.transactionsDetails || [];

    if (type === 'Collected') {
      // Return list of transactions
      return transactions.map(tx => {
        const tenantInfo = activeTenants.find(t => t.id === tx.tenantId) || { name: 'Unknown Tenant', roomNumber: '?' };
        return {
          id: tx.tenantId,
          name: tenantInfo.name,
          roomNumber: tenantInfo.roomNumber,
          amount: tx.amount,
          status: 'Paid'
        };
      });
    }

    if (type === 'Expected') {
      // Return all active tenants
      return activeTenants.map(t => ({
        id: t.id,
        name: t.name,
        roomNumber: t.roomNumber,
        amount: t.agreedRent,
        status: transactions.some(tx => tx.tenantId === t.id) ? 'Paid' : 'Pending'
      }));
    }

    if (type === 'Pending') {
      // Return active tenants who have NOT paid
      return activeTenants
        .filter(t => !transactions.some(tx => tx.tenantId === t.id))
        .map(t => ({
          id: t.id,
          name: t.name,
          roomNumber: t.roomNumber,
          amount: t.agreedRent,
          status: 'Pending'
        }));
    }

    return [];
  };

  return (
    <SafeAreaView style={styles.container}>
      <Surface style={styles.header} elevation={2}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, marginLeft: -8 }}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.textDark} />
          </TouchableOpacity>
          <Text variant="titleLarge" style={styles.headerTitle}>{type} Revenue</Text>
          <View style={{ width: 24 }} />
        </View>
        <Text style={styles.headerSubtitle}>For {monthYear}</Text>
      </Surface>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Surface style={[styles.totalCard, { borderLeftColor: headerColor, borderLeftWidth: 4 }]} elevation={1}>
          <View style={[styles.iconCircle, { backgroundColor: headerColor + '20' }]}>
            <MaterialCommunityIcons name={headerIcon} size={28} color={headerColor} />
          </View>
          <View>
            <Text style={styles.totalLabel}>Total {type}</Text>
            <Text style={[styles.totalAmount, { color: headerColor }]}>{formatCurrency(totalAmount)}</Text>
          </View>
        </Surface>

        {isLoading ? (
          <Text style={{ textAlign: 'center', marginTop: 40, color: Colors.textLight }}>Loading details...</Text>
        ) : blockStats.length === 0 ? (
          <Text style={{ textAlign: 'center', marginTop: 40, color: Colors.textLight }}>No data available.</Text>
        ) : (
          blockStats.map((block) => {
            const items = getItemsForBlock(block);
            if (items.length === 0) return null;

            // Calculate block total for this context
            const blockTotal = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

            return (
              <Surface key={block.name} style={styles.blockCard} elevation={1}>
                <View style={styles.blockHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Avatar.Icon size={40} icon="office-building" style={{ backgroundColor: '#EEF2FF', marginRight: 12 }} color={Colors.primary} />
                    <View>
                      <Text style={styles.blockName}>{block.name}</Text>
                      <Text style={[styles.blockTotal, { color: headerColor }]}>{formatCurrency(blockTotal)}</Text>
                    </View>
                  </View>
                </View>

                <Divider style={{ marginVertical: 10 }} />

                {items.map((item, idx) => (
                  <TouchableOpacity 
                    key={`${item.id}-${idx}`} 
                    style={styles.lineItem}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('TenantProfile', { tenantId: item.id })}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={[styles.itemIcon, { backgroundColor: '#F8FAFC' }]}>
                        <MaterialCommunityIcons name="account" size={20} color={Colors.textLight} />
                      </View>
                      <View>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemSub}>Room {item.roomNumber || 'None'}</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.itemAmount}>{formatCurrency(item.amount)}</Text>
                      {type === 'Expected' && (
                        <Chip
                          style={{ backgroundColor: (item.status === 'Paid' ? Colors.success : Colors.warning) + '20', marginTop: 4, height: 20 }}
                          textStyle={{ color: item.status === 'Paid' ? Colors.success : Colors.warning, fontWeight: '700', fontSize: 10, marginVertical: 0, paddingVertical: 0 }}
                        >
                          {item.status}
                        </Chip>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
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
  totalAmount: { fontSize: 24, fontWeight: 'bold', marginTop: 2 },

  blockCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16 },
  blockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  blockName: { fontSize: 18, fontWeight: 'bold', color: Colors.textDark },
  blockTotal: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  
  lineItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  itemIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemName: { fontSize: 15, fontWeight: '600', color: Colors.textDark },
  itemSub: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  itemAmount: { fontSize: 16, fontWeight: 'bold', color: Colors.textDark }
});

export default RevenueBreakdown;
