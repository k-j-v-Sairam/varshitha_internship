import React, { useState } from 'react';
import { View, StyleSheet, FlatList, SafeAreaView, TouchableOpacity, Dimensions } from 'react-native';
import { 
  Text, 
  FAB, 
  Portal, 
  Modal, 
  TextInput, 
  Button, 
  Surface,
  useTheme
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');

const HostelManagement = ({ navigation }) => {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  const [blockName, setBlockName] = useState('');
  
  // Updated initial data to include styling properties for the modern look
  const [blocks, setBlocks] = useState([
    { id: '1', name: 'Block A', floors: 3, rooms: 12, color: '#e0f2fe', iconColor: '#0284c7', status: 'Full' },
    { id: '2', name: 'Block B', floors: 2, rooms: 8, color: '#fce7f3', iconColor: '#db2777', status: '2 Vacant' },
  ]);

  const showModal = () => setVisible(true);
  const hideModal = () => setVisible(false);

  // Helper to assign random colors to new blocks
  const getRandomTheme = () => {
    const themes = [
      { color: '#dcfce7', iconColor: '#16a34a' }, // Green
      { color: '#fff7ed', iconColor: '#ea580c' }, // Orange
      { color: '#f3e8ff', iconColor: '#7e22ce' }, // Purple
      { color: '#e0f2fe', iconColor: '#0284c7' }, // Blue
    ];
    return themes[Math.floor(Math.random() * themes.length)];
  };

  const addBlock = () => {
    if (blockName.trim()) {
      const newTheme = getRandomTheme();
      setBlocks([...blocks, { 
        id: Math.random().toString(), 
        name: blockName, 
        floors: 0, 
        rooms: 0,
        color: newTheme.color,
        iconColor: newTheme.iconColor,
        status: 'New'
      }]);
      setBlockName('');
      hideModal();
    }
  };

  const renderBlockItem = ({ item }) => (
    <TouchableOpacity 
      activeOpacity={0.9}
      style={[styles.cardContainer, { backgroundColor: item.color || '#f5f5f5' }]}
      onPress={() => navigation.navigate('BlockDetails', { blockName: item.name })}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,255,255,0.6)' }]}>
          <Icon name="office-building" size={24} color={item.iconColor || '#6200EE'} />
        </View>
        <View style={styles.statusPill}>
           <Text style={[styles.statusText, { color: item.iconColor || '#6200EE' }]}>
             {item.status || 'Active'}
           </Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.blockName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.blockDetails}>{item.floors} Floors • {item.rooms} Rooms</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Surface style={styles.header} elevation={1}>
        <View>
          <Text variant="headlineSmall" style={styles.title}>Hostel Blocks</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>Manage wings and floor structures</Text>
        </View>
        <Icon name="cog-outline" size={24} color="#555" />
      </Surface>

      {/* Grid List */}
      <FlatList
        data={blocks}
        keyExtractor={(item) => item.id}
        renderItem={renderBlockItem}
        numColumns={2}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
      />

      {/* Modal for Adding Block */}
      <Portal>
        <Modal visible={visible} onDismiss={hideModal} contentContainerStyle={styles.modal}>
          <Text variant="titleLarge" style={styles.modalTitle}>Add New Block</Text>
          <TextInput
            label="Block Name (e.g. Block C)"
            value={blockName}
            onChangeText={setBlockName}
            mode="outlined"
            style={styles.input}
            activeOutlineColor="#6200EE"
          />
          <Button mode="contained" onPress={addBlock} style={styles.button}>
            Create Block
          </Button>
        </Modal>
      </Portal>

      {/* Floating Action Button */}
      <FAB
        icon="plus"
        label="Add Block"
        style={styles.fab}
        onPress={showModal}
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
  
  // Grid Styles
  list: { padding: 15, paddingBottom: 100 },
  columnWrapper: { justifyContent: 'space-between', marginBottom: 15 },
  cardContainer: {
    width: (width / 2) - 24, // Responsive width for 2 columns
    height: 150,
    borderRadius: 20,
    padding: 15,
    justifyContent: 'space-between',
    elevation: 0, // Flat look
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusPill: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: { fontSize: 10, fontWeight: '700' },
  cardContent: { marginTop: 10 },
  blockName: { fontSize: 17, fontWeight: 'bold', color: '#334155', marginBottom: 4 },
  blockDetails: { fontSize: 12, color: '#475569', fontWeight: '500' },

  // Modal & FAB Styles
  modal: { 
    backgroundColor: 'white', 
    padding: 25, 
    margin: 20, 
    borderRadius: 15,
    elevation: 5
  },
  modalTitle: { marginBottom: 20, fontWeight: 'bold', color: '#333' },
  input: { marginBottom: 20, backgroundColor: '#fff' },
  button: { paddingVertical: 5, backgroundColor: '#6200EE' },
  fab: { 
    position: 'absolute', 
    margin: 20, 
    right: 0, 
    bottom: 10, 
    backgroundColor: '#6200EE',
    borderRadius: 30 
  },
});

export default HostelManagement;