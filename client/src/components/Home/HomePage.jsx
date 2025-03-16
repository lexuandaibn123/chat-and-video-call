import React from 'react';
import styled from 'styled-components';

const HomePageContainer = styled.div`
  padding: 20px;
  text-align: center;
`;

const Title = styled.h1`
  color: #333;
`;

const Description = styled.p`
  font-size: 16px;
  color: #666;
`;

function HomePage() {
  return (
    <HomePageContainer>
      <Title>Chào mừng đến trang chủ!</Title>
      <Description>Đây là nội dung chính của trang chủ.</Description>
    </HomePageContainer>
  );
}

export default HomePage;