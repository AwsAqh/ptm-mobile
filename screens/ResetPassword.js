import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { resetPassword } from '../api/auth';
import Notification from '../components/Notification';
import { colors } from '../styles/them';


export default function ResetPasswordScreen({ navigation,route }) {
    const navigate=useNavigation()
  const {email,pin}=route.params
 const [password,setPassword]=useState('')
 const [confirmPassword,setConfirmPassword]=useState('')
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' });

 


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

   
    if(!password || password!==confirmPassword) { setNotification({visible:true,message:"passwords must match",type:"error"});return}
            if(password.length<6) {setNotification({visible:true,message:"password must be 6 chars at least",type:"error"}) ;return}

    try{
        console.log(pin,password,email)
            const response=await resetPassword(email,password,pin)
            setNotification({visible:true,message:response,type:"success"})
            setTimeout(()=>{navigate.replace('Login')},2000)
    }
    catch(err){
        console.log("failed")
        setNotification({visible:true,message:err.message,type:"error"})
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


    <Text style={styles.title}>Enter new password</Text>
     <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#bbb"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        placeholderTextColor="#bbb"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />
     
      <TouchableOpacity style={styles.button} onPress={handleConfirm} disabled={loading}>
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
