import { useFocusEffect } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { confirmPin, forgotPassword } from '../api/auth';
import Notification from '../components/Notification';
import { colors } from '../styles/them';
export default function ConfirmPinScreen({ navigation,route }) {
  const [pin, setPin] = useState(null);
 const {email}=route.params
 
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' });

 
useEffect(()=>{

  const requestPin=async()=>{
  console.log("reset pin triggered")
try{
  const response=await forgotPassword(email);
  
  setNotification({visible:true,message:response,type:"info"})

}
catch(err){
  setNotification({visible:true,message:err.message,type:"error"})

}}
requestPin()

},[])

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        const { index, routes } = navigation.getState();
        // if there *is* a previous screen, navigate back
        if (index > 0) {
          console.log('Going back to:', routes[index - 1].name);
          navigation.goBack();
        } else {
          // no previous route—redirect to Login instead of exiting
          console.log('No back route; redirecting to Login.');
          navigation.navigate('Login');
        }
        return true; // we handled it
      };

      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [navigation])
  );


  useEffect(() => {
    if (notification.visible && notification.type !== 'loading') {
      const timer = setTimeout(() => {
        setNotification((prev) => ({ ...prev, visible: false }));
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [notification.visible, notification.type]);

 
  const handleConfirm=async()=>{
   
    if(!pin) {setNotification({visible:true,message:"Please enter a pin", type:"error"} ) ; return}
    try{

      const correctPin=await confirmPin(email,pin)
      console.log("email sent to reset pass, ",email)
      if(correctPin) navigation.replace('ResetPassword',{email,pin});
     

    }
    catch(err){

      setNotification({
        visible:true,
        message:err.message,
        type:"error"
    
      }) 
      return
     

    }
  }



  return (
    <View style={styles.container}>
      <Notification
        visible={notification.visible}
        message={notification.message}
        type={notification.type}
        actions={notification.actions}
        onClose={() => setNotification({ ...notification, visible: false })}
      />
      <Text style={styles.title}>Confirm your pin</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter the recived PIN at your email"
        placeholderTextColor="#bbb"
        value={pin}
        onChangeText={setPin}
        keyboardType="number-pad"
        autoCapitalize="none"
      />
     
      <TouchableOpacity style={styles.button} onPress={handleConfirm} >
        <Text style={styles.buttonText}>Confirm</Text>
      </TouchableOpacity>

     
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: colors.text,
  },
  input: {
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
  button: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  link: {
    color: colors.primary,
    textAlign: 'center',
    marginTop: 10,
  },
});
