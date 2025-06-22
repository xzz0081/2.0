import React from 'react';
import { Typography, Row, Col } from 'antd';
import RealTimeTradeList from '../components/RealTimeTradeList';

const { Title, Paragraph } = Typography;

// 实时交易记录页面
const RealTimeTrades: React.FC = () => {
  return (
    <div>
      <Title level={2}>实时交易记录</Title>
      <Paragraph type="secondary">
        实时监控所有钱包的交易活动，包括买入、卖出操作和交易状态变化
      </Paragraph>

      <Row gutter={[24, 24]}>
        <Col span={24}>
          <RealTimeTradeList maxItems={200} />
        </Col>
      </Row>
    </div>
  );
};

export default RealTimeTrades;
