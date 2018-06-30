# STRADA
[![Build Status](https://travis-ci.org/robisim74/STRADA.svg?branch=master)](https://travis-ci.org/robisim74/STRADA)

> STRADA (_Simulation of TRAffic DAta_) is an urban traffic web simulator that uses data in real time.

> This project is under active development for the dissertation of my bachelor's degree in computer engineering.

## Documentation
Official docs: [STRADA documentation](https://robisim74.github.io/STRADA/)

## Development

### Requirements
- [Node.js and npm](https://nodejs.org)
- Update npm: `npm install npm@latest -g`
- Angular CLI: `npm install -g @angular/cli`
- Firebase
    - Create a Firebase project in the [Firebase console](https://console.firebase.google.com/)
    - Firebase CLI: `npm install -g firebase-tools`
    - Login: `firebase login`
- Google Maps 
    - Get your API keys: https://cloud.google.com/maps-platform/
    - Enable _Maps JavaScript API_, _Geocoding API_ and _Directions API_

### Prerequisites
- Update `config.json` file
- Update `.firebaserc` file

### Firebase Functions
```Shell
cd functions
npm install
npm run serve:dev
```

### App
```Shell
npm install
npm start
```

## Test
```Shell
npm test
```

## License
MIT