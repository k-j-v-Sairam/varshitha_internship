import React, { useCallback, memo, useState } from 'react';
import { View, StyleSheet, FlatList, SafeAreaView, TouchableOpacity, Dimensions, RefreshControl, Alert } from 'react-native';
import { Text, FAB, Surface, useTheme, Dialog, Avatar, Button, Portal } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useBlocks, useDeleteBlock } from '../../hooks/useQueries';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import { Colors } from '../../theme/colors';

const { width } = Dimensions.get('window');

const BlockCard = memo(({ item, navigation, onLongPress }) => {
  const bgColor = item.color || '#e0f2fe';
  const iconColor = item.iconColor || '#0284c7';
  
  return (
    <TouchableOpacity 
      activeOpacity={0.9}
      style={[styles.cardContainer, { backgroundColor: bgColor }]}
      onPress={() => navigation.navigate('BlockDetails', { blockName: item.name })}
      onLongPress={() => onLongPress(item)} 
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,255,255,0.6)' }]}>
          <Icon name="office-building" size={24} color={iconColor} />
        </View>
        <View style={styles.statusPill}>
           <Text style={[styles.statusText, { color: iconColor }]}>
             {item.status || 'Active'}
           </Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.blockName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.blockDetails}>{item.floors || 0} Floors • {item.rooms || 0} Rooms</Text>
      </View>
    </TouchableOpacity>
  );
});

const HostelManagement = ({ navigation }) => {
  const theme = useTheme();
  
  const [refreshing, setRefreshing] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [blockToDelete, setBlockToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: blocks = [], refetch, isLoading } = useBlocks();
  const deleteBlockMutation = useDeleteBlock();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleLongPressBlock = (block) => {
    setBlockToDelete(block);
    setDeleteModalVisible(true);
  };

  const confirmDeleteBlock = async () => {
    setIsDeleting(true);
    try {
      await deleteBlockMutation.mutateAsync({ blockId: blockToDelete.id, blockName: blockToDelete.name });
      setDeleteModalVisible(false);
      setBlockToDelete(null);
    } catch (error) {
      Alert.alert("Error", "Could not delete block.");
    } finally {
      setIsDeleting(false);
    }
  };

  const renderBlockItem = ({ item }) => (
    <BlockCard item={item} navigation={navigation} onLongPress={handleLongPressBlock} />
  );

  return (
    <SafeAreaView style={styles.container}>
      <Surface style={styles.header} elevation={1}>
        <View>
          <Text variant="headlineSmall" style={styles.title}>Hostel Blocks</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>Long press a block to remove</Text>
        </View>
      </Surface>

      {isLoading && !refreshing ? (
        <View style={[styles.list, { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }]}>
           <SkeletonLoader width={(width / 2) - 24} height={150} style={{ marginBottom: 15, borderRadius: 20 }} />
           <SkeletonLoader width={(width / 2) - 24} height={150} style={{ marginBottom: 15, borderRadius: 20 }} />
           <SkeletonLoader width={(width / 2) - 24} height={150} style={{ marginBottom: 15, borderRadius: 20 }} />
           <SkeletonLoader width={(width / 2) - 24} height={150} style={{ marginBottom: 15, borderRadius: 20 }} />
        </View>
      ) : (
        <FlatList
          data={blocks}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderBlockItem}
          numColumns={2}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
          }
          ListEmptyComponent={
            <View style={{padding: 20, alignItems: 'center'}}>
              <Text style={{color: '#94a3b8'}}>No blocks found. Add your first block!</Text>
            </View>
          }
        />
      )}

      <Portal>
        <Dialog visible={deleteModalVisible} onDismiss={() => setDeleteModalVisible(false)} style={{ backgroundColor: '#FFF', borderRadius: 24 }}>
          <View style={{ alignItems: 'center', marginTop: 20 }}>
            <Avatar.Icon size={64} icon="alert-decagram" color="#EF4444" style={{ backgroundColor: '#FEE2E2' }} />
          </View>
          <Dialog.Title style={{ textAlign: 'center', fontWeight: 'bold', color: '#1F2937' }}>
            Delete {blockToDelete?.name}?
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ textAlign: 'center', color: '#6B7280', marginBottom: 16 }}>
              This will permanently destroy the building block and all floors within it.
            </Text>
            <View style={{ backgroundColor: '#ECFDF5', padding: 12, borderRadius: 12 }}>
              <Text style={{ color: '#065F46', textAlign: 'center', fontSize: 13, fontWeight: '500' }}>
                🛡️ Don't worry! Any students living in this block will not be deleted. They will simply be moved to "Unassigned" status.
              </Text>
            </View>
          </Dialog.Content>
          <Dialog.Actions style={{ paddingHorizontal: 20, paddingBottom: 20, justifyContent: 'space-between' }}>
            <Button onPress={() => setDeleteModalVisible(false)} textColor="#6B7280" style={{flex: 1}}>Cancel</Button>
            <Button onPress={confirmDeleteBlock} mode="contained" buttonColor="#EF4444" loading={isDeleting} style={{flex: 1, marginLeft: 10}}>Delete</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <FAB
        icon="plus"
        label="Add Block"
        style={styles.fab}
        onPress={() => navigation.navigate('AddBlockScreen')} // 🔥 ROUTES TO NEW SCREEN
        color="#FFF"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: { 
    padding: 20, 
    paddingTop: 20,
    backgroundColor: '#FFF', 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5
  },
  title: { fontWeight: 'bold', color: '#1e293b' },
  subtitle: { color: '#64748b', marginTop: 2 },
  list: { padding: 15, paddingBottom: 100 },
  columnWrapper: { justifyContent: 'space-between', marginBottom: 15 },
  cardContainer: {
    width: (width / 2) - 24, 
    height: 150,
    borderRadius: 20,
    padding: 15,
    justifyContent: 'space-between',
    elevation: 0, 
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  iconContainer: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  statusPill: { backgroundColor: 'rgba(255,255,255,0.7)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '700' },
  cardContent: { marginTop: 10 },
  blockName: { fontSize: 17, fontWeight: 'bold', color: '#334155', marginBottom: 4 },
  blockDetails: { fontSize: 12, color: '#475569', fontWeight: '500' },
  fab: { position: 'absolute', margin: 20, right: 0, bottom: 10, backgroundColor: Colors.primary, borderRadius: 30 },
});

export default HostelManagement;