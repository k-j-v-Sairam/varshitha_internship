import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform, TouchableOpacity, Alert } from 'react-native';
import { Text, TextInput, Button, Surface, IconButton, SegmentedButtons, Chip } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useHostel } from '../../context/HostelContext';

const colors = {
  primary: '#6200EE', background: '#F8FAFC', cardBg: '#FFFFFF', 
  textDark: '#1E293B', textLight: '#64748B', success: '#10B981', border: '#E2E8F0'
};

const SHARING_OPTIONS = [1, 2, 3, 4, 5];

const AMENITIES_LIST = [
  { id: 'wifi', label: 'High-Speed WiFi', icon: 'wifi' },
  { id: 'cctv', label: 'CCTV Cameras', icon: 'cctv' },
  { id: 'security', label: '24/7 Security', icon: 'shield-check' },
  { id: 'mess', label: 'Mess / Food', icon: 'silverware-fork-knife' },
  { id: 'power', label: 'Power Backup', icon: 'lightning-bolt' },
  { id: 'laundry', label: 'Laundry', icon: 'washing-machine' },
  { id: 'parking', label: 'Parking', icon: 'car' },
  { id: 'gym', label: 'Gym / Fitness', icon: 'dumbbell' },
];

const AddBlockScreen = ({ navigation, route }) => {
  // 🔥 EXTRACT PARAMS FOR EDIT MODE
  const { isEditMode, blockId, blockName: editBlockName } = route.params || {};

  const { blocks, pricingMatrix, addBlock, updateBlockDetails } = useHostel(); 
  const [loading, setLoading] = useState(false);

  // States
  const [blockName, setBlockName] = useState('');
  const [floorCount, setFloorCount] = useState('');
  const [area, setArea] = useState('');
  const [genderType, setGenderType] = useState('Men'); 
  const [acType, setAcType] = useState('Both'); 
  const [selectedAmenities, setSelectedAmenities] = useState(['wifi', 'cctv']); 
  const [selectedSharings, setSelectedSharings] = useState([1, 2, 3]); 
  const [pricing, setPricing] = useState({});

  // 🔥 EFFECT: PRE-FILL DATA IF IN EDIT MODE
  useEffect(() => {
    if (isEditMode && blockId) {
      const block = blocks.find(b => b.id === blockId);
      if (block) {
        setBlockName(block.name);
        setFloorCount(block.floors.toString());
        setArea(block.area || '');
        setGenderType(block.genderType || 'Coliving');
        setAcType(block.acType || 'Both');
        setSelectedAmenities(block.amenities || []);
        setSelectedSharings(block.sharingCapacities || []);

        if (pricingMatrix && pricingMatrix[block.name]) {
          setPricing(pricingMatrix[block.name]);
        }
      }
    }
  }, [isEditMode, blockId, blocks, pricingMatrix]);

  const toggleSharing = (num) => {
    let newSharings;
    if (selectedSharings.includes(num)) {
      newSharings = selectedSharings.filter(val => val !== num);
    } else {
      newSharings = [...selectedSharings, num].sort();
    }
    setSelectedSharings(newSharings);
  };

  const toggleAmenity = (id) => {
    if (selectedAmenities.includes(id)) {
      setSelectedAmenities(selectedAmenities.filter(item => item !== id));
    } else {
      setSelectedAmenities([...selectedAmenities, id]);
    }
  };

  const handlePriceChange = (sharingNum, type, value) => {
    setPricing(prev => ({
      ...prev,
      [sharingNum]: {
        ...prev[sharingNum],
        [type]: Number(value) || 0
      }
    }));
  };

  const handleSaveBlock = async () => {
    if (!blockName.trim() || !floorCount.trim()) {
      Alert.alert("Missing Info", "Block Name and Number of Floors are mandatory.");
      return;
    }

    if (selectedSharings.length === 0) {
      Alert.alert("Missing Info", "Please select at least one room sharing capacity.");
      return;
    }

    setLoading(true);

    const blockData = {
      name: blockName.trim(),
      floors: floorCount,
      area: area.trim(),
      genderType,
      acType,
      sharingCapacities: selectedSharings,
      amenities: selectedAmenities, 
      pricingMatrix: pricing
    };

    try {
      if (isEditMode) {
        // 🔥 UPDATE EXISTING BLOCK
        await updateBlockDetails(blockId, blockName.trim(), blockData);
        Alert.alert("Success", "Block settings updated successfully!", [
          { text: "OK", onPress: () => navigation.goBack() }
        ]);
      } else {
        // 🔥 CREATE NEW BLOCK
        await addBlock(blockData); 
        Alert.alert("Success", "Block created and priced successfully!", [
          { text: "OK", onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      Alert.alert("Error", `Could not ${isEditMode ? 'update' : 'create'} block.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Surface style={styles.header} elevation={2}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
           <IconButton icon="arrow-left" iconColor="#1E293B" size={24} style={{margin:0}} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>{isEditMode ? 'Edit Block Settings' : 'Create New Block'}</Text>
          <Text style={styles.headerSubtitle}>{isEditMode ? 'Update rules, amenities, and prices' : 'Set up rules, rooms, and pricing'}</Text>
        </View>
      </Surface>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex: 1}}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <Text style={styles.sectionHeader}>1. Basic Details</Text>
          <Surface style={styles.card} elevation={0}>
            {/* 🔥 Locked fields in Edit Mode to prevent DB corruption */}
            <TextInput 
              label="Block Name (e.g. Sairam A)" 
              value={blockName} 
              onChangeText={setBlockName} 
              mode="outlined" 
              style={[styles.input, isEditMode && {backgroundColor: '#F1F5F9'}]} 
              activeOutlineColor={colors.primary} 
              outlineColor={colors.border}
              disabled={isEditMode}
            />
            {isEditMode && <Text style={{fontSize: 11, color: '#EF4444', marginTop: -8, marginBottom: 12, marginLeft: 4}}>* Name cannot be changed after creation.</Text>}
            
            <View style={{flexDirection: 'row', gap: 10}}>
               <TextInput 
                 label="Total Floors" 
                 value={floorCount} 
                 onChangeText={setFloorCount} 
                 keyboardType="number-pad" 
                 mode="outlined" 
                 style={[styles.input, {flex: 1}, isEditMode && {backgroundColor: '#F1F5F9'}]} 
                 activeOutlineColor={colors.primary} 
                 outlineColor={colors.border}
                 disabled={isEditMode} 
               />
               <TextInput 
                 label="Area / Location" 
                 value={area} 
                 onChangeText={setArea} 
                 mode="outlined" 
                 style={[styles.input, {flex: 2}]} 
                 activeOutlineColor={colors.primary} 
                 outlineColor={colors.border}
               />
            </View>
          </Surface>

          <Text style={styles.sectionHeader}>2. Property Type</Text>
          <Surface style={styles.card} elevation={0}>
            <Text style={styles.fieldLabel}>Resident Type</Text>
            <SegmentedButtons
              value={genderType}
              onValueChange={setGenderType}
              buttons={[
                { value: 'Men', label: 'Men' },
                { value: 'Women', label: 'Women' },
                { value: 'Coliving', label: 'Coliving' },
              ]}
              style={{marginBottom: 20}}
              theme={{ colors: { secondaryContainer: '#E0E7FF' } }}
            />

            <Text style={styles.fieldLabel}>AC Availability</Text>
            <SegmentedButtons
              value={acType}
              onValueChange={setAcType}
              buttons={[
                { value: 'AC', label: 'AC Only' },
                { value: 'NonAC', label: 'Non-AC' },
                { value: 'Both', label: 'Both Types' },
              ]}
              theme={{ colors: { secondaryContainer: '#E0E7FF' } }}
            />
          </Surface>

          <Text style={styles.sectionHeader}>3. Included Amenities</Text>
          <Surface style={[styles.card, {paddingBottom: 6}]} elevation={0}>
            <View style={styles.amenitiesGrid}>
              {AMENITIES_LIST.map((amenity) => {
                const isSelected = selectedAmenities.includes(amenity.id);
                return (
                  <TouchableOpacity 
                    key={amenity.id} 
                    activeOpacity={0.7} 
                    onPress={() => toggleAmenity(amenity.id)}
                    style={[styles.amenityBox, isSelected && styles.amenityBoxSelected]}
                  >
                    <Icon name={amenity.icon} size={22} color={isSelected ? colors.primary : colors.textLight} />
                    <Text style={[styles.amenityLabel, isSelected && {color: colors.primary, fontWeight: '700'}]}>
                      {amenity.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Surface>

          <Text style={styles.sectionHeader}>4. Room Configurations</Text>
          <Surface style={styles.card} elevation={0}>
            <Text style={styles.fieldLabel}>Select available sharing capacities for this block:</Text>
            <View style={styles.chipContainer}>
              {SHARING_OPTIONS.map(num => (
                <Chip
                  key={num}
                  selected={selectedSharings.includes(num)}
                  onPress={() => toggleSharing(num)}
                  showSelectedOverlay
                  style={[styles.chip, selectedSharings.includes(num) && styles.chipSelected]}
                  textStyle={selectedSharings.includes(num) ? {color: '#FFF', fontWeight: 'bold'} : {color: colors.textDark}}
                >
                  {num}s
                </Chip>
              ))}
            </View>
          </Surface>

          {selectedSharings.length > 0 && (
            <>
              <Text style={styles.sectionHeader}>5. Base Pricing Matrix</Text>
              <Surface style={styles.card} elevation={0}>
                <Text style={{color: colors.textLight, fontSize: 13, marginBottom: 15}}>
                  Set the default monthly rent. This will auto-fill when adding new tenants to this specific block.
                </Text>

                {selectedSharings.map(sharing => (
                  <View key={sharing} style={{marginBottom: 15}}>
                    <Text style={{fontWeight: '700', color: colors.textDark, marginBottom: 8}}>{sharing}-Sharing Rooms</Text>
                    <View style={{flexDirection: 'row', gap: 10}}>
                      
                      {(acType === 'AC' || acType === 'Both') && (
                        <TextInput 
                          label="AC Rent (₹)" 
                          keyboardType="number-pad" 
                          mode="outlined" 
                          style={{flex: 1, backgroundColor: '#FFF', height: 45}} 
                          activeOutlineColor={colors.success}
                          outlineColor={colors.border}
                          value={pricing[sharing]?.AC?.toString() || ''}
                          onChangeText={(val) => handlePriceChange(sharing, 'AC', val)}
                        />
                      )}

                      {(acType === 'NonAC' || acType === 'Both') && (
                        <TextInput 
                          label="Non-AC Rent (₹)" 
                          keyboardType="number-pad" 
                          mode="outlined" 
                          style={{flex: 1, backgroundColor: '#FFF', height: 45}} 
                          activeOutlineColor={colors.success}
                          outlineColor={colors.border}
                          value={pricing[sharing]?.NonAC?.toString() || ''}
                          onChangeText={(val) => handlePriceChange(sharing, 'NonAC', val)}
                        />
                      )}
                      
                    </View>
                  </View>
                ))}
              </Surface>
            </>
          )}

          <Button 
            mode="contained" 
            onPress={handleSaveBlock} 
            loading={loading}
            style={styles.submitBtn}
            contentStyle={{paddingVertical: 10}}
            labelStyle={{fontSize: 16, fontWeight: 'bold'}}
          >
            {isEditMode ? 'Save Changes' : 'Create Block & Save Setup'}
          </Button>
          <View style={{height: 40}} />

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.cardBg, paddingTop: 50, paddingBottom: 15, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 10, backgroundColor: '#F1F5F9', borderRadius: 12 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.textDark },
  headerSubtitle: { fontSize: 13, color: colors.textLight, fontWeight: '500' },
  scrollContent: { padding: 15 },
  sectionHeader: { fontSize: 15, fontWeight: 'bold', color: colors.textLight, marginTop: 15, marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 5, borderWidth: 1, borderColor: colors.border },
  input: { marginBottom: 12, backgroundColor: '#fff', fontSize: 15 },
  fieldLabel: { color: colors.textDark, fontSize: 14, fontWeight: '700', marginBottom: 10 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { backgroundColor: '#F1F5F9', borderColor: colors.border, borderWidth: 1 },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  submitBtn: { marginTop: 20, borderRadius: 12, backgroundColor: colors.primary, elevation: 4 },
  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  amenityBox: { 
    width: '48%', 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F8FAFC', 
    padding: 12, 
    borderRadius: 12, 
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  amenityBoxSelected: { backgroundColor: '#EEF2FF', borderColor: colors.primary },
  amenityLabel: { fontSize: 13, color: colors.textDark, fontWeight: '500', marginLeft: 8, flexShrink: 1 }
});

export default AddBlockScreen;