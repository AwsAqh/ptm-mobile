import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getModels } from '../api/models';
import Header from '../components/Header';
import Notification from '../components/Notification';
import PreTrainedModelBlock from '../components/PreTrainedModelBlock';
import { colors } from '../styles/them';

const CARD_MARGIN = 12;
const CARD_WIDTH = (Dimensions.get('window').width / 2) - (CARD_MARGIN * 2.5);

const CATEGORIES = [
  { value: 'All', label: 'All' },
  { value: 'plants', label: 'Plants' },
  { value: 'animals diseases', label: 'Animals diseases' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'other', label: 'Other' },
];

export default function BrowseModelsScreen({ navigation }) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const data = await getModels();
      setModels(data);
    } catch (error) {
      setNotification({
        type: 'error',
        message: 'Failed to load models. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleModelPress = (model) => {
    navigation.navigate('ModelDetails', { model });
  };

  const filteredModels = models.filter(model => {
    const matchesCategory =
      selectedCategory === 'All' || model.modelCategory === selectedCategory;
    const matchesSearch = model.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header title="Browse Models" />
        <TextInput
          style={styles.search}
          placeholder="Search models..."
          placeholderTextColor="#bbb"
          value={search}
          onChangeText={setSearch}
        />
        <View style={styles.categories}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.value}
              style={[
                styles.categoryButton,
                selectedCategory === cat.value && styles.selectedCategory,
              ]}
              onPress={() => setSelectedCategory(cat.value)}
            >
              <Text style={styles.categoryText}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredModels}
            keyExtractor={(item, idx) => (item.id ? item.id.toString() : idx.toString())}
            renderItem={({ item }) => (
              <PreTrainedModelBlock
                model={item}
                onPress={() => handleModelPress(item)}
                cardWidth={CARD_WIDTH}
              />
            )}
            numColumns={2}
            columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 18 }}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={<Text style={styles.empty}>No models found.</Text>}
          />
        )}
        {notification && (
          <Notification
            type={notification.type}
            message={notification.message}
            onClose={() => setNotification(null)}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: CARD_MARGIN,
    paddingTop: 0,
  },
  search: {
    backgroundColor: '#222',
    color: 'white',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
    fontWeight: 'bold',
    fontSize: 16,
  },
  categories: { flexDirection: 'row', marginBottom: 12 },
  categoryButton: { padding: 8, marginRight: 8, borderRadius: 8, backgroundColor: '#222' },
  selectedCategory: { backgroundColor: '#28a745' },
  categoryText: { color: '#fff' },
  empty: { color: '#fff', textAlign: 'center', marginTop: 32 },
  searchInput: {
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 10,
    backgroundColor: colors.card,
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
