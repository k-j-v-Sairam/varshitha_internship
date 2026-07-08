import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, StatusBar, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Text, Surface, IconButton, Searchbar, FAB, Avatar, Badge, Chip, useTheme } from 'react-native-paper';
import { useBlocks, useTenants } from '../../hooks/useQueries';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import { Colors } from '../../theme/colors';

const TenantManagement = ({ navigation }) => {
  const theme = useTheme();
  
  // --- STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); 
  const [blockFilter, setBlockFilter] = useState('All');   
  
  // --- LIVE DATA FETCH ---
  const { data: blocks = [], refetch: refetchBlocks } = useBlocks();
  const { data: tenants = [], isLoading: loading, refetch: refetchTenants } = useTenants();
  
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchBlocks(), refetchTenants()]);
    setRefreshing(false);
  }, [refetchBlocks, refetchTenants]);

  // --- DYNAMIC BLOCK OPTIONS ---
  const blockOptions = ['All', ...blocks.map(b => b.name)];

  // --- FILTERING LOGIC ---

  // 1. Filter accurately by the blockId saved directly in the tenant's database file
  const tenantsInBlock = tenants.filter(t => {
    if (blockFilter === 'All') return true;
    const tBlock = t.blockId || 'Unassigned'; // Fallback if old data is missing it
    return tBlock === blockFilter || tBlock === blockFilter.replace('Block ', '');
  });

  // 2. Calculate Stats based on the SELECTED BLOCK
  const totalTenants = tenantsInBlock.length;
  const paidCount = tenantsInBlock.filter(t => t.rentStatus === 'Paid').length;
  const pendingCount = tenantsInBlock.filter(t => t.rentStatus === 'Pending' || t.rentStatus === 'Overdue').length;
  const complaintCount = tenantsInBlock.filter(t => t.rentStatus === 'Complaint').length;

  // 3. Filter by Search Text & Status
  const finalDisplayList = tenantsInBlock.filter(tenant => {
    const smartId = `${tenant.blockId || 'Unassigned'}-${tenant.roomNumber || 'None'}`;
    const searchLower = searchQuery.toLowerCase();
    
    const matchesSearch = 
      (tenant.name && tenant.name.toLowerCase().includes(searchLower)) || 
      smartId.toLowerCase().includes(searchLower) ||
      (tenant.phone && tenant.phone.includes(searchLower)) ||
      (tenant.idProofNumber && tenant.idProofNumber.toLowerCase().includes(searchLower)); 
    
    // Status Filter Check
    if (statusFilter === 'All') return matchesSearch;
    if (statusFilter === 'Paid') return matchesSearch && tenant.rentStatus === 'Paid';
    if (statusFilter === 'Pending') return matchesSearch && (tenant.rentStatus === 'Pending' || tenant.rentStatus === 'Overdue');
    if (statusFilter === 'Complaint') return matchesSearch && tenant.rentStatus === 'Complaint';
    return matchesSearch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'Paid': return '#10B981'; // Green
      case 'Pending': return '#F59E0B'; // Amber
      case 'Overdue': return '#EF4444'; // Red
      case 'Complaint': return '#8B5CF6'; // Violet
      case 'Unassigned': return '#EF4444'; // Red
      default: return '#6B7280';
    }
  };

  // Helper to render Stat Cards
  const renderStatCard = (title, count, type, icon) => {
    const isSelected = statusFilter === type;
    const activeColor = type === 'Paid' ? '#10B981' : type === 'Pending' ? '#F59E0B' : type === 'Complaint' ? '#8B5CF6' : '#4F46E5';
    
    return (
      <TouchableOpacity 
        style={[styles.statCard, isSelected && { borderColor: activeColor, borderWidth: 2 }]} 
        onPress={() => setStatusFilter(type)}
        activeOpacity={0.8}
      >
        <Surface style={styles.statInner} elevation={2}>
          <View style={[styles.statIconBox, { backgroundColor: `${activeColor}20` }]}>
             <IconButton icon={icon} iconColor={activeColor} size={24} />
          </View>
          <View>
            <Text style={styles.statCount}>{count}</Text>
            <Text style={styles.statLabel}>{title}</Text>
          </View>
        </Surface>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      {/* HEADER */}
      <View style={styles.header}>
        <IconButton icon="arrow-left" iconColor="#fff" size={24} onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Tenant Management</Text>
        <IconButton icon="bell-outline" iconColor="#fff" size={24} onPress={() => navigation.navigate('OwnerComplaints')} />
      </View>

      <View style={styles.contentContainer}>
        
        {/* BLOCK FILTER CHIPS */}
        <View style={styles.blockFilterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {blockOptions.map((block) => (
              <Chip 
                key={block}
                mode="flat" 
                selected={blockFilter === block} 
                onPress={() => setBlockFilter(block)}
                style={[
                  styles.blockChip, 
                  blockFilter === block && { backgroundColor: Colors.primary }
                ]}
                textStyle={{ color: blockFilter === block ? '#fff' : Colors.primary }}
              >
                {block === 'All' ? 'All Blocks' : block}
              </Chip>
            ))}
          </ScrollView>
        </View>

        {/* STATS ROW */}
        <View style={styles.statsRow}>
          {renderStatCard('Total', totalTenants, 'All', 'account-group')}
          {renderStatCard('Paid', paidCount, 'Paid', 'check-circle')}
        </View>
        <View style={styles.statsRow}>
          {renderStatCard('Dues', pendingCount, 'Pending', 'clock-alert')}
          {renderStatCard('Issues', complaintCount, 'Complaint', 'alert-circle')}
        </View>

        {/* SEARCH BAR */}
        <Searchbar
          placeholder="Search Name or ID..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
          iconColor="#6B7280"
          elevation={1}
        />

        {/* TENANT LIST */}
        {loading && !refreshing ? (
          <View>
            {[...Array(4)].map((_, i) => (
               <SkeletonLoader key={i} width="100%" height={80} style={{ marginBottom: 12, borderRadius: 16 }} />
            ))}
          </View>
        ) : (
          <FlatList
            data={finalDisplayList}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingBottom: 80 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
            ListEmptyComponent={
               <Text style={styles.emptyText}>No tenants found in {blockFilter}.</Text>
            }
            renderItem={({ item }) => (
              // UPDATED THIS LINE
              <TouchableOpacity 
                onPress={() => navigation.navigate('TenantProfile', { tenantId: item.id })}
                activeOpacity={0.9}
              >
                <Surface style={styles.tenantCard} elevation={1}>
                  <View style={styles.cardLeft}>
                    {item.image ? (
                      <Avatar.Image size={48} source={{ uri: item.image }} />
                    ) : (
                      <Avatar.Text 
                        size={48} 
                        label={(item.name || 'U').substring(0, 2).toUpperCase()} 
                        style={{ backgroundColor: getStatusColor(item.rentStatus) + '20' }}
                        color={getStatusColor(item.rentStatus)}
                      />
                    )}
                    <View style={styles.cardInfo}>
                      <Text style={styles.tenantName} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
                      
                      {/* ACCURATE ID DISPLAY */}
                      <View style={styles.idContainer}>
                         <Text style={styles.idLabel}>ID: </Text>
                         <Text style={styles.idText}>{item.blockId || 'Unassigned'}-{item.roomNumber || 'None'}</Text>
                      </View>


                    </View>
                  </View>

                  <View style={styles.cardRight}>
                    <Text style={styles.amountText}>₹{item.deposit || '0'}</Text>
                    <Badge 
                      style={[styles.statusBadge, { backgroundColor: getStatusColor(item.rentStatus) + '20', color: getStatusColor(item.rentStatus) }]}
                    >
                      {item.rentStatus || 'Pending'}
                    </Badge>
                  </View>
                </Surface>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* FAB - Add New Tenant */}
      <FAB
        icon="plus"
        style={styles.fab}
        color="#fff"
        label="Add Tenant"
        onPress={() => navigation.navigate('TenantOnboarding')} // Redirects to Hostels cleanly
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.primary, paddingTop: 40, paddingBottom: 20, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, elevation: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  contentContainer: { flex: 1, padding: 20 },
  blockFilterContainer: { marginBottom: 15, height: 40 },
  blockChip: { marginRight: 10, backgroundColor: Colors.cardBg, borderWidth: 1, borderColor: Colors.primary },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  statCard: { flex: 0.48, borderRadius: 16 },
  statInner: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, backgroundColor: Colors.cardBg, height: 70 },
  statIconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  statCount: { fontSize: 18, fontWeight: 'bold', color: Colors.textDark },
  statLabel: { fontSize: 12, color: Colors.textMedium },
  searchBar: { backgroundColor: Colors.cardBg, borderRadius: 12, marginBottom: 20, height: 45 },
  searchInput: { fontSize: 14, alignSelf: 'center' },
  tenantCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: Colors.cardBg, borderRadius: 16, marginBottom: 12 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cardInfo: { marginLeft: 12, flex: 1, marginRight: 10 },
  tenantName: { fontSize: 16, fontWeight: '700', color: Colors.textDark },
  idContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  idLabel: { fontSize: 12, color: Colors.textMuted },
  idText: { fontSize: 13, fontWeight: 'bold', color: Colors.textMedium },
  cardRight: { alignItems: 'flex-end', maxWidth: 110 },
  amountText: { fontSize: 16, fontWeight: '700', color: Colors.textDark, marginBottom: 4 },
  statusBadge: { fontWeight: 'bold', borderRadius: 6, paddingHorizontal: 8, fontSize: 11, height: 22, lineHeight: 22, maxWidth: 100 },
  emptyText: { textAlign: 'center', color: Colors.textMuted, marginTop: 20 },
  centerLoad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: Colors.primary, borderRadius: 28 },
});

export default TenantManagement;