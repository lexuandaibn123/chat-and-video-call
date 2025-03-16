// // src/App.jsx
// import React from 'react';
// import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
// import Login from './components/Auth/Login';
// // import Register from './components/Auth/Register';
// // import HomePage from './components/Home/HomePage';
// import styled from 'styled-components'; // Import styled-components

// // Định nghĩa các styled components
// const AppContainer = styled.div`
//   font-family: sans-serif;
//   text-align: center;
// `;

// const Heading = styled.h1`
//   color: #007bff;
// `;

// function App() {
//   return (
//     <AppContainer>
//       <Heading>Chào mừng đến ứng dụng Chat và Video Call!</Heading>
//       <Router>
//         <Routes>
//           <Route path="/login" element={<Login />} />
//           {/* <Route path="/register" element={<Register />} />
//           <Route path="/" element={<HomePage />} />
//           <Route path="*" element={<Navigate to="/login" />} /> */}
//         </Routes>
//       </Router>
//     </AppContainer>
//   );
// }

// export default App;


import React from 'react';
import AuthForm from './components/Auth/AuthForm'; // Adjust path as needed

function App() {
  return (
    <div className="App">
      <AuthForm />
    </div>
  );
}

export default App;