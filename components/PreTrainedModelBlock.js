import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Button, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../styles/them';

export default function PreTrainedModelBlock({ model, onPress, cardWidth }) {
  const navigation = useNavigation();
  const fallbackImage = require('../assets/image.png');
  const [imgSrc, setImgSrc] = useState(model.featureImage ? { uri: model.featureImage } : fallbackImage);

  return (
    <View style={[styles.card, { width: cardWidth }]}>
      <TouchableOpacity style={styles.touchable} onPress={onPress}>
        <Image
          source={imgSrc}
          style={styles.featureImage}
          resizeMode="cover"
          onError={() => setImgSrc(fallbackImage)}
        />
        <Text style={styles.title}>{model.name}</Text>
        <Text style={styles.desc} numberOfLines={2}>{model.modelDescription}</Text>
        <Text style={styles.category}>{model.modelCategory}</Text>
      </TouchableOpacity>
      <Button
        title="Use"
        onPress={() => navigation.navigate('ClassifyImage', { modelId: model._id })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  touchable: {
    alignItems: 'center',
    marginBottom: 10,
  },
  featureImage: {
    width: 120,
    height: 90,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#222',
  },
  title: { color: colors.text, fontWeight: 'bold', fontSize: 18, marginBottom: 6, textAlign: 'center' },
  desc: { color: colors.secondaryText, marginBottom: 6, textAlign: 'center' },
  category: { color: colors.accent, fontWeight: '600', fontSize: 13 },
});
