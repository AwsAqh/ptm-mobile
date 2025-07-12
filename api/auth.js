import { API_URL } from './config';

// Login API
export async function login({ email, password }) {
  console.log('API_URL:', API_URL);
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.msg || 'Login failed');
  return data;
}

// Register API
export async function register({ name, email, password }) {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.msg || 'Registration failed');
  return data;
} 

export async function checkEmailExists(email){
 
const response=await fetch(`${API_URL}/auth/check-email-exists`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:email})})

const data=await response.json()

if(!response.ok)throw new Error(data.message||'user not found')

return true

}

export async function forgotPassword(email){

const response=await fetch(`${API_URL}/auth/forgot-password`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:email})})
const data=await response.json()
console.log(data)
if(!response.ok) throw new Error (data.message || "Failed to send a pin!")
  return data.message
}

export async function confirmPin(email,pin){
console.log("email sent to confirm pin", email, "pin, ",pin)

  const response=await fetch(`${API_URL}/auth/confirm-pin`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,pin}) })
  const data=await response.json()
  console.log("data in confrim pin",data)
  if(!response.ok)throw new Error(data.message||"Invalid pin")
    return true


}

export async function resetPassword(email,password,pin){
  const response=await fetch(`${API_URL}/auth/reset-password`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,pin,password})})
  const data=await response.json()
  if(!response.ok) throw new Error (data.message|| " failed to reset password")
    return data.message

}