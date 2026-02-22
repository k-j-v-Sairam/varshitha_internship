import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, StatusBar, ScrollView } from 'react-native';
import { Text, Surface, IconButton, Searchbar, FAB, Avatar, Badge, Chip, useTheme } from 'react-native-paper';

// 1. Updated Mock Data with 'Block' information
// IDs are now 'Smart IDs' -> Block + Room (e.g., A-101)
const initialTenants = [
  { id: '1', name: 'Rahul Sharma', room: '101', block: 'A', status: 'Paid', amount: '₹8,000', phone: '9876543210' },
  { id: '2', name: 'Priya Patel', room: '102', block: 'A', status: 'Pending', amount: '₹6,000', phone: '9876543211' },
  { id: '3', name: 'Amit Kumar', room: '203', block: 'A', status: 'Overdue', amount: '₹4,500', phone: '9876543212' },
  { id: '4', name: 'Sneha Gupta', room: '102', block: 'B', status: 'Paid', amount: '₹6,500', phone: '9876543213' },
  { id: '5', name: 'Vikram Singh', room: '305', block: 'B', status: 'Complaint', amount: '₹7,000', phone: '9876543214' },
  { id: '6', name: 'Arjun Das', room: '101', block: 'C', status: 'Paid', amount: '₹8,000', phone: '9876543215' },
];

const TenantManagement = ({ navigation }) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All', 'Paid', 'Pending', 'Complaint'
  const [blockFilter, setBlockFilter] = useState('All');   // 'All', 'A', 'B', 'C'

  // --- FILTERING LOGIC ---

  // 1. First, filter by Block
  const tenantsInBlock = initialTenants.filter(t => 
    blockFilter === 'All' ? true : t.block === blockFilter
  );

  // 2. Calculate Stats based on the SELECTED BLOCK (Dynamic Stats)
  const totalTenants = tenantsInBlock.length;
  const paidCount = tenantsInBlock.filter(t => t.status === 'Paid').length;
  const pendingCount = tenantsInBlock.filter(t => t.status === 'Pending' || t.status === 'Overdue').length;
  const complaintCount = tenantsInBlock.filter(t => t.status === 'Complaint').length;

  // 3. Finally, filter by Search Text & Status (for the list view)
  const finalDisplayList = tenantsInBlock.filter(tenant => {
    // Search Check (Name or Smart ID)
    const smartId = `${tenant.block}-${tenant.room}`;
    const matchesSearch = tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          smartId.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Status Filter Check
    if (statusFilter === 'All') return matchesSearch;
    if (statusFilter === 'Paid') return matchesSearch && tenant.status === 'Paid';
    if (statusFilter === 'Pending') return matchesSearch && (tenant.status === 'Pending' || tenant.status === 'Overdue');
    if (statusFilter === 'Complaint') return matchesSearch && tenant.status === 'Complaint';
    return matchesSearch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'Paid': return '#10B981'; // Green
      case 'Pending': return '#F59E0B'; // Amber
      case 'Overdue': return '#EF4444'; // Red
      case 'Complaint': return '#8B5CF6'; // Violet
      default: return '#6B7280';
    }
  };

  // Helper to render Stat Cards (Clickable to set Status Filter)
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
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <IconButton icon="arrow-left" iconColor="#fff" size={24} onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Tenant Management</Text>
        <IconButton icon="bell-outline" iconColor="#fff" size={24} />
      </View>

      <View style={styles.contentContainer}>
        
        {/* --- NEW: BLOCK FILTER CHIPS --- */}
        <View style={styles.blockFilterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {['All', 'A', 'B', 'C'].map((block) => (
              <Chip 
                key={block}
                mode="flat" 
                selected={blockFilter === block} 
                onPress={() => setBlockFilter(block)}
                style={[
                  styles.blockChip, 
                  blockFilter === block && { backgroundColor: '#4F46E5' }
                ]}
                textStyle={{ color: blockFilter === block ? '#fff' : '#4F46E5' }}
              >
                {block === 'All' ? 'All Blocks' : `Block ${block}`}
              </Chip>
            ))}
          </ScrollView>
        </View>

        {/* STATS ROW (Updates based on Selected Block) */}
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
          placeholder="Search Name or ID (e.g. A-101)..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
          iconColor="#6B7280"
          elevation={1}
        />

        {/* TENANT LIST */}
        <FlatList
          data={finalDisplayList}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
             <Text style={styles.emptyText}>No tenants found in Block {blockFilter}.</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity 
              onPress={() => navigation.navigate('TenantDetails', { tenant: item })}
              activeOpacity={0.9}
            >
              <Surface style={styles.tenantCard} elevation={1}>
                <View style={styles.cardLeft}>
                  <Avatar.Text 
                    size={48} 
                    label={item.name.substring(0, 2).toUpperCase()} 
                    style={{ backgroundColor: getStatusColor(item.status) + '20' }}
                    color={getStatusColor(item.status)}
                  />
                  <View style={styles.cardInfo}>
                    <Text style={styles.tenantName}>{item.name}</Text>
                    
                    {/* --- UPDATED: SMART ID DISPLAY --- */}
                    <View style={styles.idContainer}>
                       <Text style={styles.idLabel}>ID: </Text>
                       <Text style={styles.idText}>{item.block}-{item.room}</Text>
                    </View>

                  </View>
                </View>

                <View style={styles.cardRight}>
                  <Text style={styles.amountText}>{item.amount}</Text>
                  <Badge 
                    style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20', color: getStatusColor(item.status) }]}
                  >
                    {item.status}
                  </Badge>
                </View>
              </Surface>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* FAB - Add New Tenant */}
      <FAB
        icon="plus"
        style={styles.fab}
        color="#fff"
        label="Add Tenant"
        onPress={() => navigation.navigate('TenantOnboarding', { blockId: blockFilter !== 'All' ? blockFilter : 'A' })} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    backgroundColor: '#4F46E5', 
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  
  // NEW: Block Filter Styles
  blockFilterContainer: {
    marginBottom: 15,
    height: 40,
  },
  blockChip: {
    marginRight: 10,
    backgroundColor: '#fff', 
    borderWidth: 1,
    borderColor: '#4F46E5',
  },

  // STATS GRID
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statCard: {
    flex: 0.48, 
    borderRadius: 16,
  },
  statInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    height: 70,
  },
  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  statCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  
  // SEARCH
  searchBar: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
    height: 45,
  },
  searchInput: {
    fontSize: 14,
    alignSelf: 'center', 
  },
  
  // LIST
  tenantCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardInfo: {
    marginLeft: 12,
  },
  tenantName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  
  // Updated ID Styles
  idContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  idLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  idText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#4B5563',
  },

  cardRight: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  statusBadge: {
    fontWeight: 'bold',
    borderRadius: 6,
    paddingHorizontal: 8,
    fontSize: 11,
    height: 22,
    lineHeight: 22, 
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginTop: 20,
  },
  // FAB
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#4F46E5',
    borderRadius: 28,
  },
});

export default TenantManagement;