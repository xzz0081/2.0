import React, { useState, useEffect } from 'react';
import { formatSolPrice } from '../utils/priceUtils';

interface SolPriceDisplayProps {
  price: number;
  lastUpdated: Date | null;
  loading?: boolean;
}

// 平滑的SOL价格显示组件
const SolPriceDisplay: React.FC<SolPriceDisplayProps> = ({ 
  price, 
  lastUpdated, 
  loading = false 
}) => {
  const [displayPrice, setDisplayPrice] = useState(price);
  const [isFlashing, setIsFlashing] = useState(false);

  // 当价格变化时，添加闪烁效果
  useEffect(() => {
    if (price !== displayPrice && !loading) {
      setIsFlashing(true);
      
      // 延迟更新显示价格，创建平滑过渡
      const timer = setTimeout(() => {
        setDisplayPrice(price);
      }, 100);

      // 移除闪烁效果
      const flashTimer = setTimeout(() => {
        setIsFlashing(false);
      }, 500);

      return () => {
        clearTimeout(timer);
        clearTimeout(flashTimer);
      };
    } else if (loading) {
      setDisplayPrice(price);
    }
  }, [price, displayPrice, loading]);

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ 
        marginBottom: '4px', 
        color: 'rgba(0, 0, 0, 0.45)', 
        fontSize: '14px',
        fontWeight: 500
      }}>
        SOL 实时价格
      </div>
      
      <div 
        className={`smooth-transition ${isFlashing ? 'price-update-flash' : ''}`}
        style={{ 
          color: '#ff4d4f', 
          fontFamily: 'monospace',
          fontSize: '24px',
          fontWeight: 'bold',
          lineHeight: '32px',
          padding: '4px 8px',
          borderRadius: '4px',
          display: 'inline-block',
          minWidth: '120px'
        }}
      >
        {formatSolPrice(displayPrice).text}
      </div>
      
      <div style={{ marginTop: '8px' }}>
        {lastUpdated && (
          <div style={{ 
            fontSize: '12px', 
            color: 'rgba(0, 0, 0, 0.45)',
            transition: 'opacity 0.3s ease'
          }}>
            更新时间: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
        
        {loading && (
          <div style={{ 
            fontSize: '12px', 
            color: '#1890ff',
            marginTop: '2px'
          }}>
            正在获取价格...
          </div>
        )}
      </div>
    </div>
  );
};

export default SolPriceDisplay;
