# PTM-MOBILE

A mobile application for image classification that connects to a local PyTorch server running on Raspberry Pi. This app is designed to work with the [ptm-localhost](https://github.com/awsaqh/ptm-localhost) backend repository.

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Python 3.8+ (for backend)
- Raspberry Pi (for running the PyTorch server)
- Expo Go app on your mobile device

## Project Structure

- `PTM-MOBILE/` - This repository (Mobile App)
- `ptm-localhost/` - Backend repository (PyTorch Server)

## Setup Instructions

### 1. Backend Setup (Raspberry Pi)

1. Clone the backend repository:
   ```bash
   git clone https://github.com/awsaqh/ptm-localhost.git
   cd ptm-localhost
   ```
2- start the backend server (please follow the readme file instructions for ptm-localhost to run correctly):
  ```bash
  cd backend
  npm install
  node app.js
  ```

2. Install Python dependencies:
   ```bash
   cd pytorch
   pip install -r requirements.txt
   ```

3. Configure the server to run on boot:
   ```bash
   # Create a systemd service
   sudo nano /etc/systemd/system/ptm-server.service
   ```

   Add the following content (adjust paths as needed):
   ```ini
   [Unit]
   Description=PTM PyTorch Server
   After=network.target

   [Service]
   User=pi
   WorkingDirectory=/home/pi/ptm-localhost
   ExecStart=/usr/bin/python3 server.py
   Restart=always
   RestartSec=10

   [Install]
   WantedBy=multi-user.target
   ```

4. Enable and start the service:
   ```bash
   sudo systemctl enable ptm-server.service
   sudo systemctl start ptm-server.service
   ```

### 2. Network Configuration

1. **Raspberry Pi Setup**:
   - Connect your Raspberry Pi to your computer
   - Edit the WiFi configuration:
     ```bash
     sudo nano /etc/wpa_supplicant/wpa_supplicant.conf
     ```
   - Add your mobile hotspot configuration:
     ```plaintext
     network={
         ssid="YourPhoneHotspotName"
         psk="YourHotspotPassword"
         priority=1
     }
     ```

2. **Mobile App Configuration**:
   - The app is configured to connect to `http://raspberrypi.local:5050` by default
   - If `raspberrypi.local` doesn't work, you can use the Pi's IP address
   - To find the IP address, run `hostname -I` on the Raspberry Pi

### 3. Mobile App Setup

1. Clone this repository:
   ```bash
   git clone https://github.com/awsaqh/ptm-mobile.git
   cd PTM-MOBILE
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Start the development server:
   ```bash
   npx expo start
   ```

4. Run on your device:
   - Install Expo Go from your device's app store
   - Scan the QR code shown in the terminal
   - The app will open in Expo Go


# Project Documentation

Here are some screenshots of the project:

![Home](./screenshot/home.jpg)
![Train new model](./screenshot/Train.jpg)
![Browse models](./screenshot/Browse.jpg)
![Classify image](./screenshot/classify.jpg)





## Usage

1. **Starting the System**:
   - Power on your Raspberry Pi
   - Enable your phone's mobile hotspot
   - The Pi will automatically connect to the hotspot
   - The server will start automatically
   - Open the app on your phone

2. **Using the App**:
   - The app will automatically connect to the Pi's server
   - You can capture images from the Pi's camera
   - Classify images using the trained models
   - Train new models with your own datasets

## Troubleshooting

1. **Connection Issues**:
   - Ensure both devices are on the same network (your hotspot)
   - Check if the server is running: `sudo systemctl status ptm-server.service`
   - Try using the IP address instead of `raspberrypi.local`
   - Check server logs: `sudo journalctl -u ptm-server.service`

2. **App Issues**:
   - Clear Expo cache: `expo start -c`
   - Reinstall node modules: `rm -rf node_modules && npm install`
   - Check Expo logs in the terminal

## Development

- The app is built with React Native and Expo
- Backend uses Python with PyTorch
- API endpoints are configured in `api/config.js`
- Main screens are in the `screens/` directory

## License

[Your License Here]

## Contributing

[Your Contributing Guidelines Here]
